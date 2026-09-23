import { describe, expect, it } from "vitest";
import { fakeIntegration } from "../resolution/fake-integration.js";
import { parseRecipeRecord, planRecipeRecord } from "./recipe.js";

const record = {
  recipeVersion: 1,
  registryRevision: "builtin-0.2",
  lockfiles: ["pnpm-lock.yaml"],
  config: {
    schemaVersion: 1,
    project: { name: "demo" },
    runtime: { id: "node" },
    packageManager: "pnpm",
    framework: { id: "vite" },
    integrations: [],
  },
};
describe("recipe records", () => {
  it("reconstructs a plan from declarative data", () => {
    const parsed = parseRecipeRecord(record);
    const vite = fakeIntegration({ id: "vite" });
    const registry = {
      get: (id: string) => (id === "vite" ? vite : undefined),
      list: () => [vite],
      byCategory: () => [vite],
    };
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(planRecipeRecord(parsed.record, registry).valid).toBe(true);
  });
  it("rejects executable command injection", () => {
    const parsed = parseRecipeRecord({ ...record, command: "rm -rf /" });
    expect(parsed).toMatchObject({ success: false, error: { code: "RECIPE_INVALID" } });
  });
});
