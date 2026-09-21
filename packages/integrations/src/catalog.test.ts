import { describe, expect, it } from "vitest";

import { builtInIntegrations, createBuiltInRegistry } from "./catalog.js";

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
});
