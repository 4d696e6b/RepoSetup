import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { taskPreparePrompt } from "../../src/reference/docs/task-guides.js";

test("plan guide describes candidate availability and experimental managed routing", async ({
  page,
}) => {
  await page.goto("/#/docs");
  await page
    .locator(".docs-start-card")
    .filter({ hasText: "Use an AI-written coding plan" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Use an AI-written coding plan");
  await expect(page.locator(".docs-article > .eyebrow")).toHaveText("Guides / VERSION 0.4.0");
  if (process.env.REPOSETUP_WEBSITE_RELEASE === "published") {
    await expect(page.locator(".docs-article")).toContainText(
      "RepoSetup 0.4.0 includes task compile",
    );
  } else {
    await expect(page.locator(".docs-article")).toContainText("Published rsetup 0.3.1");
    await expect(page.locator(".docs-article")).toContainText("does not contain task commands");
  }
  await page
    .locator(".docs-article")
    .getByRole("link", { name: "How the managed router works", exact: false })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Model routing and managed execution",
  );
  await expect(page.locator(".docs-article")).toContainText(
    "Production model capability profiles are unconfirmed",
  );
  await page.goto("/#/docs/cli");
  await expect(page.locator(".docs-article")).toContainText("rsetup task");
});

test("copying the preparation prompt has an accessible keyboard fallback", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("clipboard unavailable");
        },
      },
      configurable: true,
    }),
  );
  await page.goto("/#/docs/task-compiler#prepare-inputs");
  const copy = page.getByRole("button", {
    name: "Copy example for 1. Give your plan to the agent",
    exact: true,
  });
  await copy.click();
  const block = copy.locator("..");
  await expect(block.getByRole("status")).toHaveText("Selected. Copy with your keyboard.");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(taskPreparePrompt);
  await expect(block.locator("pre")).toBeFocused();
});

for (const slug of ["task-compiler", "task-router", "task-troubleshooting"]) {
  test(`${slug} supports deep links, reflow and accessible reading`, async ({ page }) => {
    await page.goto(`/#/docs/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    const result = await new AxeBuilder({ page }).include("main").analyze();
    expect(result.violations).toEqual([]);
    await expect(page.locator("main input[type=file], main input[type=password]")).toHaveCount(0);
  });
}
