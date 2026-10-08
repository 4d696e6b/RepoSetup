import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createDetectionContext,
  createNodeDetectionFs,
  type ProcessRunRequest,
} from "@reposetup/core";
import { afterEach, describe, expect, it } from "vitest";

import { createDependencyHealthCheck } from "./dependency-health.js";
import type { ResolvedCliDeps } from "./types.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-dependencies-"));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) await writeFile(path.join(root, file), text);
  return createDetectionContext(root, createNodeDetectionFs(root));
}
function dependencies(
  runProcess: ResolvedCliDeps["runProcess"],
): Pick<ResolvedCliDeps, "runProcess" | "resolveExecutable" | "commandExists"> {
  return {
    commandExists: async () => true,
    runProcess,
    resolveExecutable: async () => "python3",
  };
}

describe("doctor installed dependency adapter", () => {
  it("does not report a corrupt Node manifest healthy", async () => {
    const context = await fixture({ "package.json": "not json" });
    const checks = await createDependencyHealthCheck(
      dependencies(async () => {
        throw new Error("Must not execute");
      }),
    )(context);
    expect(checks[0]).toMatchObject({
      ok: false,
      message: "Cannot inspect dependencies: package.json is invalid.",
    });
  });

  it("inspects uv's project environment instead of a globally available Python", async () => {
    const context = await fixture({
      "pyproject.toml": '[project]\ndependencies = ["fastapi[standard]"]\n',
      "uv.lock": "version = 1\n",
    });
    const runs: ProcessRunRequest[] = [];
    const checks = await createDependencyHealthCheck(
      dependencies(async (request) => {
        runs.push(request);
        return {
          exitCode: 1,
          stdout: JSON.stringify({
            checked: ["fastapi"],
            missing: ["fastapi-cli"],
            errors: [],
            environment: request.command,
          }),
          stderr: "",
        };
      }),
    )(context);
    expect(runs[0]?.command).toBe(
      path.join(
        context.projectRoot,
        ".venv",
        process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
      ),
    );
    expect(runs[0]?.args.slice(0, 3)).toEqual(["-I", "-B", "-c"]);
    expect(checks).toEqual([
      expect.objectContaining({
        id: "dependencies:python",
        ok: false,
        message: expect.stringContaining("fastapi-cli"),
        suggestion: expect.stringContaining("uv sync"),
      }),
    ]);
  });
  it("reports an unavailable environment without launching a package manager", async () => {
    const context = await fixture({
      "pyproject.toml": '[project]\ndependencies = ["fastapi"]\n',
      "uv.lock": "version = 1\n",
    });
    const check = await createDependencyHealthCheck(
      dependencies(async () => ({ exitCode: 1, stdout: "", stderr: "not found", notFound: true })),
    )(context);
    expect(check[0]?.ok).toBe(false);
    await expect(createNodeDetectionFs(context.projectRoot).exists(".venv")).resolves.toBe(false);
  });
  it("uses the selected interpreter for pip and rejects malformed probe output", async () => {
    const context = await fixture({ "requirements.txt": "Flask==3.1.3\n" });
    const runs: ProcessRunRequest[] = [];
    const checks = await createDependencyHealthCheck(
      dependencies(async (request) => {
        runs.push(request);
        return { exitCode: 0, stdout: "not a health report", stderr: "" };
      }),
    )(context);
    expect(runs[0]?.command).toBe("python3");
    expect(checks[0]?.ok).toBe(false);
  });
  it("checks installed Node packages without executing application code", async () => {
    const context = await fixture({
      "package.json": JSON.stringify({ dependencies: { next: "16.3.6" } }),
    });
    await mkdir(path.join(context.projectRoot, "node_modules"));
    const checks = await createDependencyHealthCheck(
      dependencies(async (request) => {
        expect(request.command).toBe("node");
        expect(request.cwd).toBe(context.projectRoot);
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            checked: ["next"],
            missing: [],
            errors: [],
            environment: context.projectRoot,
          }),
          stderr: "",
        };
      }),
    )(context);
    expect(checks[0]?.ok).toBe(true);
  });
});
