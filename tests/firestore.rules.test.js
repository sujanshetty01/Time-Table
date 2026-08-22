const fs = require("node:fs");
const path = require("node:path");
const { after, before, beforeEach, describe, test } = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} = require("firebase/firestore");

const PROJECT_ID = "demo-pathpilot-rules";
let testEnv;

const validProfile = (overrides = {}) => ({
  fullName: "Taylor Morgan",
  careerGoalKey: "backend-engineer",
  careerGoalLabel: "Backend Engineer",
  currentRole: "Support Engineer",
  yearsExp: 2,
  skillLevel: "Intermediate",
  workStartMin: 360,
  workEndMin: 900,
  learnStartMin: 720,
  learnEndMin: 840,
  afterStartMin: 1140,
  afterHours: 1.5,
  learningStyles: ["Hands-on Labs", "Documentation"],
  cloud: "AWS",
  targetCert: "AWS Developer Associate",
  timelineMonths: 9,
  interests: ["APIs", "distributed systems"],
  onboardedAt: "2026-08-22T10:00:00.000Z",
  updatedAt: serverTimestamp(),
  ...overrides,
});

const validUser = (uid, overrides = {}) => ({
  uid,
  email: `${uid}@example.com`,
  role: "user",
  mentorIds: [],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

async function seedUser(uid, overrides = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "users", uid),
      validUser(uid, overrides),
    );
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(
        path.join(__dirname, "..", "firestore.rules"),
        "utf8",
      ),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe("owner data validation", () => {
  test("allows bounded user, profile, plan, progress, and settings documents", async () => {
    const db = testEnv.authenticatedContext("owner").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "users", "owner"), validUser("owner"));
    batch.set(doc(db, "users/owner/profiles/main"), validProfile());
    batch.set(doc(db, "users/owner/plans/active"), {
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      templateVersion: 1,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "users/owner/taskProgress/main"), {
      done: ["backend-engineer:phase-1:task-1"],
      streak: { count: 1, last: "2026-08-22" },
      log: { "backend-engineer:phase-1:task-1": "2026-08-22" },
      celebrated: [],
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "users/owner/settings/main"), {
      weekTarget: 150,
      updatedAt: serverTimestamp(),
    });

    await assertSucceeds(batch.commit());
  });

  test("rejects extra root fields, role escalation, and malformed profile values", async () => {
    const db = testEnv.authenticatedContext("owner").firestore();
    await assertFails(
      setDoc(doc(db, "users", "owner"), validUser("owner", { progress: {} })),
    );
    await assertFails(
      setDoc(doc(db, "users", "owner"), validUser("owner", { role: "admin" })),
    );
    await assertFails(
      setDoc(
        doc(db, "users/owner/profiles/main"),
        validProfile({ timelineMonths: 120 }),
      ),
    );
  });

  test("allows a one-time replacement of a legacy root document", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "owner"), {
        email: "owner@example.com",
        progress: { done: [] },
        profile: { fullName: "Taylor" },
      });
    });
    const db = testEnv.authenticatedContext("owner").firestore();
    await assertSucceeds(setDoc(doc(db, "users", "owner"), validUser("owner")));
  });
});

describe("role-scoped access", () => {
  test("allows only an assigned mentor to read a learner profile", async () => {
    await seedUser("mentor", { role: "mentor" });
    await seedUser("otherMentor", { role: "mentor" });
    await seedUser("learner", { mentorIds: ["mentor"] });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "users/learner/profiles/main"),
        validProfile(),
      );
    });

    const assigned = testEnv.authenticatedContext("mentor").firestore();
    const unassigned = testEnv.authenticatedContext("otherMentor").firestore();
    await assertSucceeds(getDoc(doc(assigned, "users/learner/profiles/main")));
    await assertFails(getDoc(doc(unassigned, "users/learner/profiles/main")));
  });

  test("requires an audit record in the same batch as an admin access change", async () => {
    await seedUser("admin", { role: "admin" });
    await seedUser("learner");
    const db = testEnv.authenticatedContext("admin").firestore();

    await assertFails(
      updateDoc(doc(db, "users", "learner"), { role: "mentor" }),
    );

    const auditRef = doc(collection(db, "adminAudit"));
    const batch = writeBatch(db);
    batch.update(doc(db, "users", "learner"), {
      role: "mentor",
      mentorIds: [],
      updatedAt: serverTimestamp(),
      lastAdminActionId: auditRef.id,
    });
    batch.set(auditRef, {
      actorUid: "admin",
      targetUid: "learner",
      action: "update-access",
      role: "mentor",
      mentorIds: [],
      at: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });
});

describe("broadcast validation", () => {
  test("accepts a bounded admin broadcast and rejects user or oversized writes", async () => {
    await seedUser("admin", { role: "admin" });
    await seedUser("learner");
    const adminDb = testEnv.authenticatedContext("admin").firestore();
    const userDb = testEnv.authenticatedContext("learner").firestore();
    const payload = {
      title: "New roadmap available",
      body: "Open PathPilot to review it.",
      at: serverTimestamp(),
      byUid: "admin",
    };

    await assertSucceeds(setDoc(doc(adminDb, "broadcasts", "valid"), payload));
    await assertFails(
      setDoc(doc(userDb, "broadcasts", "forbidden"), {
        ...payload,
        byUid: "learner",
      }),
    );
    await assertFails(
      setDoc(doc(adminDb, "broadcasts", "oversized"), {
        ...payload,
        title: "x".repeat(121),
      }),
    );
  });
});
