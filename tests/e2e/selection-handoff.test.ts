import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  cleanupWorkspace,
  createTempWorkspace,
  monorepoBin,
  repoRoot,
  runNodeCli,
  snapshotTree,
} from "./harness.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => cleanupWorkspace(root, false)));
});
async function fixture(name: string, mode: string) {
  const file = path.join(repoRoot, "examples/selections", `${name}.${mode}.json`);
  return { file, token: Buffer.from(await readFile(file, "utf8")).toString("base64url") };
}

it.each(["react-vite", "express", "fastapi"])(
  "launches create %s token/file to equivalent plans without mutation",
  async (name) => {
    const cwd = await createTempWorkspace("reposetup-e2e-selection-");
    roots.push(cwd);
    const before = await snapshotTree(cwd);
    const input = await fixture(name, "create");
    const outputs = [];
    for (const route of [
      ["--selection", input.token],
      ["--selection-file", input.file],
    ]) {
      const result = await runNodeCli(monorepoBin, ["--json", "create", ...route, "--dry-run"], {
        cwd,
      });
      expect(result.exitCode, result.stderr).toBe(0);
      outputs.push(JSON.parse(result.stdout));
    }
    expect(outputs[0]).toEqual(outputs[1]);
    expect(await snapshotTree(cwd)).toEqual(before);
  },
);

it.each(["react-vite", "express", "fastapi"])(
  "launches add %s token/file against detected local context",
  async (name) => {
    const cwd = await createTempWorkspace("reposetup-e2e-add-selection-");
    roots.push(cwd);
    if (name === "fastapi") {
      await writeFile(
        path.join(cwd, "pyproject.toml"),
        '[project]\nname="api"\ndependencies=["fastapi"]\n',
      );
      await writeFile(path.join(cwd, "uv.lock"), "version = 1\n");
      await writeFile(path.join(cwd, "main.py"), "from fastapi import FastAPI\napp=FastAPI()\n");
    } else {
      await writeFile(
        path.join(cwd, "package.json"),
        JSON.stringify({
          name: "app",
          dependencies:
            name === "express" ? { express: "5.0.0" } : { react: "19.0.0", vite: "7.0.0" },
          devDependencies: { typescript: "5.9.3" },
        }),
      );
      await writeFile(path.join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      await writeFile(path.join(cwd, "tsconfig.json"), "{}\n");
      if (name === "react-vite")
        await writeFile(path.join(cwd, "vite.config.ts"), "export default {}\n");
    }
    const before = await snapshotTree(cwd);
    const input = await fixture(name, "add");
    const outputs = [];
    for (const route of [
      ["--selection", input.token],
      ["--config", input.file],
    ]) {
      const result = await runNodeCli(monorepoBin, ["--json", "add", ...route, "--dry-run"], {
        cwd,
      });
      expect(result.exitCode, result.stderr).toBe(0);
      outputs.push(JSON.parse(result.stdout));
    }
    expect(outputs[0]).toEqual(outputs[1]);
    expect(await snapshotTree(cwd)).toEqual(before);
  },
);

it("a pasted selection shows choices/plan and refuses execution without interactive confirmation", async () => {
  const cwd = await createTempWorkspace("reposetup-e2e-confirm-selection-");
  roots.push(cwd);
  const input = await fixture("express", "create");
  const before = await snapshotTree(cwd);
  const result = await runNodeCli(monorepoBin, ["create", "--selection", input.token], { cwd });
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toContain("Decoded selection");
  expect(result.stdout).toContain("Operations");
  expect(result.stderr).toContain("requires interactive confirmation");
  expect(await snapshotTree(cwd)).toEqual(before);
});

it("the launched CLI rejects oversized/malformed selections with structured errors", async () => {
  const cwd = await createTempWorkspace("reposetup-e2e-invalid-selection-");
  roots.push(cwd);
  for (const token of ["%$()", "a".repeat(4097)]) {
    const result = await runNodeCli(
      monorepoBin,
      ["--json", "create", "--selection", token, "--dry-run"],
      { cwd },
    );
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({
      version: 1,
      kind: "error",
      error: { code: "SELECTION_INVALID" },
    });
  }
  expect(await snapshotTree(cwd)).toEqual({});
});
