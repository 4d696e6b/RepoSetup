import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BUNDLED_PRESETS } from "../../../../packages/cli/src/presets.js";
import { productionOrigins } from "../../src/security.js";

test("public home, direct documentation entry, and keyboard search work without a motion toggle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your stack.Ready to build.");
  await expect(page.getByRole("button", { name: /Motion|animations/i })).toHaveCount(0);
  await expect(page.locator(".hero-copy")).toContainText("npm install -g rsetup@0.2.3");
  await expect(page.locator("body")).not.toContainText(/0\.3\.0|0\.4\.0/);
  expect(
    await page.locator(".brand img, .hero-art").evaluateAll(async (images) => {
      const assets = images as HTMLImageElement[];
      await Promise.all(assets.map((image) => image.decode()));
      return assets.every((image) => image.naturalWidth > 0);
    }),
  ).toBe(true);

  await page.goto("/#/docs/create#confirmation");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create a project");
  await expect(page.locator("#confirmation")).toBeFocused();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("searchbox", { name: "Search documentation and integrations" });
  await expect(search).toBeFocused();
  await search.fill("psycopg");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).not.toHaveText("0 results");
  await search.press("Tab");
  await expect(dialog.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("public analytics scripts load and page views contain only bounded public routes", async ({
  page,
  baseURL,
}) => {
  test.skip(
    !productionOrigins.includes(new URL(baseURL!).origin),
    "Preview hosts keep analytics disabled.",
  );
  const pageViews: string[] = [];
  const performanceEvents: string[] = [];
  const failures: string[] = [];
  // Vercel intentionally ignores automated browsers. Exercise its real script
  // as a regular browser, but intercept collection so tests never inflate stats.
  await page.addInitScript(() => {
    const agent = navigator.userAgent.replace("HeadlessChrome", "Chrome");
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgent", { get: () => agent });
  });
  await page.route("**/_vercel/insights/view", (route) => route.fulfill({ status: 204 }));
  await page.route("**/_vercel/speed-insights/vitals", (route) => route.fulfill({ status: 204 }));
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/_vercel/insights/view"))
      pageViews.push(request.postData() ?? "");
    if (request.method() === "POST" && request.url().includes("/_vercel/speed-insights/vitals"))
      performanceEvents.push(request.postData() ?? "");
  });
  page.on("console", (message) => {
    if (/Content Security Policy|Failed to load script/.test(message.text()))
      failures.push(message.text());
  });
  const analyticsScript = page.waitForResponse((response) =>
    response.url().endsWith("/_vercel/insights/script.js"),
  );
  const speedScript = page.waitForResponse((response) =>
    response.url().endsWith("/_vercel/speed-insights/script.js"),
  );
  const pageView = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().includes("/_vercel/insights/view"),
  );
  await page.goto("/?private-canary=do-not-collect#/docs/create#confirmation");
  expect((await analyticsScript).ok()).toBe(true);
  expect((await speedScript).ok()).toBe(true);
  expect((await pageView).ok()).toBe(true);
  await expect(page.locator('script[src="/_vercel/insights/script.js"]')).toHaveAttribute(
    "data-disable-auto-track",
    "1",
  );
  await expect.poll(() => pageViews.length).toBe(1);
  expect(pageViews[0]).toContain("/docs/create");
  expect(pageViews[0]).not.toMatch(/private-canary|do-not-collect|confirmation|#/);

  const builderView = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().includes("/_vercel/insights/view"),
  );
  await page.getByRole("link", { name: "Presets", exact: true }).first().click();
  expect((await builderView).ok()).toBe(true);
  await page.goto("/#/builder/react-vite");
  await expect
    .poll(() =>
      pageViews.some((payload) => payload.includes('"/builder"') || payload.includes('/builder"')),
    )
    .toBe(true);
  await page.getByLabel("Project name", { exact: true }).fill("private-project-canary");
  await page.keyboard.press("Control+k");
  await page.getByRole("searchbox").fill("private-search-canary");
  for (const payload of pageViews)
    expect(payload).not.toMatch(/private-project-canary|private-search-canary|react-vite/);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect.poll(() => performanceEvents.length).toBeGreaterThan(0);
  for (const payload of performanceEvents) {
    expect(payload).not.toMatch(
      /private-canary|do-not-collect|private-project-canary|private-search-canary|react-vite/,
    );
    const { metrics } = JSON.parse(payload) as { metrics: { href: string; route: string }[] };
    for (const metric of metrics) {
      const url = new URL(metric.href);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
      expect(metric.route).toMatch(/^\/(?:docs\/create|presets|builder)$/);
    }
  }
  expect(failures).toEqual([]);
});

test("public builder downloads all five exact released recipes and retains preview and confirmation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const name = "public-smoke";
  const filename = `reposetup-${name}.json`;
  const create = `npx rsetup@0.2.3 create --config ${filename}`;

  for (const preset of BUNDLED_PRESETS) {
    await page.goto(`/#/builder/${preset.id}`);
    await page.getByLabel("Project name", { exact: true }).fill(name);
    const review = page.getByRole("region", { name: "Review your setup" });
    await expect(review.locator("code")).toHaveText([`${create} --dry-run`, create]);
    await expect(review).toContainText("asks for confirmation before execution");
    await expect(review).not.toContainText(/--yes|--selection|--recipe/);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: `Download ${filename}` }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(filename);
    expect(await download.failure()).toBeNull();
    const path = await download.path();
    expect(path).not.toBeNull();
    const config: unknown = JSON.parse(readFileSync(path!, "utf8"));
    expect(config, preset.id).toEqual({ ...preset.config, project: { name, path: name } });
    await expect(review).toContainText("Config downloaded.");
  }
  expect(errors).toEqual([]);
});
