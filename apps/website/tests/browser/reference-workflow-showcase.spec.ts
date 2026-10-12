import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("workflow walkthrough uses accessible tabs, fixed controls and published examples", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const section = page.getByRole("region", { name: "See the bigger picture." });
  const illustration = section.locator("#workflow-panel-preview .showcase-art img");
  await expect
    .poll(() => illustration.evaluate((node) => getComputedStyle(node).animationPlayState))
    .toBe("paused");
  await section.scrollIntoViewIfNeeded();
  await expect
    .poll(() => illustration.evaluate((node) => getComputedStyle(node).animationPlayState))
    .toBe("running");
  await expect(page.locator(".stack-experience")).not.toHaveClass(/is-playing/);
  const tabs = section.getByRole("tab");
  const preview = section.getByRole("tab", { name: "Preview", exact: true });
  const confirm = section.getByRole("tab", { name: "Confirm", exact: true });
  const inspect = section.getByRole("tab", { name: "Inspect", exact: true });
  await preview.focus();
  await expect(preview).toHaveAttribute("aria-selected", "true");
  await preview.press("ArrowRight");
  await expect(confirm).toBeFocused();
  await expect(confirm).toHaveAttribute("aria-selected", "true");
  await expect(section.getByRole("tabpanel")).toHaveCount(1);
  await expect(section.getByRole("tabpanel")).toContainText("asks for confirmation");
  await expect(section.getByRole("tabpanel").locator("code")).toHaveText(
    "npx rsetup create --config reposetup-my-app.json",
  );
  await confirm.press("End");
  await expect(inspect).toBeFocused();
  await expect(section.getByRole("tabpanel").locator("code")).toHaveText(
    "npx rsetup stack\nnpx rsetup doctor",
  );
  await section.getByRole("button", { name: "Copy inspect workflow commands" }).click();
  await expect(section.getByRole("status")).toHaveText("Copied");
  await inspect.focus();
  await inspect.press("ArrowRight");
  await expect(preview).toBeFocused();
  await expect(preview).toHaveAttribute("tabindex", "0");
  await expect(confirm).toHaveAttribute("tabindex", "-1");
  await preview.press("ArrowLeft");
  await expect(inspect).toBeFocused();
  await inspect.press("Home");
  await expect(preview).toBeFocused();
  await expect(tabs).toHaveCount(3);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of [preview, confirm, inspect]) {
      await tab.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      const scan = await new AxeBuilder({ page })
        .include(".workflow-showcase")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
  }
  await preview.click();
  await section.getByRole("link", { name: "Understand the preview" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Read a dry-run plan");
});
