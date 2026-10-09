import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BUNDLED_PRESETS } from "../../../../packages/cli/src/presets.js";

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
