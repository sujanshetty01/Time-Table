const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

async function openPlanner(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("dialog", { name: "Sign in to PathPilot" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const startDate = new Date().toISOString().slice(0, 10);
    const addDays = (value, amount) => {
      const date = new Date(`${value}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + amount);
      return date.toISOString().slice(0, 10);
    };
    const tasks = [
      {
        taskId: "task-foundation",
        order: 0,
        title: "Map the cloud foundation",
        phaseTitle: "Foundation",
        dependencyIds: [],
        estimatedMinutes: 60,
      },
      {
        taskId: "task-network",
        order: 1,
        title: "Design the network boundary",
        phaseTitle: "Architecture",
        dependencyIds: ["task-foundation"],
        estimatedMinutes: 60,
      },
      {
        taskId: "task-resilience",
        order: 2,
        title: "Test the recovery path",
        phaseTitle: "Operations",
        dependencyIds: ["task-network"],
        estimatedMinutes: 60,
      },
    ];
    const sessions = tasks.map((task) => ({
      sessionId: `session-${task.taskId}`,
      taskId: task.taskId,
      activeRevisionId: "revision-test",
      status: "pending",
      locked: false,
      scheduledDate: null,
      startMin: null,
      durationMin: task.estimatedMinutes,
    }));
    const workspace = {
      plan: {
        activeRevisionId: "revision-test",
        careerGoalKey: "cloud-architect",
      },
      tasks,
      sessions,
      completedTaskIds: [],
      preferences: {
        startDate,
        deadline: addDays(startDate, 13),
        availableDays: [0, 1, 2, 3, 4, 5, 6],
        startMin: 720,
        endMin: 900,
        dailyCapMinutes: 180,
        weeklyCapMinutes: 900,
      },
    };
    globalThis.__plannerWorkspace = workspace;
    globalThis.__plannerCalls = { preferences: [], sessions: [], versions: [] };
    globalThis.__plannerUid = "test-user";
    globalThis.PathAuth = {
      ...globalThis.PathAuth,
      uid: () => globalThis.__plannerUid,
    };
    globalThis.PathPlan = {
      workspace: async () => globalThis.__plannerWorkspace,
      saveSchedule: async ({
        preferences,
        sessions: updates,
        plannerVersion,
      }) => {
        globalThis.__plannerCalls.preferences.push(preferences);
        globalThis.__plannerCalls.sessions.push(updates);
        globalThis.__plannerCalls.versions.push(plannerVersion);
        return { planner: preferences, plannerVersion: plannerVersion + 1 };
      },
    };
    globalThis.document.getElementById("authOverlay").classList.remove("show");
    globalThis.dispatchEvent(new CustomEvent("pathpilot:plan-ready"));
  });
  await expect(page.locator("#plannerStatus")).toContainText(
    "3 roadmap tasks loaded",
  );
  await page.locator("#planner").scrollIntoViewIfNeeded();
  await expect(page.locator("#planner > .reveal").first()).toHaveCSS(
    "opacity",
    "1",
  );
}

test("planner explains constraints, persists locks and drags, and exports ICS", async ({
  page,
}) => {
  await openPlanner(page);

  await expect(page.locator(".planner-session")).toHaveCount(3);
  await expect(page.locator("#plannerMetrics")).toContainText("Scheduled");
  await expect(page.locator("#plannerConflicts")).toContainText(
    "No scheduling conflicts",
  );
  const accessibility = await new AxeBuilder({ page })
    .include("#planner")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);
  const contrastRatios = await page.evaluate(() => {
    const channels = (value) =>
      value
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
    const luminance = (value) => {
      const linear = channels(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const background = (element) => {
      let current = element;
      while (current) {
        const value = globalThis.getComputedStyle(current).backgroundColor;
        if (value && !value.endsWith(", 0)")) return value;
        current = current.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const ratio = (selector) => {
      const element = globalThis.document.querySelector(selector);
      const foreground = luminance(globalThis.getComputedStyle(element).color);
      const behind = luminance(background(element));
      return (
        (Math.max(foreground, behind) + 0.05) /
        (Math.min(foreground, behind) + 0.05)
      );
    };
    const status = globalThis.document.getElementById("plannerStatus");
    const previousTone = status.dataset.tone;
    const themes = ["dark", "light"].map((theme) => {
      globalThis.document.documentElement.dataset.theme = theme;
      status.dataset.tone = "error";
      return [
        theme,
        {
          primary: ratio("#plannerBuild"),
          selectedDay: ratio("#plannerDays label:has(input:checked)"),
          fieldLabel: ratio(".planner-field > span"),
          errorStatus: ratio('#plannerStatus[data-tone="error"]'),
          phaseLabel: ratio(".planner-phase"),
        },
      ];
    });
    globalThis.document.documentElement.dataset.theme = "dark";
    status.dataset.tone = previousTone;
    return Object.fromEntries(themes);
  });
  Object.values(contrastRatios).forEach((theme) =>
    Object.values(theme).forEach((ratio) =>
      expect(ratio).toBeGreaterThanOrEqual(4.5),
    ),
  );

  await page
    .locator('.planner-lock[data-session-id="session-task-foundation"]')
    .click();
  await expect(page.locator("#plannerStatus")).toContainText("locked in place");
  await expect(
    page.locator('.planner-session[data-session-id="session-task-foundation"]'),
  ).toHaveClass(/locked/);
  expect(
    await page.evaluate(() => globalThis.__plannerCalls.sessions.at(-1).length),
  ).toBe(3);

  const targetDay = page.locator(".planner-day").nth(2);
  const targetDate = await targetDay.getAttribute("data-date");
  await page
    .locator('.planner-session[data-session-id="session-task-foundation"]')
    .locator(".planner-drag-handle")
    .dragTo(targetDay);
  await expect(page.locator("#plannerStatus")).toContainText("Session moved");
  const lastUpdate = await page.evaluate(() =>
    globalThis.__plannerCalls.sessions
      .at(-1)
      .find((session) => session.sessionId === "session-task-foundation"),
  );
  expect(lastUpdate.scheduledDate).toBe(targetDate);
  expect(lastUpdate.locked).toBe(true);

  await page
    .locator("#plannerDeadline")
    .fill(await page.locator("#plannerStartDate").inputValue());
  await page.locator("#plannerDailyCap").fill("60");
  await page.locator("#plannerDailyCap").press("Tab");
  await expect(page.locator("#plannerConflictCount")).not.toHaveText("0");
  await expect(page.locator("#plannerConflicts")).toContainText(
    /No available capacity|Cannot schedule/,
  );

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#plannerExport").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pathpilot-plan.ics");
});

test("planner remains contained on mobile and date input reschedules", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlanner(page);

  const firstSession = page.locator(".planner-session").first();
  const dateInput = firstSession.locator('[data-action="date"]');
  const targetDate = await page
    .locator(".planner-day")
    .nth(1)
    .getAttribute("data-date");
  await dateInput.fill(targetDate);
  await dateInput.press("Tab");
  await expect(page.locator("#plannerStatus")).toContainText("Session moved");

  const dimensions = await page.evaluate(() => ({
    viewport: globalThis.document.documentElement.clientWidth,
    documentWidth: globalThis.document.documentElement.scrollWidth,
    plannerRight: globalThis.document
      .getElementById("planner")
      .getBoundingClientRect().right,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.plannerRight).toBeLessThanOrEqual(dimensions.viewport);
});

test("planner renders a profile learning window that starts at midnight", async ({
  page,
}) => {
  await openPlanner(page);
  await page.evaluate(() => {
    globalThis.__plannerWorkspace.preferences = null;
    globalThis.PathProfile = {
      ...globalThis.PathProfile,
      get: () => ({ learnStartMin: 0, learnEndMin: 120 }),
    };
    globalThis.dispatchEvent(new CustomEvent("pathpilot:plan-ready"));
  });

  await expect(page.locator("#plannerStartTime")).toHaveValue("00:00");
  await expect(page.locator("#plannerEndTime")).toHaveValue("02:00");
  await expect(page.locator(".planner-session-time").first()).toContainText(
    "12:00 AM",
  );
});

test("planner round-trips an end-of-day availability boundary", async ({
  page,
}) => {
  await openPlanner(page);
  await page.evaluate(() => {
    globalThis.__plannerWorkspace.preferences.endMin = 1440;
    globalThis.__plannerWorkspace.preferences.dailyCapMinutes = 180;
    globalThis.dispatchEvent(new CustomEvent("pathpilot:plan-ready"));
  });

  await expect(page.locator("#plannerEndTime")).toHaveValue("00:00");
  await page.locator("#plannerBuild").click();
  await expect(page.locator("#plannerStatus")).toContainText("Plan saved");
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__plannerCalls.preferences.at(-1)?.endMin),
    )
    .toBe(1440);
});

test("planner discards a workspace response that arrives after sign-out", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("dialog", { name: "Sign in to PathPilot" }),
  ).toBeVisible();
  await page.evaluate(() => {
    globalThis.__plannerUid = "stale-user";
    globalThis.PathAuth = {
      ...globalThis.PathAuth,
      uid: () => globalThis.__plannerUid,
    };
    globalThis.PathPlan = {
      workspace: () =>
        new Promise((resolve) => {
          globalThis.__resolvePlannerWorkspace = resolve;
        }),
    };
    globalThis.document.getElementById("authOverlay").classList.remove("show");
    globalThis.dispatchEvent(new CustomEvent("pathpilot:plan-ready"));
  });
  await expect(page.locator("#plannerStatus")).toContainText(
    "Loading your active plan",
  );

  await page.evaluate(() => {
    globalThis.__plannerUid = null;
    globalThis.dispatchEvent(new CustomEvent("pathpilot:signed-out"));
    globalThis.__resolvePlannerWorkspace({
      plan: { planId: "stale-plan", activeRevisionId: "stale-revision" },
      tasks: [{ taskId: "stale-task", order: 0 }],
      sessions: [],
      completedTaskIds: [],
      preferences: null,
    });
  });

  await expect(page.locator("#plannerStatus")).toContainText(
    "Sign in to load your active plan",
  );
  await expect(page.locator(".planner-session")).toHaveCount(0);
  await expect(page.locator("#plannerMetrics")).toBeEmpty();
});

test("planner discards a schedule save that completes after sign-out", async ({
  page,
}) => {
  await openPlanner(page);
  await page.evaluate(() => {
    globalThis.PathPlan.saveSchedule = () =>
      new Promise((resolve) => {
        globalThis.__resolvePlannerSave = resolve;
      });
  });

  await page
    .locator('.planner-lock[data-session-id="session-task-foundation"]')
    .click();
  await page.evaluate(() => {
    globalThis.__plannerUid = null;
    globalThis.dispatchEvent(new CustomEvent("pathpilot:signed-out"));
    globalThis.__resolvePlannerSave();
  });

  await expect(page.locator("#plannerStatus")).toContainText(
    "Sign in to load your active plan",
  );
  await expect(page.locator(".planner-session")).toHaveCount(0);
  await expect(page.locator("#plannerMetrics")).toBeEmpty();
});

test("planner clears the previous workspace on a direct account switch", async ({
  page,
}) => {
  await openPlanner(page);

  await page.evaluate(() => {
    globalThis.__plannerUid = "next-user";
    globalThis.dispatchEvent(
      new CustomEvent("pathpilot:account-changed", {
        detail: { uid: globalThis.__plannerUid },
      }),
    );
  });

  await expect(page.locator("#plannerStatus")).toContainText(
    "Waiting for your active plan",
  );
  await expect(page.locator(".planner-session")).toHaveCount(0);
  await expect(page.locator("#plannerMetrics")).toBeEmpty();
  await expect(page.locator("#plannerBuild")).toBeDisabled();
  await expect(page.locator("#plannerExport")).toBeDisabled();
  await expect(page.locator("#plannerPrev")).toBeDisabled();
  await expect(page.locator("#plannerNext")).toBeDisabled();
});

test("planner locks editable state while a save is pending", async ({
  page,
}) => {
  await openPlanner(page);
  await page.evaluate(() => {
    globalThis.PathPlan.saveSchedule = () =>
      new Promise((resolve) => {
        globalThis.__resolvePlannerSave = resolve;
      });
  });

  await page
    .locator('.planner-lock[data-session-id="session-task-foundation"]')
    .click();

  await expect(page.locator("#plannerDeadline")).toBeDisabled();
  await expect(page.locator("#plannerDays input").first()).toBeDisabled();
  await expect(page.locator("#plannerPrev")).toBeDisabled();
  await expect(page.locator(".planner-lock").first()).toBeDisabled();
  await expect(page.locator(".planner-date-edit input").first()).toBeDisabled();

  await page.evaluate(() => globalThis.__resolvePlannerSave());
  await expect(page.locator("#plannerStatus")).toContainText(
    "Session locked in place",
  );
  await expect(page.locator("#plannerDeadline")).toBeEnabled();
  await expect(page.locator(".planner-lock").first()).toBeEnabled();
});

test("planner advances its optimistic version after each save", async ({
  page,
}) => {
  await openPlanner(page);

  await page
    .locator('.planner-lock[data-session-id="session-task-foundation"]')
    .click();
  await expect(page.locator("#plannerStatus")).toContainText(
    "Session locked in place",
  );
  await page
    .locator('.planner-lock[data-session-id="session-task-network"]')
    .click();
  await expect(page.locator("#plannerStatus")).toContainText(
    "Session locked in place",
  );

  await expect
    .poll(() => page.evaluate(() => globalThis.__plannerCalls.versions))
    .toEqual([0, 1]);
});

test("planner restores persisted state after a rejected plan save", async ({
  page,
}) => {
  await openPlanner(page);
  const originalDeadline = await page.locator("#plannerDeadline").inputValue();
  await page.evaluate(() => {
    globalThis.PathPlan.saveSchedule = async () => {
      throw new Error("This schedule changed in another tab.");
    };
  });
  await page
    .locator("#plannerDeadline")
    .fill(originalDeadline.slice(0, 5) + "12-31");
  await page.locator("#plannerDeadline").dispatchEvent("change");

  await page.locator("#plannerBuild").click();

  await expect(page.locator("#plannerStatus")).toContainText(
    "changed in another tab",
  );
  await expect(page.locator("#plannerDeadline")).toHaveValue(originalDeadline);
  await expect(page.locator("#plannerDeadline")).toBeEnabled();
  await expect(page.locator("#plannerBuild")).toBeEnabled();
  await expect(page.locator("#plannerExport")).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__plannerWorkspace.plannerVersion || 0),
    )
    .toBe(0);
});
