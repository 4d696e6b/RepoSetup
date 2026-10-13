import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { revealNavigation } from "./navigation-helper.js";

test("compact navigation retains destinations, current page and keyboard dismissal", async ({
  page,
}) => {
  await page.goto("/#/integrations");
  const header = page.locator(".site-header");
  await expect(header.getByRole("link", { name: "Build a selection" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Presets", exact: true })).toBeHidden();
  await revealNavigation(page, "Integrations");
  const explore = header.getByRole("button", { name: "Explore", exact: true });
  await expect(explore).toHaveAttribute("aria-expanded", "true");
  await expect(header.getByRole("link", { name: "Integrations", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const name of [
    "By goal",
    "Minimal starters",
    "How it works",
    "Integrations",
    "Presets",
    "What's new",
    "GitHub ↗",
  ])
    await expect(header.getByRole("link", { name, exact: true })).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await explore.press("Escape");
  await expect(header.locator(".explore-trigger")).toHaveAttribute("aria-expanded", "false");
  const menu = header.getByRole("button", { name: "Open navigation", exact: true });
  if (await menu.isVisible()) await expect(menu).toBeFocused();
  else await expect(explore).toBeFocused();
});

test("mobile menu fits 320px, closes on navigation and leaves Build directly reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/#/docs");
  const header = page.locator(".site-header");
  const menu = header.getByRole("button", { name: "Open navigation", exact: true });
  await expect(menu).toBeVisible();
  await expect(header.getByRole("link", { name: "Docs", exact: true })).toBeHidden();
  await expect(header.getByRole("link", { name: "Build a selection" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await revealNavigation(page, "By goal");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await header.getByRole("link", { name: "By goal", exact: true }).click();
  await expect(page).toHaveURL(/#\/goals$/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#main")).toBeFocused();
  await header.getByRole("link", { name: "Build a selection" }).click();
  await expect(page.getByLabel("RepoSetup command", { exact: true })).toBeVisible();
});

test("search returns focus and keyboard search works with the mobile menu closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/docs");
  const header = page.locator(".site-header");
  const menu = header.getByRole("button", { name: "Open navigation", exact: true });
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("searchbox", { name: "Search documentation and integrations", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(menu).toBeFocused();
  await revealNavigation(page, "Search");
  const search = header.getByRole("button", { name: "Open documentation search" });
  await search.click();
  await page
    .getByRole("searchbox", { name: "Search documentation and integrations", exact: true })
    .fill("create");
  await expect(page.getByRole("dialog").getByRole("link").first()).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(header.getByRole("button", { name: "Close navigation" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

test("outside clicks and viewport changes dismiss navigation without stale listeners", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#/docs");
  const header = page.locator(".site-header");
  const explore = header.getByRole("button", { name: "Explore", exact: true });
  await explore.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(header.locator(".explore-trigger")).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  await revealNavigation(page, "Presets");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(header.locator(".explore-trigger")).toHaveAttribute("aria-expanded", "false");
  await header.getByRole("link", { name: "Build a selection" }).click();
  await expect(page.getByLabel("RepoSetup command", { exact: true })).toBeVisible();
  await explore.click();
  await explore.press("Escape");
  await expect(explore).toBeFocused();
  await expect(header.locator(".explore-trigger")).toHaveAttribute("aria-expanded", "false");
});

test("PC navigation stays in one row and Explore fits laptop, wide and short windows", async ({
  page,
}) => {
  await page.goto("/#/goals");
  const header = page.locator(".site-header");
  for (const [width, height] of [
    [761, 700],
    [768, 700],
    [900, 700],
    [1024, 600],
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
    [768, 360],
    [1024, 320],
  ] as const) {
    await page.setViewportSize({ width: width, height: height });
    const docs = header.getByRole("link", { name: "Docs", exact: true });
    const explore = header.getByRole("button", { name: "Explore", exact: true });
    const search = header.getByRole("button", { name: "Open documentation search" });
    const build = header.getByRole("link", { name: "Build a selection" });
    await expect(header.getByRole("button", { name: "Open navigation", exact: true })).toBeHidden();
    const controls = [
      header.getByRole("link", { name: "RepoSetup home" }),
      docs,
      explore,
      search,
      build,
    ];
    const boxes = [];
    for (const control of controls) {
      await expect(control).toBeVisible();
      boxes.push((await control.boundingBox())!);
    }
    for (let index = 0; index < boxes.length; index++) {
      const box = boxes[index]!;
      expect(box.x, `${width}×${height}: left edge`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${width}×${height}: right edge`).toBeLessThanOrEqual(width);
      expect(Math.abs(box.y + box.height / 2 - (boxes[0]!.y + boxes[0]!.height / 2))).toBeLessThan(
        3,
      );
      if (index > 0)
        expect(box.x).toBeGreaterThanOrEqual(boxes[index - 1]!.x + boxes[index - 1]!.width);
    }
    await explore.click();
    const panel = header.locator(".explore-panel");
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height, `${width}×${height}: dropdown bottom`).toBeLessThanOrEqual(
      height,
    );
    const github = panel.getByRole("link", { name: "GitHub ↗", exact: true });
    await github.focus();
    await expect(github).toBeFocused();
    const linkBounds = (await github.boundingBox())!;
    expect(linkBounds.y).toBeGreaterThanOrEqual(bounds.y);
    expect(linkBounds.y + linkBounds.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await explore.press("Escape");
  }
  await page.setViewportSize({ width: 760, height: 700 });
  await expect(header.getByRole("button", { name: "Open navigation", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Docs", exact: true })).toBeHidden();
  await expect(header.getByRole("link", { name: "Build a selection" })).toBeVisible();
});
