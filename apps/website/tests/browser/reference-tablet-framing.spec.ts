import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

import type releaseData from "../../src/reference/generated/release.json";

const release = JSON.parse(
  readFileSync(new URL("../../src/reference/generated/release.json", import.meta.url), "utf8"),
) as typeof releaseData;
const longestPreset = [...release.presets].sort(
  (left, right) => right.config.integrations.length - left.config.integrations.length,
)[0]!;
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 },
  { width: 1440, height: 650 },
  { width: 1920, height: 1080 },
];
const readingStops = [
  { progress: 0.24, chapter: "overview" },
  { progress: 0.54, chapter: "presets" },
  { progress: 0.9, chapter: "docs" },
];

type Rectangle = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

async function rectangle(locator: Locator): Promise<Rectangle> {
  return locator.evaluate((node) => {
    const { top, right, bottom, left, width, height } = node.getBoundingClientRect();
    return { top, right, bottom, left, width, height };
  });
}

function contained(child: Rectangle, parent: Rectangle, context: string, padding = 0) {
  // One CSS pixel allows for fractional scaling and browser layout rounding.
  const tolerance = 1;
  expect(child.width, `${context}: nonzero width`).toBeGreaterThan(0);
  expect(child.height, `${context}: nonzero height`).toBeGreaterThan(0);
  expect(child.left, `${context}: left edge`).toBeGreaterThanOrEqual(
    parent.left + padding - tolerance,
  );
  expect(child.top, `${context}: top edge`).toBeGreaterThanOrEqual(
    parent.top + padding - tolerance,
  );
  expect(child.right, `${context}: right edge`).toBeLessThanOrEqual(
    parent.right - padding + tolerance,
  );
  expect(child.bottom, `${context}: bottom edge`).toBeLessThanOrEqual(
    parent.bottom - padding + tolerance,
  );
}

async function sequential(group: Locator, context: string) {
  const elements = await group.all();
  for (let index = 1; index < elements.length; index += 1) {
    const previous = await rectangle(elements[index - 1]!);
    const next = await rectangle(elements[index]!);
    expect(
      previous.bottom,
      `${context}: elements ${index} and ${index + 1} do not overlap`,
    ).toBeLessThanOrEqual(next.top + 1);
  }
}

async function scrollToProgress(page: Page, progress: number) {
  const scene = page.locator(".stack-experience");
  await scene.locator(".tablet-scroll-track").evaluate((node, progress) => {
    const bounds = node.getBoundingClientRect();
    window.scrollTo(0, scrollY + bounds.top + (bounds.height - innerHeight) * progress);
    window.dispatchEvent(new Event("scroll"));
  }, progress);
  await page.clock.runFor(64);
  await expect(scene).toHaveClass(/\bis-playing\b/);
  await expect
    .poll(() =>
      scene.evaluate((node) =>
        Number((node as HTMLElement).style.getPropertyValue("--scene-progress")),
      ),
    )
    .toBeCloseTo(progress, 2);
}

