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
