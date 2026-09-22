import { access } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cliPackageVersion,
  cleanupWorkspace,
  createTempWorkspace,
  keepOnFailure,
  monorepoBin,
  repoRoot,
  runNodeCli,
} from "./harness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((dir) => cleanupWorkspace(dir, keep)));
});

describe("packed-CLI smoke via monorepo dist", () => {
  it("prints help, version, search, and info from the built bin", async () => {
    await access(monorepoBin);
    const cwd = await createTempWorkspace("reposetup-e2e-smoke-");
    tempDirs.push(cwd);

    const help = await runNodeCli(monorepoBin, ["--help"], { cwd });
    expect(help.exitCode, help.stderr).toBe(0);
    expect(help.stdout).toContain("create");
    expect(help.stdout).toContain("search");
    expect(help.stdout).toContain("doctor");

    const version = await runNodeCli(monorepoBin, ["--version"], { cwd });
    expect(version.exitCode).toBe(0);
    expect(version.stdout.trim()).toBe(cliPackageVersion());
    expect(version.stdout.trim()).toBe("0.1.0");

    const search = await runNodeCli(monorepoBin, ["search", "prisma"], { cwd });
    expect(search.exitCode).toBe(0);
    expect(search.stdout).toContain("prisma");

    const info = await runNodeCli(monorepoBin, ["info", "prisma"], { cwd });
    expect(info.exitCode).toBe(0);
    expect(info.stdout).toContain("prisma");
    expect(info.stdout).toContain("candidate");
    expect(info.stdout).not.toContain("stable");
  });

  it("dry-runs the Next.js example from the repo without using the source tree as cwd", async () => {
    const cwd = await createTempWorkspace("reposetup-e2e-dry-");
    tempDirs.push(cwd);
    const config = path.join(repoRoot, "examples", "reposetup.next-sqlite.json");

    const result = await runNodeCli(monorepoBin, ["create", "--config", config, "--dry-run"], {
      cwd,
    });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain("create-next-app");
    expect(result.stdout).toContain("No files or commands were executed.");
    expect(result.stdout).not.toContain("Executed ");
  });
});
