import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

import type releaseData from "../../src/reference/generated/release.json";

const release = JSON.parse(
  readFileSync(new URL("../../src/reference/generated/release.json", import.meta.url), "utf8"),
) as typeof releaseData;
const longestPreset = [...release.presets].sort(
  (left, right) => right.config.integrations.length - left.config.integrations.length,
)[0]!;

function scene(page: Page) {
  return page.locator(".stack-experience");
}

async function visibleScene(page: Page) {
  const experience = scene(page);
  await experience.locator(".tablet-stage").scrollIntoViewIfNeeded();
  await page.clock.runFor(64);
  await expect(experience).toHaveClass(/\bis-playing\b/);
  return experience;
}

async function advancePreset(page: Page) {
  // Each recursive timeout must run before advancing to its successor.
  await page.clock.fastForward(12000);
}

async function currentState(experience: Locator) {
  return experience.evaluate((node) => {
    const stage = node.querySelector<HTMLElement>(".tablet-stage")!;
    return {
      preset: (node as HTMLElement).dataset.preset,
      phase: stage.dataset.phase,
      progress: stage.dataset.progress,
      recipe: node.querySelector(".tablet-current-recipe")!.textContent,
    };
  });
}

async function runningAnimations(page: Page) {
  return page.evaluate(
    () => document.getAnimations().filter((animation) => animation.playState === "running").length,
  );
}

async function runningSceneAnimations(experience: Locator) {
  return experience.evaluate((node) =>
    node
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === "running")
      .map((animation) => ({
        name:
          animation instanceof CSSAnimation ? animation.animationName : "transition or entrance",
        pending: animation.pending,
      })),
  );
}

async function assertRecipe(experience: Locator, preset: (typeof release.presets)[number]) {
  await expect(experience).toHaveAttribute("data-preset", preset.id);
  await expect(experience.locator(".tablet-stage")).toHaveAttribute("data-preset", preset.id);
  await expect(experience.locator(".tablet-current-recipe")).toHaveText(preset.name);
  const framework = release.integrations.find(
    (integration) => integration.id === preset.config.framework.id,
  )!;
  await expect(experience.locator(".tablet-framework")).toContainText(framework.name);
  expect(
    await experience
      .locator(".tablet-ingredient")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({ id: (node as HTMLElement).dataset.id, name: node.textContent })),
      ),
  ).toEqual(
    preset.config.integrations.map(({ id }) => ({
      id,
      name: release.integrations.find((integration) => integration.id === id)!.name,
    })),
  );
  const ids = new Set([
    preset.config.runtime.id,
    preset.config.packageManager,
    preset.config.framework.id,
    ...preset.config.integrations.map(({ id }) => id),
  ]);
  const experimental = release.integrations.filter(
    ({ id, status }) => ids.has(id) && status === "experimental",
  );
  for (const integration of experimental)
    await expect(experience.locator(".tablet-support")).toContainText(integration.name);
  if (experimental.length === 0)
    await expect(experience.locator(".tablet-support")).not.toContainText(/experimental/i);
  await expect(experience).not.toContainText(/0\.3\.\d|0\.4\.\d|--selection|--recipe\b/);
}

async function cinematicProgress(experience: Locator) {
  return experience.evaluate((node) =>
    (node as HTMLElement).style.getPropertyValue("--scene-progress").trim(),
  );
}

async function scrollScene(page: Page, fraction: number) {
  await scene(page)
    .locator(".tablet-scroll-track")
    .evaluate((node, fraction) => {
      const bounds = node.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + bounds.top + (bounds.height - innerHeight) * fraction);
      window.dispatchEvent(new Event("scroll"));
    }, fraction);
  await page.clock.runFor(64);
  await expect
    .poll(async () => Number(await cinematicProgress(scene(page))))
    .toBeCloseTo(fraction, 2);
}

