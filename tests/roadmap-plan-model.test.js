const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPlanSnapshot,
  createPlanRevision,
  validateDependencyGraph,
} = require("../js/planner-core");

function loadRoadmaps() {
  const context = vm.createContext({ window: {} });
  ["data.js", "roadmaps.js"].forEach((file) => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "js", file),
      "utf8",
    );
    vm.runInContext(source, context, { filename: file });
  });
  return context;
}

describe("real roadmap plan contracts", () => {
  const variants = [
    ["cloud-architect", "Azure"],
    ["cloud-architect", "AWS"],
    ["cloud-architect", "GCP"],
    ["ai-engineer", "Azure"],
    ["devops-engineer", "Azure"],
    ["data-engineer", "Azure"],
    ["cybersecurity-engineer", "Azure"],
    ["backend-engineer", "Azure"],
  ];

  for (const [careerGoalKey, cloud] of variants) {
    test(`${careerGoalKey}/${cloud} maps to a valid bounded plan`, () => {
      const context = loadRoadmaps();
      context.setActiveRoadmap(careerGoalKey, cloud);
      const roadmap = context.window.PathRoadmaps.resolve(careerGoalKey, cloud);
      const snapshot = buildPlanSnapshot({
        careerGoalKey,
        cloud,
        templateId: roadmap.templateId,
        tracker: roadmap.tracker,
      });
      const taskIds = snapshot.tasks.map((task) => task.taskId);
      const sessionIds = snapshot.sessions.map((session) => session.sessionId);

      assert.ok(taskIds.length > 0);
      assert.equal(new Set(taskIds).size, taskIds.length);
      assert.equal(new Set(sessionIds).size, sessionIds.length);
      assert.equal(validateDependencyGraph(snapshot.tasks), true);
      const version = createPlanRevision(snapshot, null, []);
      assert.equal(version.chunks.length, 9);
      version.chunks.forEach((chunk) => {
        assert.ok(chunk.taskIds.length <= 8);
        assert.equal(chunk.sessionIds.length, chunk.taskIds.length);
      });
      assert.ok(
        snapshot.tasks.length +
          snapshot.sessions.length +
          version.chunks.length +
          3 <
          500,
        "plan generation must fit in one Firestore batch",
      );
      assert.ok(
        Buffer.byteLength(JSON.stringify(version.revision), "utf8") < 900_000,
        "revision must remain below Firestore's 1 MiB document limit",
      );
      version.chunks.forEach((chunk) => {
        assert.ok(
          Buffer.byteLength(JSON.stringify(chunk), "utf8") < 900_000,
          "revision chunk must remain below Firestore's 1 MiB document limit",
        );
      });
    });
  }

  test("records the template actually used by a fallback cloud plan", () => {
    const context = loadRoadmaps();
    const roadmap = context.window.PathRoadmaps.resolve(
      "cloud-architect",
      "GCP",
    );
    const snapshot = buildPlanSnapshot({
      careerGoalKey: "cloud-architect",
      cloud: "GCP",
      templateId: roadmap.templateId,
      tracker: roadmap.tracker,
    });

    assert.equal(snapshot.cloud, "GCP");
    assert.equal(snapshot.templateId, "cloud-architect:Azure");
    assert.match(snapshot.tasks[0].taskId, /^cloud-architect-GCP:/);
  });

  test("keeps Azure legacy task IDs while namespacing every other template", () => {
    const context = loadRoadmaps();
    context.setActiveRoadmap("cloud-architect", "Azure");
    const azureId =
      context.window.PathRoadmaps.current().tracker[0].tasks[0].id;
    context.setActiveRoadmap("cloud-architect", "AWS");
    const awsId = context.window.PathRoadmaps.current().tracker[0].tasks[0].id;
    context.setActiveRoadmap("backend-engineer", "Azure");
    const backendId =
      context.window.PathRoadmaps.current().tracker[0].tasks[0].id;

    assert.match(azureId, /^p1-/);
    assert.match(awsId, /^cloud-architect-AWS:/);
    assert.match(backendId, /^backend-engineer:/);
  });

  test("keeps task IDs stable when a template inserts or reorders labs", () => {
    const context = loadRoadmaps();
    const before = vm.runInContext(
      `buildTracker(
        AI_ENGINEER.phases,
        "ai-engineer:",
        legacyTaskIds("ai-engineer", "ai-engineer:"),
      )[0].tasks`,
      context,
    );
    const after = vm.runInContext(
      `(() => {
        const phases = JSON.parse(JSON.stringify(AI_ENGINEER.phases));
        phases[0].plan[0].hands.unshift("A newly inserted lab");
        phases[0].plan[0].hands.reverse();
        return buildTracker(
          phases,
          "ai-engineer:",
          legacyTaskIds("ai-engineer", "ai-engineer:"),
        )[0].tasks;
      })()`,
      context,
    );
    const afterByLabel = new Map(
      Array.from(after, (task) => [task.label, task.id]),
    );

    before.forEach((task) =>
      assert.equal(afterByLabel.get(task.label), task.id),
    );
  });

  test("keeps every current task on its deployed positional ID", () => {
    for (const [careerGoalKey, cloud] of variants) {
      const context = loadRoadmaps();
      context.setActiveRoadmap(careerGoalKey, cloud);
      const prefix =
        careerGoalKey === "cloud-architect" && cloud === "Azure"
          ? ""
          : `${careerGoalKey}${careerGoalKey === "cloud-architect" ? `-${cloud}` : ""}:`;
      const actual = context.window.PathRoadmaps.current().tracker;

      actual.forEach((phase) => {
        phase.tasks.forEach((task, index) => {
          assert.equal(task.id, `${prefix}${phase.id}-${index}`);
        });
      });
    }
  });
});
