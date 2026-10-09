import { test, expect } from "@playwright/test";

test("goal chips discover backend frameworks, data layers and real workflow tools", async ({
  page,
}) => {
  await page.goto("/#/integrations");
  const cards = page.locator(".integration-card h2");
  const apps = page.getByRole("button", { name: "Build an app", exact: true });
  await apps.click();
  await expect(apps).toHaveAttribute("aria-pressed", "true");
  await expect(cards).toHaveText([
    "Next.js",
    "React + Vite",
    "Express",
    "Fastify",
    "FastAPI",
    "Flask",
  ]);

  await page.getByRole("button", { name: "Work with data", exact: true }).click();
  await expect(cards).toHaveText([
    "SQLite",
    "PostgreSQL",
    "MongoDB",
    "Prisma",
    "Drizzle ORM",
    "Mongoose",
    "SQLAlchemy",
    "Alembic",
  ]);
  const workflow = page.getByRole("button", { name: "Improve your workflow", exact: true });
  await workflow.click();
  await expect(workflow).toHaveAttribute("aria-pressed", "true");
  await expect(cards).toHaveText([
    "ESLint",
    "Prettier",
    "Ruff",
    "Docker",
    "Docker Compose",
    "GitHub Actions",
  ]);
  await page.getByRole("searchbox", { name: "Search integrations" }).fill("docker");
  await expect(cards).toHaveText(["Docker", "Docker Compose"]);
  await page.getByRole("searchbox", { name: "Search integrations" }).fill("");
  await page.getByLabel("Category", { exact: true }).selectOption("formatting");
  await expect(cards).toHaveText(["Prettier"]);
  await expect(workflow).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "All tools", exact: true }).click();
  await expect(cards).toHaveCount(37);
});

test("relationship targets name dependencies and link to a filtered category", async ({ page }) => {
  await page.goto("/#/integrations/sqlalchemy");
  const relationships = page.locator(".reading-content > ul");
  await expect(relationships).toContainText("Requires: PostgreSQL (postgresql)");
  await expect(relationships).toContainText("Conflicts: Data access category");
  await relationships.getByRole("link", { name: "Data access category" }).click();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("orm");
  await expect(page.locator(".integration-card h2")).toHaveText([
    "Prisma",
    "Drizzle ORM",
    "Mongoose",
    "SQLAlchemy",
  ]);
  await page.goto("/#/docs/integration-sqlalchemy");
  const section = page.locator(".docs-section").filter({ has: page.locator("#relationships") });
  await expect(section).toContainText("requires: PostgreSQL (postgresql)");
  await expect(section.getByRole("link", { name: /PostgreSQL \(postgresql\)/ })).toHaveAttribute(
    "href",
    "#/integrations/postgresql",
  );
  await section.getByRole("link", { name: /PostgreSQL \(postgresql\)/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PostgreSQL");
});
