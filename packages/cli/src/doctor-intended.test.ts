import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NODE_DEPENDENCY_PROBE, PYTHON_DEPENDENCY_PROBE } from "@reposetup/core";
import { runCli } from "./run-cli.js";

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
const intended = {
  schemaVersion: 1,
  project: { name: "app" },
  runtime: { id: "node" },
  packageManager: "pnpm",
  framework: { id: "react-vite" },
  integrations: [{ id: "prettier" }],
};

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-config-"));
  dirs.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "app",
      dependencies: { react: "19.0.0", vite: "8.3.0" },
      devDependencies: { prettier: "3.9.8" },
    }),
  );
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(path.join(root, "vite.config.ts"), "export default {};\n");
  await writeFile(path.join(root, ".prettierrc.json"), "{}\n");
  await writeFile(path.join(root, "reposetup.json"), JSON.stringify(intended));
  return root;
}

function io() {
  let out = "",
    err = "";
  return {
    io: {
      writeOut: (value: string) => {
        out += value;
      },
      writeErr: (value: string) => {
        err += value;
      },
    },
    out: () => out,
    err: () => err,
  };
}

describe("doctor --config", () => {
  it("accepts a schemaVersion 1 config, alternative file location and compatible JSON envelope without writes", async () => {
    const root = await fixture();
    const before = await readFile(path.join(root, "package.json"), "utf8");
    const captured = io();
    const result = await runCli(["--json", "doctor", "--config", "reposetup.json"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
      resolveExecutable: async (command) => command,
      runProcess: async (request) => ({
        exitCode: 0,
        stdout:
          request.args.includes(NODE_DEPENDENCY_PROBE) ||
          request.args.includes(PYTHON_DEPENDENCY_PROBE)
            ? JSON.stringify({ missing: [], checked: [], errors: [], environment: request.cwd })
            : "v24.21.0",
        stderr: "",
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(captured.out()) as {
      version: number;
      kind: string;
      failed: number;
      result: { mode: string; checks: Array<{ id: string; ok: boolean }> };
    };
    expect(output).toMatchObject({
      version: 1,
      kind: "doctor",
      failed: 0,
      result: { mode: "intended" },
    });
    expect(output.result.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "intended:prettier", ok: true })]),
    );
    expect(await readFile(path.join(root, "package.json"), "utf8")).toBe(before);
    expect(captured.err()).toBe("");
  });

  it("retains installed-dependency failures alongside intended configuration checks", async () => {
    const root = await fixture();
    const before = await readFile(path.join(root, "package.json"), "utf8");
    const captured = io();
    const result = await runCli(["--json", "doctor", "--config", "reposetup.json"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
      resolveExecutable: async (command) => command,
      runProcess: async (request) =>
        request.args.includes(NODE_DEPENDENCY_PROBE)
          ? {
              exitCode: 1,
              stdout: JSON.stringify({
                missing: ["prettier"],
                checked: ["react", "vite"],
                errors: [],
                environment: root,
              }),
              stderr: "",
            }
          : { exitCode: 0, stdout: "v24.21.0", stderr: "" },
    });
    expect(result.exitCode).toBe(5);
    expect(JSON.parse(captured.out()).result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dependencies:node", ok: false }),
        expect.objectContaining({ id: "intended:prettier", ok: true }),
      ]),
    );
    expect(await readFile(path.join(root, "package.json"), "utf8")).toBe(before);
  });

  it("returns a versioned error for malformed config", async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({ ...intended, schemaVersion: 2 }),
    );
    const captured = io();
    const result = await runCli(["--json", "doctor", "--config", "reposetup.json"], {
      cwd: root,
      io: captured.io,
    });
    expect(result.exitCode).not.toBe(0);
    expect(captured.out()).toBe("");
    expect(JSON.parse(captured.err())).toMatchObject({
      version: 1,
      kind: "error",
      error: { code: "CONFIG_INVALID" },
    });
  });

  it("returns a failing doctor report when an intended dependency is removed", async () => {
    const root = await fixture();
    const manifest = JSON.stringify({
      name: "app",
      dependencies: { react: "19.0.0", vite: "8.3.0" },
    });
    await writeFile(path.join(root, "package.json"), manifest);
    const captured = io();
    const result = await runCli(["--json", "doctor", "--config", "reposetup.json"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
      resolveExecutable: async (command) => command,
      runProcess: async (request) => ({
        exitCode: 0,
        stdout:
          request.args.includes(NODE_DEPENDENCY_PROBE) ||
          request.args.includes(PYTHON_DEPENDENCY_PROBE)
            ? JSON.stringify({ missing: [], checked: [], errors: [], environment: request.cwd })
            : "v24.21.0",
        stderr: "",
      }),
    });
    expect(result.exitCode).toBe(5);
    const output = JSON.parse(captured.out()) as {
      failed: number;
      result: { checks: Array<{ id: string; code?: string }> };
    };
    expect(output.failed).toBeGreaterThan(0);
    expect(output.result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "intended-dependency:prettier",
          code: "INTENDED_DEPENDENCY_MISSING",
        }),
      ]),
    );
    expect(await readFile(path.join(root, "package.json"), "utf8")).toBe(manifest);
  });

  it("reports a custom Python dependency version without claiming incompatibility", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-python-"));
    dirs.push(root);
    await writeFile(
      path.join(root, "pyproject.toml"),
      '[project]\nname = "app"\ndependencies = ["fastapi[standard]==0.141.1"]\n[dependency-groups]\ndev = ["pytest==8.3.0"]\n',
    );
    await writeFile(path.join(root, "uv.lock"), "version = 1\n");
    await writeFile(path.join(root, "main.py"), "from fastapi import FastAPI\napp = FastAPI()\n");
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({
        schemaVersion: 1,
        project: { name: "app" },
        runtime: { id: "python" },
        packageManager: "uv",
        framework: { id: "fastapi" },
        integrations: [{ id: "pytest" }],
      }),
    );
    const captured = io();
    const result = await runCli(["--json", "doctor", "--config", "reposetup.json"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
      resolveExecutable: async (command) => command,
      runProcess: async (request) => ({
        exitCode: 0,
        stdout:
          request.args.includes(NODE_DEPENDENCY_PROBE) ||
          request.args.includes(PYTHON_DEPENDENCY_PROBE)
            ? JSON.stringify({ missing: [], checked: [], errors: [], environment: request.cwd })
            : "Python 3.13.1",
        stderr: "",
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(captured.out()) as {
      failed: number;
      result: { checks: Array<{ id: string; level?: string }> };
    };
    expect(output.failed).toBe(0);
    expect(output.result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "intended-version:pytest", level: "info" }),
      ]),
    );
  });

  it("refuses a symlinked intended project path", async () => {
    const root = await fixture();
    const outside = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-outside-"));
    dirs.push(outside);
    await symlink(outside, path.join(root, "linked"));
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({ ...intended, project: { name: "app", path: "linked" } }),
    );
    const captured = io();
    const result = await runCli(["doctor", "--config", "reposetup.json"], {
      cwd: root,
      io: captured.io,
    });
    expect(result.exitCode).not.toBe(0);
    expect(captured.err()).toContain("symlink");
  });
});
