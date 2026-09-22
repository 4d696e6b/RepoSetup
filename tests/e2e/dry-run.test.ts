import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupWorkspace,
  createTempWorkspace,
  fixturePath,
  keepOnFailure,
  monorepoBin,
  repoRoot,
  runNodeCli,
  snapshotTree,
} from "./harness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((dir) => cleanupWorkspace(dir, keep)));
});

describe("dry-run mutation safety", () => {
  it("does not create project files, configs, or env examples for create --dry-run", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-dry-create-");
    tempDirs.push(cwd);
    const before = await snapshotTree(cwd);

    const result = await runNodeCli(
      monorepoBin,
      [
        "create",
        "--config",
        path.join(repoRoot, "examples/reposetup.next-sqlite.json"),
        "--dry-run",
      ],
      { cwd },
    );

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain("No files or commands were executed.");
    expect(await snapshotTree(cwd)).toEqual(before);
  });

  it("does not mutate package.json or write configs for add --dry-run", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-dry-add-");
    tempDirs.push(cwd);
    await access(monorepoBin);
    await writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(cwd, "next.config.mjs"), "export default {};\n");
    const before = await snapshotTree(cwd);

    const result = await runNodeCli(monorepoBin, ["add", "zod", "--dry-run"], { cwd });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain("No files or commands were executed.");
    expect(await snapshotTree(cwd)).toEqual(before);
  });

  it("plans golden React and FastAPI fixtures without writing files", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-dry-goldens-");
    tempDirs.push(cwd);
    const before = await snapshotTree(cwd);

    for (const name of ["golden-react-vite.json", "golden-fastapi.json", "golden-express.json"]) {
      const result = await runNodeCli(
        monorepoBin,
        ["create", "--config", fixturePath(name), "--dry-run"],
        { cwd },
      );
      expect(result.exitCode, `${name}\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain("No files or commands were executed.");
    }

    expect(await snapshotTree(cwd)).toEqual(before);
  });
});
