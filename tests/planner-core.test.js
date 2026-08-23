const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
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
} = require("../js/planner-core");

const templates = [
  { title: "Learn", dur: "60 min" },
  { title: "Practice", dur: "60 min" },
  { title: "Document", dur: "30 min" },
  { title: "Review", dur: "30 min" },
];

describe("buildSchedule", () => {
  test("allocates the full window using template weights", () => {
    const result = buildSchedule(templates, 720, 900);

    assert.deepEqual(
      result.map((block) => block.endMin - block.startMin),
      [60, 60, 30, 30],
    );
    assert.equal(result[0].time, "12:00–1:00");
    assert.equal(result.at(-1).endMin, 900);
  });

  test("preserves usable blocks at the minimum supported window", () => {
    const result = buildSchedule(templates, 720, 760);

    assert.deepEqual(
      result.map((block) => block.endMin - block.startMin),
      [10, 10, 10, 10],
    );
    assert.throws(() => buildSchedule(templates, 720, 759), RangeError);
  });
});

describe("computeProgress", () => {
  test("counts only tasks in the active roadmap", () => {
    const phases = [
      { id: "foundation", tasks: [{ id: "active:1" }, { id: "active:2" }] },
      { id: "projects", tasks: [{ id: "active:3" }] },
    ];
    const result = computeProgress(
      phases,
      new Set(["active:1", "active:2", "other:1"]),
      10,
    );

    assert.deepEqual(result, {
      done: 2,
      xp: 20,
      pct: 67,
      phase: { foundation: 1, projects: 0 },
    });
  });
});

