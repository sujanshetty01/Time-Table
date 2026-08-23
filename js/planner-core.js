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

  function parseDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? date
      : null;
  }

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function addDays(value, amount) {
    const date = parseDateKey(value);
    date.setUTCDate(date.getUTCDate() + amount);
    return dateKey(date);
  }

  function mondayKey(value) {
    const date = parseDateKey(value);
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return dateKey(date);
  }

  function normalizePlannerPreferences(preferences, today) {
    const source = preferences || {};
    const startDate = parseDateKey(source.startDate) ? source.startDate : today;
    const fallbackDeadline = addDays(startDate, 83);
    const deadline = parseDateKey(source.deadline)
      ? source.deadline
      : fallbackDeadline;
    if (deadline < startDate) {
      throw new RangeError(
        "The planning deadline must be on or after the start date.",
      );
    }
    const availableDays = [
      ...new Set(
        (Array.isArray(source.availableDays)
          ? source.availableDays
          : [1, 2, 3, 4, 5]
        )
          .map(Number)
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
      ),
    ].sort();
    const startValue = Number(source.startMin);
    const endValue = Number(source.endMin);
    const dailyCapValue = Number(source.dailyCapMinutes);
    const weeklyCapValue = Number(source.weeklyCapMinutes);
    const startMin = Math.max(
      0,
      Math.min(1430, Number.isFinite(startValue) ? startValue : 720),
    );
    const endMin = Math.max(
      startMin + 10,
      Math.min(1440, Number.isFinite(endValue) ? endValue : 900),
    );
    const dailyCapMinutes = Math.max(
      10,
      Math.min(
        endMin - startMin,
        Number.isFinite(dailyCapValue) ? dailyCapValue : 180,
      ),
    );
    const weeklyCapMinutes = Math.max(
      dailyCapMinutes,
      Math.min(10080, Number.isFinite(weeklyCapValue) ? weeklyCapValue : 720),
    );
    return {
      startDate,
      deadline,
      availableDays,
      startMin,
      endMin,
      dailyCapMinutes,
      weeklyCapMinutes,
    };
  }

  function planConstraintSchedule({
    tasks,
    sessions,
    preferences,
    completedTaskIds = [],
    today = dateKey(new Date()),
  }) {
    if (!parseDateKey(today))
      throw new TypeError("A valid planning date is required.");
    const prefs = normalizePlannerPreferences(preferences, today);
    const orderedTasks = Array.isArray(tasks)
      ? [...tasks].sort((a, b) => a.order - b.order)
      : [];
    validateDependencyGraph(orderedTasks);
    const taskById = new Map(orderedTasks.map((task) => [task.taskId, task]));
    const visitedTasks = new Set();
    const taskList = [];
    function appendTask(task) {
      if (visitedTasks.has(task.taskId)) return;
      (task.dependencyIds || []).forEach((dependencyId) =>
        appendTask(taskById.get(dependencyId)),
      );
      visitedTasks.add(task.taskId);
      taskList.push(task);
    }
    orderedTasks.forEach(appendTask);
    const sessionList = Array.isArray(sessions) ? sessions : [];
    const sessionByTask = new Map(
      sessionList.map((session) => [session.taskId, session]),
    );
    const completed = new Set(completedTaskIds);
    const reservations = new Map();
    const weeklyMinutes = new Map();
    const scheduledByTask = new Map();
    const planned = [];
    const conflicts = [];
    const recovery = [];

    function reserve(session) {
      const items = reservations.get(session.scheduledDate) || [];
      items.push({
        startMin: session.startMin,
        endMin: session.startMin + session.durationMin,
        sessionId: session.sessionId,
      });
      items.sort((left, right) => left.startMin - right.startMin);
      reservations.set(session.scheduledDate, items);
      const week = mondayKey(session.scheduledDate);
      weeklyMinutes.set(
        week,
        (weeklyMinutes.get(week) || 0) + session.durationMin,
      );
      scheduledByTask.set(session.taskId, session);
    }

    function totalForDate(value) {
      return (reservations.get(value) || []).reduce(
        (total, item) => total + item.endMin - item.startMin,
        0,
      );
    }

    function availableStart(value, durationMin, minimumStart) {
      if (!prefs.availableDays.includes(parseDateKey(value).getUTCDay()))
        return null;
      if (totalForDate(value) + durationMin > prefs.dailyCapMinutes)
        return null;
      if (
        (weeklyMinutes.get(mondayKey(value)) || 0) + durationMin >
        prefs.weeklyCapMinutes
      ) {
        return null;
      }
      const items = reservations.get(value) || [];
      let candidate = Math.max(prefs.startMin, minimumStart || prefs.startMin);
      for (const item of items) {
        if (candidate + durationMin <= item.startMin) break;
        if (candidate < item.endMin) candidate = item.endMin;
      }
      return candidate + durationMin <= prefs.endMin ? candidate : null;
    }

    sessionList
      .filter(
        (session) =>
          session.locked &&
          !completed.has(session.taskId) &&
          session.status !== "completed",
      )
      .forEach((session) => {
        const validDate = parseDateKey(session.scheduledDate);
        const validTime =
          Number.isInteger(session.startMin) &&
          Number.isInteger(session.durationMin) &&
          session.durationMin >= 10;
        if (!validDate || !validTime) {
          conflicts.push({
            taskId: session.taskId,
            sessionId: session.sessionId,
            code: "locked-without-slot",
            reason: "This session is locked but has no valid date and time.",
          });
          return;
        }
        const locked = {
          ...session,
          status: "scheduled",
          explanation: "Kept here because you locked this session.",
        };
        const endMin = locked.startMin + locked.durationMin;
        const overlaps = (reservations.get(locked.scheduledDate) || []).some(
          (item) => locked.startMin < item.endMin && endMin > item.startMin,
        );
        if (!prefs.availableDays.includes(validDate.getUTCDay())) {
          conflicts.push({
            taskId: session.taskId,
            sessionId: session.sessionId,
            code: "locked-rest-day",
            reason: "This session is locked on a day marked unavailable.",
          });
        }
        if (locked.startMin < prefs.startMin || endMin > prefs.endMin) {
          conflicts.push({
            taskId: session.taskId,
            sessionId: session.sessionId,
            code: "locked-outside-hours",
            reason: "This session is locked outside your available hours.",
          });
        }
        if (overlaps) {
          conflicts.push({
            taskId: session.taskId,
            sessionId: session.sessionId,
            code: "locked-overlap",
            reason: "This locked session overlaps another locked session.",
          });
        }
        reserve(locked);
        planned.push(locked);
        if (totalForDate(locked.scheduledDate) > prefs.dailyCapMinutes) {
          conflicts.push({
            taskId: session.taskId,
            sessionId: session.sessionId,
            code: "locked-daily-cap",
            reason: "Locked sessions exceed the daily workload cap.",
          });
        }
        if (
          (weeklyMinutes.get(mondayKey(locked.scheduledDate)) || 0) >
          prefs.weeklyCapMinutes
        ) {
          conflicts.push({
            taskId: session.taskId,
            sessionId: session.sessionId,
            code: "locked-weekly-cap",
            reason: "Locked sessions exceed the weekly workload cap.",
          });
        }
        if (
          session.scheduledDate < prefs.startDate ||
          session.scheduledDate > prefs.deadline
        ) {
          conflicts.push({
            taskId: session.taskId,
            sessionId: session.sessionId,
            code: "locked-outside-window",
            reason: "A locked session falls outside the planning window.",
          });
        }
      });

    taskList.forEach((task) => {
      const session = sessionByTask.get(task.taskId);
      if (session?.status === "skipped") {
        planned.push({
          ...session,
          locked: false,
          scheduledDate: null,
          startMin: null,
          explanation: "Skipped by you and excluded from this schedule.",
        });
        return;
      }
      if (
        !session ||
        completed.has(task.taskId) ||
        session.status === "completed" ||
        (session.locked && scheduledByTask.has(task.taskId))
      ) {
        return;
      }
      if (session.locked) return;
      const blockedDependency = (task.dependencyIds || []).find(
        (dependencyId) =>
          !completed.has(dependencyId) && !scheduledByTask.has(dependencyId),
      );
      if (blockedDependency) {
        conflicts.push({
          taskId: task.taskId,
          sessionId: session.sessionId,
          code: "dependency-unavailable",
          reason: `Cannot schedule until ${taskById.get(blockedDependency)?.title || blockedDependency} has a slot.`,
        });
        planned.push({
          ...session,
          status: "unscheduled",
          scheduledDate: null,
          startMin: null,
          explanation: "Waiting for a prerequisite session to be scheduled.",
        });
        return;
      }
      const durationMin = Math.max(
        10,
        Number(session.durationMin) || task.estimatedMinutes,
      );
      if (
        durationMin > prefs.dailyCapMinutes ||
        durationMin > prefs.endMin - prefs.startMin
      ) {
        conflicts.push({
          taskId: task.taskId,
          sessionId: session.sessionId,
          code: "session-exceeds-cap",
          reason: `${durationMin} minutes exceeds the available daily workload window.`,
        });
        planned.push({
          ...session,
          status: "unscheduled",
          scheduledDate: null,
          startMin: null,
          explanation: "Increase the daily cap or shorten this session.",
        });
        return;
      }
      const dependencies = (task.dependencyIds || [])
        .map((dependencyId) => scheduledByTask.get(dependencyId))
        .filter(Boolean);
      const dependency = dependencies.reduce((latest, current) => {
        if (!latest || current.scheduledDate > latest.scheduledDate) {
          return current;
        }
        if (
          current.scheduledDate === latest.scheduledDate &&
          current.startMin + current.durationMin >
            latest.startMin + latest.durationMin
        ) {
          return current;
        }
        return latest;
      }, null);
      let candidateDate = [prefs.startDate, today, dependency?.scheduledDate]
        .filter(Boolean)
        .sort()
        .at(-1);
      let startMin = null;
      let attempts = 0;
      const searchLimitDays = 7 * (sessionList.length + 1);
      while (candidateDate <= prefs.deadline && attempts <= searchLimitDays) {
        const minimumStart =
          dependency && dependency.scheduledDate === candidateDate
            ? dependency.startMin + dependency.durationMin
            : prefs.startMin;
        startMin = availableStart(candidateDate, durationMin, minimumStart);
        if (startMin !== null) break;
        candidateDate = addDays(candidateDate, 1);
        attempts += 1;
      }
      if (startMin === null || candidateDate > prefs.deadline) {
        conflicts.push({
          taskId: task.taskId,
          sessionId: session.sessionId,
          code: "deadline-capacity",
          reason: "No available capacity remains before the deadline.",
        });
        planned.push({
          ...session,
          status: "unscheduled",
          scheduledDate: null,
          startMin: null,
          explanation:
            "Add an available day, raise a workload cap, or move the deadline.",
        });
        return;
      }
      const wasMissed =
        parseDateKey(session.scheduledDate) &&
        session.scheduledDate < today &&
        session.status !== "completed";
      const scheduled = {
        ...session,
        status: "scheduled",
        scheduledDate: candidateDate,
        startMin,
        durationMin,
        explanation: wasMissed
          ? `Recovered from ${session.scheduledDate} into the earliest available slot.`
          : `Placed on an available day within your daily and weekly workload caps.`,
      };
      reserve(scheduled);
      planned.push(scheduled);
      if (wasMissed) {
        recovery.push({
          taskId: task.taskId,
          sessionId: session.sessionId,
          fromDate: session.scheduledDate,
          toDate: candidateDate,
          reason: scheduled.explanation,
        });
      }
    });

    planned
      .filter((session) => session.locked && session.status === "scheduled")
      .forEach((session) => {
        const task = taskById.get(session.taskId);
        (task?.dependencyIds || []).forEach((dependencyId) => {
          if (completed.has(dependencyId)) return;
          const dependency = scheduledByTask.get(dependencyId);
          if (!dependency) {
            conflicts.push({
              taskId: session.taskId,
              sessionId: session.sessionId,
              code: "locked-dependency-missing",
              reason:
                "This locked session has a prerequisite without a scheduled slot.",
            });
            return;
          }
          const dependencyFinishesAfterStart =
            dependency.scheduledDate > session.scheduledDate ||
            (dependency.scheduledDate === session.scheduledDate &&
              dependency.startMin + dependency.durationMin > session.startMin);
          if (dependencyFinishesAfterStart) {
            conflicts.push({
              taskId: session.taskId,
              sessionId: session.sessionId,
              code: "locked-dependency-order",
              reason:
                "This locked session starts before its prerequisite finishes.",
            });
          }
        });
      });

    return {
      preferences: prefs,
      sessions: planned,
      conflicts,
      recovery,
      summary: {
        scheduled: planned.filter((session) => session.status === "scheduled")
          .length,
        unscheduled: planned.filter(
          (session) => session.status === "unscheduled",
        ).length,
        locked: planned.filter((session) => session.locked).length,
        totalMinutes: planned
          .filter((session) => session.status === "scheduled")
          .reduce((total, session) => total + session.durationMin, 0),
      },
    };
  }

  function escapeIcs(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\r|\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function foldIcsLine(line) {
    const folded = [];
    let segment = "";
    let octets = 0;
    for (const character of line) {
      const characterOctets = new TextEncoder().encode(character).length;
      if (segment && octets + characterOctets > 75) {
        folded.push(segment);
        segment = ` ${character}`;
        octets = 1 + characterOctets;
      } else {
        segment += character;
        octets += characterOctets;
      }
    }
    folded.push(segment);
    return folded.join("\r\n");
  }

  function icsTime(date, minutes) {
    const dayOffset = Math.floor(minutes / 1440);
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
    const normalizedDate = addDays(date, dayOffset);
    const hours = String(Math.floor(normalizedMinutes / 60)).padStart(2, "0");
    const mins = String(normalizedMinutes % 60).padStart(2, "0");
    return `${normalizedDate.replace(/-/g, "")}T${hours}${mins}00`;
  }

  function buildIcsCalendar({
    sessions,
    tasks,
    calendarName = "PathPilot plan",
    calendarId = calendarName,
    generatedAt = new Date(),
  }) {
    const taskById = new Map((tasks || []).map((task) => [task.taskId, task]));
    const stamp = generatedAt
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const uidNamespace = hashString(String(calendarId || calendarName));
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PathPilot//Constraint Planner//EN",
      "CALSCALE:GREGORIAN",
      `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    ];
    (sessions || [])
      .filter(
        (session) =>
          session.status === "scheduled" &&
          parseDateKey(session.scheduledDate) &&
          Number.isInteger(session.startMin),
      )
      .forEach((session) => {
        const task = taskById.get(session.taskId) || {};
        lines.push(
          "BEGIN:VEVENT",
          `UID:${uidNamespace}-${escapeIcs(session.sessionId)}@pathpilot`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${icsTime(session.scheduledDate, session.startMin)}`,
          `DTEND:${icsTime(session.scheduledDate, session.startMin + session.durationMin)}`,
          `SUMMARY:${escapeIcs(task.title || "Learning session")}`,
          `DESCRIPTION:${escapeIcs(session.explanation || "Scheduled by PathPilot")}`,
          "END:VEVENT",
        );
      });
    lines.push("END:VCALENDAR");
    return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
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
    buildIcsCalendar,
    computeProgress,
    createPlanRevision,
    createRollbackRevision,
    expandRevisionChunk,
    normalizePlannerPreferences,
    planConstraintSchedule,
    preserveSessionState,
    validateDependencyGraph,
  };
});
