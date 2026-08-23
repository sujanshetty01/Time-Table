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

const PLAN_ID = "plan-backend-engineer-aws";
const REVISION_ID = "rev-000001";
const TASK_ID = "backend-engineer:p1-0";
const SESSION_ID = `${TASK_ID}::1`;
const CHUNK_IDS = Array.from(
  { length: 9 },
  (_, index) => `chunk-${String(index).padStart(3, "0")}`,
);

const validPlan = (overrides = {}) => ({
  schemaVersion: 2,
  planId: PLAN_ID,
  templateId: "backend-engineer:AWS",
  templateVersion: 1,
  careerGoalKey: "backend-engineer",
  cloud: "AWS",
  activeRevisionId: REVISION_ID,
  latestRevisionNumber: 1,
  status: "active",
  sourceHash: "abcd1234",
  migrationSource: "new-plan",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const validRevision = (overrides = {}) => ({
  planId: PLAN_ID,
  revisionId: REVISION_ID,
  revisionNumber: 1,
  previousRevisionId: null,
  restoredRevisionId: null,
  reason: "initial-generation",
  templateId: "backend-engineer:AWS",
  templateVersion: 1,
  sourceHash: "abcd1234",
  taskIds: [TASK_ID],
  sessionIds: [SESSION_ID],
  chunkIds: CHUNK_IDS,
  preservedCompletedTaskIds: [TASK_ID],
  createdAt: serverTimestamp(),
  ...overrides,
});

const validChunk = (ordinal, overrides = {}) => ({
  planId: PLAN_ID,
  revisionId: REVISION_ID,
  chunkId: CHUNK_IDS[ordinal],
  ordinal,
  sourceHash: "abcd1234",
  taskIds: ordinal === 0 ? [TASK_ID] : [],
  templateTaskIds: ordinal === 0 ? [TASK_ID] : [],
  titles: ordinal === 0 ? ["Study APIs"] : [],
  phaseIds: ordinal === 0 ? ["p1"] : [],
  phaseTitles: ordinal === 0 ? ["Foundation"] : [],
  dependencyIds: ordinal === 0 ? [null] : [],
  estimatedMinutes: ordinal === 0 ? [60] : [],
  sessionIds: ordinal === 0 ? [SESSION_ID] : [],
  statuses: ordinal === 0 ? ["unscheduled"] : [],
  locks: ordinal === 0 ? [false] : [],
  scheduledDates: ordinal === 0 ? [null] : [],
  startMinutes: ordinal === 0 ? [null] : [],
  durationMinutes: ordinal === 0 ? [60] : [],
  createdAt: serverTimestamp(),
  ...overrides,
});

const validTask = (overrides = {}) => ({
  taskId: TASK_ID,
  templateTaskId: TASK_ID,
  title: "Study APIs",
  phaseId: "p1",
  phaseTitle: "Foundation",
  order: 0,
  dependencyIds: [],
  estimatedMinutes: 60,
  activeRevisionId: REVISION_ID,
  definitionChunkId: CHUNK_IDS[0],
  definitionIndex: 0,
  firstRevisionId: REVISION_ID,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const validSession = (overrides = {}) => ({
  sessionId: SESSION_ID,
  taskId: TASK_ID,
  ordinal: 1,
  status: "unscheduled",
  locked: false,
  scheduledDate: null,
  startMin: null,
  durationMin: 60,
  activeRevisionId: REVISION_ID,
  definitionChunkId: CHUNK_IDS[0],
  definitionIndex: 0,
  firstRevisionId: REVISION_ID,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const validPlanner = (overrides = {}) => ({
  startDate: "2026-09-14",
  deadline: "2026-12-14",
  availableDays: [1, 2, 3, 4, 5],
  startMin: 720,
  endMin: 900,
  dailyCapMinutes: 180,
  weeklyCapMinutes: 720,
  ...overrides,
});

function writeVersion(
  batch,
  db,
  {
    plan = validPlan(),
    revision = validRevision(),
    chunks = CHUNK_IDS.map((_, ordinal) => validChunk(ordinal)),
  } = {},
) {
  batch.set(doc(db, `users/owner/plans/${PLAN_ID}`), plan);
  batch.set(
    doc(db, `users/owner/plans/${PLAN_ID}/revisions/${revision.revisionId}`),
    revision,
  );
  chunks.forEach((chunk) => {
    batch.set(
      doc(
        db,
        `users/owner/plans/${PLAN_ID}/revisions/${revision.revisionId}/chunks/${chunk.chunkId}`,
      ),
      chunk,
    );
  });
}

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
  test("allows bounded user, profile, versioned plan, progress, and settings documents", async () => {
    const db = testEnv.authenticatedContext("owner").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "users", "owner"), validUser("owner"));
    batch.set(doc(db, "users/owner/profiles/main"), validProfile());
    writeVersion(batch, db);
    batch.set(
      doc(db, `users/owner/plans/${PLAN_ID}/tasks/${TASK_ID}`),
      validTask(),
    );
    batch.set(
      doc(db, `users/owner/plans/${PLAN_ID}/sessions/${SESSION_ID}`),
      validSession(),
    );
    batch.set(doc(db, "users/owner/taskProgress/main"), {
      done: ["backend-engineer:phase-1:task-1"],
      streak: { count: 1, last: "2026-08-22" },
      log: { "backend-engineer:phase-1:task-1": "2026-08-22" },
      celebrated: [],
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "users/owner/settings/main"), {
      weekTarget: 150,
      activePlanId: PLAN_ID,
      planner: validPlanner(),
      plannerVersion: 0,
      updatedAt: serverTimestamp(),
    });

    await assertSucceeds(batch.commit());
    const sessionRef = doc(
      db,
      `users/owner/plans/${PLAN_ID}/sessions/${SESSION_ID}`,
    );
    await assertSucceeds(
      updateDoc(sessionRef, {
        status: "scheduled",
        locked: true,
        scheduledDate: "2026-09-14",
        startMin: 720,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(sessionRef, {
        durationMin: 0,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(sessionRef, {
        scheduledDate: null,
        startMin: null,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(sessionRef, {
        scheduledDate: "2026/09/14",
        startMin: 720,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(sessionRef, {
        scheduledDate: "2026-09-14",
        startMin: 1400,
        durationMin: 60,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/owner/settings/main"), {
        weekTarget: 150,
        activePlanId: PLAN_ID,
        planner: validPlanner({ availableDays: [1, 7] }),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/owner/settings/main"), {
        weekTarget: 150,
        activePlanId: PLAN_ID,
        planner: validPlanner({
          startMin: 1430,
          endMin: 1440,
          dailyCapMinutes: 10,
          weeklyCapMinutes: 10,
        }),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/owner/settings/main"), {
        weekTarget: 150,
        activePlanId: PLAN_ID,
        planner: validPlanner({ startDate: "2026/09/14" }),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/owner/settings/main"), {
        weekTarget: 150,
        activePlanId: PLAN_ID,
        planner: validPlanner({ deadline: "2026-9-30" }),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/owner/settings/main"), {
        weekTarget: 150,
        activePlanId: PLAN_ID,
        planner: validPlanner(),
        plannerVersion: -1,
        updatedAt: serverTimestamp(),
      }),
    );
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

  test("keeps the legacy active-plan pointer writable during rollout", async () => {
    const db = testEnv.authenticatedContext("owner").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/owner/plans/active"), {
        careerGoalKey: "backend-engineer",
        cloud: "AWS",
        templateVersion: 1,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("versioned plan integrity", () => {
  test("rejects a plan without its activated revision", async () => {
    await seedUser("owner");
    const db = testEnv.authenticatedContext("owner").firestore();
    await assertFails(
      setDoc(doc(db, `users/owner/plans/${PLAN_ID}`), validPlan()),
    );
  });

  test("allows an authoritative revision without optional materialized caches", async () => {
    await seedUser("owner");
    const db = testEnv.authenticatedContext("owner").firestore();
    const batch = writeBatch(db);
    writeVersion(batch, db);

    await assertSucceeds(batch.commit());
  });

  test("rejects materialized definitions that differ from the active revision", async () => {
    await seedUser("owner");
    const db = testEnv.authenticatedContext("owner").firestore();

    for (const [ref, data] of [
      [
        doc(db, `users/owner/plans/${PLAN_ID}/tasks/${TASK_ID}`),
        validTask({ title: "A different task" }),
      ],
      [
        doc(db, `users/owner/plans/${PLAN_ID}/sessions/${SESSION_ID}`),
        validSession({ durationMin: 90 }),
      ],
    ]) {
      const batch = writeBatch(db);
      writeVersion(batch, db);
      batch.set(ref, data);
      await assertFails(batch.commit());
    }
  });

  test("rejects missing chunks, malformed definitions, and unrelated progress", async () => {
    await seedUser("owner");
    const db = testEnv.authenticatedContext("owner").firestore();

    const cases = [
      {
        chunks: CHUNK_IDS.slice(0, 7).map((_, ordinal) => validChunk(ordinal)),
      },
      {
        revision: validRevision({
          taskIds: Array.from({ length: 73 }, (_, index) => `task-${index}`),
          sessionIds: Array.from(
            { length: 73 },
            (_, index) => `task-${index}::1`,
          ),
          preservedCompletedTaskIds: [],
        }),
      },
      {
        chunks: CHUNK_IDS.map((_, ordinal) =>
          ordinal === 0 ? validChunk(0, { titles: [""] }) : validChunk(ordinal),
        ),
      },
      {
        revision: validRevision({
          preservedCompletedTaskIds: ["unrelated-task"],
        }),
      },
    ];
    for (const version of cases) {
      const batch = writeBatch(db);
      writeVersion(batch, db, version);
      await assertFails(batch.commit());
    }
  });

  test("keeps revisions and stable task/session identities immutable", async () => {
    await seedUser("owner");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `users/owner/plans/${PLAN_ID}`), {
        ...validPlan(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}`),
        { ...validRevision(), createdAt: new Date() },
      );
      for (let ordinal = 0; ordinal < CHUNK_IDS.length; ordinal += 1) {
        await setDoc(
          doc(
            db,
            `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}/chunks/${CHUNK_IDS[ordinal]}`,
          ),
          { ...validChunk(ordinal), createdAt: new Date() },
        );
      }
      await setDoc(doc(db, `users/owner/plans/${PLAN_ID}/tasks/${TASK_ID}`), {
        ...validTask(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/sessions/${SESSION_ID}`),
        { ...validSession(), createdAt: new Date(), updatedAt: new Date() },
      );
    });
    const db = testEnv.authenticatedContext("owner").firestore();

    await assertFails(
      updateDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}`),
        { reason: "profile-change" },
      ),
    );
    await assertFails(
      updateDoc(
        doc(
          db,
          `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}/chunks/${CHUNK_IDS[0]}`,
        ),
        { titles: ["Changed"] },
      ),
    );
    await assertFails(
      updateDoc(doc(db, `users/owner/plans/${PLAN_ID}/tasks/${TASK_ID}`), {
        taskId: "replacement-task",
      }),
    );
    await assertFails(
      updateDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/sessions/${SESSION_ID}`),
        { taskId: "replacement-task" },
      ),
    );
  });

  test("allows rollback only as a new atomically activated revision", async () => {
    await seedUser("owner");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `users/owner/plans/${PLAN_ID}`), {
        ...validPlan(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}`),
        { ...validRevision(), createdAt: new Date() },
      );
      for (let ordinal = 0; ordinal < CHUNK_IDS.length; ordinal += 1) {
        await setDoc(
          doc(
            db,
            `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}/chunks/${CHUNK_IDS[ordinal]}`,
          ),
          { ...validChunk(ordinal), createdAt: new Date() },
        );
      }
    });
    const db = testEnv.authenticatedContext("owner").firestore();
    const nextRevisionId = "rev-000002";
    const batch = writeBatch(db);
    batch.update(doc(db, `users/owner/plans/${PLAN_ID}`), {
      activeRevisionId: nextRevisionId,
      latestRevisionNumber: 2,
      sourceHash: "abcd1234",
      migrationSource: "rollback",
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(db, `users/owner/plans/${PLAN_ID}/revisions/${nextRevisionId}`),
      validRevision({
        revisionId: nextRevisionId,
        revisionNumber: 2,
        previousRevisionId: REVISION_ID,
        restoredRevisionId: REVISION_ID,
        reason: "rollback",
      }),
    );
    CHUNK_IDS.forEach((chunkId, ordinal) => {
      batch.set(
        doc(
          db,
          `users/owner/plans/${PLAN_ID}/revisions/${nextRevisionId}/chunks/${chunkId}`,
        ),
        validChunk(ordinal, { revisionId: nextRevisionId }),
      );
    });

    await assertSucceeds(batch.commit());
  });

  test("rejects forged rollback ancestry, targets, and definitions", async () => {
    await seedUser("owner");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `users/owner/plans/${PLAN_ID}`), {
        ...validPlan(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}`),
        { ...validRevision(), createdAt: new Date() },
      );
      for (let ordinal = 0; ordinal < CHUNK_IDS.length; ordinal += 1) {
        await setDoc(
          doc(
            db,
            `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}/chunks/${CHUNK_IDS[ordinal]}`,
          ),
          { ...validChunk(ordinal), createdAt: new Date() },
        );
      }
    });
    const db = testEnv.authenticatedContext("owner").firestore();
    const nextRevisionId = "rev-000002";
    const attempts = [
      {
        revision: validRevision({
          revisionId: nextRevisionId,
          revisionNumber: 2,
          previousRevisionId: "rev-wrong",
          restoredRevisionId: REVISION_ID,
          reason: "rollback",
        }),
      },
      {
        revision: validRevision({
          revisionId: nextRevisionId,
          revisionNumber: 2,
          previousRevisionId: REVISION_ID,
          restoredRevisionId: "rev-999999",
          reason: "rollback",
        }),
      },
      {
        revision: validRevision({
          revisionId: nextRevisionId,
          revisionNumber: 2,
          previousRevisionId: REVISION_ID,
          restoredRevisionId: REVISION_ID,
          reason: "rollback",
        }),
        chunks: CHUNK_IDS.map((_, ordinal) =>
          ordinal === 0
            ? validChunk(0, {
                revisionId: nextRevisionId,
                titles: ["Forged"],
              })
            : validChunk(ordinal, { revisionId: nextRevisionId }),
        ),
      },
    ];

    for (const attempt of attempts) {
      const batch = writeBatch(db);
      batch.update(doc(db, `users/owner/plans/${PLAN_ID}`), {
        activeRevisionId: nextRevisionId,
        latestRevisionNumber: 2,
        sourceHash: "abcd1234",
        migrationSource: "rollback",
        updatedAt: serverTimestamp(),
      });
      batch.set(
        doc(db, `users/owner/plans/${PLAN_ID}/revisions/${nextRevisionId}`),
        attempt.revision,
      );
      const chunks =
        attempt.chunks ||
        CHUNK_IDS.map((_, ordinal) =>
          validChunk(ordinal, { revisionId: nextRevisionId }),
        );
      chunks.forEach((chunk) => {
        batch.set(
          doc(
            db,
            `users/owner/plans/${PLAN_ID}/revisions/${nextRevisionId}/chunks/${chunk.chunkId}`,
          ),
          chunk,
        );
      });
      await assertFails(batch.commit());
    }
  });

  test("directly rejects malformed and altered immutable chunks", async () => {
    await seedUser("owner");
    const nextRevisionId = "rev-000002";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `users/owner/plans/${PLAN_ID}`), {
        ...validPlan({
          activeRevisionId: nextRevisionId,
          latestRevisionNumber: 2,
          migrationSource: "rollback",
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}`),
        { ...validRevision(), createdAt: new Date() },
      );
      await setDoc(
        doc(db, `users/owner/plans/${PLAN_ID}/revisions/${nextRevisionId}`),
        {
          ...validRevision({
            revisionId: nextRevisionId,
            revisionNumber: 2,
            previousRevisionId: REVISION_ID,
            restoredRevisionId: REVISION_ID,
            reason: "rollback",
          }),
          createdAt: new Date(),
        },
      );
      for (let ordinal = 0; ordinal < CHUNK_IDS.length; ordinal += 1) {
        await setDoc(
          doc(
            db,
            `users/owner/plans/${PLAN_ID}/revisions/${REVISION_ID}/chunks/${CHUNK_IDS[ordinal]}`,
          ),
          { ...validChunk(ordinal), createdAt: new Date() },
        );
      }
    });
    const db = testEnv.authenticatedContext("owner").firestore();
    const chunkRef = doc(
      db,
      `users/owner/plans/${PLAN_ID}/revisions/${nextRevisionId}/chunks/${CHUNK_IDS[0]}`,
    );

    await assertFails(
      setDoc(
        chunkRef,
        validChunk(0, {
          revisionId: nextRevisionId,
          dependencyIds: ["unknown-task"],
        }),
      ),
    );
    await assertFails(
      setDoc(
        chunkRef,
        validChunk(0, {
          revisionId: nextRevisionId,
          titles: ["Altered rollback task"],
        }),
      ),
    );
    await assertSucceeds(
      setDoc(
        chunkRef,
        validChunk(0, {
          revisionId: nextRevisionId,
        }),
      ),
    );
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