describe("versioned plan model", () => {
  const tracker = [
    {
      id: "foundation",
      title: "Foundation",
      tasks: [
        { id: "backend-engineer:p1-0", label: "📘 Study APIs" },
        { id: "backend-engineer:p1-1", label: "Build an API" },
      ],
    },
    {
      id: "delivery",
      title: "Delivery",
      tasks: [{ id: "backend-engineer:p2-0", label: "📦 Ship the service" }],
    },
  ];

  test("builds stable task/session IDs and an acyclic dependency graph", () => {
    const first = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker,
    });
    const second = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker,
    });

    assert.equal(first.planId, "plan-backend-engineer-aws");
    assert.deepEqual(first, second);
    assert.deepEqual(
      first.tasks.map(({ taskId, dependencyIds }) => ({
        taskId,
        dependencyIds,
      })),
      [
        { taskId: "backend-engineer:p1-0", dependencyIds: [] },
        {
          taskId: "backend-engineer:p1-1",
          dependencyIds: ["backend-engineer:p1-0"],
        },
        {
          taskId: "backend-engineer:p2-0",
          dependencyIds: ["backend-engineer:p1-1"],
        },
      ],
    );
    assert.deepEqual(
      first.sessions.map((session) => session.sessionId),
      [
        "backend-engineer:p1-0::1",
        "backend-engineer:p1-1::1",
        "backend-engineer:p2-0::1",
      ],
    );
    assert.equal(validateDependencyGraph(first.tasks), true);
  });

  test("creates an append-only revision while preserving matching progress", () => {
    const snapshot = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker,
    });
    const result = createPlanRevision(
      snapshot,
      null,
      ["backend-engineer:p1-0", "another-goal:p1-0"],
      "legacy-migration",
    );

    assert.equal(result.plan.activeRevisionId, "rev-000001");
    assert.equal(result.revision.reason, "legacy-migration");
    assert.equal(result.chunks.length, 9);
    assert.deepEqual(
      result.chunks.flatMap((chunk) => expandRevisionChunk(chunk).tasks),
      snapshot.tasks,
    );
    assert.deepEqual(
      result.chunks.flatMap((chunk) => expandRevisionChunk(chunk).sessions),
      snapshot.sessions,
    );
    assert.notEqual(result.chunks[0].titles, snapshot.tasks);
    assert.deepEqual(result.revision.preservedCompletedTaskIds, [
      "backend-engineer:p1-0",
    ]);
  });

  test("accepts 72 tasks and rejects a 73rd revision definition", () => {
    const makeSnapshot = (taskCount) =>
      buildPlanSnapshot({
        careerGoalKey: "backend-engineer",
        cloud: "AWS",
        tracker: [
          {
            id: "p1",
            title: "Foundation",
            tasks: Array.from({ length: taskCount }, (_, index) => ({
              id: `backend-engineer:p1-${index}`,
              label: `Task ${index + 1}`,
            })),
          },
        ],
      });

    const maximum = createPlanRevision(makeSnapshot(72), null, []);
    assert.equal(maximum.chunks.length, 9);
    assert.ok(maximum.chunks.every((chunk) => chunk.taskIds.length === 8));
    assert.throws(
      () => createPlanRevision(makeSnapshot(73), null, []),
      /task limit/,
    );
  });

  test("freezes preserved session state for exact rollback restoration", () => {
    const snapshot = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker,
    });
    const session = snapshot.sessions[0];
    const revisionSnapshot = preserveSessionState(snapshot, [
      {
        ...session,
        status: "scheduled",
        locked: true,
        scheduledDate: "2026-09-14",
        startMin: 540,
        durationMin: 75,
      },
    ]);
    const target = createPlanRevision(revisionSnapshot, null, []);
    const frozenSession = expandRevisionChunk(target.chunks[0]).sessions[0];

    assert.deepEqual(frozenSession, revisionSnapshot.sessions[0]);
    assert.equal(snapshot.sessions[0].status, "unscheduled");
    assert.equal(snapshot.sessions[0].locked, false);

    const rollback = createRollbackRevision(
      {
        planId: snapshot.planId,
        activeRevisionId: "rev-000002",
        latestRevisionNumber: 2,
      },
      target.revision,
      target.chunks,
      [],
    );
    assert.deepEqual(
      expandRevisionChunk(rollback.chunks[0]).sessions[0],
      frozenSession,
    );
  });

  test("rolls back by appending a revision instead of rewriting history", () => {
    const snapshot = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker: [
        {
          id: "p1",
          title: "Foundations",
          tasks: [
            {
              id: "backend-engineer:p1-0",
              label: "Original task",
            },
          ],
        },
      ],
    });
    const target = createPlanRevision(snapshot, null, [
      "backend-engineer:p1-0",
    ]);
    const currentPlan = {
      planId: snapshot.planId,
      activeRevisionId: "rev-000002",
      latestRevisionNumber: 2,
      templateId: "backend-engineer:AWS",
      templateVersion: 2,
      sourceHash: "newer",
    };
    const result = createRollbackRevision(
      currentPlan,
      target.revision,
      target.chunks,
      ["backend-engineer:p1-0", "another-goal:p1-0"],
    );

    assert.equal(result.plan.activeRevisionId, "rev-000003");
    assert.equal(result.plan.sourceHash, snapshot.sourceHash);
    assert.equal(result.revision.previousRevisionId, "rev-000002");
    assert.equal(result.revision.restoredRevisionId, "rev-000001");
    assert.equal(result.revision.reason, "rollback");
    assert.deepEqual(result.revision.preservedCompletedTaskIds, [
      "backend-engineer:p1-0",
    ]);
    assert.deepEqual(
      result.chunks.flatMap((chunk) => expandRevisionChunk(chunk).tasks),
      snapshot.tasks,
    );
    assert.notEqual(result.chunks[0].titles, target.chunks[0].titles);
    assert.equal(target.revision.reason, "initial-generation");
  });

  test("rollback keeps historical definitions isolated from later mutations", () => {
    const snapshot = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker,
    });
    const original = createPlanRevision(snapshot, null, []);
    snapshot.tasks[0].title = "Changed title";
    snapshot.tasks[1].dependencyIds = [];
    snapshot.sessions[0].durationMin = 999;

    const result = createRollbackRevision(
      {
        planId: snapshot.planId,
        activeRevisionId: "rev-000002",
        latestRevisionNumber: 2,
      },
      original.revision,
      original.chunks,
      [],
    );

    assert.notEqual(result.chunks[0].titles[0], "Changed title");
    assert.equal(result.chunks[0].dependencyIds[1], "backend-engineer:p1-0");
    assert.notEqual(result.chunks[0].durationMinutes[0], 999);
  });

  test("rejects rollback definitions that do not match revision indexes", () => {
    const snapshot = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker,
    });
    const target = createPlanRevision(snapshot, null, []);
    target.chunks[0].taskIds[0] = "different-task";

    assert.throws(
      () =>
        createRollbackRevision(
          {
            planId: snapshot.planId,
            activeRevisionId: "rev-000002",
            latestRevisionNumber: 2,
          },
          target.revision,
          target.chunks,
          [],
        ),
      /do not match/,
    );
  });

  test("rejects missing and cyclic dependencies", () => {
    assert.throws(
      () =>
        validateDependencyGraph([{ taskId: "a", dependencyIds: ["missing"] }]),
      /Unknown dependency/,
    );
    assert.throws(
      () =>
        validateDependencyGraph([
          { taskId: "a", dependencyIds: ["b"] },
          { taskId: "b", dependencyIds: ["a"] },
        ]),
      /cycles/,
    );
  });
});

