import { describe, expect, it } from "vitest";

import type { RepoSetupConfig } from "../config/types.js";
import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import {
  createRecipeRecord,
  parseRecipeRecord,
  planLockedReproduction,
  planRecipeRecord,
  reproductionRequirements,
} from "./recipe.js";

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
  } satisfies RepoSetupConfig,
};

function registry(): RegistryLookup {
  const vite = fakeIntegration({
    id: "vite",
    plan: () => [
      {
        type: "run_command",
        command: "pnpm",
        args: ["create", "vite@8.3.0", "."],
        cwd: ".",
        description: "Scaffold Vite",
      },
    ],
  });
  return {
    get: (id: string) => (id === "vite" ? vite : undefined),
    list: () => [vite],
    byCategory: () => [vite],
  };
}

describe("recipe records", () => {
  it("reconstructs a plan from declarative data", () => {
    const parsed = parseRecipeRecord(record);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(planRecipeRecord(parsed.record, registry()).valid).toBe(true);
  });

  it("rejects executable command injection", () => {
    const parsed = parseRecipeRecord({ ...record, command: "rm -rf /" });
    expect(parsed).toMatchObject({ success: false, error: { code: "RECIPE_INVALID" } });
  });

  it("rejects an unknown config schema and a command hidden in a package spec", () => {
    expect(
      parseRecipeRecord({
        ...record,
        config: { ...record.config, schemaVersion: 2 },
      }),
    ).toMatchObject({ success: false, error: { code: "RECIPE_INVALID" } });
    expect(
      parseRecipeRecord({
        ...record,
        directVersions: { vite: ["vite@8.3.0 && rm -rf /"] },
      }),
    ).toMatchObject({ success: false, error: { code: "RECIPE_INVALID" } });
  });

  it("keeps identical inputs on the same semantic plan", () => {
    const config = record.config;
    const lookup = registry();
    const first = createRecipeRecord({
      config,
      registry: lookup,
      registryRevision: "2026-09-23",
      directVersions: { vite: ["vite@8.3.0"] },
    });
    const second = createRecipeRecord({
      config,
      registry: lookup,
      registryRevision: "2026-09-23",
      directVersions: { vite: ["vite@8.3.0"] },
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.record.planHash).toBe(second.record.planHash);
    expect(first.record.lockfiles).toEqual(["pnpm-lock.yaml"]);
    expect(planRecipeRecord(first.record, lookup).operations).toEqual(
      planRecipeRecord(second.record, lookup).operations,
    );
    expect(reproductionRequirements(first.record).configAloneIsSufficient).toBe(false);
    expect(reproductionRequirements(first.record).summary).toContain("pnpm-lock.yaml");
    expect(reproductionRequirements(first.record).summary).toContain("not byte-identical");
  });

  it("does not execute a record whose hash no longer matches the registry plan", () => {
    const created = createRecipeRecord({
      config: record.config,
      registry: registry(),
      registryRevision: "2026-09-23",
    });
    expect(created.ok).toBe(true);
    if (!created.ok || created.record.planHash === undefined) {
      return;
    }
    const tampered = {
      ...created.record,
      planHash: "a".repeat(64),
    };
    const planned = planRecipeRecord(tampered, registry());
    expect(planned.valid).toBe(false);
    expect(planned.operations).toEqual([]);
    expect(planned.errors[0]?.code).toBe("RECIPE_INVALID");
  });

  it("repeats an install from the lockfile instead of the generator", () => {
    const created = createRecipeRecord({
      config: record.config,
      registry: registry(),
      registryRevision: "2026-09-23",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const first = planLockedReproduction(created.record);
    const second = planLockedReproduction(created.record);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.operation).toMatchObject({
      command: "pnpm",
      args: ["install", "--frozen-lockfile"],
      requiresLockfile: "pnpm-lock.yaml",
    });
    expect(JSON.stringify(first.operation)).not.toContain("create");
    expect(JSON.stringify(first.operation)).not.toContain("@latest");
  });

  it("refuses a locked repeat when the recipe names the wrong lockfile", () => {
    const created = createRecipeRecord({
      config: record.config,
      registry: registry(),
      registryRevision: "2026-09-23",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const planned = planLockedReproduction({
      ...created.record,
      lockfiles: ["package-lock.json"],
    });
    expect(planned).toMatchObject({ ok: false, error: { code: "LOCKFILE_CONFLICT" } });
  });
});