async function assertReadingFrame(page: Page, chapter: string, context: string) {
  const scene = page.locator(".stack-experience");
  const stage = scene.locator(".tablet-stage");
  await expect(stage).toHaveAttribute("data-phase", chapter);
  const stageBounds = await rectangle(stage);
  const viewport = page.viewportSize()!;
  const visibleStage = {
    top: Math.max(stageBounds.top, 0),
    left: Math.max(stageBounds.left, 0),
    right: Math.min(stageBounds.right, viewport.width),
    bottom: Math.min(stageBounds.bottom, viewport.height),
    width: Math.min(stageBounds.right, viewport.width) - Math.max(stageBounds.left, 0),
    height: Math.min(stageBounds.bottom, viewport.height) - Math.max(stageBounds.top, 0),
  };
  const screenBounds = await rectangle(scene.locator(".tablet-screen"));
  contained(screenBounds, visibleStage, `${context}: full tablet screen`, 6);

  const panel = scene.locator(`.tablet-story-panel[data-chapter='${chapter}']`);
  contained(await rectangle(panel), screenBounds, `${context}: active panel`);
  const content = panel.locator(
    [
      "h2",
      "h3",
      "p",
      "pre",
      "li",
      ".tablet-screen-header",
      ".tablet-screen-hero",
      ".tablet-overview-facts > div",
      ".tablet-recipe-pane",
      ".tablet-docs-pane",
      ".tablet-ingredients",
      ".tablet-ingredient",
      ".hero-art-wrap",
    ].join(", "),
  );
  for (const element of await content.all()) {
    const name = await element.evaluate((node) => node.className || node.tagName.toLowerCase());
    contained(await rectangle(element), screenBounds, `${context}: ${name}`);
  }

  const captionBounds = await rectangle(scene.locator(".tablet-story-caption"));
  const dotsBounds = await rectangle(scene.locator(".tablet-chapter-dots"));
  contained(captionBounds, visibleStage, `${context}: chapter caption`);
  contained(dotsBounds, visibleStage, `${context}: chapter dots`);
  expect(screenBounds.bottom, `${context}: caption clears screen`).toBeLessThanOrEqual(
    captionBounds.top - 5,
  );
  expect(screenBounds.bottom, `${context}: dots clear screen`).toBeLessThanOrEqual(
    dotsBounds.top - 5,
  );

  if (chapter === "overview") {
    await sequential(panel.locator(":scope > *"), `${context}: overview sections`);
    await sequential(
      panel.locator(
        [
          ".tablet-eyebrow",
          ".tablet-screen-title",
          ".tablet-screen-description",
          ".tablet-overview-description",
          ".hero-art-wrap",
        ].join(", "),
      ),
      `${context}: overview text`,
    );
    await sequential(panel.locator(".tablet-overview-facts > div"), `${context}: overview cards`);
  } else if (chapter === "presets") {
    await sequential(panel.locator(":scope > *"), `${context}: preset sections`);
    await sequential(panel.locator(".tablet-recipe-pane > *"), `${context}: preset card content`);
    const cardBounds = await rectangle(panel.locator(".tablet-recipe-pane"));
    for (const element of await panel.locator(".tablet-recipe-pane > *").all())
      contained(await rectangle(element), cardBounds, `${context}: preset card child`, 4);
  } else {
    await sequential(panel.locator(":scope > *"), `${context}: documentation sections`);
    await sequential(
      panel.locator(".tablet-docs-pane > *"),
      `${context}: documentation card content`,
    );
    await sequential(panel.locator(".tablet-doc-row"), `${context}: documentation rows`);
    for (const row of await panel.locator(".tablet-doc-row").all())
      await sequential(row.locator(":scope > *"), `${context}: documentation row text`);
    const cardBounds = await rectangle(panel.locator(".tablet-docs-pane"));
    const commandBounds = await rectangle(panel.locator(".tablet-command"));
    contained(commandBounds, cardBounds, `${context}: entire command card`, 4);
    contained(
      await rectangle(panel.locator(".tablet-command code")),
      commandBounds,
      `${context}: command text`,
    );
    expect(commandBounds.bottom, `${context}: chapter caption clears command`).toBeLessThanOrEqual(
      captionBounds.top - 5,
    );
    expect(commandBounds.bottom, `${context}: chapter dots clear command`).toBeLessThanOrEqual(
      dotsBounds.top - 5,
    );
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
    `${context}: no horizontal page overflow`,
  ).toBeLessThanOrEqual(viewport.width);
}

for (const viewport of viewports) {
  test(`tablet reading content and captions remain fully framed at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page
      .locator(".tablet-hand")
      .evaluate(async (node) => (node as HTMLImageElement).decode());
    const scene = page.locator(".stack-experience");
    await scene.locator(".tablet-stage").scrollIntoViewIfNeeded();
    await page.clock.runFor(64);
    await expect(scene).toHaveClass(/\bis-playing\b/);
    await expect(scene.locator(".tablet-scene-rail")).toHaveAttribute("aria-hidden", "true");
    await expect(scene.locator(".tablet-chapter-dots")).toHaveAttribute("aria-hidden", "true");
    await expect(
      scene.locator(".tablet-chapter-dots button, .tablet-scene-rail button, [tabindex]"),
    ).toHaveCount(0);

    for (const preset of [release.presets[0]!, longestPreset]) {
      // Recipes rotate only while their reading chapter is out of view.
      await scrollToProgress(page, 0.24);
      const currentId = await scene.getAttribute("data-preset");
      const current = release.presets.findIndex(({ id }) => id === currentId);
      const destination = release.presets.findIndex(({ id }) => id === preset.id);
      const count = (destination - current + release.presets.length) % release.presets.length;
      for (let index = 0; index < count; index += 1) await page.clock.fastForward(12000);
      await expect(scene).toHaveAttribute("data-preset", preset.id);
      for (const stop of readingStops) {
        await scrollToProgress(page, stop.progress);
        await assertReadingFrame(
          page,
          stop.chapter,
          `${viewport.width}×${viewport.height}, ${preset.id}, ${stop.chapter}`,
        );
      }
    }
  });
}
