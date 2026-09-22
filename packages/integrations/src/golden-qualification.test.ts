import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseRepoSetupConfig, planInstallation } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../tests/e2e/fixtures");

const fixtures = [
  ["golden-react-vite.json", ["react-vite", "zod", "vitest", "prettier"]],
  ["golden-express.json", ["express", "postgresql", "prisma", "zod", "vitest", "prettier"]],
  ["golden-fastapi.json", ["fastapi", "pydantic", "sqlalchemy", "alembic", "pytest", "ruff"]],
  ["golden-flask.json", ["flask", "sqlalchemy", "alembic", "pytest", "ruff"]],
] as const;

describe("golden qualification fixtures", () => {
  it.each(fixtures)("plans %s", (fileName, expectedIds) => {
    const parsed = parseRepoSetupConfig(
      JSON.parse(readFileSync(join(fixturesDir, fileName), "utf8")),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const planned = planInstallation(parsed.config, createBuiltInRegistry());
    expect(planned.valid, JSON.stringify(planned.errors)).toBe(true);
    const ids = planned.orderedIntegrations.map((item) => item.id);
    for (const id of expectedIds) {
      expect(ids).toContain(id);
    }
  });
});
