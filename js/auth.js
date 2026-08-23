/* ============================================================
   auth.js — Firebase Auth + Firestore real-time progress sync
   Bridges to app.js via window.CloudBridge / window.Cloud.
   Falls back to local-only mode when Firebase isn't configured.
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cfg = window.FIREBASE_CONFIG || {};
  const configured =
    !!cfg.apiKey && !String(cfg.apiKey).includes("YOUR_") &&
    !!cfg.projectId && !String(cfg.projectId).includes("YOUR_") &&
    typeof firebase !== "undefined";

  /* -------- Local-only mode (no Firebase configured) -------- */
  if (!configured) {
    const boot = () => {
      const o = $("authOverlay"); if (o) o.remove();
      const chip = $("userChip");
      if (chip) chip.innerHTML = `<span class="uc-dot local"></span><span class="uc-email">Local mode</span>`;
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
    return;
  }

  /* -------- Cloud mode -------- */
  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  let currentUser = null;
  let unsubs = [];
  let authGeneration = 0;

  let currentRole = "user";
  function computeIsAdmin() { return currentRole === "admin"; }
  window.PathAuth = {
    uid: () => currentUser && currentUser.uid,
    email: () => currentUser && currentUser.email,
    role: () => (computeIsAdmin() ? "admin" : currentRole),
    isAdmin: () => computeIsAdmin(),
    isMentor: () => currentRole === "mentor" || computeIsAdmin(),
    async listUsers() {
      let query = db.collection("users");
      if (!computeIsAdmin()) query = query.where("mentorIds", "array-contains", currentUser.uid);
      const snap = await query.get();
      return Promise.all(snap.docs.map(async (userDoc) => {
        const [profileDoc, progressDoc] = await Promise.all([
          userDoc.ref.collection("profiles").doc("main").get(),
          userDoc.ref.collection("taskProgress").doc("main").get(),
        ]);
        return {
          uid: userDoc.id,
          ...userDoc.data(),
          profile: profileDoc.exists ? profileDoc.data() : null,
          progress: progressDoc.exists ? progressDoc.data() : null,
        };
      }));
    },
    async setUserRole(uid, role) {
      if (!computeIsAdmin() || !["user", "mentor", "admin"].includes(role)) {
        throw new Error("Not authorized to update roles.");
      }
      const userRef = db.collection("users").doc(uid);
      const snap = await userRef.get();
      if (!snap.exists) throw new Error("User not found.");
      const mentorIds = Array.isArray(snap.data().mentorIds) ? snap.data().mentorIds : [];
      const auditRef = db.collection("adminAudit").doc();
      const batch = db.batch();
      batch.update(userRef, {
        role,
        mentorIds,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastAdminActionId: auditRef.id,
      });
      batch.set(auditRef, {
        actorUid: currentUser.uid,
        targetUid: uid,
        action: "update-access",
        role,
        mentorIds,
        at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return batch.commit();
    },
    broadcast(title, body) {
      return db.collection("broadcasts").add({
        title,
        body,
        at: firebase.firestore.FieldValue.serverTimestamp(),
        byUid: currentUser && currentUser.uid,
      });
    },
  };

  // Gate the app immediately until auth state resolves.
  showOverlay();

  // Save interface consumed by app.js persist().
  window.Cloud = {
    save(data) {
      if (!currentUser) return;
      const clean = normalizeProgress(data);
      const userRef = db.collection("users").doc(currentUser.uid);
      const batch = db.batch();
      batch.set(userRef.collection("taskProgress").doc("main"), {
        done: clean.done,
        streak: clean.streak,
        log: clean.log,
        celebrated: clean.celebrated,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(userRef.collection("settings").doc("main"), {
        weekTarget: clean.weekTarget,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.commit().catch((e) => console.warn("Cloud save failed:", e.message));
    },
    saveProfile(profile) {
      if (!currentUser) return;
      const uid = currentUser.uid;
      const generation = authGeneration;
      const clean = normalizeProfile(profile);
      const userRef = db.collection("users").doc(uid);
      const batch = db.batch();
      batch.set(userRef.collection("profiles").doc("main"), {
        ...clean,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.commit()
        .then(() => queuePlanWrite(clean, "profile-change", uid, generation))
        .catch((e) => console.warn("Profile save failed:", e.message));
    },
  };

  const GOAL_LABELS = {
    "cloud-architect": "Cloud Architect",
    "ai-engineer": "AI Engineer",
    "devops-engineer": "DevOps Engineer",
    "data-engineer": "Data Engineer",
    "cybersecurity-engineer": "Cybersecurity Engineer",
    "backend-engineer": "Backend Engineer",
  };
  const LEVELS = ["Beginner", "Intermediate", "Advanced"];
  const CLOUDS = ["Azure", "AWS", "GCP"];
  const STYLES = ["Videos", "Documentation", "Hands-on Labs", "Courses", "Reading"];
  const clampInt = (value, min, max, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  const cleanText = (value, max) => String(value == null ? "" : value).slice(0, max);

  function normalizeProfile(value) {
    const source = value && typeof value === "object" ? value : {};
    const careerGoalKey = Object.hasOwn(GOAL_LABELS, source.careerGoalKey)
      ? source.careerGoalKey : "cloud-architect";
    const workStartMin = clampInt(source.workStartMin, 0, 1438, 360);
    const workEndMin = clampInt(source.workEndMin, workStartMin + 1, 1439, 900);
    const learnStartMin = clampInt(source.learnStartMin, 0, 1438, 720);
    const learnEndMin = clampInt(source.learnEndMin, learnStartMin + 40, 1439, 900);
    return {
      fullName: cleanText(source.fullName, 100) || "PathPilot learner",
      careerGoalKey,
      careerGoalLabel: GOAL_LABELS[careerGoalKey],
      currentRole: cleanText(source.currentRole, 100),
      yearsExp: clampInt(source.yearsExp, 0, 50, 0),
      skillLevel: LEVELS.includes(source.skillLevel) ? source.skillLevel : "Beginner",
      workStartMin,
      workEndMin,
      learnStartMin,
      learnEndMin,
      afterStartMin: clampInt(source.afterStartMin, 0, 1439, 1140),
      afterHours: Math.min(6, Math.max(0, Number(source.afterHours) || 0)),
      learningStyles: Array.isArray(source.learningStyles)
        ? [...new Set(source.learningStyles.filter((style) => STYLES.includes(style)))].slice(0, 5)
        : [],
      cloud: CLOUDS.includes(source.cloud) ? source.cloud : "Azure",
      targetCert: cleanText(source.targetCert, 100),
      timelineMonths: clampInt(source.timelineMonths, 1, 36, 12),
      interests: Array.isArray(source.interests)
        ? source.interests.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 20)
        : [],
      onboardedAt: cleanText(source.onboardedAt, 40) || new Date().toISOString(),
    };
  }

  function normalizeProgress(value) {
    const source = value && typeof value === "object" ? value : {};
    const streak = source.streak && typeof source.streak === "object" ? source.streak : {};
    const log = source.log && typeof source.log === "object" && !Array.isArray(source.log)
      ? Object.fromEntries(Object.entries(source.log).slice(0, 2000)) : {};
    return {
      done: Array.isArray(source.done) ? [...new Set(source.done)].slice(0, 2000) : [],
      streak: {
        count: clampInt(streak.count, 0, 10000, 0),
        last: typeof streak.last === "string" ? streak.last.slice(0, 10) : null,
      },
      log,
      celebrated: Array.isArray(source.celebrated)
        ? [...new Set(source.celebrated)].slice(0, 100) : [],
      weekTarget: clampInt(source.weekTarget, 10, 10000, 150),
    };
  }

  let planWriteQueue = Promise.resolve();
  function queuePlanWrite(
    profile,
    reason,
    uid = currentUser?.uid,
    generation = authGeneration,
  ) {
    planWriteQueue = planWriteQueue
      .catch(() => {})
      .then(() => {
        if (
          !uid ||
          generation !== authGeneration ||
          currentUser?.uid !== uid
        ) {
          return null;
        }
        return ensurePlanModel(profile, reason, uid, generation);
      });
    return planWriteQueue;
  }

  function announcePlan(planId) {
    window.dispatchEvent(
      new CustomEvent("pathpilot:plan-ready", { detail: { planId } }),
    );
  }

  function roadmapForProfile(profile) {
    const roadmaps = window.PathRoadmaps;
    const roadmap = roadmaps && typeof roadmaps.resolve === "function"
      ? roadmaps.resolve(profile.careerGoalKey, profile.cloud)
      : roadmaps && roadmaps.current();
    return roadmap && Array.isArray(roadmap.tracker)
      ? roadmap
      : {
          templateId: `${profile.careerGoalKey}:${profile.cloud}`,
          tracker: [],
        };
  }

  function writeRevisionChunks(batch, planRef, version, now) {
    const revisionRef = planRef.collection("revisions").doc(version.revision.revisionId);
    batch.set(revisionRef, { ...version.revision, createdAt: now });
    version.chunks.forEach((chunk) => {
      batch.set(revisionRef.collection("chunks").doc(chunk.chunkId), {
        ...chunk,
        createdAt: now,
      });
    });
  }

  function writeMaterializedPlan(
    batch,
    planRef,
    version,
    existingTasks,
    existingSessions,
    now,
  ) {
    version.chunks.forEach((chunk) => {
      const definitions = window.PathCore.expandRevisionChunk(chunk);
      definitions.tasks.forEach((task, definitionIndex) => {
        const existing = existingTasks.get(task.taskId);
        batch.set(planRef.collection("tasks").doc(task.taskId), {
          ...task,
          activeRevisionId: version.revision.revisionId,
          definitionChunkId: chunk.chunkId,
          definitionIndex,
          firstRevisionId: existing
            ? existing.firstRevisionId
            : version.revision.revisionId,
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now,
        });
      });
      definitions.sessions.forEach((session, definitionIndex) => {
        const existing = existingSessions.get(session.sessionId);
        batch.set(planRef.collection("sessions").doc(session.sessionId), {
          ...session,
          activeRevisionId: version.revision.revisionId,
          definitionChunkId: chunk.chunkId,
          definitionIndex,
          firstRevisionId: existing
            ? existing.firstRevisionId
            : version.revision.revisionId,
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now,
        });
      });
    });
  }

  async function ensurePlanModel(
    profile,
    requestedReason,
    uid,
    generation,
    retryCount = 0,
  ) {
    if (
      !window.PathCore ||
      !uid ||
      generation !== authGeneration ||
      currentUser?.uid !== uid
    ) {
      return null;
    }
    const cleanProfile = normalizeProfile(profile);
    const roadmap = roadmapForProfile(cleanProfile);
    const snapshot = window.PathCore.buildPlanSnapshot({
      careerGoalKey: cleanProfile.careerGoalKey,
      cloud: cleanProfile.cloud,
      templateId: roadmap.templateId,
      templateVersion: 1,
      tracker: roadmap.tracker,
    });
    const userRef = db.collection("users").doc(uid);
    const planRef = userRef.collection("plans").doc(snapshot.planId);
    const settingsRef = userRef.collection("settings").doc("main");
    const progressRef = userRef.collection("taskProgress").doc("main");
    const [planSnap, legacySnap, settingsSnap, progressSnap, tasksSnap, sessionsSnap] = await Promise.all([
      planRef.get(),
      userRef.collection("plans").doc("active").get(),
      settingsRef.get(),
      progressRef.get(),
      planRef.collection("tasks").get(),
      planRef.collection("sessions").get(),
    ]);
    if (generation !== authGeneration || currentUser?.uid !== uid) return null;
    const localProgress = normalizeProgress(window.CloudBridge.localData());
    const storedProgress = progressSnap.exists
      ? normalizeProgress(progressSnap.data())
      : localProgress;
    const weekTarget = settingsSnap.exists
      ? clampInt(settingsSnap.data().weekTarget, 10, 10000, localProgress.weekTarget)
      : localProgress.weekTarget;
    const plannerVersion = settingsSnap.exists
      ? clampInt(settingsSnap.data().plannerVersion, 0, 1000000, 0)
      : 0;

    const storedPlan = planSnap.exists ? planSnap.data() : null;
    const preserveRollback = storedPlan
      && storedPlan.migrationSource === "rollback"
      && requestedReason !== "profile-change";
    if (storedPlan && (storedPlan.sourceHash === snapshot.sourceHash || preserveRollback)) {
      await settingsRef.set({
        weekTarget,
        activePlanId: snapshot.planId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      if (generation === authGeneration && currentUser?.uid === uid) {
        announcePlan(snapshot.planId);
      }
      return snapshot.planId;
    }

    const previousPlan = storedPlan;
    const hasLegacyPointer = legacySnap.exists
      && !(settingsSnap.exists && settingsSnap.data().activePlanId);
    const reason = previousPlan
      ? "template-update"
      : hasLegacyPointer
        ? "legacy-migration"
        : requestedReason === "profile-change"
          ? "initial-generation"
          : requestedReason;
    const migrationSource = previousPlan
      ? "template-update"
      : hasLegacyPointer
        ? "legacy-active"
        : "new-plan";
    const existingTasks = new Map(
      tasksSnap.docs.map((item) => [item.id, item.data()]),
    );
    const existingSessions = new Map(
      sessionsSnap.docs.map((item) => [item.id, item.data()]),
    );
    const revisionSnapshot = window.PathCore.preserveSessionState(
      snapshot,
      existingSessions,
    );
    const version = window.PathCore.createPlanRevision(
      revisionSnapshot,
      previousPlan,
      storedProgress.done,
      reason,
    );
    const now = firebase.firestore.FieldValue.serverTimestamp();
    if (generation !== authGeneration || currentUser?.uid !== uid) return null;
    try {
      await db.runTransaction(async (transaction) => {
        const currentSettingsSnap = await transaction.get(settingsRef);
        const currentPlanSnap = await transaction.get(planRef);
        const currentPlannerVersion = currentSettingsSnap.exists
          ? clampInt(
              currentSettingsSnap.data().plannerVersion,
              0,
              1000000,
              0,
            )
          : 0;
        const currentPlan = currentPlanSnap.exists
          ? currentPlanSnap.data()
          : null;
        const planChanged = previousPlan
          ? !currentPlan ||
            currentPlan.activeRevisionId !== previousPlan.activeRevisionId ||
            currentPlan.latestRevisionNumber !==
              previousPlan.latestRevisionNumber ||
            currentPlan.sourceHash !== previousPlan.sourceHash
          : currentPlan !== null;
        if (currentPlannerVersion !== plannerVersion || planChanged) {
          const conflict = new Error("Plan activation changed during preparation.");
          conflict.code = "pathpilot/activation-conflict";
          throw conflict;
        }

        transaction.set(planRef, {
          ...version.plan,
          migrationSource,
          createdAt:
            previousPlan && previousPlan.createdAt
              ? previousPlan.createdAt
              : now,
          updatedAt: now,
        });
        writeRevisionChunks(transaction, planRef, version, now);
        writeMaterializedPlan(
          transaction,
          planRef,
          version,
          existingTasks,
          existingSessions,
          now,
        );
        transaction.set(
          settingsRef,
          {
            weekTarget,
            activePlanId: snapshot.planId,
            updatedAt: now,
          },
          { merge: true },
        );
      });
    } catch (error) {
      if (
        error.code === "pathpilot/activation-conflict" &&
        retryCount < 2 &&
        generation === authGeneration &&
        currentUser?.uid === uid
      ) {
        return ensurePlanModel(
          profile,
          requestedReason,
          uid,
          generation,
          retryCount + 1,
        );
      }
      throw error;
    }
    if (generation === authGeneration && currentUser?.uid === uid) {
      announcePlan(snapshot.planId);
    }
    return snapshot.planId;
  }

  async function rollbackPlan(revisionId) {
    if (!currentUser || !window.PathCore) throw new Error("Sign in before restoring a plan.");
    const userRef = db.collection("users").doc(currentUser.uid);
    const settingsSnap = await userRef.collection("settings").doc("main").get();
    const planId = settingsSnap.exists ? settingsSnap.data().activePlanId : null;
    if (!planId) throw new Error("No active plan is available.");
    const planRef = userRef.collection("plans").doc(planId);
    const targetRef = planRef.collection("revisions").doc(revisionId);
    const [
      planSnap,
      targetSnap,
      targetChunksSnap,
      progressSnap,
      tasksSnap,
      sessionsSnap,
    ] = await Promise.all([
      planRef.get(),
      targetRef.get(),
      targetRef.collection("chunks").orderBy("ordinal").get(),
      userRef.collection("taskProgress").doc("main").get(),
      planRef.collection("tasks").get(),
      planRef.collection("sessions").get(),
    ]);
    if (!planSnap.exists || !targetSnap.exists) throw new Error("Plan revision not found.");
    const completedIds = progressSnap.exists
      ? normalizeProgress(progressSnap.data()).done
      : normalizeProgress(window.CloudBridge.localData()).done;
    const version = window.PathCore.createRollbackRevision(
      planSnap.data(),
      targetSnap.data(),
      targetChunksSnap.docs.map((item) => item.data()),
      completedIds,
    );
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(planRef, {
      schemaVersion: version.plan.schemaVersion,
      planId: version.plan.planId,
      templateId: version.plan.templateId,
      templateVersion: version.plan.templateVersion,
      careerGoalKey: version.plan.careerGoalKey,
      cloud: version.plan.cloud,
      activeRevisionId: version.plan.activeRevisionId,
      latestRevisionNumber: version.plan.latestRevisionNumber,
      status: version.plan.status,
      sourceHash: version.plan.sourceHash,
      migrationSource: "rollback",
      createdAt: planSnap.data().createdAt,
      updatedAt: now,
    });
    const existingTasks = new Map(tasksSnap.docs.map((item) => [item.id, item.data()]));
    const existingSessions = new Map(sessionsSnap.docs.map((item) => [item.id, item.data()]));
    writeRevisionChunks(batch, planRef, version, now);
    writeMaterializedPlan(
      batch,
      planRef,
      version,
      existingTasks,
      existingSessions,
      now,
    );
    await batch.commit();
    announcePlan(version.plan.planId);
    return version.revision.revisionId;
  }

  async function plannerWorkspace() {
    if (!currentUser) throw new Error("Sign in to open your planner.");
    const userRef = db.collection("users").doc(currentUser.uid);
    const settingsSnap = await userRef.collection("settings").doc("main").get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const planId = settings.activePlanId;
    if (!planId) throw new Error("Generate your roadmap before opening the planner.");
    const planRef = userRef.collection("plans").doc(planId);
    const [planSnap, tasksSnap, sessionsSnap, progressSnap] = await Promise.all([
      planRef.get(),
      planRef.collection("tasks").orderBy("order").get(),
      planRef.collection("sessions").get(),
      userRef.collection("taskProgress").doc("main").get(),
    ]);
    if (!planSnap.exists) throw new Error("The active plan could not be loaded.");
    const plan = planSnap.data();
    return {
      plan,
      tasks: tasksSnap.docs
        .map((item) => item.data())
        .filter((task) => task.activeRevisionId === plan.activeRevisionId),
      sessions: sessionsSnap.docs
        .map((item) => item.data())
        .filter((session) => session.activeRevisionId === plan.activeRevisionId),
      completedTaskIds: progressSnap.exists
        ? normalizeProgress(progressSnap.data()).done
        : [],
      preferences: settings.planner || null,
      plannerVersion: clampInt(settings.plannerVersion, 0, 1000000, 0),
    };
  }

  async function savePlannerSchedule({
    planId,
    activeRevisionId,
    preferences,
    sessions,
    plannerVersion = 0,
  }) {
    if (!currentUser) throw new Error("Sign in to save your schedule.");
    if (!planId || !activeRevisionId) {
      throw new Error("The active plan revision is required.");
    }
    if (!Array.isArray(sessions) || sessions.length > 72) {
      throw new RangeError("A schedule can contain at most 72 sessions.");
    }
    if (!Number.isInteger(plannerVersion) || plannerVersion < 0) {
      throw new RangeError("The planner version is invalid.");
    }
    const planner = window.PathCore.normalizePlannerPreferences(
      preferences,
      new Date().toISOString().slice(0, 10),
    );
    const uid = currentUser.uid;
    const userRef = db.collection("users").doc(uid);
    const settingsRef = userRef.collection("settings").doc("main");
    const planRef = userRef.collection("plans").doc(planId);
    await db.runTransaction(async (transaction) => {
      const settingsSnap = await transaction.get(settingsRef);
      const planSnap = await transaction.get(planRef);
      const activePlanId = settingsSnap.exists
        ? settingsSnap.data().activePlanId
        : null;
      const currentPlannerVersion = settingsSnap.exists
        ? clampInt(settingsSnap.data().plannerVersion, 0, 1000000, 0)
        : 0;
      if (activePlanId !== planId || !planSnap.exists) {
        throw new Error("The active plan changed. Refresh the planner.");
      }
      if (planSnap.data().activeRevisionId !== activeRevisionId) {
        throw new Error("The active plan revision changed. Refresh the planner.");
      }
      if (currentPlannerVersion !== plannerVersion) {
        throw new Error(
          "This schedule changed in another tab. Refresh the planner before saving.",
        );
      }
      transaction.set(
        settingsRef,
        {
          planner,
          plannerVersion: currentPlannerVersion + 1,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      sessions.forEach((session) => {
        transaction.update(planRef.collection("sessions").doc(session.sessionId), {
          status: session.status,
          locked: session.locked,
          scheduledDate: session.scheduledDate,
          startMin: session.startMin,
          durationMin: session.durationMin,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
    });
    return { planner, plannerVersion: plannerVersion + 1 };
  }

  window.PathPlan = {
    ensure: (profile) => queuePlanWrite(profile, "profile-change"),
    rollback: rollbackPlan,
    saveSchedule: savePlannerSchedule,
    workspace: plannerWorkspace,
    async revisions() {
      if (!currentUser) return [];
      const settings = await db.collection("users").doc(currentUser.uid)
        .collection("settings").doc("main").get();
      const planId = settings.exists ? settings.data().activePlanId : null;
      if (!planId) return [];
      const snap = await db.collection("users").doc(currentUser.uid)
        .collection("plans").doc(planId).collection("revisions")
        .orderBy("revisionNumber", "desc").get();
      return snap.docs.map((item) => item.data());
    },
  };

  async function ensureUserRecord(user) {
    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    if (!snap.exists) {
      await userRef.set({
        uid: user.uid,
        email: user.email || `${user.uid}@pathpilot.invalid`,
        role: "user",
        mentorIds: [],
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    const old = snap.data();
    if (old.profile || old.progress || !old.uid || !Array.isArray(old.mentorIds)) {
      const batch = db.batch();
      const normalizedProfile = old.profile ? normalizeProfile(old.profile) : null;
      const normalizedProgress = normalizeProgress(old.progress);
      batch.set(userRef, {
        uid: user.uid,
        email: user.email || old.email || `${user.uid}@pathpilot.invalid`,
        role: ["user", "mentor", "admin"].includes(old.role) ? old.role : "user",
        mentorIds: Array.isArray(old.mentorIds) ? old.mentorIds.slice(0, 50) : [],
        createdAt: old.createdAt || now,
        updatedAt: now,
      });
      if (normalizedProfile) {
        batch.set(userRef.collection("profiles").doc("main"), { ...normalizedProfile, updatedAt: now });
      }
      batch.set(userRef.collection("taskProgress").doc("main"), {
        done: normalizedProgress.done,
        streak: normalizedProgress.streak,
        log: normalizedProgress.log,
        celebrated: normalizedProgress.celebrated,
        updatedAt: now,
      });
      batch.set(userRef.collection("settings").doc("main"), {
        weekTarget: normalizedProgress.weekTarget,
        updatedAt: now,
      });
      await batch.commit();
      return;
    }

    await userRef.update({ email: user.email || old.email, updatedAt: now });
  }

  let profileApplied = false;
  function watch(uid, generation) {
    unsubs.forEach((unsubscribe) => unsubscribe());
    unsubs = [];
    profileApplied = false;
    let progress = null;
    let weekTarget = 150;
    const userRef = db.collection("users").doc(uid);
    const isActive = () =>
      generation === authGeneration && currentUser?.uid === uid;
    unsubs.push(userRef.onSnapshot(
      (snap) => {
        if (!isActive() || !snap.exists) return;
        const data = snap.data();
        currentRole = data.role || "user";
        if (window.AdminPanel) window.AdminPanel.refreshAccess();
      },
      (err) => console.warn("User snapshot error:", err.message)
    ));
    unsubs.push(userRef.collection("profiles").doc("main").onSnapshot(
      (snap) => {
        if (!isActive()) return;
        if (snap.exists && window.PathProfile) {
          const data = { ...snap.data() };
          delete data.updatedAt;
          window.PathProfile.apply(data, { save: false });
          profileApplied = true;
          queuePlanWrite(data, "legacy-migration", uid, generation)
            .catch((err) => console.warn("Plan migration failed:", err.message));
        } else if (!profileApplied && window.Onboarding) {
          window.Onboarding.open(null, { first: true });
        }
      },
      (err) => console.warn("Profile snapshot error:", err.message)
    ));
    const applyProgress = () => {
      if (!isActive() || !progress) return;
      const combined = { ...progress, weekTarget };
      delete combined.updatedAt;
      if (JSON.stringify(combined) !== JSON.stringify(window.CloudBridge.localData())) {
        window.CloudBridge.applyRemote(combined);
      }
    };
    unsubs.push(userRef.collection("taskProgress").doc("main").onSnapshot(
      (snap) => {
        if (!isActive()) return;
        if (snap.exists) { progress = snap.data(); applyProgress(); }
        else window.Cloud.save(window.CloudBridge.localData());
      },
      (err) => console.warn("Progress snapshot error:", err.message)
    ));
    unsubs.push(userRef.collection("settings").doc("main").onSnapshot(
      (snap) => {
        if (!isActive()) return;
        if (snap.exists) weekTarget = snap.data().weekTarget || 150;
        applyProgress();
      },
      (err) => console.warn("Settings snapshot error:", err.message)
    ));
  }

  auth.onAuthStateChanged(async (user) => {
    const generation = ++authGeneration;
    const previousUid = currentUser?.uid || null;
    const nextUid = user?.uid || null;
    unsubs.forEach((unsubscribe) => unsubscribe());
    unsubs = [];
    currentUser = user;
    if (previousUid !== nextUid) {
      window.dispatchEvent(
        new CustomEvent("pathpilot:account-changed", {
          detail: { uid: nextUid },
        }),
      );
    }
    if (user) {
      try {
        await ensureUserRecord(user);
        if (
          generation !== authGeneration ||
          currentUser?.uid !== user.uid
        ) {
          return;
        }
        setChip(user.email);
        hideOverlay();
        watch(user.uid, generation);
        if (window.AdminPanel) window.AdminPanel.refreshAccess();
      } catch (error) {
        if (
          generation !== authGeneration ||
          currentUser?.uid !== user.uid
        ) {
          return;
        }
        console.warn("Account setup failed:", error.message);
        showError("Could not load your PathPilot data. Please try again.");
        showOverlay();
      }
    } else {
      currentRole = "user";
      window.CloudBridge.applyRemote(null); // clear UI for the next user
      if (window.PathProfile) window.PathProfile.apply(null); // clear personalization
      if (window.Onboarding) window.Onboarding.close();
      if (window.AdminPanel) window.AdminPanel.refreshAccess();
      window.dispatchEvent(new CustomEvent("pathpilot:signed-out"));
      setChip(null);
      showOverlay();
    }
  });

  /* -------- UI helpers -------- */
  function showOverlay() { const o = $("authOverlay"); if (o) { o.classList.add("show"); document.body.style.overflow = "hidden"; const f = $("googleBtn") || $("authEmail"); if (f) setTimeout(() => f.focus(), 50); } }
  function hideOverlay() { const o = $("authOverlay"); if (o) { o.classList.remove("show"); document.body.style.overflow = ""; } }

  function setChip(email) {
    const chip = $("userChip");
    if (!chip) return;
    if (email) {
      const safe = String(email).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      chip.innerHTML =
        `<span class="uc-dot"></span>` +
        `<span class="uc-email" title="${safe}">${safe}</span>` +
        `<button class="uc-logout" id="logoutBtn" title="Log out" aria-label="Log out">⏻</button>`;
      const lb = $("logoutBtn");
      if (lb) lb.onclick = () => auth.signOut();
    } else {
      chip.innerHTML = `<span class="uc-dot signed-out"></span><span class="uc-email">Signed out</span>`;
    }
  }

  function showError(msg) { const e = $("authError"); if (e) e.textContent = msg || ""; }
  function mapError(code) {
    return {
      "auth/invalid-email": "Enter a valid email address.",
      "auth/missing-password": "Enter your password.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/email-already-in-use": "That email already has an account — try logging in.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/wrong-password": "Incorrect email or password.",
      "auth/user-not-found": "No account with that email — sign up first.",
      "auth/network-request-failed": "Network error — check your connection.",
      "auth/operation-not-allowed": "This sign-in method isn't enabled in Firebase yet.",
      "auth/unauthorized-domain": "This domain isn't authorized in Firebase Auth settings.",
      "auth/popup-blocked": "Popup blocked — allow popups and try again.",
      "auth/too-many-requests": "Too many attempts. Please try again shortly.",
    }[code] || "Something went wrong. Please try again.";
  }

  function wireForm() {
    const email = $("authEmail"), pass = $("authPass"), submit = $("authSubmit");
    if (!submit) return;
    const tabs = document.querySelectorAll(".auth-tab");
    let mode = "login";

    // Google sign-in
    const googleBtn = $("googleBtn");
    if (googleBtn) {
      googleBtn.addEventListener("click", async () => {
        showError("");
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
          await auth.signInWithPopup(provider);
        } catch (ex) {
          // Popups can be blocked (or unavailable on file://) — fall back to redirect.
          if (ex.code === "auth/popup-blocked" || ex.code === "auth/operation-not-supported-in-this-environment" || ex.code === "auth/cancelled-popup-request") {
            try { await auth.signInWithRedirect(provider); return; } catch (e2) { showError(mapError(e2.code)); return; }
          }
          if (ex.code !== "auth/popup-closed-by-user") showError(mapError(ex.code));
        }
      });
    }

    tabs.forEach((t) =>
      t.addEventListener("click", () => {
        mode = t.dataset.mode;
        tabs.forEach((x) => x.classList.toggle("active", x === t));
        submit.textContent = mode === "login" ? "Log in" : "Create account";
        pass.setAttribute("autocomplete", mode === "login" ? "current-password" : "new-password");
        showError("");
      })
    );

    async function go() {
      showError("");
      const e = email.value.trim(), p = pass.value;
      if (!e || !p) { showError("Enter your email and password."); return; }
      submit.disabled = true;
      const original = submit.textContent;
      submit.textContent = "Please wait…";
      try {
        if (mode === "login") await auth.signInWithEmailAndPassword(e, p);
        else await auth.createUserWithEmailAndPassword(e, p);
        pass.value = "";
      } catch (ex) {
        showError(mapError(ex.code));
      } finally {
        submit.disabled = false;
        submit.textContent = original;
      }
    }

    submit.addEventListener("click", go);
    [email, pass].forEach((el) =>
      el.addEventListener("keydown", (ev) => { if (ev.key === "Enter") go(); })
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireForm);
  else wireForm();
})();
