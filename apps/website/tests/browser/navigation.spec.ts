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
