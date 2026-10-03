import { describe, expect, it } from "vitest";
import {
  decodeSelection,
  encodeSelection,
  parseSelectionJson,
  selectionCommand,
  SELECTION_LIMITS,
  type DeclarativeSelection,
} from "./format.js";

const selection: DeclarativeSelection = {
  selectionVersion: 1,
  catalogRevision: "0.3.0-cli.1",
  cliContract: "selection-v1",
  mode: "create",
  config: {
    schemaVersion: 1,
    project: { name: "my-app", path: "my-app" },
    runtime: { id: "node" },
    packageManager: "pnpm",
    framework: { id: "react-vite", options: { typescript: true } },
    integrations: [{ id: "zod" }],
  },
};
const token = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
describe("selection v1 transport", () => {
  it("round-trips create/add and produces a fixed command without confirmation bypass", () => {
    for (const input of [
      selection,
      {
        selectionVersion: 1,
        catalogRevision: "0.3.0-cli.1",
        cliContract: "selection-v1",
        mode: "add",
        context: {
          runtimeId: "node",
          frameworkId: "express",
          packageManager: "pnpm",
          typescript: true,
        },
        integrations: [{ id: "zod", options: {} }],
      } satisfies DeclarativeSelection,
    ]) {
      expect(decodeSelection(encodeSelection(input))).toEqual({ ok: true, selection: input });
      expect(parseSelectionJson(JSON.stringify(input))).toEqual(
        decodeSelection(encodeSelection(input)),
      );
      expect(selectionCommand(input)).toMatch(
        /^reposetup (create|add) --selection [A-Za-z0-9_-]+$/,
      );
      expect(selectionCommand(input, true)).toContain(" --dry-run");
    }
  });
  it.each(["", "abc=", "ab+c", "a", "AB", "-".repeat(SELECTION_LIMITS.tokenCharacters + 1)])(
    "rejects malformed/noncanonical/oversized input",
    (input) => {
      expect(decodeSelection(input).ok).toBe(false);
    },
  );
  it("rejects invalid UTF-8, JSON, oversized JSON and deep structures", () => {
    expect(decodeSelection(Buffer.from([0xc0, 0xaf]).toString("base64url")).ok).toBe(false);
    expect(decodeSelection(Buffer.from("{").toString("base64url")).ok).toBe(false);
    expect(parseSelectionJson(" ".repeat(SELECTION_LIMITS.fileBytes + 1)).ok).toBe(false);
    expect(parseSelectionJson("[".repeat(9) + "0" + "]".repeat(9)).ok).toBe(false);
  });
  it.each([
    "../escape",
    "--help",
    "app;touch-pwn",
    "$(touch-pwn)",
    "app\nname",
    "CON",
    "con",
    "aux",
    "nul",
    "com1",
    "a/b",
    "C:\\app",
    "app name",
  ])("rejects hostile name %s", (name) => {
    const input = structuredClone(selection);
    if (input.mode !== "create") throw new Error();
    input.config.project.name = name;
    expect(decodeSelection(token(input)).ok).toBe(false);
  });
  it("rejects absolute/traversing paths and executable/secret fields", () => {
    for (const projectPath of ["/tmp/app", "../app", "a/../app", ".", "C:\\app"]) {
      if (selection.mode !== "create") throw new Error();
      expect(
        decodeSelection(
          token({
            ...selection,
            config: { ...selection.config, project: { name: "app", path: projectPath } },
          }),
        ).ok,
      ).toBe(false);
    }
    for (const extra of [
      { commands: ["touch pwn"] },
      { secrets: { key: "secret" } },
      { operations: [] },
      { selectionVersion: 2 },
      { cliContract: "future" },
    ]) {
      expect(decodeSelection(token({ ...selection, ...extra })).ok).toBe(false);
    }
  });
  it("rejects duplicate/excessive selections", () => {
    if (selection.mode !== "create") throw new Error();
    for (const integrations of [
      [{ id: "zod" }, { id: "zod" }],
      Array.from({ length: 17 }, (_, i) => ({ id: `id-${i}` })),
    ]) {
      expect(
        decodeSelection(token({ ...selection, config: { ...selection.config, integrations } })).ok,
      ).toBe(false);
    }
  });
});

it("accepts exact token/file bounds and rejects the next byte", () => {
  const json = JSON.stringify(selection);
  const boundedToken = Buffer.from(json.padEnd(SELECTION_LIMITS.tokenBytes, " ")).toString(
    "base64url",
  );
  expect(boundedToken.length).toBe(SELECTION_LIMITS.tokenCharacters);
  expect(decodeSelection(boundedToken)).toEqual({ ok: true, selection });
  expect(
    decodeSelection(
      Buffer.from(json.padEnd(SELECTION_LIMITS.tokenBytes + 1, " ")).toString("base64url"),
    ).ok,
  ).toBe(false);
  expect(parseSelectionJson(json.padEnd(SELECTION_LIMITS.fileBytes, " ")).ok).toBe(true);
  expect(parseSelectionJson(json.padEnd(SELECTION_LIMITS.fileBytes + 1, " ")).ok).toBe(false);
});
it.each(["con", "prn", "aux", "nul", "com1", "lpt9"])(
  "rejects portable device-name segments %s",
  (name) => {
    if (selection.mode !== "create") throw new Error();
    expect(
      decodeSelection(token({ ...selection, config: { ...selection.config, project: { name } } }))
        .ok,
    ).toBe(false);
    expect(
      decodeSelection(
        token({
          ...selection,
          config: { ...selection.config, project: { name: "app", path: `projects/${name}` } },
        }),
      ).ok,
    ).toBe(false);
  },
);
