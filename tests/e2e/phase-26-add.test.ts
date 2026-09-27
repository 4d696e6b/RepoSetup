import { access, mkdir } from "node:fs/promises";
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
  runProcess,
} from "./harness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((dir) => cleanupWorkspace(dir, keep)));
});

async function hasUv(): Promise<boolean> {
  try {
    return (await runProcess("uv", ["--version"], { cwd: repoRoot })).exitCode === 0;
  } catch {
    return false;
  }
}

async function createProject(configName: string): Promise<string> {
  const parent = await createTempWorkspace("reposetup-phase-26-add-");
  tempDirs.push(parent);
  const cwd = path.join(parent, "project");
  await mkdir(cwd);
  const created = await runNodeCli(
    monorepoBin,
    ["create", "--config", fixturePath(configName), "--yes"],
    {
      cwd,
    },
  );
  expect(created.exitCode, created.stderr).toBe(0);
  return cwd;
}

const uvAvailable = await hasUv();

describe("Phase 26 add workflows", () => {
  it("adds and then detects the React Testing Library and TanStack Query combination", async () => {
    const cwd = await createProject("golden-react-vite.json");

    const added = await runNodeCli(
      monorepoBin,
      ["add", "testing-library", "tanstack-query", "--yes"],
      {
        cwd,
      },
    );
    expect(added.exitCode, `${added.stdout}\n${added.stderr}`).toBe(0);
    await access(path.join(cwd, "src", "testing-library-sample.test.tsx"));
    await access(path.join(cwd, "src", "tanstack-query-sample.test.tsx"));

    const test = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd });
    expect(test.exitCode, `${test.stdout}\n${test.stderr}`).toBe(0);

    const repeated = await runNodeCli(
      monorepoBin,
      ["add", "testing-library", "tanstack-query", "--yes"],
      { cwd },
    );
    expect(repeated.exitCode, `${repeated.stdout}\n${repeated.stderr}`).toBe(0);
    expect(repeated.stdout).toContain("No changes.");
  });

  it.skipIf(!uvAvailable)(
    "adds and then detects the HTTPX and Pydantic Settings combination",
    async () => {
      const cwd = await createProject("golden-fastapi.json");

      const added = await runNodeCli(monorepoBin, ["add", "httpx", "pydantic-settings", "--yes"], {
        cwd,
      });
      expect(added.exitCode, `${added.stdout}\n${added.stderr}`).toBe(0);
      await access(path.join(cwd, "test_httpx.py"));
      await access(path.join(cwd, "test_settings.py"));

      const pytest = await runProcess("uv", ["run", "pytest"], { cwd });
      expect(pytest.exitCode, `${pytest.stdout}\n${pytest.stderr}`).toBe(0);

      const repeated = await runNodeCli(
        monorepoBin,
        ["add", "httpx", "pydantic-settings", "--yes"],
        { cwd },
      );
      expect(repeated.exitCode, `${repeated.stdout}\n${repeated.stderr}`).toBe(0);
      expect(repeated.stdout).toContain("No changes.");
    },
  );
});
