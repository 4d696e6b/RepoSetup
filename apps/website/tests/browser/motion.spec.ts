import { test, expect, type Locator, type Page } from "@playwright/test";

async function runningAnimations(page: Page) {
  return page.evaluate(
    () => document.getAnimations().filter((animation) => animation.playState === "running").length,
  );
}

async function fullyVisible(target: Locator) {
  return target.evaluate((node) => {
    for (let element: Element | null = node; element; element = element.parentElement) {
      const style = getComputedStyle(element);
      if (Number(style.opacity) < 0.99 || style.visibility === "hidden") return false;
    }
    return true;
  });
}

test.describe("system reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("starts with static, readable content and a clearly disabled motion control", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Motion reduced", exact: true })).toBeDisabled();
    await expect.poll(() => runningAnimations(page)).toBe(0);
    const title = page.getByRole("heading", { level: 1 });
    expect(await fullyVisible(title)).toBe(true);
    for (const card of await page.locator(".feature-card").all()) {
      await card.scrollIntoViewIfNeeded();
      expect(await fullyVisible(card)).toBe(true);
    }
    await page.getByRole("link", { name: "Read the documentation" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start with a plan");
    await expect.poll(() => runningAnimations(page)).toBe(0);
  });
});

test("changing the system preference stops live motion without hiding content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Pause animations", exact: true })).toBeEnabled();
  await expect.poll(() => runningAnimations(page)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Motion reduced", exact: true })).toBeDisabled();
  await expect.poll(() => runningAnimations(page)).toBe(0);
  expect(await fullyVisible(page.getByRole("heading", { level: 1 }))).toBe(true);
  for (const card of await page.locator(".feature-card").all()) {
    expect(await fullyVisible(card)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Pause animations", exact: true })).toBeEnabled();
  await expect.poll(() => runningAnimations(page)).toBeGreaterThan(0);
});

test("the pause choice survives navigation and reload, then resumes on request", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Pause animations", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume animations", exact: true })).toBeEnabled();
  await expect.poll(() => runningAnimations(page)).toBe(0);
  for (const card of await page.locator(".feature-card").all()) {
    expect(await fullyVisible(card)).toBe(true);
  }
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find your next step.");
  await expect(page.getByRole("button", { name: "Resume animations", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume animations", exact: true })).toBeEnabled();
  await page.getByRole("link", { name: "RepoSetup home", exact: true }).click();
  await expect.poll(() => runningAnimations(page)).toBe(0);
  await page.getByRole("button", { name: "Resume animations", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause animations", exact: true })).toBeEnabled();
  await expect.poll(() => runningAnimations(page)).toBeGreaterThan(0);
});

test("keyboard focus makes entrance and scroll-reveal links immediately readable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const start = page.locator(".hero-copy").getByRole("link", { name: "Get started" });
  await start.focus();
  await expect(start).toBeFocused();
  await expect.poll(() => fullyVisible(start)).toBe(true);
  const later = page.locator(".feature-card").last().getByRole("link");
  await later.focus();
  await expect(later).toBeFocused();
  await expect.poll(() => fullyVisible(later)).toBe(true);
  await later.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Inspect, diagnose, and export");
  await expect(page.locator("main")).toBeFocused();
});

test("animated illustrations and scrolling keep the page inside narrow and wide viewports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    // A rapid first pointer exit must cancel the queued frame, not leave a tilt.
    expect(
      await page.evaluate(async () => {
        const hero = document.querySelector<HTMLElement>(".hero-visual")!;
        const bounds = hero.getBoundingClientRect();
        hero.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerType: "mouse",
            clientX: bounds.right,
            clientY: bounds.top,
          }),
        );
        hero.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return getComputedStyle(hero.querySelector(".hero-art-wrap")!).transform;
      }),
    ).toBe("none");
    await page.locator(".hero-art-wrap").hover();
    const artBox = await page.locator(".hero-art-wrap").boundingBox();
    expect(artBox).not.toBeNull();
    await page.mouse.move(artBox!.x + artBox!.width * 0.8, artBox!.y + artBox!.height * 0.3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.getByRole("link", { name: "Explore the workflow" }).click();
    await expect
      .poll(
        () => page.evaluate(() => ({ hash: location.hash, active: document.activeElement?.id })),
        { message: `Workflow focus at ${width}px` },
      )
      .toEqual({ hash: "#/#workflow", active: "workflow" });
    for (const card of await page.locator(".feature-card").all()) {
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
    await page.getByRole("link", { name: "RepoSetup home", exact: true }).click();
    await page.getByRole("link", { name: "Docs", exact: true }).click();
    await expect(page.locator(".hero-art-wrap")).toHaveCount(0);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your stack.Ready to build.");
  }
  expect(errors).toEqual([]);
});

test("motion leaves deep documentation entry, search and recipe download usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#/docs/create#confirmation");
  const heading = page.locator("#confirmation");
  await expect(heading).toBeFocused();
  expect(await fullyVisible(heading)).toBe(true);
  expect(
    await page.locator(".docs-article").evaluate((node) => getComputedStyle(node).transform),
  ).toBe("none");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("searchbox", { name: "Search documentation and integrations" });
  await expect(search).toBeFocused();
  await search.fill("dry run");
  await expect(page.getByRole("dialog").getByRole("status")).not.toHaveText("0 results");
  await page.keyboard.press("Escape");
  await page.goto("/#/builder/next-sqlite");
  await page.getByLabel("Project name", { exact: true }).fill("motion-review");
  await expect(page.getByRole("region", { name: "Review your setup" })).toContainText(
    "npx rsetup@0.2.3 create --config reposetup-motion-review.json --dry-run",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download reposetup-motion-review.json" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("reposetup-motion-review.json");
});
