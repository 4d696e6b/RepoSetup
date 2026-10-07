import { access, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  cleanupWorkspace,
  createTempWorkspace,
  repoRoot,
  runProcess,
  writeJson,
} from "./harness.js";

const workspaces: string[] = [];
let tarball: string;
let packageDir: string;

beforeAll(async () => {
  packageDir = await createTempWorkspace("reposetup-create-package-");
  const packed = await runProcess(
    "pnpm",
    ["--filter", "rsetup", "pack", "--pack-destination", packageDir],
    { cwd: repoRoot },
  );
  expect(packed.exitCode, packed.stderr).toBe(0);
  const name = (await readdir(packageDir)).find((name) => name.endsWith(".tgz"));
  expect(name).toBeDefined();
  tarball = path.join(packageDir, name as string);
});

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => cleanupWorkspace(workspace, false)));
});

// Keep packaging separate from the monorepo entry point: this executes the same
// npx package-resolution and bin route a user uses, with the unpublished patch.
async function create(
  framework: string,
  manager: string,
  typescript = true,
  pythonEnv = process.env,
) {
  const parent = await createTempWorkspace("reposetup-create-solution-");
  workspaces.push(parent);
  const env = { ...pythonEnv, npm_config_cache: path.join(parent, "npm-cache") };
  const cwd = path.join(parent, "workspace");
  await mkdir(cwd);
  const config = path.join(parent, "reposetup.json");
  await writeJson(config, {
    schemaVersion: 1,
    project: { name: "demo", path: "apps/demo" },
    runtime: { id: ["fastapi", "flask"].includes(framework) ? "python" : "node" },
    packageManager: manager,
    framework: {
      id: framework,
      ...(["fastapi", "flask"].includes(framework) ? {} : { options: { typescript } }),
    },
    integrations: [],
  });
  const args = ["--yes", "--package", tarball, "rsetup", "create", "--config", config];
  const preview = await runProcess("npx", [...args, "--dry-run"], { cwd, env });
  expect(preview.exitCode, preview.stderr).toBe(0);
  expect(await readdir(cwd)).toEqual([]);
  const created = await runProcess("npx", [...args, "--yes"], { cwd, env });
  expect(created.exitCode, `${created.stdout}\n${created.stderr}`).toBe(0);
  expect(await readdir(cwd)).toEqual(["apps"]);
  return { cwd: path.join(cwd, "apps/demo"), env };
}

const nodeCases = ["nextjs", "react-vite", "express", "fastify"].flatMap((framework) =>
  ["npm", "pnpm"].flatMap((manager) =>
    [true, false].map((typescript) => ({ framework, manager, typescript })),
  ),
);

describe("npx create supported bare solutions", () => {
  it.each(nodeCases)(
    "$framework / $manager / TypeScript $typescript / nested destination",
    async ({ framework, manager, typescript }) => {
      const { cwd, env } = await create(framework, manager, typescript);
      await access(path.join(cwd, "node_modules"));
      const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
      expect(Object.keys(pkg.dependencies).length).toBeGreaterThan(0);
      if (["nextjs", "react-vite"].includes(framework) || typescript) {
        const built = await runProcess(manager, ["run", "build"], { cwd, env });
        expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);
      } else {
        const checked = await runProcess(
          process.execPath,
          ["--check", framework === "fastify" ? "server.js" : "app.js"],
          { cwd },
        );
        expect(checked.exitCode, checked.stderr).toBe(0);
      }
      const doctor = await runProcess("npx", ["--yes", "--package", tarball, "rsetup", "doctor"], {
        cwd,
        env,
      });
      expect(doctor.exitCode, `${doctor.stdout}\n${doctor.stderr}`).toBe(0);
    },
  );

  it.each(
    ["fastapi", "flask"].flatMap((framework) =>
      ["uv", "pip"].map((manager) => ({ framework, manager })),
    ),
  )(
    "$framework / $manager / isolated Python / nested destination",
    async ({ framework, manager }) => {
      const parent = await createTempWorkspace("reposetup-create-python-env-");
      workspaces.push(parent);
      const venv = path.join(parent, "venv");
      const installed = await runProcess("python", ["-m", "venv", venv], { cwd: parent });
      expect(installed.exitCode, installed.stderr).toBe(0);
      const env = {
        ...process.env,
        PATH: `${path.join(venv, process.platform === "win32" ? "Scripts" : "bin")}${path.delimiter}${process.env.PATH}`,
        VIRTUAL_ENV: venv,
      };
      const { cwd } = await create(framework, manager, true, env);
      const args = ["-c", `import ${framework === "fastapi" ? "main" : "app"}`];
      const imported = await runProcess(
        manager === "uv" ? "uv" : "python",
        manager === "uv" ? ["run", "python", ...args] : args,
        { cwd, env },
      );
      expect(imported.exitCode, `${imported.stdout}\n${imported.stderr}`).toBe(0);
      const doctor = await runProcess("npx", ["--yes", "--package", tarball, "rsetup", "doctor"], {
        cwd,
        env,
      });
      expect(doctor.exitCode, `${doctor.stdout}\n${doctor.stderr}`).toBe(0);
    },
  );
});

// Dispose only the package directory created by this suite.
afterAll(async () => {
  if (packageDir !== undefined) await cleanupWorkspace(packageDir, false);
});
