import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { authoredPages } from "../../src/docs/content.js";

const data = JSON.parse(
  readFileSync(new URL("../../src/generated/release.json", import.meta.url), "utf8"),
) as {
  integrations: { id: string; name: string }[];
  presets: { id: string }[];
  cli: { commands: { id: string }[] };
};
test("home uses the supplied brand assets and published install command", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your stack.Ready to build.");
  await expect(page.locator(".brand img")).toHaveAttribute("src", /brand\/reposetup-logo.png/);
  await expect(page.locator(".hero-art")).toHaveAttribute("src", /brand\/hero-stack.png/);
  await expect(page.locator(".hero-copy")).toContainText("npm install -g rsetup@0.2.3");
  await expect(page.locator("body")).not.toContainText("0.3.0");
  await expect(page.locator("body")).not.toContainText("0.4.0");
  expect(
    await page.locator("img").evaluateAll(async (images) => {
      const assets = images as HTMLImageElement[];
      await Promise.all(assets.map((img) => img.decode()));
      return assets.every((img) => img.naturalWidth > 0);
    }),
  ).toBe(true);
});
test("library search and preset exploration link to release-specific docs", async ({ page }) => {
  await page.goto("/#/integrations");
  await page.getByRole("searchbox", { name: "Search integrations" }).fill("postgres");
  await expect(page.getByRole("status")).toContainText("integrations in release 0.2.3");
  await page.getByRole("link", { name: "Explore integration" }).first().click();
  await expect(page.getByRole("link", { name: "Official documentation" })).toHaveAttribute(
    "href",
    /^https:/,
  );
  await page.goto("/#/presets");
  await expect(page.locator(".preset-card")).toHaveCount(5);
  await page.getByRole("link", { name: "Explore this recipe" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start with a clear plan.");
});
test("recipe download and commands preserve exact selections and explicit project destination", async ({
  page,
}) => {
  await page.goto("/#/builder/next-sqlite");
  await page.getByLabel("Project name", { exact: true }).fill("review-app");
  await expect(page.getByRole("region", { name: "Review your setup" })).toContainText(
    "npx rsetup@0.2.3 create --config reposetup-review-app.json --dry-run",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download reposetup-review-app.json" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("reposetup-review-app.json");
  const json = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(json.project).toEqual({ name: "review-app", path: "review-app" });
  expect(json.integrations.map((item: { id: string }) => item.id)).toEqual([
    "tailwind",
    "sqlite",
    "prisma",
    "zod",
    "vitest",
    "prettier",
  ]);
  await page.getByLabel("Project name", { exact: true }).fill("../outside");
  await expect(page.getByLabel("Project name", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByRole("button", { name: /^Download/ })).toHaveCount(0);
  for (const invalid of ["A1", "http", "node_modules"]) {
    await page.getByLabel("Project name", { exact: true }).fill(invalid);
    await expect(page.getByRole("button", { name: /^Download/ })).toHaveCount(0);
  }
  await page.goto("/#/builder/express-postgres");
  await expect(page.locator(".builder-form")).toContainText(
    "Includes experimental integrations: PostgreSQL, Docker, Docker Compose, GitHub Actions.",
  );
});
test("docs search dialog works with keyboard and hostile text stays literal", async ({ page }) => {
  await page.goto("/#/docs");
  await page.getByRole("button", { name: "Open documentation search" }).click();
  const input = page.getByRole("searchbox", { name: "Search documentation and integrations" });
  await expect(input).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open documentation search" })).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(input).toBeFocused();
  await input.fill("psycopg");
  await expect(page.getByRole("dialog").getByRole("status")).not.toHaveText("0 results");
  await input.press("Tab");
  await expect(page.getByRole("dialog").getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/#/integrations?q=%3Cimg%20src=x%20onerror=alert(1)%3E");
  await expect(page.getByRole("searchbox")).toHaveValue("<img src=x onerror=alert(1)>");
  await expect(page.locator(".integration-grid img")).toHaveCount(0);
});
test("heading links, back and forward, mobile navigation and copy feedback", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    }),
  );
  await page.goto("/#/docs/getting-started");
  await page
    .getByRole("button", { name: /Copy example/ })
    .first()
    .click();
  await expect(page.getByText("Copied", { exact: true })).toBeVisible();
  await page.goto("/#/docs/create");
  const anchor = page.locator(".heading-anchor").first();
  const href = await anchor.getAttribute("href");
  await anchor.click();
  expect(page.url()).toContain(href!);
  await page.goto("/#/docs/inspect");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create a project");
  await page.setViewportSize({ width: 320, height: 700 });
  const menu = page.getByText("Browse documentation", { exact: true });
  await menu.focus();
  await menu.press("Enter");
  await expect(page.locator(".docs-mobile-nav")).toHaveAttribute("open", "");
});
test("every docs, integration and builder route loads at 320px without overflow", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 700 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "/",
    "/docs",
    "/integrations",
    "/presets",
    "/release",
    ...authoredPages.map((entry) => `/docs/${entry.slug}`),
    ...data.integrations.flatMap((entry) => [
      `/integrations/${entry.id}`,
      `/docs/integration-${entry.id}`,
    ]),
    ...data.presets.flatMap((entry) => [`/builder/${entry.id}`, `/docs/preset-${entry.id}`]),
    ...data.cli.commands.map((entry) => `/docs/cli-${entry.id}`),
    ...["cli", "cli-global", "cli-exit-codes", "integrations", "preset-reference"].map(
      (id) => `/docs/${id}`,
    ),
  ];
  for (const route of routes) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole("heading", { level: 1 }), route).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }), route).not.toHaveText(/not found/i);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      route,
    ).toBeLessThanOrEqual(320);
  }
  expect(errors).toEqual([]);
});
test("key pages pass accessibility and reflow checks", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/docs/getting-started",
      "/docs/cli-create",
      "/integrations",
      "/integrations/prisma",
      "/presets",
      "/builder/fastapi",
    ]) {
      await page.goto(`/#${route}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${route} at ${width}`,
      ).toBeLessThanOrEqual(width);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations, `${route} at ${width}`).toEqual([]);
    }
  }
});
test("CSP blocks connections and no-JavaScript fallback links the released guide", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  expect(
    await page.evaluate(async () => {
      try {
        await fetch("/blocked");
        return true;
      } catch {
        return false;
      }
    }),
  ).toBe(false);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto(new URL("/", page.url()).href);
  const guide = noJs.getByRole("link", { name: "0.2.3 user guide" });
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute("href", /v0\.2\.3/);
  await context.close();
});
