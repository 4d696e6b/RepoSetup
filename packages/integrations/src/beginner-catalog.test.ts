import { describe, expect, it } from "vitest";
import { decodeSelection, encodeSelection, planInstallation } from "@reposetup/core";
import {
  exportBeginnerCatalog,
  validateBeginnerCatalog,
  validateSelection,
} from "@reposetup/registry";
import { BEGINNER_CATALOG } from "./beginner-catalog.js";
import { createBuiltInRegistry } from "./catalog.js";
import { BUNDLED_PRESETS, findBundledPreset } from "./presets.js";

const registry = createBuiltInRegistry();
const envelope = {
  selectionVersion: 1,
  catalogRevision: BEGINNER_CATALOG.revision,
  cliContract: "selection-v1",
  mode: "create",
};

describe("beginner catalog and selection resolution", () => {
  it("exports strictly validated public data and keeps all legacy presets", () => {
    expect(JSON.parse(exportBeginnerCatalog(BEGINNER_CATALOG, registry))).toEqual(BEGINNER_CATALOG);
    expect(BUNDLED_PRESETS.map((item) => item.id)).toEqual([
      "next-sqlite",
      "react-vite",
      "express-postgres",
      "fastapi",
      "flask",
    ]);
    expect(findBundledPreset("react-vite")?.config.integrations.map((item) => item.id)).toContain(
      "shadcn",
    );
    expect(registry.search("test an app").map((item) => item.id)).toEqual(
      expect.arrayContaining(["vitest", "pytest"]),
    );
  });
  it("plans every bounded subset and round-trips token/file choices", () => {
    for (const preset of BEGINNER_CATALOG.presets) {
      const context = BEGINNER_CATALOG.contexts.find((item) => item.id === preset.contextId)!;
      for (let mask = 0; mask < 2 ** context.optionalIds.length; mask++) {
        const config = structuredClone(preset.config);
        config.integrations = context.optionalIds
          .filter((_, i) => mask & (1 << i))
          .map((id) => ({ id, options: {} }));
        const valid = validateSelection({ ...envelope, config }, registry, BEGINNER_CATALOG);
        expect(valid.ok, JSON.stringify(valid)).toBe(true);
        if (!valid.ok) continue;
        expect(decodeSelection(encodeSelection(valid.selection))).toEqual(valid);
        expect(planInstallation(config, registry).valid).toBe(true);
        if (config.integrations.length) {
          expect(
            validateSelection(
              {
                ...envelope,
                mode: "add",
                context: context.context,
                integrations: config.integrations,
              },
              registry,
              BEGINNER_CATALOG,
            ).ok,
          ).toBe(true);
        }
      }
    }
  });
  it("rejects unknown IDs/options, stale catalogs, incompatible contexts and executable/secret options", () => {
    const config = structuredClone(BEGINNER_CATALOG.presets[0]!.config);
    const invalid = [
      { ...envelope, catalogRevision: "old", config },
      { ...envelope, config: { ...config, packageManager: "npm" } },
      {
        ...envelope,
        config: { ...config, framework: { id: "react-vite", options: { typescript: false } } },
      },
      ...["unknown", "pytest", "prisma", "playwright"].map((id) => ({
        ...envelope,
        config: { ...config, integrations: [{ id }] },
      })),
      ...[{ command: "touch pwn" }, { token: "secret" }, { typescript: true }].map((options) => ({
        ...envelope,
        config: { ...config, integrations: [{ id: "zod", options }] },
      })),
      {
        ...envelope,
        config: {
          ...config,
          framework: { id: "react-vite", options: { typescript: true, script: "touch pwn" } },
        },
      },
    ];
    for (const value of invalid)
      expect(validateSelection(value, registry, BEGINNER_CATALOG).ok).toBe(false);
  });
  it("rejects duplicate catalog IDs, missing guidance, bad links, incompatible variants and command fields", () => {
    for (const alter of [
      (catalog: typeof BEGINNER_CATALOG) => {
        catalog.presets.push(catalog.presets[0]!);
      },
      (catalog: typeof BEGINNER_CATALOG) => {
        catalog.guidance.pop();
      },
      (catalog: typeof BEGINNER_CATALOG) => {
        catalog.guidance[0]!.documentationUrl = "http://example.com";
      },
      (catalog: typeof BEGINNER_CATALOG) => {
        catalog.presets[0]!.config.integrations = [{ id: "pytest" }];
      },
      (catalog: typeof BEGINNER_CATALOG) => {
        Object.assign(catalog, { commands: ["touch pwn"] });
      },
    ]) {
      const catalog = structuredClone(BEGINNER_CATALOG);
      alter(catalog);
      expect(() => validateBeginnerCatalog(catalog, registry)).toThrow();
    }
  });
});
