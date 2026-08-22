const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPlanSnapshot,
  buildSchedule,
  computeProgress,
  createPlanRevision,
  createRollbackRevision,
  expandRevisionChunk,
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
