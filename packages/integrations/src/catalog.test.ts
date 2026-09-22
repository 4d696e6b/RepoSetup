import { describe, expect, it } from "vitest";

import { builtInIntegrations, createBuiltInRegistry } from "./catalog.js";

const CANDIDATE_IDS = [
  "node",
  "python",
  "npm",
  "pnpm",
  "uv",
  "pip",
  "nextjs",
  "react-vite",
  "express",
  "fastapi",
  "flask",
  "tailwind",
  "sqlite",
  "prisma",
  "zod",
  "pydantic",
  "vitest",
  "pytest",
  "eslint",
  "prettier",
  "ruff",
  "sqlalchemy",
  "alembic",
] as const;

const EXPERIMENTAL_IDS = [
  "fastify",
  "shadcn",
  "postgresql",
  "mongodb",
  "drizzle",
  "mongoose",
  "playwright",
  "docker",
  "docker-compose",
  "github-actions",
] as const;

describe("built-in catalog", () => {
  it("registers unique built-in integrations", () => {
    expect(builtInIntegrations.map((definition) => definition.id)).toEqual([
      "node",
      "python",
      "npm",
      "pnpm",
      "uv",
      "pip",
      "nextjs",
      "react-vite",
      "express",
      "fastify",
      "fastapi",
      "flask",
      "tailwind",
      "shadcn",
      "sqlite",
      "postgresql",
      "mongodb",
      "prisma",
      "drizzle",
      "mongoose",
      "sqlalchemy",
      "alembic",
      "zod",
      "pydantic",
      "vitest",
      "playwright",
      "pytest",
      "eslint",
      "prettier",
      "ruff",
      "docker",
      "docker-compose",
      "github-actions",
    ]);
  });

  it("passes registry validation", () => {
    expect(createBuiltInRegistry().validate()).toEqual({ valid: true, errors: [] });
  });

  it("records freshness metadata and honest maturity for every built-in integration", () => {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    const byId = new Map(builtInIntegrations.map((definition) => [definition.id, definition]));

    for (const id of CANDIDATE_IDS) {
      expect(byId.get(id)?.status).toBe("candidate");
    }
    for (const id of EXPERIMENTAL_IDS) {
      expect(byId.get(id)?.status).toBe("experimental");
    }

    for (const definition of builtInIntegrations) {
      expect(["stable", "candidate", "experimental", "deprecated"]).toContain(definition.status);
      expect(definition.status).not.toBe("stable");
      expect(definition.status).not.toBe("deprecated");
      expect(definition.documentationUrl.startsWith("https://")).toBe(true);
      expect(definition.verification?.verifiedAt).toMatch(isoDate);
      expect(Number.isNaN(Date.parse(`${definition.verification?.verifiedAt}T00:00:00Z`))).toBe(
        false,
      );
    }
  });
});
