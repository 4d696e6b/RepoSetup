import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { authoredPages } from "../../src/reference/docs/content.js";

const reference = JSON.parse(
  readFileSync(new URL("../../src/reference/generated/release.json", import.meta.url), "utf8"),
) as {
  integrations: { id: string }[];
  presets: { id: string }[];
  cli: { commands: { id: string }[] };
};
const beginner = JSON.parse(
  readFileSync(new URL("../../src/generated/catalog.json", import.meta.url), "utf8"),
) as { guidance: { id: string }[]; presets: { id: string }[]; contexts: { id: string }[] };

const routes = [
  ...new Set([
    "/",
    "/docs",
    "/integrations",
    "/presets",
    "/release",
    "/goals",
    "/how-to",
    "/learn/libraries",
    "/learn/starters",
    ...authoredPages.map((page) => `/docs/${page.slug}`),
    ...reference.integrations.flatMap((entry) => [
      `/integrations/${entry.id}`,
      `/docs/integration-${entry.id}`,
    ]),
    ...reference.presets.flatMap((entry) => [`/builder/${entry.id}`, `/docs/preset-${entry.id}`]),
    ...reference.cli.commands.map((entry) => `/docs/cli-${entry.id}`),
    ...["cli", "cli-global", "cli-exit-codes", "integrations", "preset-reference"].map(
      (slug) => `/docs/${slug}`,
    ),
    ...beginner.guidance.map((entry) => `/learn/libraries/${entry.id}`),
    ...beginner.presets.map((entry) => `/presets/${entry.id}`),
    ...beginner.contexts.flatMap((entry) => [
      `/builder/${entry.id}`,
      `/builder/${entry.id}?mode=add`,
    ]),
  ]),
];

test("all reference and beginner routes keep the same typography and text palette", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  await page.goto("/#/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const baseline = await page.locator("main h1").evaluate((heading) => ({
    font: getComputedStyle(heading).fontFamily,
    color: getComputedStyle(heading).color,
  }));
  const observations = [];
  for (const route of routes) {
    await page.goto(`/#${route}`);
    if (
      /^\/(goals|how-to|learn\/|presets\/beginner-|builder\/(react-vite-ts-pnpm|express-ts-pnpm|fastapi-uv))/.test(
        route,
      )
    ) {
      await expect(page.locator(".beginner-surface"), route).toBeVisible();
    }
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading, route).toBeVisible();
    await expect(heading, route).not.toHaveText(/not found/i);
    await expect(heading, route).toHaveCSS("font-family", baseline.font);
    await expect(heading, route).toHaveCSS("color", baseline.color);
    const observed = await heading.evaluate((element) => ({
      font: getComputedStyle(element).fontFamily,
      color: getComputedStyle(element).color,
    }));
    const content = await page.locator(".beginner-surface, .docs-article").all();
    for (const surface of content) {
      const family = await surface.evaluate((element) => getComputedStyle(element).fontFamily);
      expect(family, route).toBe(baseline.font);
    }
    observations.push({ route, ...observed });
  }
  await testInfo.attach("route-theme-evidence", {
    body: JSON.stringify(observations, null, 2),
    contentType: "application/json",
  });
});

test("beginner buttons, forms and focus use the shared reference theme", async ({ page }) => {
  await page.goto("/#/");
  const primary = page.locator("main .button.primary").first();
  const baseline = await primary.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      font: style.fontFamily,
      background: style.backgroundColor,
      color: style.color,
      radius: style.borderRadius,
    };
  });
  await page.goto("/#/builder/react-vite-ts-pnpm");
  const copy = page.getByRole("button", { name: "Copy RepoSetup command", exact: true });
  await expect(copy).toBeVisible();
  expect(
    await copy.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        font: style.fontFamily,
        background: style.backgroundColor,
        color: style.color,
        radius: style.borderRadius,
      };
    }),
  ).toEqual(baseline);
  const name = page.getByLabel("Project name", { exact: true });
  await name.focus();
  expect(
    await name.evaluate((element) => ({
      font: getComputedStyle(element).fontFamily,
      outline: getComputedStyle(element).outlineColor,
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    })),
  ).toMatchObject({ font: baseline.font, outline: "rgb(167, 63, 34)", accent: "#a73f22" });
  await name.fill("../invalid");
  await expect(page.locator("#project-name")).toHaveAttribute("aria-invalid", "true");
  await expect(copy).toHaveCount(0);
  await name.fill("theme-app");
  await expect(
    page.getByRole("button", { name: "Copy RepoSetup command", exact: true }),
  ).toBeEnabled();
});
