import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ browser }, testInfo) => {
  testInfo.annotations.push({ type: "browser-version", description: browser.version() });
});

test("invalid project controls have linked errors and recover without losing focus", async ({
  page,
}) => {
  await page.goto("/#/builder/express-ts-pnpm");
  const name = page.getByLabel("Project name", { exact: true });
  const path = page.getByLabel("New project folder", { exact: true });
  await name.fill("con");
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/Reserved device names/);
  await expect(page.getByRole("button", { name: "Copy RepoSetup command" })).toHaveCount(0);
  await name.fill("session-app");
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await path.fill("../outside");
  await expect(path).toBeFocused();
  await expect(path).toHaveAttribute("aria-invalid", "true");
  await expect(path).toHaveAccessibleDescription(/relative folder segments/);
  await expect(page.locator("#selection-error")).toHaveAttribute("aria-atomic", "true");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  // Invalid input must not move the review panel below the full selection form on desktop.
  if (page.viewportSize()!.width > 900) {
    const form = await page.locator("form").boundingBox();
    const review = await page.getByRole("region", { name: "Review selection" }).boundingBox();
    expect(Math.abs(form!.y - review!.y)).toBeLessThan(2);
  }
  if (test.info().project.name === "chromium-desktop")
    await page.screenshot({ path: "test-results/invalid-builder-desktop.png", fullPage: true });
  await page.getByLabel("Project journey").selectOption("add");
  await expect(path).toBeHidden();
  await expect(path).toBeDisabled();
  await expect(name).toBeDisabled();
  expect(await page.locator("form").evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    true,
  );
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByRole("group", { name: "Optional libraries" })).toHaveAccessibleDescription(
    /at least one/,
  );
  await page.getByLabel("Zod", { exact: true }).check();
  await expect(page.getByRole("button", { name: "Copy RepoSetup command" })).toBeVisible();
  await page.getByLabel("Project journey").selectOption("create");
  await expect(path).toBeEnabled();
  await expect(path).toHaveAttribute("aria-invalid", "true");
  await path.fill("projects/session-app");
  await expect(path).toHaveAttribute("aria-invalid", "false");
  await expect(page.locator("#project-path-error")).toBeHidden();
  await expect(page.getByRole("button", { name: "Copy RepoSetup command" })).toBeVisible();
});

test("blocked clipboard selects the entire command for keyboard copying", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/#/builder/react-vite-ts-pnpm");
  const command = page.getByLabel("RepoSetup command", { exact: true });
  await page.getByRole("button", { name: "Copy RepoSetup command" }).click();
  await expect(command).toBeFocused();
  await expect(page.locator("#export-status")).toContainText("copy it manually");
  expect(
    await command.evaluate((node: HTMLTextAreaElement) => [node.selectionStart, node.selectionEnd]),
  ).toEqual([0, (await command.inputValue()).length]);
  await expect(page.locator("#export-status")).toHaveAttribute("aria-atomic", "true");
});

test("learning links retain the in-memory draft without transmitting or storing it", async ({
  page,
}) => {
  const requests: string[] = [];
  const pageErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/#/builder/express-ts-pnpm");
  await page.getByLabel("Project name", { exact: true }).fill("private-session-name");
  await page
    .getByLabel("New project folder", { exact: true })
    .fill("projects/private-session-name");
  await page.getByLabel("Zod", { exact: true }).check();
  const before = await page.getByLabel("RepoSetup command", { exact: true }).inputValue();
  await page.getByRole("link", { name: "When can I skip it?" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zod");
  await page.getByRole("link", { name: "Build a selection" }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "private-session-name",
  );
  await expect(page.getByLabel("Zod", { exact: true })).toBeChecked();
  await expect(page.getByLabel("RepoSetup command", { exact: true })).toHaveValue(before);
  expect(page.url()).not.toContain("private-session-name");
  expect(page.url()).not.toContain(before.split(" ").at(-1)!);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(requests.every((url) => new URL(url).origin === "http://127.0.0.1:4175")).toBe(true);
  expect(requests.some((url) => url.includes("private-session-name"))).toBe(false);
  expect(pageErrors).toEqual([]);
});
