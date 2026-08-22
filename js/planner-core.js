(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PathCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function shortRange(startMin, endMin) {
    const format = (value) => {
      const hours = Math.floor(value / 60) % 24;
      const minutes = value % 60;
      return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`;
    };
    return `${format(startMin)}–${format(endMin)}`;
  }

  function allocateDurations(templates, totalMinutes) {
    const minimum = 10;
    if (totalMinutes < templates.length * minimum) {
      throw new RangeError(
        `Learning window must be at least ${templates.length * minimum} minutes.`,
      );
    }

    const weights = templates.map((template) => {
      const parsed = Number.parseInt(template.dur, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });
    const durations = Array(templates.length).fill(0);
    let remaining = totalMinutes;
    let active = templates.map((_, index) => index);

    while (active.length) {
      const weightTotal = active.reduce(
        (sum, index) => sum + weights[index],
        0,
      );
      const constrained = active.filter(
        (index) => (remaining * weights[index]) / weightTotal < minimum,
      );
      if (constrained.length) {
        constrained.forEach((index) => {
          durations[index] = minimum;
          remaining -= minimum;
        });
        active = active.filter((index) => !constrained.includes(index));
        continue;
      }

      const exact = active.map(
        (index) => (remaining * weights[index]) / weightTotal,
      );
      active.forEach((index, position) => {
        durations[index] = Math.floor(exact[position]);
      });
      let remainder =
        remaining - active.reduce((sum, index) => sum + durations[index], 0);
      active
        .map((index, position) => ({ index, fraction: exact[position] % 1 }))
        .sort(
          (left, right) =>
            right.fraction - left.fraction || left.index - right.index,
        )
        .forEach(({ index }) => {
          if (remainder > 0) {
            durations[index] += 1;
            remainder -= 1;
          }
        });
      break;
    }

    return durations;
  }

  function buildSchedule(templates, startMin, endMin) {
    if (!Array.isArray(templates) || templates.length === 0) return [];
    if (
      !Number.isInteger(startMin) ||
      !Number.isInteger(endMin) ||
      endMin <= startMin
    ) {
      throw new TypeError(
        "Learning window must use increasing integer minute values.",
      );
    }

    const durations = allocateDurations(templates, endMin - startMin);
    let cursor = startMin;
    return templates.map((template, index) => {
      const blockStart = cursor;
      const blockEnd = blockStart + durations[index];
      cursor = blockEnd;
      return {
        ...template,
        startMin: blockStart,
        endMin: blockEnd,
        time: shortRange(blockStart, blockEnd),
        dur: `${durations[index]} min`,
      };
    });
  }

  function computeProgress(phases, completedIds, xpPerTask) {
    const completed =
      completedIds instanceof Set ? completedIds : new Set(completedIds || []);
    const tasks = phases.flatMap((phase) => phase.tasks);
    const activeIds = new Set(tasks.map((task) => task.id));
    const done = [...completed].filter((id) => activeIds.has(id)).length;
    const total = tasks.length;
    const phase = {};
    phases.forEach((item) => {
      const phaseDone = item.tasks.filter((task) =>
        completed.has(task.id),
      ).length;
      phase[item.id] =
        item.tasks.length > 0 && phaseDone === item.tasks.length ? 1 : 0;
    });
    return {
      done,
      xp: done * xpPerTask,
      pct: total ? Math.round((done / total) * 100) : 0,
      phase,
    };
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function estimateTaskMinutes(label) {
    if (label.startsWith("📘")) return 60;
    if (label.startsWith("📦")) return 90;
    return 45;
  }

  function validateDependencyGraph(tasks) {
    const taskIds = new Set(tasks.map((task) => task.taskId));
    if (taskIds.size !== tasks.length) {
      throw new Error("Plan tasks must have unique IDs.");
    }

    const visiting = new Set();
    const visited = new Set();
    const byId = new Map(tasks.map((task) => [task.taskId, task]));

    function visit(taskId) {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId))
        throw new Error("Plan dependencies must not contain cycles.");
      visiting.add(taskId);
      const task = byId.get(taskId);
      task.dependencyIds.forEach((dependencyId) => {
        if (!taskIds.has(dependencyId)) {
          throw new Error(`Unknown dependency: ${dependencyId}`);
        }
        visit(dependencyId);
      });
      visiting.delete(taskId);
      visited.add(taskId);
    }

    tasks.forEach((task) => visit(task.taskId));
    return true;
  }

  function buildPlanSnapshot({
    careerGoalKey,
    cloud,
    templateId = `${careerGoalKey}:${cloud || "General"}`,
    templateVersion = 1,
    tracker,
  }) {
    if (!careerGoalKey || !Array.isArray(tracker) || tracker.length === 0) {
      throw new TypeError("A goal and non-empty tracker are required.");
    }

    const planId = `plan-${slug(careerGoalKey)}-${slug(cloud || "general")}`;
    const tasks = [];
    let previousTaskId = null;

    tracker.forEach((phase) => {
      phase.tasks.forEach((task) => {
        const taskId = String(task.id);
        const dependencyIds = Array.isArray(task.dependencyIds)
          ? [...new Set(task.dependencyIds.map(String))]
          : previousTaskId
            ? [previousTaskId]
            : [];
        tasks.push({
          taskId,
          templateTaskId: String(task.templateTaskId || taskId),
          title: String(task.label),
          phaseId: String(phase.id),
          phaseTitle: String(phase.title),
          order: tasks.length,
          dependencyIds,
          estimatedMinutes: estimateTaskMinutes(String(task.label)),
        });
        previousTaskId = taskId;
      });
    });

    validateDependencyGraph(tasks);
    const sessions = tasks.map((task) => ({
      sessionId: `${task.taskId}::1`,
      taskId: task.taskId,
      ordinal: 1,
      status: "unscheduled",
      locked: false,
      scheduledDate: null,
      startMin: null,
      durationMin: task.estimatedMinutes,
    }));
    const sourceHash = hashString(
      JSON.stringify({ templateId, templateVersion, tasks, sessions }),
    );

    return {
      schemaVersion: 2,
      planId,
      templateId,
      templateVersion,
      careerGoalKey,
      cloud: cloud || "General",
      sourceHash,
      tasks,
      sessions,
    };
  }

  function nextRevisionId(revisionNumber) {
    return `rev-${String(revisionNumber).padStart(6, "0")}`;
  }

  function preserveSessionState(snapshot, sessionStateById) {
    const existing =
      sessionStateById instanceof Map
        ? sessionStateById
        : new Map(
            (sessionStateById || []).map((session) => [
              session.sessionId,
              session,
            ]),
          );
    return {
      ...snapshot,
      sessions: snapshot.sessions.map((session) => {
        const state = existing.get(session.sessionId);
        return state && state.taskId === session.taskId
          ? {
              ...session,
              status: state.status,
              locked: state.locked,
              scheduledDate: state.scheduledDate,
              startMin: state.startMin,
              durationMin: state.durationMin,
            }
          : { ...session };
      }),
    };
  }

  function buildRevisionChunks(snapshot, revisionId) {
    const chunkSize = 8;
    const chunkCount = 9;
    if (snapshot.tasks.length > chunkSize * chunkCount) {
      throw new RangeError("Plan exceeds the revision task limit.");
    }
    return Array.from({ length: chunkCount }, (_, ordinal) => {
      const start = ordinal * chunkSize;
      const tasks = snapshot.tasks
        .slice(start, start + chunkSize)
        .map((task) => ({
          ...task,
          dependencyIds: [...task.dependencyIds],
        }));
      const sessions = snapshot.sessions
        .slice(start, start + chunkSize)
        .map((session) => ({ ...session }));
      return {
        planId: snapshot.planId,
        revisionId,
        chunkId: `chunk-${String(ordinal).padStart(3, "0")}`,
        ordinal,
        sourceHash: snapshot.sourceHash,
        taskIds: tasks.map((task) => task.taskId),
        templateTaskIds: tasks.map((task) => task.templateTaskId),
        titles: tasks.map((task) => task.title),
        phaseIds: tasks.map((task) => task.phaseId),
        phaseTitles: tasks.map((task) => task.phaseTitle),
        dependencyIds: tasks.map((task) => task.dependencyIds[0] || null),
        estimatedMinutes: tasks.map((task) => task.estimatedMinutes),
        sessionIds: sessions.map((session) => session.sessionId),
        statuses: sessions.map((session) => session.status),
        locks: sessions.map((session) => session.locked),
        scheduledDates: sessions.map((session) => session.scheduledDate),
        startMinutes: sessions.map((session) => session.startMin),
        durationMinutes: sessions.map((session) => session.durationMin),
      };
    });
  }

  function expandRevisionChunk(chunk) {
    const tasks = chunk.taskIds.map((taskId, index) => ({
      taskId,
      templateTaskId: chunk.templateTaskIds[index],
      title: chunk.titles[index],
      phaseId: chunk.phaseIds[index],
      phaseTitle: chunk.phaseTitles[index],
      order: chunk.ordinal * 8 + index,
      dependencyIds:
        chunk.dependencyIds[index] === null ? [] : [chunk.dependencyIds[index]],
      estimatedMinutes: chunk.estimatedMinutes[index],
    }));
    const sessions = chunk.sessionIds.map((sessionId, index) => ({
      sessionId,
      taskId: chunk.taskIds[index],
      ordinal: 1,
      status: chunk.statuses[index],
      locked: chunk.locks[index],
      scheduledDate: chunk.scheduledDates[index],
      startMin: chunk.startMinutes[index],
      durationMin: chunk.durationMinutes[index],
    }));
    return { tasks, sessions };
  }

  function createPlanRevision(
    snapshot,
    previousPlan,
    completedIds,
    reason = "initial-generation",
  ) {
    const prior =
      previousPlan && previousPlan.planId === snapshot.planId
        ? previousPlan
        : null;
    const revisionNumber = prior ? prior.latestRevisionNumber + 1 : 1;
    const revisionId = nextRevisionId(revisionNumber);
    const completed =
      completedIds instanceof Set ? completedIds : new Set(completedIds || []);
    const chunks = buildRevisionChunks(snapshot, revisionId);

    return {
      plan: {
        schemaVersion: snapshot.schemaVersion,
        planId: snapshot.planId,
        templateId: snapshot.templateId,
        templateVersion: snapshot.templateVersion,
        careerGoalKey: snapshot.careerGoalKey,
        cloud: snapshot.cloud,
        activeRevisionId: revisionId,
        latestRevisionNumber: revisionNumber,
        status: "active",
        sourceHash: snapshot.sourceHash,
      },
      revision: {
        planId: snapshot.planId,
        revisionId,
        revisionNumber,
        previousRevisionId: prior ? prior.activeRevisionId : null,
        restoredRevisionId: null,
        reason,
        templateId: snapshot.templateId,
        templateVersion: snapshot.templateVersion,
        sourceHash: snapshot.sourceHash,
        taskIds: snapshot.tasks.map((task) => task.taskId),
        sessionIds: snapshot.sessions.map((session) => session.sessionId),
        chunkIds: chunks.map((chunk) => chunk.chunkId),
        preservedCompletedTaskIds: snapshot.tasks
          .filter((task) => completed.has(task.taskId))
          .map((task) => task.taskId),
      },
      chunks,
    };
  }

  function createRollbackRevision(
    currentPlan,
    targetRevision,
    targetChunks,
    completedIds,
  ) {
    if (
      !currentPlan ||
      !targetRevision ||
      currentPlan.planId !== targetRevision.planId
    ) {
      throw new Error("Rollback target must belong to the active plan.");
    }
    if (!Array.isArray(targetChunks) || targetChunks.length !== 9) {
      throw new Error("Rollback target does not contain plan definitions.");
    }
    const orderedChunks = [...targetChunks].sort(
      (left, right) => left.ordinal - right.ordinal,
    );
    const expandedChunks = orderedChunks.map(expandRevisionChunk);
    const targetTasks = expandedChunks.flatMap((chunk) => chunk.tasks);
    const targetSessions = expandedChunks.flatMap((chunk) => chunk.sessions);
    if (
      targetTasks.length !== targetRevision.taskIds.length ||
      targetSessions.length !== targetRevision.sessionIds.length ||
      targetTasks.some(
        (task, index) => task.taskId !== targetRevision.taskIds[index],
      ) ||
      targetSessions.some(
        (session, index) =>
          session.sessionId !== targetRevision.sessionIds[index],
      )
    ) {
      throw new Error("Rollback target definitions do not match the revision.");
    }
    validateDependencyGraph(targetTasks);
    const revisionNumber = currentPlan.latestRevisionNumber + 1;
    const revisionId = nextRevisionId(revisionNumber);
    const completed =
      completedIds instanceof Set
        ? completedIds
        : new Set(
            completedIds || targetRevision.preservedCompletedTaskIds || [],
          );
    const chunks = orderedChunks.map((chunk, ordinal) => ({
      ...chunk,
      revisionId,
      chunkId: `chunk-${String(ordinal).padStart(3, "0")}`,
      ordinal,
      taskIds: [...chunk.taskIds],
      templateTaskIds: [...chunk.templateTaskIds],
      titles: [...chunk.titles],
      phaseIds: [...chunk.phaseIds],
      phaseTitles: [...chunk.phaseTitles],
      dependencyIds: [...chunk.dependencyIds],
      estimatedMinutes: [...chunk.estimatedMinutes],
      sessionIds: [...chunk.sessionIds],
      statuses: [...chunk.statuses],
      locks: [...chunk.locks],
      scheduledDates: [...chunk.scheduledDates],
      startMinutes: [...chunk.startMinutes],
      durationMinutes: [...chunk.durationMinutes],
    }));
    return {
      plan: {
        ...currentPlan,
        activeRevisionId: revisionId,
        latestRevisionNumber: revisionNumber,
        templateId: targetRevision.templateId,
        templateVersion: targetRevision.templateVersion,
        sourceHash: targetRevision.sourceHash,
      },
      revision: {
        ...targetRevision,
        revisionId,
        revisionNumber,
        previousRevisionId: currentPlan.activeRevisionId,
        restoredRevisionId: targetRevision.revisionId,
        reason: "rollback",
        chunkIds: chunks.map((chunk) => chunk.chunkId),
        preservedCompletedTaskIds: targetRevision.taskIds.filter((taskId) =>
          completed.has(taskId),
        ),
      },
      chunks,
    };
  }

  return {
    buildPlanSnapshot,
    buildSchedule,
    computeProgress,
    createPlanRevision,
    createRollbackRevision,
    expandRevisionChunk,
    preserveSessionState,
    validateDependencyGraph,
  };
});
