import { describe, expect, it } from "vitest";

import { builtInIntegrations, createBuiltInRegistry } from "./catalog.js";

describe("built-in catalog", () => {
  it("registers unique built-in integrations", () => {
    expect(builtInIntegrations.map((definition) => definition.id)).toEqual([
      "node",
      "npm",
      "pnpm",
      "nextjs",
      "react-vite",
      "express",
      "fastify",
      "tailwind",
      "shadcn",
      "sqlite",
      "postgresql",
      "mongodb",
      "prisma",
      "drizzle",
      "mongoose",
      "zod",
      "vitest",
      "playwright",
      "eslint",
      "prettier",
      "docker",
      "docker-compose",
      "github-actions",
    ]);
  });

  it("passes registry validation", () => {
    expect(createBuiltInRegistry().validate()).toEqual({ valid: true, errors: [] });
  });
});
