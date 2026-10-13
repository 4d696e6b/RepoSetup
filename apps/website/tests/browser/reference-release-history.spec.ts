import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const published = process.env.REPOSETUP_WEBSITE_RELEASE === "published";
const publishedVersion = published ? "0.3.0" : "0.2.3";
const forbiddenPin = new RegExp(`rsetup@(?!${publishedVersion.replaceAll(".", "\\.")}(?:\\s|$))`);
const versions = [
  ...(published ? ["0.3.0"] : []),
  "0.2.3",
  "0.2.2",
  "0.2.1",
  "0.2.0",
  "0.1.1",
  "0.1.0",
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/release");
});

test("direct What's new entry includes every published release in newest-first order", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^What's new[.]?$/);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", {
      name: "What's new",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page");
  const history = page.getByRole("region", { name: "Published release history" });
  const cards = history.locator("article.release-card");
  await expect(cards).toHaveCount(versions.length);
  expect(
    await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-version"))),
  ).toEqual(versions);

  for (const version of versions) {
    const card = history.locator(`article[data-version="${version}"]`);
    await expect(card.getByRole("heading", { level: 2 })).toContainText(`${version} ·`);
    await expect(card.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
    await expect(card.locator(".release-card-summary")).not.toHaveText("");
    expect(await card.locator(".release-card-changes > li").count()).toBeGreaterThan(0);
    await expect(card.locator(".release-qualification")).not.toHaveText("");
    const source = card.getByRole("link", {
      name:
        version === "0.3.0"
          ? "Reviewed release source"
          : new RegExp(`^(?:Release notes|Changelog) ${version.replaceAll(".", "\\.")}$`),
    });
    await expect(source).toHaveAttribute("href", /^https:\/\/github\.com\/4d696e6b\/RepoSetup\//);
    await expect(source).toHaveAttribute("rel", /noreferrer/);
    await expect(
      card.getByRole("link", { name: `npm package ${version}`, exact: true }),
    ).toHaveAttribute("href", `https://www.npmjs.com/package/rsetup/v/${version}`);
  }
  await expect(history.getByText("Latest published", { exact: true })).toHaveCount(1);
  await expect(history.locator(`article[data-version="${publishedVersion}"]`)).toContainText(
    "Latest published",
  );
  await expect(history).not.toContainText(published ? /0\.4\.\d/ : /0\.[34]\.\d/);
  for (const command of await page.locator("main code").allTextContents())
    expect(command).not.toMatch(forbiddenPin);
});

test("release sources, documentation, and preset builder remain reachable by keyboard", async ({
  page,
  browserName,
}) => {
  // Safari's default link navigation is Option-Tab (Apple's documented shortcut).
  const previous = browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab";
  const next = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const history = page.getByRole("region", { name: "Published release history" });
  for (const version of versions) {
    const source = history.locator(`article[data-version="${version}"]`).getByRole("link", {
      name:
        version === "0.3.0"
          ? "Reviewed release source"
          : new RegExp(`^(?:Release notes|Changelog) ${version.replaceAll(".", "\\.")}$`),
    });
    await source.focus();
    await source.press(previous);
    await page.keyboard.press(next);
    await expect(source).toBeFocused();
  }
  const docs = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", {
    name: "Docs",
    exact: true,
  });
  await docs.focus();
  await docs.press(previous);
  await page.keyboard.press(next);
  await expect(docs).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/docs$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/not found/i);

  await page.goto("/#/release");
  const gettingStarted = page.locator("main").getByRole("link", {
    name: /Read the getting started guide/,
  });
  await gettingStarted.focus();
  await gettingStarted.press(previous);
  await page.keyboard.press(next);
  await expect(gettingStarted).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/docs\/getting-started$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/#/release");
  const presets = page.locator("main").getByRole("link", { name: /Explore the presets/ });
  await presets.focus();
  await presets.press(previous);
  await page.keyboard.press(next);
  await expect(presets).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/presets$/);
  const recipe = page.getByRole("link", { name: "Explore this recipe ↗", exact: true }).first();
  await recipe.focus();
  await recipe.press(previous);
  await page.keyboard.press(next);
  await expect(recipe).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/builder\/[\w-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start with a clear plan.");
  await expect(page.getByRole("button", { name: /^Download reposetup-/ })).toBeVisible();
});

for (const width of [320, 1440]) {
  test(`published release history is readable and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const history = page.getByRole("region", { name: "Published release history" });
    for (const version of versions) {
      const card = history.locator(`article[data-version="${version}"]`);
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByRole("heading", { level: 2 })).toBeVisible();
      const bounds = await card.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x, `${version} left edge at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width, `${version} right edge at ${width}px`).toBeLessThanOrEqual(
        width,
      );
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}