describe("constraint planner", () => {
  function planningFixture() {
    const planningTracker = [
      {
        id: "foundation",
        title: "Foundation",
        tasks: [
          { id: "backend-engineer:p1-0", label: "Learn APIs" },
          { id: "backend-engineer:p1-1", label: "Build an API" },
          { id: "backend-engineer:p1-2", label: "Document the API" },
        ],
      },
    ];
    const snapshot = buildPlanSnapshot({
      careerGoalKey: "backend-engineer",
      cloud: "AWS",
      tracker: planningTracker,
    });
    return {
      tasks: snapshot.tasks,
      sessions: snapshot.sessions,
      preferences: {
        startDate: "2026-09-14",
        deadline: "2026-09-21",
        availableDays: [1, 2, 3, 4, 5],
        startMin: 540,
        endMin: 720,
        dailyCapMinutes: 90,
        weeklyCapMinutes: 180,
      },
      today: "2026-09-14",
    };
  }

  test("honors dependencies, rest days, and workload caps", () => {
    const result = planConstraintSchedule(planningFixture());

    assert.deepEqual(
      result.sessions.map(({ scheduledDate, startMin }) => ({
        scheduledDate,
        startMin,
      })),
      [
        { scheduledDate: "2026-09-14", startMin: 540 },
        { scheduledDate: "2026-09-14", startMin: 585 },
        { scheduledDate: "2026-09-15", startMin: 540 },
      ],
    );
    assert.equal(result.conflicts.length, 0);
    assert.equal(result.summary.totalMinutes, 135);
    assert.ok(
      result.sessions.every((session) =>
        session.explanation.includes("workload caps"),
      ),
    );
  });

  test("starts after the latest-finishing prerequisite", () => {
    const fixture = planningFixture();
    fixture.tasks[2] = {
      ...fixture.tasks[2],
      dependencyIds: [fixture.tasks[0].taskId, fixture.tasks[1].taskId],
    };
    fixture.sessions = fixture.sessions.map((session, index) =>
      index < 2
        ? {
            ...session,
            status: "scheduled",
            locked: true,
            scheduledDate: index === 0 ? "2026-09-15" : "2026-09-14",
            startMin: index === 0 ? 585 : 540,
          }
        : session,
    );

    const result = planConstraintSchedule(fixture);
    const dependent = result.sessions.find(
      (session) => session.taskId === fixture.tasks[2].taskId,
    );

    assert.equal(dependent.scheduledDate, "2026-09-15");
    assert.equal(dependent.startMin, 630);
  });

  test("schedules dependencies before dependents regardless of display order", () => {
    const fixture = planningFixture();
    fixture.tasks = [fixture.tasks[1], fixture.tasks[0], fixture.tasks[2]].map(
      (task, order) => ({ ...task, order }),
    );

    const result = planConstraintSchedule(fixture);
    const foundation = result.sessions.find(
      (session) => session.taskId === fixture.tasks[1].taskId,
    );
    const dependent = result.sessions.find(
      (session) => session.taskId === fixture.tasks[0].taskId,
    );

    assert.equal(result.conflicts.length, 0);
    assert.ok(
      foundation.scheduledDate < dependent.scheduledDate ||
        foundation.startMin + foundation.durationMin <= dependent.startMin,
    );
  });

  test("accepts midnight availability and preserves skipped sessions", () => {
    const fixture = planningFixture();
    fixture.preferences = normalizePlannerPreferences(
      {
        ...fixture.preferences,
        startMin: 0,
        endMin: 120,
      },
      fixture.today,
    );
    fixture.sessions[1] = {
      ...fixture.sessions[1],
      status: "skipped",
    };

    const result = planConstraintSchedule(fixture);
    const first = result.sessions.find(
      (session) => session.taskId === fixture.tasks[0].taskId,
    );
    const skipped = result.sessions.find(
      (session) => session.taskId === fixture.tasks[1].taskId,
    );

    assert.equal(result.preferences.startMin, 0);
    assert.equal(first.startMin, 0);
    assert.equal(skipped.status, "skipped");
    assert.equal(skipped.scheduledDate, null);
    assert.deepEqual(
      normalizePlannerPreferences(
        {
          ...fixture.preferences,
          startMin: 1430,
          endMin: 1440,
          dailyCapMinutes: 10,
          weeklyCapMinutes: 10,
        },
        fixture.today,
      ),
      {
        ...fixture.preferences,
        startMin: 1430,
        endMin: 1440,
        dailyCapMinutes: 10,
        weeklyCapMinutes: 10,
      },
    );
  });

  test("preserves manual locks and recovers missed sessions", () => {
    const fixture = planningFixture();
    fixture.sessions = fixture.sessions.map((session, index) =>
      index === 1
        ? {
            ...session,
            status: "scheduled",
            locked: true,
            scheduledDate: "2026-09-16",
            startMin: 600,
          }
        : index === 0
          ? {
              ...session,
              status: "scheduled",
              scheduledDate: "2026-09-10",
              startMin: 540,
            }
          : session,
    );

    const result = planConstraintSchedule(fixture);
    const locked = result.sessions.find((session) => session.locked);

    assert.equal(locked.scheduledDate, "2026-09-16");
    assert.match(locked.explanation, /locked/);
    assert.deepEqual(result.recovery, [
      {
        taskId: fixture.tasks[0].taskId,
        sessionId: fixture.sessions[0].sessionId,
        fromDate: "2026-09-10",
        toDate: "2026-09-14",
        reason: "Recovered from 2026-09-10 into the earliest available slot.",
      },
    ]);
  });

  test("explains constraint violations caused by manual locks", () => {
    const fixture = planningFixture();
    fixture.sessions = fixture.sessions.map((session, index) => ({
      ...session,
      status: "scheduled",
      locked: true,
      scheduledDate: index === 0 ? "2026-09-19" : "2026-09-14",
      startMin: index === 2 ? 600 : 585,
    }));

    const result = planConstraintSchedule(fixture);
    const codes = result.conflicts.map((conflict) => conflict.code);

    assert.ok(codes.includes("locked-rest-day"));
    assert.ok(codes.includes("locked-overlap"));
    assert.ok(codes.includes("locked-dependency-order"));
    assert.equal(result.summary.locked, 3);
  });

  test("explains deadline and oversized-session conflicts", () => {
    const noDays = planningFixture();
    noDays.preferences.availableDays = [];
    const deadlineResult = planConstraintSchedule(noDays);
    assert.equal(deadlineResult.summary.scheduled, 0);
    assert.equal(deadlineResult.conflicts[0].code, "deadline-capacity");
    assert.match(deadlineResult.conflicts[0].reason, /before the deadline/);

    const oversized = planningFixture();
    oversized.sessions[0] = { ...oversized.sessions[0], durationMin: 120 };
    const capResult = planConstraintSchedule(oversized);
    assert.equal(capResult.conflicts[0].code, "session-exceeds-cap");
    assert.match(capResult.conflicts[0].reason, /exceeds/);
  });

  test("uses the full supported horizon for weekly sessions", () => {
    const fixture = planningFixture();
    fixture.tasks = Array.from({ length: 72 }, (_, index) => ({
      taskId: `task-${index}`,
      order: index,
      title: `Task ${index}`,
      phaseTitle: "Long plan",
      dependencyIds: index === 0 ? [] : [`task-${index - 1}`],
      estimatedMinutes: 60,
    }));
    fixture.sessions = fixture.tasks.map((task) => ({
      sessionId: `session-${task.taskId}`,
      taskId: task.taskId,
      status: "pending",
      locked: false,
      scheduledDate: null,
      startMin: null,
      durationMin: 60,
    }));
    fixture.preferences = {
      ...fixture.preferences,
      startDate: "2026-01-05",
      deadline: "2027-06-01",
      availableDays: [1],
      startMin: 540,
      endMin: 600,
      dailyCapMinutes: 60,
      weeklyCapMinutes: 60,
    };
    fixture.today = fixture.preferences.startDate;

    const result = planConstraintSchedule(fixture);

    assert.equal(result.summary.scheduled, 72);
    assert.equal(result.conflicts.length, 0);
    assert.equal(result.sessions.at(-1).scheduledDate, "2027-05-17");
  });

  test("exports only scheduled sessions to an ICS calendar", () => {
    const fixture = planningFixture();
    const result = planConstraintSchedule(fixture);
    const calendar = buildIcsCalendar({
      sessions: result.sessions,
      tasks: fixture.tasks,
      calendarName: "Backend plan",
      generatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    assert.match(calendar, /BEGIN:VCALENDAR\r\nVERSION:2.0/);
    assert.match(calendar, /X-WR-CALNAME:Backend plan/);
    assert.match(calendar, /DTSTART:20260914T090000/);
    assert.match(calendar, /SUMMARY:Learn/);
    assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 3);
    assert.ok(calendar.endsWith("END:VCALENDAR\r\n"));
  });

  test("rolls an ICS end time at midnight into the next date", () => {
    const fixture = planningFixture();
    const calendar = buildIcsCalendar({
      tasks: fixture.tasks,
      sessions: [
        {
          ...fixture.sessions[0],
          status: "scheduled",
          scheduledDate: "2026-09-14",
          startMin: 1380,
          durationMin: 60,
        },
      ],
      generatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    assert.match(calendar, /DTSTART:20260914T230000/);
    assert.match(calendar, /DTEND:20260915T000000/);
    assert.doesNotMatch(calendar, /T240000/);
  });

  test("namespaces, escapes, and folds ICS content", () => {
    const fixture = planningFixture();
    const session = {
      ...fixture.sessions[0],
      status: "scheduled",
      scheduledDate: "2026-09-14",
      startMin: 540,
      explanation: `First line\rSecond line\n${"résumé ".repeat(20)}`,
    };
    const first = buildIcsCalendar({
      tasks: fixture.tasks,
      sessions: [session],
      calendarId: "account-a:plan-a",
      generatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    const second = buildIcsCalendar({
      tasks: fixture.tasks,
      sessions: [session],
      calendarId: "account-b:plan-a",
      generatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    const uid = (calendar) => calendar.match(/^UID:(.+)$/m)[1];

    assert.notEqual(uid(first), uid(second));
    assert.doesNotMatch(first, /account-a/);
    assert.match(first, /DESCRIPTION:First line\\nSecond line\\n/);
    assert.ok(
      first.split("\r\n").every((line) => Buffer.byteLength(line) <= 75),
    );
    assert.match(first, /\r\n /);
    assert.doesNotMatch(first.replaceAll("\r\n", ""), /[\r\n]/);
  });
});