test("the passive scene automatically shows all five exact presets with a stable discovery link", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const experience = await visibleScene(page);
  await expect(
    experience.locator("button, select, input, textarea, [aria-live], [role='status']"),
  ).toHaveCount(0);
  await expect(experience.locator(".tablet-stage")).not.toHaveAttribute("tabindex");
  await expect(experience.locator(".tablet-stage")).not.toHaveAttribute("role", "group");
  await expect(experience.locator(".tablet-screen")).toHaveAttribute("aria-hidden", "true");
  await expect(experience.locator(".tablet-hand")).toHaveAttribute(
    "src",
    /brand\/tablet-hand\.png$/,
  );
  expect(
    await experience.locator(".tablet-hand").evaluate(async (node) => {
      const image = node as HTMLImageElement;
      await image.decode();
      return image.naturalWidth > 0 && image.alt === "";
    }),
  ).toBe(true);
  await expect(
    experience.locator(".tablet-screen a, .tablet-screen button, [tabindex]"),
  ).toHaveCount(0);
  await expect(experience).not.toContainText(/drag to explore|arrow keys|view controls/i);
  const discovery = experience.getByRole("link", { name: "Explore the presets →", exact: true });
  await discovery.evaluate((node) => (node as HTMLElement).focus({ preventScroll: true }));
  const caption = await experience.locator(".tablet-caption").innerHTML();

  for (const preset of release.presets) {
    await assertRecipe(experience, preset);
    await page.clock.fastForward(12000);
    await expect(discovery).toBeFocused();
    await expect(discovery).toHaveAttribute("href", "#/presets");
    expect(await experience.locator(".tablet-caption").innerHTML()).toBe(caption);
  }
  await assertRecipe(experience, release.presets[0]!);
  await discovery.press("Enter");
  await expect(page).toHaveURL(/#\/presets$/);
  await expect(scene(page)).toHaveCount(0);
});

test("the independent preset builder still downloads the exact published 0.2.3 configuration", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/#/builder/${longestPreset.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start with a clear plan.");
  await expect(page.getByRole("combobox", { name: "Starting preset" })).toHaveValue(
    longestPreset.id,
  );
  await expect(scene(page)).toHaveCount(0);
  await page.getByLabel("Project name", { exact: true }).fill("scene-review");
  await expect(page.getByRole("region", { name: "Review your setup" })).toContainText(
    "npx rsetup create --config reposetup-scene-review.json --dry-run",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download reposetup-scene-review.json" }).click(),
  ]);
  expect(JSON.parse(readFileSync((await download.path())!, "utf8"))).toEqual({
    ...longestPreset.config,
    project: { name: "scene-review", path: "scene-review" },
  });
});

test("offscreen and hidden scenes pause both the recipe timer and their CSS loops", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const experience = await visibleScene(page);
  await page.clock.fastForward(4000);
  await scrollScene(page, 0.1);
  const beforeScroll = await cinematicProgress(experience);
  await scrollScene(page, 0.3);
  expect(await cinematicProgress(experience)).not.toBe(beforeScroll);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(experience).not.toHaveClass(/\bis-playing\b/);
  const offscreen = await currentState(experience);
  // CSS animation pauses settle at the next rendering update, especially in Firefox.
  await page.clock.runFor(32);
  await expect.poll(() => runningSceneAnimations(experience)).toEqual([]);
  await page.clock.fastForward(24000);
  expect(await currentState(experience)).toEqual(offscreen);

  await visibleScene(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(experience).not.toHaveClass(/\bis-playing\b/);
  const hidden = await currentState(experience);
  await page.clock.runFor(32);
  await expect.poll(() => runningSceneAnimations(experience)).toEqual([]);
  await page.clock.fastForward(24000);
  expect(await currentState(experience)).toEqual(hidden);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(experience).toHaveClass(/\bis-playing\b/);
  await page.clock.fastForward(12000);
  await expect(experience).toHaveAttribute("data-preset", release.presets[1]!.id);
});

