import { access, mkdir, readFile, readdir, realpath, rm, rename } from "node:fs/promises";
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
  it.each(["npm", "pnpm"])(
    "Express TypeScript / %s / development tools survive production and omit settings",
    async (manager) => {
      const { cwd, env } = await create("express", manager, true, {
        ...process.env,
        NODE_ENV: "production",
        npm_config_omit: "dev",
        npm_config_production: "true",
      });
      await access(path.join(cwd, "node_modules", "express", "package.json"));
      await access(path.join(cwd, "node_modules", "@types", "express", "index.d.ts"));
      await access(path.join(cwd, "node_modules", "@types", "node", "index.d.ts"));
      const built = await runProcess(manager, ["run", "build"], { cwd, env });
      expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);
      const doctorArgs = ["--yes", "--package", tarball, "rsetup", "--json", "doctor"];
      const healthy = await runProcess("npx", doctorArgs, { cwd, env });
      expect(healthy.exitCode, `${healthy.stdout}\n${healthy.stderr}`).toBe(0);
      expect(JSON.parse(healthy.stdout).result.checks).toContainEqual(
        expect.objectContaining({ id: "dependencies:node", ok: true }),
      );

      // A runtime package alone is insufficient for the generated TypeScript app.
      await rm(path.join(cwd, "node_modules", "@types", "express"), {
        recursive: true,
        force: true,
      });
      const damaged = await runProcess("npx", doctorArgs, { cwd, env });
      expect(damaged.exitCode).not.toBe(0);
      expect(JSON.parse(damaged.stdout).result.checks).toContainEqual(
        expect.objectContaining({
          id: "dependencies:node",
          ok: false,
          message: expect.stringContaining("@types/express"),
        }),
      );
      const missingTypesBuild = await runProcess(manager, ["run", "build"], { cwd, env });
      expect(missingTypesBuild.exitCode).not.toBe(0);
      expect(`${missingTypesBuild.stdout}\n${missingTypesBuild.stderr}`).toContain("express");

      // Follow doctor's suggested install policy under the same production settings.
      const missingCheck = JSON.parse(damaged.stdout).result.checks.find(
        (check: { id: string }) => check.id === "dependencies:node",
      );
      const installArgs =
        manager === "npm" ? ["install", "--include=dev"] : ["install", "--prod=false", "--force"];
      expect(missingCheck.suggestion).toContain(`${manager} ${installArgs.join(" ")}`);
      const repaired = await runProcess(manager, installArgs, { cwd, env });
      expect(repaired.exitCode, `${repaired.stdout}\n${repaired.stderr}`).toBe(0);
      const repairedBuild = await runProcess(manager, ["run", "build"], { cwd, env });
      expect(repairedBuild.exitCode, `${repairedBuild.stdout}\n${repairedBuild.stderr}`).toBe(0);
      const repairedDoctor = await runProcess("npx", doctorArgs, { cwd, env });
      expect(repairedDoctor.exitCode, `${repairedDoctor.stdout}\n${repairedDoctor.stderr}`).toBe(0);
    },
  );

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
        if (["express", "fastify"].includes(framework)) {
          const [command, entry] = pkg.scripts.start.split(" ");
          expect(command).toBe("node");
          await access(path.join(cwd, entry));
        }
      } else {
        const checked = await runProcess(
          process.execPath,
          ["--check", framework === "fastify" ? "server.js" : "app.js"],
          { cwd },
        );
        expect(checked.exitCode, checked.stderr).toBe(0);
      }
      const doctor = await runProcess(
        "npx",
        ["--yes", "--package", tarball, "rsetup", "--json", "doctor"],
        {
          cwd,
          env,
        },
      );
      expect(doctor.exitCode, `${doctor.stdout}\n${doctor.stderr}`).toBe(0);
      const report = JSON.parse(doctor.stdout);
      expect(await realpath(cwd)).toBe(await realpath(report.result.projectRoot));
      expect(report.result.checks).toContainEqual(
        expect.objectContaining({ id: "dependencies:node", ok: true }),
      );
      expect(report.result.checks).toContainEqual(
        expect.objectContaining({ id: framework, ok: true }),
      );
      const packageName = {
        nextjs: "next",
        "react-vite": "vite",
        express: "express",
        fastify: "fastify",
      }[framework];
      await rm(path.join(cwd, "node_modules", packageName as string), {
        recursive: true,
        force: true,
      });
      const damaged = await runProcess(
        "npx",
        ["--yes", "--package", tarball, "rsetup", "--json", "doctor"],
        { cwd, env },
      );
      expect(damaged.exitCode).not.toBe(0);
      expect(JSON.parse(damaged.stdout).result.checks).toContainEqual(
        expect.objectContaining({
          id: "dependencies:node",
          ok: false,
          message: expect.stringContaining(packageName as string),
        }),
      );
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
      const doctor = await runProcess(
        "npx",
        ["--yes", "--package", tarball, "rsetup", "--json", "doctor"],
        {
          cwd,
          env,
        },
      );
      expect(doctor.exitCode, `${doctor.stdout}\n${doctor.stderr}`).toBe(0);
      const report = JSON.parse(doctor.stdout);
      expect(await realpath(cwd)).toBe(await realpath(report.result.projectRoot));
      expect(report.result.checks).toContainEqual(
        expect.objectContaining({ id: framework, ok: true }),
      );
      expect(report.result.checks).toContainEqual(
        expect.objectContaining({ id: "dependencies:python", ok: true }),
      );
      if (manager === "pip") {
        expect(await readFile(path.join(cwd, "requirements.txt"), "utf8")).toContain(
          framework === "fastapi" ? "fastapi[standard]" : "Flask",
        );
      }
      const python =
        manager === "uv"
          ? path.join(
              cwd,
              ".venv",
              process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
            )
          : path.join(venv, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
      const packagesToDamage = framework === "fastapi" ? ["fastapi-cli", "fastapi"] : ["flask"];
      for (const name of packagesToDamage) {
        const location = await runProcess(
          python,
          [
            "-I",
            "-B",
            "-c",
            "import importlib.metadata as m, pathlib, sys; d=m.distribution(sys.argv[1]); print(next(str(pathlib.Path(d.locate_file(f)).parent) for f in d.files if f.name == 'METADATA' and str(f.parent).endswith('.dist-info')))",
            name,
          ],
          { cwd, env },
        );
        expect(location.exitCode, location.stderr).toBe(0);
        const metadata = location.stdout.trim();
        const removed = path.join(parent, `disabled-${name}`);
        await rename(metadata, removed);
        try {
          const damaged = await runProcess(
            "npx",
            ["--yes", "--package", tarball, "rsetup", "--json", "doctor"],
            { cwd, env },
          );
          expect(damaged.exitCode).not.toBe(0);
          expect(JSON.parse(damaged.stdout).result.checks).toContainEqual(
            expect.objectContaining({
              id: "dependencies:python",
              ok: false,
              message: expect.stringMatching(new RegExp(name, "i")),
            }),
          );
          // doctor must not run uv sync and silently repair the deliberately damaged environment.
          await expect(access(metadata)).rejects.toThrow();
        } finally {
          await rename(removed, metadata);
        }
      }
      if (manager === "uv") {
        const environment = path.join(cwd, ".venv");
        await rename(environment, `${environment}-unavailable`);
        try {
          const damaged = await runProcess(
            "npx",
            ["--yes", "--package", tarball, "rsetup", "--json", "doctor"],
            { cwd, env },
          );
          expect(damaged.exitCode).not.toBe(0);
          expect(JSON.parse(damaged.stdout).result.checks).toContainEqual(
            expect.objectContaining({ id: "dependencies:python", ok: false }),
          );
          await expect(access(environment)).rejects.toThrow();
        } finally {
          await rename(`${environment}-unavailable`, environment);
        }
      }
    },
  );
});

// Dispose only the package directory created by this suite.
afterAll(async () => {
  if (packageDir !== undefined) await cleanupWorkspace(packageDir, false);
});
