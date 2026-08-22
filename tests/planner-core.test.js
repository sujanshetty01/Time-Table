const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildSchedule, computeProgress } = require("../js/planner-core");

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
