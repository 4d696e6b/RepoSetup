import { describe, expect, it } from "vitest";

import { builtInIntegrations, createBuiltInRegistry } from "./catalog.js";

describe("built-in catalog", () => {
  it("registers unique Phase 7 integrations", () => {
    expect(builtInIntegrations.map((definition) => definition.id)).toEqual([
      "node",
      "npm",
      "pnpm",
      "nextjs",
      "tailwind",
      "sqlite",
      "prisma",
      "zod",
      "vitest",
      "prettier",
    ]);
  });

  it("passes registry validation", () => {
    expect(createBuiltInRegistry().validate()).toEqual({ valid: true, errors: [] });
  });
});
