const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("sign-in shell has accessible structure and no serious axe violations", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/PathPilot/);
  await expect(page.locator(".skip-link")).toHaveAttribute("href", "#overview");
  await expect(
    page.getByRole("dialog", { name: "Sign in to PathPilot" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include("#authOverlay")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(({ impact }) =>
    ["serious", "critical"].includes(impact),
  );
  expect(blocking).toEqual([]);
});

test("browser builds the active versioned plan model", async ({ page }) => {
  await page.goto("/");

  const model = await page.evaluate(() => {
    const roadmap = globalThis.PathRoadmaps.current();
    const snapshot = globalThis.PathCore.buildPlanSnapshot({
      careerGoalKey: "cloud-architect",
      cloud: "Azure",
      tracker: roadmap.tracker,
    });
    return {
      planId: snapshot.planId,
      taskCount: snapshot.tasks.length,
      sessionCount: snapshot.sessions.length,
      rollbackAvailable: typeof globalThis.PathPlan.rollback === "function",
    };
  });

  expect(model.planId).toBe("plan-cloud-architect-azure");
  expect(model.taskCount).toBeGreaterThan(0);
  expect(model.sessionCount).toBe(model.taskCount);
  expect(model.rollbackAvailable).toBe(true);
});