test("the decorative stage leaves native touch scrolling and pinch zoom available", async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const experience = scene(page);
  const stage = experience.locator(".tablet-stage");
  const before = await currentState(experience);
  expect(
    await stage.evaluate((node) => {
      const element = node as HTMLElement;
      const box = element.getBoundingClientRect();
      const outcomes = ["pointerdown", "pointermove", "pointerup"].map((type, index) => {
        const event = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 73,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          clientX: box.x + box.width / 2 + index * 40,
          clientY: box.y + box.height / 2 - index * 40,
        });
        element.dispatchEvent(event);
        return { prevented: event.defaultPrevented, captured: element.hasPointerCapture(73) };
      });
      return { outcomes, touchAction: getComputedStyle(element).touchAction };
    }),
  ).toEqual({
    outcomes: Array.from({ length: 3 }, () => ({ prevented: false, captured: false })),
    touchAction: "auto",
  });
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
    "content",
    /user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/i,
  );
  if (browserName === "chromium" && isMobile) {
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    const initialScroll = await page.evaluate(() => scrollY);
    const client = await context.newCDPSession(page);
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step += 1)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - step * 15 }],
      });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initialScroll);
    await client.detach();
  }
  expect(await currentState(experience)).toEqual(before);
});

test("the tablet zoom and screen scroll fit 320, 390, 768 and 1440px layouts", async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const experience = await visibleScene(page);
  for (
    let index = 0;
    index < release.presets.findIndex(({ id }) => id === longestPreset.id);
    index += 1
  )
    await advancePreset(page);
  await assertRecipe(experience, longestPreset);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await visibleScene(page);
    const transforms: { device: string; content: string }[] = [];
    for (const fraction of [0, 0.24, 0.38, 0.54, 0.7, 0.9, 1]) {
      await scrollScene(page, fraction);
      transforms.push(
        await experience.evaluate((node) => ({
          device: getComputedStyle(node.querySelector(".tablet-device")!).transform,
          content: getComputedStyle(node.querySelector(".tablet-screen-content")!).transform,
        })),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${width}px at native scroll progress ${fraction}`,
      ).toBeLessThanOrEqual(width);
      if ([0.24, 0.54, 0.9].includes(fraction)) {
        expect(
          Number(
            await experience.evaluate((node) =>
              (node as HTMLElement).style.getPropertyValue("--camera-zoom"),
            ),
          ),
        ).toBe(1);
        const chapter = fraction === 0.24 ? "overview" : fraction === 0.54 ? "presets" : "docs";
        await expect(experience.locator(".tablet-stage")).toHaveAttribute("data-phase", chapter);
        const panel = experience.locator(`.tablet-story-panel[data-chapter='${chapter}']`);
        const boxes = await panel.evaluate((node) =>
          [node, ...Array.from(node.children)].map((child) => ({
            className: child.className,
            height: child.clientHeight,
            contentHeight: child.scrollHeight,
          })),
        );
        expect(
          boxes.filter((box) => box.contentHeight > box.height + 2),
          `${chapter} information fits its tablet screen at ${width}px`,
        ).toEqual([]);
      }
      const link = experience.locator(".tablet-presets-link");
      await expect(link).toBeVisible();
      expect(
        await link.evaluate((node) => {
          const box = node.getBoundingClientRect();
          return box.left >= 0 && box.right <= document.documentElement.clientWidth;
        }),
      ).toBe(true);
    }
    expect(transforms[0]!.device).not.toBe(transforms.at(-1)!.device);
    expect(transforms[0]!.content).not.toBe(transforms.at(-1)!.content);
  }
});

test("default and experimental passive recipe scenes pass accessibility at 320px", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  const experience = await visibleScene(page);
  for (const preset of [release.presets[0]!, longestPreset]) {
    const currentId = await experience.getAttribute("data-preset");
    const current = release.presets.findIndex(({ id }) => id === currentId);
    const destination = release.presets.findIndex(({ id }) => id === preset.id);
    const count = (destination - current + release.presets.length) % release.presets.length;
    for (let index = 0; index < count; index += 1) await advancePreset(page);
    await assertRecipe(experience, preset);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations, `Passive recipe ${preset.id} at 320px`).toEqual([]);
    expect(
      await experience.locator(".tablet-caption").evaluate((node) => {
        for (let element: Element | null = node; element; element = element.parentElement) {
          const style = getComputedStyle(element);
          if (Number(style.opacity) < 0.99 || style.visibility === "hidden") return false;
        }
        return true;
      }),
    ).toBe(true);
  }
});

test("reduced motion shows the static default and live preference changes stop automatic cycling", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const experience = scene(page);
  await experience.locator(".tablet-stage").scrollIntoViewIfNeeded();
  const initial = await currentState(experience);
  expect(initial).toMatchObject({ preset: "next-sqlite", phase: "overview", progress: "0" });
  expect(await cinematicProgress(experience)).toBe("0");
  await expect(experience).not.toHaveClass(/\bis-playing\b/);
  await page.clock.fastForward(24000);
  expect(await currentState(experience)).toEqual(initial);
  await expect.poll(() => runningAnimations(page)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await visibleScene(page);
  await expect.poll(() => runningAnimations(page)).toBeGreaterThan(0);
  await advancePreset(page);
  await expect(experience).toHaveAttribute("data-preset", release.presets[1]!.id);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(experience).not.toHaveClass(/\bis-playing\b/);
  expect(await currentState(experience)).toEqual(initial);
  expect(await cinematicProgress(experience)).toBe("0");
  await page.evaluate(() => window.scrollBy(0, 75));
  await page.clock.runFor(32);
  expect(await cinematicProgress(experience)).toBe("0");
  await page.clock.fastForward(24000);
  expect(await currentState(experience)).toEqual(initial);
  await expect.poll(() => runningAnimations(page)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await visibleScene(page);
  await page.clock.fastForward(12000);
  await expect(experience).toHaveAttribute("data-preset", release.presets[1]!.id);
});

test("route cleanup stops detached scene timers and back navigation starts a fresh scene", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const experience = await visibleScene(page);
  await page.clock.fastForward(4000);
  const old = await experience.elementHandle();
  expect(old).not.toBeNull();
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(scene(page)).toHaveCount(0);
  const detached = await old!.evaluate((node) => node.outerHTML);
  await page.clock.fastForward(24000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(await old!.evaluate((node) => node.outerHTML)).toBe(detached);
  await page.goBack();
  const replacement = await visibleScene(page);
  expect(await currentState(replacement)).toMatchObject({
    preset: "next-sqlite",
    phase: "overview",
  });
  await page.clock.fastForward(12000);
  await expect(replacement).toHaveAttribute("data-preset", release.presets[1]!.id);
  expect(errors).toEqual([]);
});

test("reading the preset chapter freezes its recipe and preserves the remaining cycle time", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const experience = await visibleScene(page);
  await page.clock.fastForward(4000);
  await scrollScene(page, 0.54);
  await expect(experience.locator(".tablet-stage")).toHaveAttribute("data-phase", "presets");
  const recipe = experience.locator(".tablet-recipe-pane");
  const readingText = await recipe.innerText();
  await assertRecipe(experience, release.presets[0]!);

  await page.clock.fastForward(24000);
  expect(await recipe.innerText()).toBe(readingText);
  await assertRecipe(experience, release.presets[0]!);
  await scrollScene(page, 0.57);
  await expect(experience.locator(".tablet-stage")).toHaveAttribute("data-phase", "presets");
  await page.clock.fastForward(24000);
  expect(await recipe.innerText()).toBe(readingText);
  await assertRecipe(experience, release.presets[0]!);

  await scrollScene(page, 0.24);
  await expect(experience.locator(".tablet-stage")).toHaveAttribute("data-phase", "overview");
  await page.clock.runFor(7000);
  await assertRecipe(experience, release.presets[0]!);
  // Four seconds were already consumed before reading. A reset to the full
  // twelve-second interval would still show the original recipe at this point.
  await page.clock.runFor(2000);
  await assertRecipe(experience, release.presets[1]!);
});
