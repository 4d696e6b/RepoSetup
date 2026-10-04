import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { BEGINNER_CATALOG, createBuiltInRegistry } from "@reposetup/integrations";
import { createWebsiteCatalog, validateSelection } from "@reposetup/registry";
import {
  decodeSelection,
  parseSelectionJson,
  SELECTION_LIMITS,
  selectionCommand,
} from "@reposetup/core";
import { catalog, handoff } from "../src/catalog.js";
import { chooseSelection, exportSelection, type Choice } from "../src/selection.js";

const registry = createBuiltInRegistry();
function choice(contextId = catalog.contexts[0]!.id): Choice {
  return { contextId, mode: "create", ids: [], name: "my-app", path: "my-app" };
}

describe("curated public catalog", () => {
  it("regenerates exactly and contains no operations/functions/local paths/secrets", () => {
    expect(createWebsiteCatalog(BEGINNER_CATALOG, registry)).toEqual(catalog);
    expect(catalog.variants).toHaveLength(24);
    const serialized = JSON.stringify(catalog);
    for (const forbidden of [
      '"operations":',
      '"command":',
      '"args":',
      '"content":',
      '"cwd":',
      '"secret":',
      "/Volumes/",
    ])
      expect(serialized).not.toContain(forbidden);
    expect(catalog.limits).toEqual(SELECTION_LIMITS);
  });
  it("uses the committed CLI definitions and contract rather than an unrelated registry", () => {
    for (const file of [
      "packages/core/src/selection/format.ts",
      "packages/core/src/selection/catalog.ts",
      "packages/integrations/src/beginner-catalog.ts",
      "packages/registry/src/selection.ts",
    ]) {
      const expected = execFileSync("git", ["show", `${handoff.commit}:${file}`], {
        encoding: "utf8",
      });
      expect(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")).toBe(expected);
    }
  });
  it("rejects missing guidance/IDs, links, duplicates, incompatible variants and executable/secret fields", () => {
    const invalid = [
      (c: typeof BEGINNER_CATALOG) => {
        c.guidance.pop();
      },
      (c: typeof BEGINNER_CATALOG) => {
        c.guidance[0]!.id = "unknown";
      },
      (c: typeof BEGINNER_CATALOG) => {
        c.guidance[0]!.documentationUrl = "javascript:alert(1)";
      },
      (c: typeof BEGINNER_CATALOG) => {
        c.presets.push(c.presets[0]!);
      },
      (c: typeof BEGINNER_CATALOG) => {
        c.contexts[0]!.optionalIds.push("pytest");
      },
      (c: typeof BEGINNER_CATALOG) => {
        Object.assign(c, { secret: "private", commands: ["run"] });
      },
      (c: typeof BEGINNER_CATALOG) => {
        c.presets[0]!.config.framework.options = { typescript: true, command: "run" };
      },
    ];
    for (const alter of invalid) {
      const c = structuredClone(BEGINNER_CATALOG);
      alter(c);
      expect(() => createWebsiteCatalog(c, registry)).toThrow();
    }
  });
});

describe("bounded website choices and command transport", () => {
  it("every selectable create/add choice round-trips to the committed CLI semantic validator", () => {
    for (const variant of catalog.variants)
      for (const mode of ["create", "add"] as const) {
        if (mode === "add" && !variant.add) continue;
        const selection = chooseSelection(catalog, {
          ...choice(variant.contextId),
          mode,
          ids: [...variant.ids].reverse(),
        });
        expect(validateSelection(selection, registry, BEGINNER_CATALOG).ok).toBe(true);
        const output = exportSelection(selection, catalog.limits);
        expect(output.command).toBe(selectionCommand(selection));
        const token = output.command!.split(" ").at(-1)!;
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(decodeSelection(token)).toEqual({ ok: true, selection });
        expect(parseSelectionJson(output.json)).toEqual({ ok: true, selection });
        expect(output.command).not.toContain("--yes");
      }
  });
  it("rejects unknown/cross-context/duplicate choices, empty add and hostile paths before export", () => {
    for (const invalid of [
      { ids: ["not-a-library"] },
      { ids: ["pytest"] },
      { ids: ["zod", "zod"] },
      { contextId: "wrong" },
      { mode: "add" as const },
      ...["../x", "CON", "nul", "a;touch-x", "$(id)", "C:\\app", "UPPER"].map((path) => ({ path })),
      ...["nul", "con", "aux", "My-App", "a b", "<script>"].map((name) => ({ name })),
    ])
      expect(() => chooseSelection(catalog, { ...choice(), ...invalid })).toThrow();
  });
  it("offers equivalent validated file input at the true token limit and rejects file overflow", () => {
    const selection = chooseSelection(catalog, choice());
    const json = JSON.stringify(selection);
    const padded =
      json + " ".repeat(SELECTION_LIMITS.tokenBytes + 1 - new TextEncoder().encode(json).length);
    const output = exportSelection(selection, catalog.limits, padded);
    expect(output.command).toBeNull();
    expect(output.fileCommand).toBe("reposetup create --selection-file selection.json");
    expect(parseSelectionJson(output.json)).toEqual({ ok: true, selection });
    expect(() =>
      exportSelection(selection, catalog.limits, json + " ".repeat(SELECTION_LIMITS.fileBytes)),
    ).toThrow();
    expect(() =>
      exportSelection(selection, catalog.limits, JSON.stringify({ ...selection, command: "run" })),
    ).toThrow();
    const add = chooseSelection(catalog, { ...choice(), mode: "add", ids: ["zod"] });
    expect(exportSelection(add, { ...catalog.limits, commandCharacters: 100 }).fileCommand).toBe(
      "reposetup add --config selection.json",
    );
  });
  it("accepts the maximum supported safe relative path and rejects stale or unknown option envelopes", () => {
    const path = ["a".repeat(63), "b".repeat(63), "c".repeat(63), "d".repeat(64)].join("/");
    expect(path).toHaveLength(256);
    const selection = chooseSelection(catalog, { ...choice(), path });
    expect(validateSelection(selection, registry, BEGINNER_CATALOG).ok).toBe(true);
    for (const value of [
      { ...selection, catalogRevision: "old" },
      { ...selection, cliContract: "future" },
      { ...selection, command: "run" },
    ])
      expect(validateSelection(value, registry, BEGINNER_CATALOG).ok).toBe(false);
  });
});

it("project errors identify the invalid field and ignore hidden create controls in add mode", async () => {
  const { projectChoiceErrors } = await import("../src/selection.js");
  const valid = {
    contextId: "express-ts-pnpm",
    mode: "create" as const,
    ids: ["zod"],
    name: "my-app",
    path: "projects/my-app",
  };
  expect(projectChoiceErrors(valid)).toEqual({});
  expect(projectChoiceErrors({ ...valid, name: "con" })).toEqual({
    name: expect.stringContaining("project name"),
  });
  expect(projectChoiceErrors({ ...valid, path: "../outside" })).toEqual({
    path: expect.stringContaining("relative folder"),
  });
  expect(projectChoiceErrors({ ...valid, name: "", path: "" })).toHaveProperty("name");
  expect(projectChoiceErrors({ ...valid, name: "", path: "" })).toHaveProperty("path");
  expect(projectChoiceErrors({ ...valid, mode: "add", name: "con", path: "../outside" })).toEqual(
    {},
  );
});
