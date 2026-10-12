import { test, expect } from "@playwright/test";

test("the stable home and documentation defer beginner code until it is requested", async ({
  page,
}) => {
  const entries: string[] = [];
  page.on("request", (request) => {
    if (/\/assets\/entry-[\w-]+\.js/.test(request.url())) entries.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(entries).toEqual([]);
  await page.getByRole("link", { name: "By goal", exact: true }).click();
  await expect(page.getByRole("link", { name: "validate input →" })).toBeVisible();
  expect(entries).toHaveLength(1);
  await page.getByRole("link", { name: "Build a selection", exact: true }).click();
  await expect(page.getByLabel("RepoSetup command", { exact: true })).toHaveValue(
    /^reposetup create --selection /,
  );
  expect(entries).toHaveLength(1);
});

test("a delayed beginner module cannot overwrite a newer documentation navigation", async ({
  page,
}) => {
  let release!: () => void;
  let requested!: () => void;
  const arrived = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const deferred = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/entry-*.js", async (route) => {
    requested();
    await deferred;
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("link", { name: "By goal", exact: true }).click();
  await arrived;
  await page.evaluate(() => {
    location.hash = "#/docs/create";
  });
  await expect(page.locator(".docs-layout")).toBeVisible();
  release();
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".docs-layout")).toBeVisible();
  await expect(page.getByRole("link", { name: "validate input →" })).toHaveCount(0);
});
