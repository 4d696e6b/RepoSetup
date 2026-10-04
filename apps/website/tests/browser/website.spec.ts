import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { WebsiteCatalog } from "@reposetup/registry";
import { handoff } from "../../src/handoff.js";

const catalog: WebsiteCatalog = JSON.parse(
  readFileSync(new URL("../../src/generated/catalog.json", import.meta.url), "utf8"),
);

test.beforeEach(async ({ browser }, testInfo) => {
  testInfo.annotations.push({ type: "browser-version", description: browser.version() });
});

test("goal discovery, library explanations, minimal presets and bounded selection", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "validate input →" }).click();
  await expect(page.getByRole("status")).toHaveText("2 libraries found");
  await page.getByRole("link", { name: "Zod", exact: true }).click();
  await expect(page.getByRole("heading", { name: "When to skip it" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the official documentation" })).toHaveAttribute(
    "href",
    "https://zod.dev/",
  );
  await page.getByRole("link", { name: "Presets", exact: true }).click();
  await page.getByRole("link", { name: "Explore the minimal preset" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Optional means optional" })).toBeVisible();
  await expect(page.getByText("Qualified packed create/add", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Customize this starting point" }).click();
  await expect(page.locator("input:checked")).toHaveCount(0);
  await expect(page.getByLabel("pytest", { exact: true })).toBeDisabled();
  await page.getByLabel("Zod", { exact: true }).check();
  const command = await page.getByLabel("RepoSetup command", { exact: true }).inputValue();
  expect(command).toMatch(/^reposetup create --selection [A-Za-z0-9_-]+$/);
  const decoded = JSON.parse(Buffer.from(command.split(" ").at(-1)!, "base64url").toString());
  expect(decoded.config.integrations).toEqual([{ id: "zod" }]);
  expect(decoded.config.framework.options).toEqual({ typescript: true });
  expect(decoded.catalogRevision).toBe("0.3.0-cli.4");
  await page.getByLabel("New project folder").fill("../bad");
  await expect(page.getByRole("button", { name: "Copy RepoSetup command" })).toHaveCount(0);
  await expect(page.locator("#selection-error")).toContainText("relative folder");
  await page.getByLabel("New project folder").fill("my-app");
  await page.getByLabel("Project journey").selectOption("add");
  await expect(page.getByLabel("New project folder")).toBeHidden();
  await expect(page.getByLabel("RepoSetup command", { exact: true })).toHaveValue(
    /^reposetup add --selection /,
  );
  await page.getByLabel("Reviewed project context", { exact: true }).selectOption("fastapi-uv");
  await expect(page.getByLabel("Zod", { exact: true })).toBeDisabled();
  await expect(page.locator("input:checked")).toHaveCount(0);
  await expect(page.locator("#selection-error")).toContainText("at least one");
  await page.getByLabel("pytest", { exact: true }).check();
  await expect(page.getByRole("link", { name: "Build a selection" })).toHaveAttribute(
    "href",
    "#/builder/fastapi-uv",
  );
  await page.getByRole("link", { name: "Build a selection" }).click();
  await expect(page.getByLabel("pytest", { exact: true })).toBeChecked();
  await expect(page.getByLabel("RepoSetup command", { exact: true })).toHaveValue(
    /^reposetup add --selection /,
  );
  await page.getByRole("link", { name: "Presets", exact: true }).click();
  await page.getByRole("link", { name: "Explore the minimal preset" }).first().click();
  await page.getByRole("link", { name: "Customize this starting point" }).click();
  await expect(page.getByLabel("Project journey")).toHaveValue("create");
});

test("copy command and downloadable file carry equivalent choices", async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === "chromium")
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/builder/react-vite-ts-pnpm");
  await page.getByLabel("Vitest", { exact: true }).check();
  const command = await page.getByLabel("RepoSetup command", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Copy RepoSetup command" }).click();
  await expect(page.locator("#export-status")).toContainText("Command copied");
  if (browserName === "chromium")
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(command);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download selection.json" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("selection.json");
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(
    JSON.parse(Buffer.from(command.split(" ").at(-1)!, "base64url").toString()),
  );
});

test("maintenance guidance matches the pinned CLI's preview and narrow repair workflow", async ({
  page,
}) => {
  await page.goto("/#/how-to");
  await expect(page.getByRole("heading", { name: "Use the matching local CLI" })).toBeVisible();
  await expect(page.locator("pre code")).toContainText(
    "pnpm --filter @reposetup/website pack:contract",
  );
  await expect(page.locator("pre code")).toContainText(
    'export PATH="$PWD/apps/website/.local-cli/bin:$PATH"',
  );
  await expect(page.getByText(handoff.commit, { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview before confirming" })).toBeVisible();
  await expect(page.getByText("--diff --dry-run", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review a small missing-file repair" }),
  ).toBeVisible();
  await expect(
    page.getByText("doctor --config reposetup.json --fix --dry-run", { exact: false }),
  ).toBeVisible();
  await page.goto("/#/integrations/prettier");
  await expect(
    page.getByText("The matching local CLI can review repair", { exact: false }),
  ).toBeVisible();
});

test("keyboard navigation, accessible pages and responsive layout", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  for (const route of [
    "/",
    "/integrations",
    "/presets",
    "/how-to",
    ...catalog.integrations.map((item) => `/integrations/${item.id}`),
    ...catalog.presets.map((item) => `/presets/${item.id}`),
    ...catalog.contexts.flatMap((item) => [`/builder/${item.id}`, `/builder/${item.id}?mode=add`]),
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.goto("/#/builder/express-ts-pnpm");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // macOS WebKit requires Option+Tab to focus links without Full Keyboard Access enabled.
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab",
  );
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByLabel("Zod", { exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Zod", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Zod", { exact: true })).toBeFocused();
});

test("reflow at narrow mobile, tablet and desktop widths", async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/integrations",
      "/builder/react-vite-ts-pnpm",
      "/integrations/prettier",
    ]) {
      await page.goto(`/#${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  }
  if (test.info().project.name === "chromium-desktop") {
    await page.goto("/#/");
    await page.screenshot({ path: "test-results/home-desktop.png", fullPage: true });
    await page.goto("/#/builder/express-ts-pnpm");
    await page.getByLabel("Zod", { exact: true }).check();
    await page.screenshot({ path: "test-results/builder-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/builder-mobile.png", fullPage: true });
  }
});
