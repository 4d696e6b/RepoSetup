import { expect, test, type Page } from "@playwright/test";

type ExportedSelection = {
  mode: "create" | "add";
  context?: { frameworkId: string; packageManager: string; runtimeId: string };
  config?: {
    project: { name: string; path?: string };
    framework: { id: string };
    integrations: Array<{ id: string }>;
  };
  integrations?: Array<{ id: string }>;
};

async function exportedSelection(page: Page): Promise<ExportedSelection> {
  const command = await page.getByLabel("RepoSetup command", { exact: true }).inputValue();
  expect(command).toMatch(/^reposetup (create|add) --selection [A-Za-z0-9_-]+$/);
  return JSON.parse(Buffer.from(command.split(" ").at(-1)!, "base64url").toString("utf8"));
}

test("simulated B01: choose a minimal browser starter and skip optional tools", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find your starting point →" }).click();
  await page.getByRole("link", { name: "Explore the minimal preset →" }).first().click();
  await expect(page.getByRole("heading", { name: "Minimal React/Vite" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Optional means optional" })).toBeVisible();
  await page.getByRole("link", { name: "Customize this starting point →" }).click();
  await expect(page.locator("input:checked")).toHaveCount(0);
  await expect(page.getByText("No optional libraries selected.")).toBeVisible();
  await page.getByLabel("Project name").fill("beginner-browser");
  await page.getByLabel("New project folder").fill("beginner-browser");
  await expect(page.getByText("Paste in the parent directory", { exact: false })).toBeVisible();
  const selection = await exportedSelection(page);
  expect(selection).toMatchObject({
    mode: "create",
    config: {
      project: { name: "beginner-browser", path: "beginner-browser" },
      framework: { id: "react-vite" },
      integrations: [],
    },
  });
});

test("simulated B02: learn why Zod helps and select it for a frontend", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "validate input →" }).click();
  await page.getByRole("link", { name: "Zod", exact: true }).click();
  await expect(
    page.getByText("Validate untrusted values against an explicit schema."),
  ).toBeVisible();
  await expect(
    page.getByText("Skip it when you have no input boundary", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: /React \+ Vite · TypeScript · pnpm/ }).click();
  await page.getByLabel("Zod", { exact: true }).check();
  await page.getByText("Expected setup impact").click();
  await expect(page.getByRole("region", { name: "Review selection" })).toContainText("Zod");
  const selection = await exportedSelection(page);
  expect(selection).toMatchObject({
    mode: "create",
    config: { framework: { id: "react-vite" }, integrations: [{ id: "zod" }] },
  });
});

test("simulated B03: choose an Express API and add a test runner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find your starting point →" }).click();
  await page.getByRole("link", { name: "Explore the minimal preset →" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Minimal Express API" })).toBeVisible();
  await page.getByRole("link", { name: "Vitest", exact: true }).click();
  await expect(page.getByText("Run repeatable assertions to catch regressions.")).toBeVisible();
  await expect(page.getByText("Skip a second test runner", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: /Express · TypeScript · pnpm/ }).click();
  await page.getByLabel("Vitest", { exact: true }).check();
  const selection = await exportedSelection(page);
  expect(selection).toMatchObject({
    mode: "create",
    config: { framework: { id: "express" }, integrations: [{ id: "vitest" }] },
  });
});

test("simulated B04: choose a Python API and avoid unavailable Node tools", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find your starting point →" }).click();
  await page.getByRole("link", { name: "Explore the minimal preset →" }).nth(2).click();
  await expect(page.getByRole("heading", { name: "Minimal FastAPI" })).toBeVisible();
  await page.getByRole("link", { name: "pytest", exact: true }).click();
  await expect(page.getByText("Run Python assertions as an automated test suite.")).toBeVisible();
  await page.getByRole("link", { name: /FastAPI · Python · uv/ }).click();
  await expect(page.getByLabel("Vitest", { exact: true })).toBeDisabled();
  await page.getByLabel("pytest", { exact: true }).check();
  const selection = await exportedSelection(page);
  expect(selection).toMatchObject({
    mode: "create",
    config: { framework: { id: "fastapi" }, integrations: [{ id: "pytest" }] },
  });
});

test("simulated B05: add to an existing project, recover from invalid input, and export a file", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "validate input →" }).click();
  await page.getByRole("link", { name: "Zod", exact: true }).click();
  await page.getByRole("link", { name: /Express · TypeScript · pnpm/ }).click();
  await page.getByLabel("New project folder").fill("../outside");
  await expect(page.locator("#selection-error")).toContainText("relative folder");
  await expect(page.getByRole("button", { name: "Copy RepoSetup command" })).toHaveCount(0);
  await page.getByLabel("Project journey").selectOption("add");
  await expect(page.getByLabel("New project folder")).toBeHidden();
  await expect(page.locator("#selection-error")).toContainText("at least one");
  await page.getByLabel("Zod", { exact: true }).check();
  await expect(
    page.getByText("Paste in your existing project package directory", { exact: false }),
  ).toBeVisible();
  const selection = await exportedSelection(page);
  expect(selection).toMatchObject({
    mode: "add",
    context: { runtimeId: "node", frameworkId: "express", packageManager: "pnpm" },
  });
  expect(selection.integrations).toEqual([{ id: "zod" }]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download selection.json" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("selection.json");
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString("utf8"))).toEqual(selection);
});
