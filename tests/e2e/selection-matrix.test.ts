import { readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./harness.js";
import { describe, expect, it } from "vitest";
import { BEGINNER_CATALOG } from "../../packages/integrations/src/beginner-catalog.js";
import { builtInIntegrations } from "../../packages/integrations/src/index.js";
import { createRegistry, validateSelection } from "../../packages/registry/src/index.js";
import { SELECTION_LIMITS } from "../../packages/core/src/selection/format.js";
import { journeys, matrix, selectionFor } from "./selection-matrix.js";

const registry = createRegistry(builtInIntegrations);

describe("frozen selection qualification matrix", () => {
  it("keeps catalog, pins, limits and contexts aligned with the reviewed matrix", () => {
    expect(matrix.schemaVersion).toBe(1);
    expect(matrix.revision).toBe("0.3.0-selection.4");
    expect(matrix.catalogRevision).toBe(BEGINNER_CATALOG.revision);
    expect(matrix.recipeRevision).toBe(BEGINNER_CATALOG.recipeRevision);
    expect(matrix.cliContract).toBe(BEGINNER_CATALOG.cliContract);
    expect(matrix.directVersions).toEqual(BEGINNER_CATALOG.directVersions);
    expect(matrix.limits).toEqual(SELECTION_LIMITS);
    expect(
      matrix.contexts.map(({ id, context, optionalIds }) => ({ id, context, optionalIds })),
    ).toEqual(
      BEGINNER_CATALOG.contexts.map(({ id, context, optionalIds }) => ({
        id,
        context,
        optionalIds,
      })),
    );
    expect(matrix.contexts.map(({ presetId }) => presetId)).toEqual(
      BEGINNER_CATALOG.presets.map(({ id }) => id),
    );
  });

  it("enumerates every advertised subset exactly once with no empty add selection", () => {
    for (const context of matrix.contexts) {
      const expected = Array.from({ length: 2 ** context.optionalIds.length }, (_, mask) =>
        context.optionalIds.filter((_, index) => mask & (1 << index)),
      );
      expect(context.variants).toEqual(expected);
      expect(new Set(context.variants.map((ids) => ids.join(","))).size).toBe(expected.length);
    }
    expect(journeys.filter(({ mode }) => mode === "create")).toHaveLength(24);
    expect(journeys.filter(({ mode }) => mode === "add")).toHaveLength(21);
    expect(new Set(journeys.map(({ id }) => id)).size).toBe(45);
    expect(Object.keys(matrix.planSha256).sort()).toEqual(journeys.map(({ id }) => id).sort());
    for (const digest of Object.values(matrix.planSha256)) expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each(journeys)(
    "resolves $id using the built-in registry without widening options",
    ({ context, ids, mode }) => {
      const selection = selectionFor(context, ids, mode);
      const result = validateSelection(selection, registry, BEGINNER_CATALOG);
      expect(result).toMatchObject({ ok: true, selection });
    },
  );

  it("keeps the minimal starter fixtures consistent with the reusable preset definitions", () => {
    for (const context of matrix.contexts) {
      const preset = BEGINNER_CATALOG.presets.find(({ id }) => id === context.presetId)!;
      const selection = selectionFor(context, [], "create");
      if (selection.mode !== "create") throw new Error("Expected create fixture");
      expect({ ...selection.config, project: preset.config.project }).toEqual(preset.config);
    }
  });

  it("retains the agreed runtime/platform targets without treating local Node 22 as qualification", () => {
    const workspace = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    expect(workspace.packageManager).toBe(`pnpm@${matrix.runtimes.pnpm}`);
    expect(matrix.runtimes).toEqual({
      nodeMajor: 24,
      pnpm: "12.5.1",
      python: ["3.12", "3.13"],
      uv: "0.12.17",
    });
    expect(matrix.platforms).toEqual([
      { runner: "ubuntu-24.04", platform: "linux", architecture: "x64" },
      { runner: "macos-15", platform: "darwin", architecture: "arm64" },
      { runner: "windows-2025", platform: "win32", architecture: "x64" },
    ]);
  });
});
