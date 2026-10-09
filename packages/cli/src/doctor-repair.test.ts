import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  NODE_DEPENDENCY_PROBE,
  PYTHON_DEPENDENCY_PROBE,
  planInstallationSubset,
  type RepoSetupConfig,
} from "@reposetup/core";
import { createDefaultRegistry } from "./default-registry.js";
import { runCli } from "./run-cli.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-repair-"));
  roots.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "app",
      dependencies: { react: "19.0.0", vite: "8.3.0" },
      devDependencies: { prettier: "3.9.8" },
    }),
  );
  await writeFile(path.join(root, "vite.config.ts"), "export default {};\n");
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(
    path.join(root, "reposetup.json"),
    JSON.stringify({
      schemaVersion: 1,
      project: { name: "app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "react-vite" },
      integrations: [{ id: "prettier" }],
    }),
  );
  return root;
}

function captured() {
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

async function invoke(
  root: string,
  flags: string[],
  confirmCreate?: () => Promise<boolean>,
  signal?: AbortSignal,
  dependenciesHealthy: () => boolean = () => true,
) {
  const capture = captured();
  const result = await runCli(
    ["--json", "doctor", "--config", "reposetup.json", "--fix", ...flags],
    {
      cwd: root,
      io: capture.io,
      commandExists: async () => true,
      resolveExecutable: async (command) => command,
      runProcess: async (request) => {
        const probe =
          request.args.includes(NODE_DEPENDENCY_PROBE) ||
          request.args.includes(PYTHON_DEPENDENCY_PROBE);
        const healthy = dependenciesHealthy();
        return {
          exitCode: probe && !healthy ? 1 : 0,
          stdout: probe
            ? JSON.stringify({
                missing: healthy ? [] : ["prettier"],
                checked: [],
                errors: [],
                environment: request.cwd,
              })
            : "v24.21.0",
          stderr: "",
        };
      },
      ...(confirmCreate === undefined ? {} : { confirmCreate }),
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return { ...capture, result };
}

describe("doctor --fix", () => {
  it("previews a missing Prettier config without any mutation", async () => {
    const root = await fixture();
    const before = await readdir(root);
    const run = await invoke(root, ["--dry-run"]);
    expect(run.result.exitCode).not.toBe(0);
    expect(JSON.parse(run.out()).repair).toMatchObject({ planned: 1, executed: 0, dryRun: true });
    expect(await readdir(root)).toEqual(before);
  });

  it("requires confirmation, repairs once and repeats as a no-op", async () => {
    const root = await fixture();
    const refused = await invoke(root, [], async () => false);
    expect(refused.result.exitCode).not.toBe(0);
    expect(await readdir(root)).not.toContain(".prettierrc");
    const confirmed = await invoke(root, [], async () => true);
    expect(confirmed.result.exitCode).toBe(0);
    expect(JSON.parse(confirmed.out()).repair).toMatchObject({ planned: 1, executed: 1 });
    const content = await readFile(path.join(root, ".prettierrc"), "utf8");
    const repeated = await invoke(root, ["--yes"]);
    expect(repeated.result.exitCode).toBe(0);
    expect(JSON.parse(repeated.out()).repair).toMatchObject({ planned: 0, executed: 0 });
    expect(await readFile(path.join(root, ".prettierrc"), "utf8")).toBe(content);
  });

  it("refuses a repair when installed dependencies change after confirmation", async () => {
    const root = await fixture();
    let healthy = true;
    const run = await invoke(
      root,
      [],
      async () => {
        healthy = false;
        return true;
      },
      undefined,
      () => healthy,
    );
    expect(run.result.exitCode).not.toBe(0);
    expect(await readdir(root)).not.toContain(".prettierrc");
    expect(JSON.parse(run.err().trim().split("\n").at(-1)!).error.code).toBe("PLAN_INVALID");
  });

  it("uses the Express recipe's dedicated config template", async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "app",
        dependencies: { express: "5.2.1" },
        devDependencies: { prettier: "3.9.8" },
      }),
    );
    await writeFile(path.join(root, "app.js"), 'import express from "express";\n');
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({
        schemaVersion: 1,
        project: { name: "app" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "express", options: { typescript: false } },
        integrations: [{ id: "prettier" }],
      }),
    );
    const run = await invoke(root, ["--yes"]);
    expect(run.result.exitCode, run.out() + run.err()).toBe(0);
    expect(await readFile(path.join(root, ".prettierrc"), "utf8")).toBe("{}\n");
  });

  it("preserves a valid alternative config and refuses a changed target after review", async () => {
    const root = await fixture();
    await writeFile(path.join(root, ".prettierrc.json"), "{}\n");
    const alternative = await invoke(root, ["--yes"]);
    expect(JSON.parse(alternative.out()).repair.planned).toBe(0);
    expect(await readdir(root)).not.toContain(".prettierrc");
    await rm(path.join(root, ".prettierrc.json"));
    const changed = await invoke(root, [], async () => {
      await writeFile(path.join(root, ".prettierrc"), '{"printWidth": 80}\n');
      return true;
    });
    expect(changed.result.exitCode).not.toBe(0);
    expect(await readFile(path.join(root, ".prettierrc"), "utf8")).toBe('{"printWidth": 80}\n');
  });

  it("refuses a changed intended config or dependency declaration after confirmation", async () => {
    const root = await fixture();
    const configPath = path.join(root, "reposetup.json");
    const config = await readFile(configPath, "utf8");
    const changedConfig = await invoke(root, [], async () => {
      await writeFile(configPath, JSON.stringify({ ...JSON.parse(config), integrations: [] }));
      return true;
    });
    expect(changedConfig.result.exitCode).not.toBe(0);
    expect(JSON.parse(changedConfig.err().trim().split("\n").at(-1)!).error.code).toBe(
      "PLAN_INVALID",
    );
    expect(await readdir(root)).not.toContain(".prettierrc");

    await writeFile(configPath, config);
    const manifestPath = path.join(root, "package.json");
    const changedManifest = await invoke(root, [], async () => {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifest.devDependencies.prettier = "2.0.0";
      await writeFile(manifestPath, JSON.stringify(manifest));
      return true;
    });
    expect(changedManifest.result.exitCode).not.toBe(0);
    expect(await readdir(root)).not.toContain(".prettierrc");
  });

  it("honors cancellation before executing a reviewed repair", async () => {
    const root = await fixture();
    const controller = new AbortController();
    const cancelled = await invoke(
      root,
      [],
      async () => {
        controller.abort();
        return true;
      },
      controller.signal,
    );
    expect(cancelled.result.exitCode).not.toBe(0);
    expect(JSON.parse(cancelled.err().trim().split("\n").at(-1)!).error.code).toBe(
      "EXECUTION_ABORTED",
    );
    expect(await readdir(root)).not.toContain(".prettierrc");
  });

  it("does not repair an absent package or a custom recipe version", async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "app", dependencies: { react: "19.0.0", vite: "8.3.0" } }),
    );
    const missing = await invoke(root, ["--yes"]);
    expect(JSON.parse(missing.out()).repair.planned).toBe(0);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "app",
        dependencies: { react: "19.0.0", vite: "8.3.0" },
        devDependencies: { prettier: "2.0.0" },
      }),
    );
    const changed = await invoke(root, ["--yes"]);
    expect(JSON.parse(changed.out()).repair.planned).toBe(0);
    expect(await readdir(root)).not.toContain(".prettierrc");
  });

  it("creates only declared Python placeholder keys and never reads the real .env", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-repair-python-"));
    roots.push(root);
    await writeFile(
      path.join(root, "pyproject.toml"),
      '[project]\nname = "app"\ndependencies = ["fastapi[standard]==0.141.1", "pydantic==2.13.5", "pydantic-settings==2.15.0", "pytest==9.1.1"]\n',
    );
    await writeFile(path.join(root, "uv.lock"), "version = 1\n");
    await writeFile(path.join(root, "main.py"), "from fastapi import FastAPI\napp = FastAPI()\n");
    const config: RepoSetupConfig = {
      schemaVersion: 1,
      project: { name: "app" },
      runtime: { id: "python" },
      packageManager: "uv",
      framework: { id: "fastapi" },
      integrations: [{ id: "pydantic" }, { id: "pytest" }, { id: "pydantic-settings" }],
    };
    const recipe = planInstallationSubset(config, createDefaultRegistry(), ["pydantic-settings"]);
    if (!recipe.valid) throw new Error("Expected a qualified Pydantic Settings recipe");
    const source = recipe.operations.find(
      (operation) => operation.type === "create_file" && operation.path === "settings.py",
    );
    if (source?.type !== "create_file") throw new Error("Missing settings recipe template");
    await writeFile(path.join(root, "settings.py"), source.content);
    await writeFile(path.join(root, ".env"), "APP_NAME=private-value\nSECRET_TOKEN=do-not-copy\n");
    await writeFile(path.join(root, "reposetup.json"), JSON.stringify(config));
    const before = await readFile(path.join(root, ".env"), "utf8");
    const run = await invoke(root, ["--yes"]);
    expect(run.result.exitCode).toBe(0);
    expect(JSON.parse(run.out()).repair).toMatchObject({ planned: 1, executed: 1 });
    expect(await readFile(path.join(root, ".env.example"), "utf8")).toBe(
      "APP_NAME=RepoSetup app\n",
    );
    expect(await readFile(path.join(root, ".env"), "utf8")).toBe(before);
    expect(run.out() + run.err()).not.toContain("private-value");
    expect(run.out() + run.err()).not.toContain("SECRET_TOKEN");
    const repeated = await invoke(root, ["--yes"]);
    expect(JSON.parse(repeated.out()).repair.planned).toBe(0);
    await writeFile(path.join(root, ".env.example"), "APP_NAME=custom\nKEEP=unchanged\n");
    const userFile = await invoke(root, ["--yes"]);
    expect(JSON.parse(userFile.out()).repair.planned).toBe(0);
    expect(await readFile(path.join(root, ".env.example"), "utf8")).toBe(
      "APP_NAME=custom\nKEEP=unchanged\n",
    );
    await rm(path.join(root, ".env.example"));
    await writeFile(path.join(root, "settings.py"), "# customized settings\n");
    const customSource = await invoke(root, ["--yes"]);
    expect(JSON.parse(customSource.out()).repair.planned).toBe(0);
    expect(await readdir(root)).not.toContain(".env.example");
    await writeFile(path.join(root, "settings.py"), source.content);
    const staleSource = await invoke(root, [], async () => {
      await writeFile(path.join(root, "settings.py"), "# modified during review\n");
      return true;
    });
    expect(staleSource.result.exitCode).not.toBe(0);
    expect(await readdir(root)).not.toContain(".env.example");

    const outside = await mkdtemp(path.join(os.tmpdir(), "reposetup-repair-outside-"));
    roots.push(outside);
    await writeFile(path.join(outside, "settings.py"), source.content);
    await rm(path.join(root, "settings.py"));
    await symlink(path.join(outside, "settings.py"), path.join(root, "settings.py"));
    const linkedProof = await invoke(root, ["--yes"]);
    expect(linkedProof.result.exitCode).not.toBe(0);
    expect(await readdir(root)).not.toContain(".env.example");
    expect(await readFile(path.join(outside, "settings.py"), "utf8")).toBe(source.content);
  });

  it.each([
    ["sqlite", "DATABASE_URL=file:./dev.db\n"],
    [
      "postgresql",
      "DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public\n",
    ],
  ] as const)(
    "restores qualified Prisma %s placeholders without touching source",
    async (database, expected) => {
      const root = await fixture();
      const config: RepoSetupConfig = {
        schemaVersion: 1,
        project: { name: "app" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "react-vite" },
        integrations: [{ id: database }, { id: "prisma" }],
      };
      const recipe = planInstallationSubset(config, createDefaultRegistry(), ["prisma"]);
      if (!recipe.valid) throw new Error("Expected a qualified Prisma recipe");
      const helper = recipe.operations.find(
        (operation) => operation.type === "create_file" && operation.path === "lib/prisma.ts",
      );
      if (helper?.type !== "create_file") throw new Error("Missing Prisma helper recipe template");
      const dependencies: Record<string, string> = { react: "19.0.0", vite: "8.3.0" };
      for (const operation of recipe.operations) {
        if (operation.type !== "install_package") continue;
        for (const spec of operation.packages) {
          const at = spec.lastIndexOf("@");
          dependencies[spec.slice(0, at)] = spec.slice(at + 1);
        }
      }
      await writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "app", dependencies }),
      );
      await mkdir(path.join(root, "prisma"));
      await mkdir(path.join(root, "lib"));
      await mkdir(path.join(root, "generated/prisma"), { recursive: true });
      await writeFile(
        path.join(root, "prisma/schema.prisma"),
        `datasource db { provider = "${database}" }\n`,
      );
      await writeFile(path.join(root, "generated/prisma/client.ts"), "// generated fixture\n");
      await writeFile(path.join(root, "lib/prisma.ts"), helper.content);
      await writeFile(path.join(root, "reposetup.json"), JSON.stringify(config));
      const run = await invoke(root, ["--yes"]);
      expect(run.result.exitCode, run.out() + run.err()).toBe(0);
      expect(await readFile(path.join(root, ".env.example"), "utf8")).toBe(expected);
      expect(await readFile(path.join(root, "lib/prisma.ts"), "utf8")).toBe(helper.content);
    },
  );
});
