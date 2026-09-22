import { writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupWorkspace,
  createTempWorkspace,
  keepOnFailure,
  monorepoBin,
  runNodeCli,
  snapshotTree,
  writeJson,
} from "./harness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((dir) => cleanupWorkspace(dir, keep)));
});

describe("CLI failure paths (spawned bin)", () => {
  it("rejects invalid JSON config with a non-zero exit and no project files", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-fail-json-");
    tempDirs.push(cwd);
    const configPath = path.join(cwd, "broken.json");
    await writeFile(configPath, "{ not json");
    const before = await snapshotTree(cwd);

    const result = await runNodeCli(monorepoBin, ["create", "--config", configPath, "--dry-run"], {
      cwd,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("CONFIG_INVALID");
    expect(result.stdout).not.toContain("Executed ");
    expect(await snapshotTree(cwd)).toEqual(before);
  });

  it("rejects an unknown integration", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-fail-unknown-");
    tempDirs.push(cwd);
    await writeJson(path.join(cwd, "reposetup.json"), {
      schemaVersion: 1,
      project: { name: "demo" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "nextjs", options: { typescript: true } },
      integrations: [{ id: "not-a-real-integration" }],
    });
    const before = await snapshotTree(cwd);

    const result = await runNodeCli(
      monorepoBin,
      ["create", "--config", "reposetup.json", "--dry-run"],
      { cwd },
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("UNKNOWN_INTEGRATION");
    expect(result.stdout).not.toContain("Executed ");
    expect(await snapshotTree(cwd)).toEqual(before);
  });

  it("rejects an unsafe project name without mutating the workspace", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-fail-name-");
    tempDirs.push(cwd);
    await writeJson(path.join(cwd, "reposetup.json"), {
      schemaVersion: 1,
      project: { name: "../evil" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "nextjs", options: { typescript: true } },
      integrations: [],
    });
    const before = await snapshotTree(cwd);

    const result = await runNodeCli(
      monorepoBin,
      ["create", "--config", "reposetup.json", "--dry-run"],
      { cwd },
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("PROJECT_NAME_INVALID");
    expect(await snapshotTree(cwd)).toEqual(before);
  });

  it("rejects invalid Next.js options", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-fail-opt-");
    tempDirs.push(cwd);
    await writeJson(path.join(cwd, "reposetup.json"), {
      schemaVersion: 1,
      project: { name: "demo" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "nextjs", options: { typescript: "yes" } },
      integrations: [],
    });

    const result = await runNodeCli(
      monorepoBin,
      ["create", "--config", "reposetup.json", "--dry-run"],
      { cwd },
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("CONFIG_INVALID");
  });

  it("rejects an incompatible Python + Next.js combination", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-fail-combo-");
    tempDirs.push(cwd);
    await writeJson(path.join(cwd, "reposetup.json"), {
      schemaVersion: 1,
      project: { name: "demo" },
      runtime: { id: "python" },
      packageManager: "uv",
      framework: { id: "nextjs", options: { typescript: true } },
      integrations: [],
    });

    const result = await runNodeCli(
      monorepoBin,
      ["create", "--config", "reposetup.json", "--dry-run"],
      { cwd },
    );

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toMatch(/UNSUPPORTED_CONTEXT|MISSING_REQUIREMENT/);
    expect(result.stdout).not.toContain("Executed ");
  });

  it("returns a useful error for info on an unknown id", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-fail-info-");
    tempDirs.push(cwd);

    const result = await runNodeCli(monorepoBin, ["info", "definitely-missing"], { cwd });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("UNKNOWN_INTEGRATION");
    expect(result.stdout).not.toContain("definitely-missing");
  });
});
