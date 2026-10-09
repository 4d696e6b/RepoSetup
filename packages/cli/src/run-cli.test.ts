import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { IntegrationDefinition, ProcessRunRequest, RepoSetupConfig } from "@reposetup/core";
import { createBuiltInRegistry } from "@reposetup/integrations";
import { createRegistry } from "@reposetup/registry";
import { afterEach, describe, expect, it } from "vitest";

import { EXIT_CODES } from "./exit-codes.js";
import { runCli } from "./run-cli.js";
import type { CliFs, CliIo, CreateAnswers } from "./types.js";
import { cliVersion } from "./version.js";

function captureIo(): { io: CliIo; stdout: () => string; stderr: () => string } {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      writeOut(text) {
        stdout += text;
      },
      writeErr(text) {
        stderr += text;
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function fakeIntegration(
  overrides: Partial<IntegrationDefinition> & Pick<IntegrationDefinition, "id">,
): IntegrationDefinition {
  const definition: IntegrationDefinition = {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    category: overrides.category ?? "utility",
    description: overrides.description ?? `Fake integration ${overrides.id}`,
    status: overrides.status ?? "experimental",
    documentationUrl:
      overrides.documentationUrl ?? `https://example.test/integrations/${overrides.id}`,
    supports: overrides.supports ?? (() => ({ supported: true })),
    plan: overrides.plan ?? (() => []),
  };

  if (overrides.keywords !== undefined) {
    definition.keywords = overrides.keywords;
  }
  if (overrides.requirements !== undefined) {
    definition.requirements = overrides.requirements;
  }
  if (overrides.recommendations !== undefined) {
    definition.recommendations = overrides.recommendations;
  }
  if (overrides.conflicts !== undefined) {
    definition.conflicts = overrides.conflicts;
  }
  if (overrides.optionSchema !== undefined) {
    definition.optionSchema = overrides.optionSchema;
  }
  if (overrides.verification !== undefined) {
    definition.verification = overrides.verification;
  }
  if (overrides.addable !== undefined) {
    definition.addable = overrides.addable;
  }
  if (overrides.removable !== undefined) {
    definition.removable = overrides.removable;
  }
  if (overrides.detect !== undefined) {
    definition.detect = overrides.detect;
  }
  if (overrides.remove !== undefined) {
    definition.remove = overrides.remove;
  }

  return definition;
}

const framework = fakeIntegration({
  id: "fake-framework",
  name: "Fake Framework",
  category: "framework",
  description: "A fake web framework",
  keywords: ["app"],
  plan: () => [
    {
      type: "create_directory",
      path: "src",
      behavior: "fail_if_exists",
      description: "Create src",
    },
  ],
});

const database = fakeIntegration({
  id: "fake-db",
  name: "Fake Database",
  category: "database",
  description: "Stores rows for tests",
  plan: () => [
    {
      type: "create_file",
      path: "db.txt",
      content: "engine=sqlite",
      behavior: "fail_if_exists",
      description: "Record database engine",
    },
  ],
});

const orm = fakeIntegration({
  id: "fake-orm",
  name: "Fake ORM",
  category: "orm",
  description: "Maps objects to rows",
  keywords: ["mapper"],
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "fake-db" },
      reason: "Needs a database",
    },
  ],
  plan: () => [
    {
      type: "install_package",
      packageManager: "pnpm",
      packages: ["fake-orm"],
      cwd: ".",
      description: "Install fake ORM",
    },
  ],
});

function testRegistry() {
  return createRegistry([framework, database, orm]);
}

function addRegistry() {
  return createRegistry([
    fakeIntegration({
      id: "nextjs",
      name: "Next.js",
      category: "framework",
      detect: async (context) => ({
        detected: context.packageJson?.dependencies.next !== undefined,
        confidence: "certain",
        evidence: [],
      }),
      plan: () => [
        {
          type: "run_command",
          command: "pnpm",
          args: ["create", "next-app@latest", ".", "--yes"],
          cwd: ".",
          description: "Scaffold Next.js with create-next-app",
        },
      ],
    }),
    fakeIntegration({
      id: "zod",
      name: "Zod",
      category: "validation",
      addable: true,
      removable: true,
      requirements: [
        {
          kind: "requires",
          target: { type: "category", category: "framework" },
          reason: "Needs a framework",
        },
      ],
      plan: () => [
        {
          type: "run_command",
          command: "pnpm",
          args: ["add", "zod"],
          cwd: ".",
          description: "Install Zod",
        },
      ],
      remove: () => [
        {
          type: "run_command",
          command: "pnpm",
          args: ["remove", "zod"],
          cwd: ".",
          description: "Remove Zod",
        },
      ],
    }),
    fakeIntegration({
      id: "prettier",
      name: "Prettier",
      category: "formatting",
      addable: true,
      requirements: [
        {
          kind: "requires",
          target: { type: "category", category: "framework" },
          reason: "Needs a framework",
        },
      ],
      plan: () => [
        {
          type: "create_file",
          path: ".prettierrc",
          content: "{}\n",
          behavior: "fail_if_exists",
          description: "Add an empty Prettier config so editors detect Prettier",
        },
      ],
    }),
  ]);
}

function sampleConfig(): RepoSetupConfig {
  return {
    schemaVersion: 1,
    project: { name: "demo", path: "." },
    runtime: { id: "node" },
    packageManager: "pnpm",
    framework: { id: "fake-framework" },
    integrations: [{ id: "fake-db" }, { id: "fake-orm" }],
  };
}

function fsFromFiles(files: Record<string, string>): CliFs {
  return {
    async readFile(filePath) {
      const contents = files[filePath];
      if (contents === undefined) {
        throw new Error(`ENOENT: ${filePath}`);
      }
      return contents;
    },
  };
}

async function snapshotTree(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (entry.isDirectory()) {
        snapshot[`${rel}/`] = "dir";
        await walk(full);
      } else {
        snapshot[rel] = await readFile(full, "utf8");
      }
    }
  }

  await walk(root);
  return snapshot;
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("runCli", () => {
  it("shows help for create, search, info, and registry validate", async () => {
    const captured = captureIo();
    const result = await runCli(["--help"], { io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("create");
    expect(captured.stdout()).toContain("add");
    expect(captured.stdout()).toContain("remove");
    expect(captured.stdout()).toContain("search");
    expect(captured.stdout()).toContain("info");
    expect(captured.stdout()).toContain("stack");
    expect(captured.stdout()).toContain("doctor");
    expect(captured.stdout()).toContain("export");
    expect(captured.stdout()).toContain("registry");
    expect(captured.stdout()).toContain("presets");
  });

  it("lists bundled guaranteed presets", async () => {
    const captured = captureIo();
    const result = await runCli(["presets"], { io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("next-sqlite");
    expect(captured.stdout()).toContain("react-vite");
    expect(captured.stdout()).toContain("express-postgres");
    expect(captured.stdout()).toContain("fastapi");
    expect(captured.stdout()).toContain("flask");
    expect(captured.stdout()).toContain("guaranteed");
  });

  it("prints the CLI version", async () => {
    const captured = captureIo();
    const result = await runCli(["--version"], { io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout().trim()).toBe(cliVersion());
  });

  it("flows config through validation, resolve, plan, and human-readable dry-run", async () => {
    const captured = captureIo();
    const cwd = "/virtual-project";
    const configPath = path.resolve(cwd, "reposetup.json");
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd,
      registry: testRegistry(),
      io: captured.io,
      fs: fsFromFiles({ [configPath]: JSON.stringify(sampleConfig()) }),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for demo");
    expect(captured.stdout()).toContain("fake-framework");
    expect(captured.stdout()).toContain("fake-db");
    expect(captured.stdout()).toContain("fake-orm");
    expect(captured.stdout()).toContain("create_directory  Create src");
    expect(captured.stdout()).toContain("create_file  Record database engine");
    expect(captured.stdout()).toContain("install_package  Install fake ORM");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(captured.stderr()).toBe("");
  });

  it("does not mutate the filesystem during dry-run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-dry-run-"));
    tempDirs.push(root);
    const projectDir = path.join(root, "project");
    await mkdir(projectDir);
    await writeFile(path.join(projectDir, "marker.txt"), "keep me\n");
    await writeFile(
      path.join(root, "reposetup.json"),
      `${JSON.stringify(
        {
          ...sampleConfig(),
          project: { name: "demo", path: "project" },
        },
        null,
        2,
      )}\n`,
    );

    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd: root,
      registry: testRegistry(),
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
    expect(await readdir(projectDir)).toEqual(["marker.txt"]);
  });

  it("shows a redacted JSON change preview without executing a dry-run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-diff-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "reposetup.json"), JSON.stringify(sampleConfig()));
    const captured = captureIo();
    const result = await runCli(
      ["--json", "create", "--config", "reposetup.json", "--diff", "--dry-run"],
      {
        cwd: root,
        registry: testRegistry(),
        io: captured.io,
        runProcess: async () => {
          throw new Error("preview spawned a process");
        },
      },
    );
    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    const output = JSON.parse(captured.stdout()) as {
      kind: string;
      preview: { version: number; changes: Array<{ category: string; target: string }> };
    };
    expect(output.kind).toBe("plan");
    expect(output.preview.version).toBe(1);
    expect(output.preview.changes).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "create", target: "db.txt" })]),
    );
    expect(await readdir(root)).toEqual(["reposetup.json"]);
  });

  it("refuses execution when a previewed target changes during confirmation", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-diff-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "reposetup.json"), JSON.stringify(sampleConfig()));
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--diff"], {
      cwd: root,
      registry: testRegistry(),
      io: captured.io,
      confirmCreate: async () => {
        await writeFile(path.join(root, "db.txt"), "my file");
        return true;
      },
      runProcess: async () => {
        throw new Error("stale preview executed a process");
      },
    });
    expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS);
    expect(captured.stderr()).toContain("changed after preview");
    expect(await readFile(path.join(root, "db.txt"), "utf8")).toBe("my file");
  });

  it("refuses a symlinked preview target without following it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-diff-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "reposetup.json"), JSON.stringify(sampleConfig()));
    await writeFile(path.join(root, "outside.txt"), "private value");
    await symlink(path.join(root, "outside.txt"), path.join(root, "db.txt"));
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--diff", "--dry-run"], {
      cwd: root,
      registry: testRegistry(),
      io: captured.io,
      runProcess: async () => {
        throw new Error("preview spawned a process");
      },
    });
    expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("blocked");
    expect(captured.stdout()).not.toContain("private value");
    expect(await readFile(path.join(root, "outside.txt"), "utf8")).toBe("private value");
    const json = captureIo();
    const jsonResult = await runCli(
      ["--json", "create", "--config", "reposetup.json", "--diff", "--dry-run"],
      {
        cwd: root,
        registry: testRegistry(),
        io: json.io,
      },
    );
    expect(jsonResult.exitCode).not.toBe(EXIT_CODES.SUCCESS);
    expect(json.stdout()).toBe("");
    expect(JSON.parse(json.stderr())).toMatchObject({ kind: "error", preview: { blocked: true } });
  });

  it("refuses to execute without confirmation or --yes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-create-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "reposetup.json"), `${JSON.stringify(sampleConfig())}\n`);
    const before = await snapshotTree(root);
    const captured = captureIo();

    const result = await runCli(["create", "--config", "reposetup.json"], {
      cwd: root,
      registry: testRegistry(),
      io: captured.io,
      confirmCreate: async () => false,
    });

    expect(result.exitCode).toBe(EXIT_CODES.INVALID_INPUT);
    expect(captured.stderr()).toContain("Aborted.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("executes the plan with --yes and a fake process runner", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-create-exec-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "reposetup.json"), `${JSON.stringify(sampleConfig())}\n`);
    const captured = captureIo();
    const runs: ProcessRunRequest[] = [];

    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: testRegistry(),
      io: captured.io,
      runProcess: async (request) => {
        runs.push(request);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Executed 4 operations.");
    expect(captured.stdout()).toContain(`Project directory: ${path.resolve(root)}`);
    expect(captured.stderr()).toBe("");
    expect(await readdir(root)).toEqual(
      expect.arrayContaining(["db.txt", "reposetup.json", "src"]),
    );
    expect(await readFile(path.join(root, "db.txt"), "utf8")).toBe("engine=sqlite");
    expect(runs).toEqual([
      {
        command: "pnpm",
        args: ["add", "--prod=false", "fake-orm"],
        cwd: path.resolve(root),
        timeoutMs: 300_000,
      },
      expect.objectContaining({
        command: "node",
        args: ["-e", expect.any(String)],
        cwd: path.resolve(root),
      }),
    ]);
  });

  it("does not report create success when a package install exits zero but verification finds missing packages", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-create-incomplete-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "reposetup.json"), JSON.stringify(sampleConfig()));
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: testRegistry(),
      io: captured.io,
      runProcess: async (request) =>
        request.args[0] === "-e"
          ? {
              exitCode: 1,
              stdout: JSON.stringify({
                missing: ["fake-orm"],
                checked: [],
                errors: [],
                environment: root,
              }),
              stderr: "",
            }
          : { exitCode: 0, stdout: "", stderr: "" },
    });
    expect(result.exitCode).toBe(EXIT_CODES.VERIFICATION_FAILURE);
    expect(captured.stderr()).toContain("VERIFICATION_FAILED");
    expect(captured.stderr()).toContain("fake-orm");
    expect(captured.stderr()).toContain(`Project directory: ${path.resolve(root)}`);
    expect(captured.stderr()).toContain("Create does not resume an interrupted installation");
    expect(captured.stdout()).not.toContain("Executed 4 operations.");
  });

  it("reports the nested project and safe recovery when its cache prevents installation", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-create-cache-"));
    tempDirs.push(root);
    const config = { ...sampleConfig(), project: { name: "child", path: "child" } };
    await writeFile(path.join(root, "reposetup.json"), JSON.stringify(config));
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: testRegistry(),
      io: captured.io,
      runProcess: async () => ({
        exitCode: 1,
        stdout: "",
        stderr:
          "npm error EEXIST EACCES: permission denied, mkdir '/user/.npm/_cacache/content-v2'",
      }),
    });
    expect(result.exitCode).toBe(EXIT_CODES.GENERAL_FAILURE);
    expect(captured.stderr()).toContain(`Project directory: ${path.join(root, "child")}`);
    expect(captured.stderr()).toContain(
      "npm install --include=dev --cache <writable-cache-directory>",
    );
    expect(captured.stderr()).toContain("Create does not resume an interrupted installation");
    expect(captured.stdout()).not.toContain("Installed dependency check passed");
    expect(await readdir(path.join(root, "child"))).toContain("src");
  });

  it.each([
    ["postgresql", "DATABASE_URL"],
    ["mongodb", "MONGODB_URI"],
  ])(
    "explains the remaining %s and Docker prerequisites after creation",
    async (databaseId, variable) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-create-system-"));
      tempDirs.push(root);
      const captured = captureIo();
      const runs: ProcessRunRequest[] = [];
      await writeFile(
        path.join(root, "reposetup.json"),
        JSON.stringify({
          schemaVersion: 1,
          project: { name: "app", path: "app" },
          runtime: { id: "node" },
          packageManager: "npm",
          framework: { id: "express", options: { typescript: true } },
          integrations: [{ id: databaseId }, { id: "docker" }],
        }),
      );
      const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
        cwd: root,
        registry: createBuiltInRegistry(),
        io: captured.io,
        commandExists: async () => true,
        runProcess: async (request) => {
          runs.push(request);
          return {
            exitCode: 0,
            stdout: request.args[0] === "--version" ? "v24.21.0" : "",
            stderr: "",
          };
        },
      });
      expect(result.exitCode, captured.stderr()).toBe(EXIT_CODES.SUCCESS);
      expect(captured.stdout()).toContain(
        "no database server was installed, started, or connected",
      );
      expect(captured.stdout()).toContain(`Configure your server and ${variable}`);
      expect(captured.stdout()).toContain(
        "Docker installation and running containers have not been verified",
      );
      expect(runs.some((request) => request.command === "docker")).toBe(false);
      expect(await readFile(path.join(root, "app", "DOCKER_SETUP.md"), "utf8")).toContain(
        "docker --version",
      );
    },
  );

  it("returns invalid input for a malformed config file", async () => {
    const captured = captureIo();
    const cwd = "/virtual-project";
    const configPath = path.resolve(cwd, "reposetup.json");
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd,
      registry: testRegistry(),
      io: captured.io,
      fs: fsFromFiles({ [configPath]: "{ not json" }),
    });

    expect(result.exitCode).toBe(EXIT_CODES.INVALID_INPUT);
    expect(captured.stderr()).toContain("CONFIG_INVALID");
  });

  it("returns a resolution failure when planning cannot succeed", async () => {
    const captured = captureIo();
    const cwd = "/virtual-project";
    const configPath = path.resolve(cwd, "reposetup.json");
    const config = {
      ...sampleConfig(),
      integrations: [{ id: "fake-orm" }],
    };
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd,
      registry: testRegistry(),
      io: captured.io,
      fs: fsFromFiles({ [configPath]: JSON.stringify(config) }),
    });

    expect(result.exitCode).toBe(EXIT_CODES.RESOLUTION_FAILURE);
    expect(captured.stderr()).toContain("MISSING_REQUIREMENT");
  });

  it("builds a dry-run plan from injected create prompts", async () => {
    const captured = captureIo();
    const answers: CreateAnswers = {
      projectName: "prompted-app",
      runtimeId: "node",
      packageManager: "pnpm",
      frameworkId: "fake-framework",
      integrations: [{ id: "fake-db" }],
    };

    const result = await runCli(["create", "--dry-run"], {
      registry: testRegistry(),
      io: captured.io,
      promptCreate: async () => answers,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for prompted-app");
    expect(captured.stdout()).toContain("create_file  Record database engine");
  });

  it("searches the injected registry without using the network", async () => {
    const captured = captureIo();
    const result = await runCli(["search", "orm"], {
      registry: testRegistry(),
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("fake-orm  orm  Fake ORM");
    expect(captured.stdout()).not.toContain("fake-db");
  });

  it("filters search results by category", async () => {
    const captured = captureIo();
    const result = await runCli(["search", "--category", "database"], {
      registry: testRegistry(),
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("fake-db  database  Fake Database");
    expect(captured.stdout()).not.toContain("fake-orm");
  });

  it("prints integration info from the registry", async () => {
    const captured = captureIo();
    const result = await runCli(["info", "fake-orm"], {
      registry: testRegistry(),
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("fake-orm");
    expect(captured.stdout()).toContain("category          orm");
    expect(captured.stdout()).toContain("requirements      fake-db");
    expect(captured.stdout()).toContain("verified          not recorded");
    expect(captured.stdout()).toContain("package range     not recorded");
    expect(captured.stdout()).toContain("runtime range     not recorded");
    expect(captured.stdout()).toContain("removable         no");
    expect(captured.stdout()).toContain("https://example.test/integrations/fake-orm");
  });

  it("validates the loaded registry", async () => {
    const captured = captureIo();
    const result = await runCli(["registry", "validate"], {
      registry: testRegistry(),
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Registry is valid (3 integrations).");
  });

  it("dry-runs the golden Next.js/SQLite example without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-golden-"));
    tempDirs.push(root);
    const examplePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../examples/reposetup.next-sqlite.json",
    );
    await writeFile(path.join(root, "reposetup.json"), await readFile(examplePath, "utf8"));
    await writeFile(path.join(root, "marker.txt"), "keep me\n");

    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for example-next-app");
    expect(captured.stdout()).toContain("nextjs");
    expect(captured.stdout()).toContain("prisma");
    expect(captured.stdout()).toContain(
      "pnpm create next-app@16.3.6 . --ts --eslint --app --no-src-dir --no-tailwind --import-alias @/* --use-pnpm --skip-install --yes",
    );
    expect(captured.stdout()).toContain(
      "modify_json  Assemble package.json dependencies before a consolidated install",
    );
    expect(captured.stdout()).toContain(
      "pnpm install --no-frozen-lockfile --prod=false --prefer-offline",
    );
    expect(captured.stdout()).toContain("pnpm exec prisma generate");
    expect(captured.stdout()).toContain("pnpm exec vitest run");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("dry-runs the React + Vite example without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-react-vite-"));
    tempDirs.push(root);
    const examplePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../examples/reposetup.react-vite.json",
    );
    await writeFile(path.join(root, "reposetup.json"), await readFile(examplePath, "utf8"));
    await writeFile(path.join(root, "marker.txt"), "keep me\n");

    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for example-react-app");
    expect(captured.stdout()).toContain("react-vite");
    expect(captured.stdout()).toContain(
      "pnpm create vite@8.3.0 . --template react-ts --no-interactive",
    );
    expect(captured.stdout()).toContain("pnpm dlx shadcn@4.21.0 init --yes --defaults -t vite");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("dry-runs the Express + PostgreSQL example without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-express-pg-"));
    tempDirs.push(root);
    const examplePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../examples/reposetup.express-postgres.json",
    );
    await writeFile(path.join(root, "reposetup.json"), await readFile(examplePath, "utf8"));
    await writeFile(path.join(root, "marker.txt"), "keep me\n");

    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for example-express-app");
    expect(captured.stdout()).toContain("express");
    expect(captured.stdout()).toContain("postgresql");
    expect(captured.stdout()).toContain(
      "pnpm exec prisma init --datasource-provider postgresql --output ../generated/prisma",
    );
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("dry-runs the FastAPI example without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-fastapi-"));
    tempDirs.push(root);
    const examplePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../examples/reposetup.fastapi.json",
    );
    await writeFile(path.join(root, "reposetup.json"), await readFile(examplePath, "utf8"));
    await writeFile(path.join(root, "marker.txt"), "keep me\n");

    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for example-fastapi-app");
    expect(captured.stdout()).toContain("fastapi");
    expect(captured.stdout()).toContain("uv init . --bare --name example-fastapi-app");
    expect(captured.stdout()).toContain(
      "install_package  Install fastapi[standard]==0.141.1, pydantic==2.13.5, SQLAlchemy==2.0.54, psycopg[binary]==3.3.6, alembic==1.20.0",
    );
    expect(captured.stdout()).toContain(
      "packages  fastapi[standard]==0.141.1, pydantic==2.13.5, SQLAlchemy==2.0.54, psycopg[binary]==3.3.6, alembic==1.20.0",
    );
    expect(captured.stdout()).toContain("uv run alembic init alembic");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("dry-runs the Flask example without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-flask-"));
    tempDirs.push(root);
    const examplePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../examples/reposetup.flask.json",
    );
    await writeFile(path.join(root, "reposetup.json"), await readFile(examplePath, "utf8"));
    await writeFile(path.join(root, "marker.txt"), "keep me\n");

    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for example-flask-app");
    expect(captured.stdout()).toContain("flask");
    expect(captured.stdout()).toContain(
      "install_package  Install Flask==3.1.3, SQLAlchemy==2.0.54, psycopg[binary]==3.3.6, alembic==1.20.0",
    );
    expect(captured.stdout()).toContain(
      "packages  Flask==3.1.3, SQLAlchemy==2.0.54, psycopg[binary]==3.3.6, alembic==1.20.0",
    );
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("validates the built-in registry by default", async () => {
    const captured = captureIo();
    const result = await runCli(["registry", "validate"], { io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Registry is valid (37 integrations).");
  });

  it("reports PROJECT_NOT_FOUND for stack outside a project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-stack-"));
    tempDirs.push(root);
    const captured = captureIo();
    const result = await runCli(["stack"], {
      cwd: root,
      io: captured.io,
      registry: testRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.INVALID_INPUT);
    expect(captured.stderr()).toContain("PROJECT_NOT_FOUND");
  });

  it("prints the detected stack for a fixture project without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-stack-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "fixture-next",
        dependencies: { next: "16.0.0", prisma: "7.10.0" },
        devDependencies: { typescript: "5.9.0" },
      }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "tsconfig.json"), "{}\n");
    await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
    const before = await snapshotTree(root);

    const captured = captureIo();
    const result = await runCli(["stack"], {
      cwd: root,
      io: captured.io,
      registry: createRegistry([
        fakeIntegration({
          id: "nextjs",
          name: "Next.js",
          category: "framework",
          detect: async () => ({
            detected: true,
            confidence: "certain",
            evidence: [
              { kind: "dependency", detail: "package.json includes next", path: "package.json" },
            ],
          }),
        }),
        fakeIntegration({
          id: "prisma",
          name: "Prisma",
          category: "orm",
          detect: async () => ({
            detected: true,
            confidence: "likely",
            evidence: [{ kind: "dependency", detail: "package.json includes prisma" }],
          }),
        }),
      ]),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Runtime");
    expect(captured.stdout()).toContain("Node.js");
    expect(captured.stdout()).toContain("Package mgr");
    expect(captured.stdout()).toContain("pnpm");
    expect(captured.stdout()).toContain("Next.js");
    expect(captured.stdout()).toContain("TypeScript");
    expect(captured.stdout()).toContain("Prisma (likely)");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("keeps quiet and no-color output concise and free of ANSI escapes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["--no-color", "add", "zod", "--dry-run", "--quiet"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run succeeded");
    expect(captured.stdout()).not.toContain("\u001B[");
  });

  it("writes a versioned JSON add plan without progress on stdout", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["--json", "add", "zod", "--diff", "--dry-run"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(JSON.parse(captured.stdout())).toMatchObject({
      version: 1,
      kind: "plan",
      dryRun: true,
      plan: { valid: true },
      preview: { version: 1, blocked: false, changes: [{ category: "unknown" }] },
    });
  });

  it("reports partial execution with a safe checked retry path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["add", "zod", "--yes"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
      runProcess: async () => ({ exitCode: 1, stdout: "", stderr: "failed" }),
    });

    expect(result.exitCode).toBe(EXIT_CODES.GENERAL_FAILURE);
    expect(captured.stderr()).toContain("Execution stopped after 0 of 1 operations completed.");
    expect(captured.stderr()).toContain("run reposetup doctor");
  });

  it("dry-runs add for an addable integration without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["add", "zod", "--dry-run"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Install Zod");
    expect(captured.stdout()).toContain("pnpm add zod");
    expect(captured.stdout()).not.toContain("create-next-app");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("dry-runs multiple additions as one plan", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["add", "zod", "prettier", "--dry-run"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Install Zod");
    expect(captured.stdout()).toContain("Prettier config");
  });

  it("reports a no-op when adding an already installed integration", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0", zod: "4.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["add", "zod", "--dry-run"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain('No changes. Integration "zod" is already present.');
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("rejects adding a non-addable integration", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["add", "nextjs"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.RESOLUTION_FAILURE);
    expect(captured.stderr()).toContain("UNSUPPORTED_CONTEXT");
  });

  it("executes add with --yes for missing files only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["add", "prettier", "--yes"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
      runProcess: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(await readFile(path.join(root, ".prettierrc"), "utf8")).toBe("{}\n");
  });

  it("dry-runs remove for an explicit recipe without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-remove-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0", zod: "4.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["remove", "zod", "--diff", "--dry-run"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Remove Zod");
    expect(captured.stdout()).toContain("Change preview:");
    expect(captured.stdout()).toContain("pnpm remove zod");
    expect(captured.stdout()).not.toContain("create-next-app");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("reports a no-op when removing an integration that is not present", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-remove-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["remove", "zod", "--dry-run"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain('No changes. Integration "zod" is not present.');
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("refuses remove when no safe recipe exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-remove-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["remove", "nextjs"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
    });

    expect(result.exitCode).toBe(EXIT_CODES.RESOLUTION_FAILURE);
    expect(captured.stderr()).toContain(
      "RepoSetup cannot safely remove this integration automatically.",
    );
  });

  it("executes remove with --yes without deleting leftover Prettier config", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-remove-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "demo-app",
        dependencies: { next: "16.0.0", zod: "4.0.0" },
      }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const ran: ProcessRunRequest[] = [];
    const result = await runCli(["remove", "zod", "--yes"], {
      cwd: root,
      io: captured.io,
      registry: addRegistry(),
      commandExists: async () => true,
      runProcess: async (request) => {
        ran.push(request);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(ran).toEqual([
      expect.objectContaining({
        command: "pnpm",
        args: ["remove", "zod"],
      }),
    ]);
  });

  it("reports PROJECT_NOT_FOUND for doctor outside a project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
    tempDirs.push(root);
    const captured = captureIo();
    const result = await runCli(["doctor"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
    });

    expect(result.exitCode).toBe(EXIT_CODES.INVALID_INPUT);
    expect(captured.stderr()).toContain("PROJECT_NOT_FOUND");
  });

  it("passes doctor for a healthy Next.js fixture without mutating files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "healthy-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["--json", "doctor"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
      runProcess: async (request) => ({
        exitCode: 0,
        stdout:
          request.args[0] === "-e"
            ? JSON.stringify({ checked: ["next"], missing: [], errors: [], environment: root })
            : "v24.0.0\n",
        stderr: "",
      }),
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(JSON.parse(captured.stdout())).toMatchObject({ version: 1, kind: "doctor", failed: 0 });
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("reports a missing Next.js package", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "broken-next" }));
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["doctor"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
    });

    expect(result.exitCode).toBe(EXIT_CODES.VERIFICATION_FAILURE);
    expect(captured.stdout()).toContain("package.json does not include next.");
    expect(captured.stdout()).toContain("Doctor found");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("reports a missing Prettier config file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "broken-prettier", devDependencies: { prettier: "3.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["doctor"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
    });

    expect(result.exitCode).toBe(EXIT_CODES.VERIFICATION_FAILURE);
    expect(captured.stdout()).toContain("Expected a Prettier config file.");
  });

  it("reports a missing Node.js prerequisite", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "healthy-app", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
    const captured = captureIo();
    const result = await runCli(["doctor"], {
      cwd: root,
      io: captured.io,
      commandExists: async (command) => command !== "node",
    });

    expect(result.exitCode).toBe(EXIT_CODES.PREREQUISITE_MISSING);
    expect(captured.stdout()).toContain("node was not found on PATH.");
  });

  it("reports a Prisma verification failure when DATABASE_URL is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "broken-prisma",
        dependencies: { "@prisma/client": "7.10.0", prisma: "7.10.0" },
      }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await mkdir(path.join(root, "prisma"));
    await writeFile(
      path.join(root, "prisma", "schema.prisma"),
      'datasource db {\n  provider = "sqlite"\n}\n',
    );
    const captured = captureIo();
    const result = await runCli(["doctor"], {
      cwd: root,
      io: captured.io,
      commandExists: async () => true,
    });

    expect(result.exitCode).toBe(EXIT_CODES.VERIFICATION_FAILURE);
    expect(captured.stdout()).toContain(".env.example is missing DATABASE_URL.");
  });

  it("dry-runs export without writing reposetup.json", async () => {
    const root = await nextExportFixture();
    const before = await snapshotTree(root);
    const captured = captureIo();
    const result = await runCli(["export", "--dry-run"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain('"schemaVersion": 1');
    expect(captured.stdout()).toContain('"id": "nextjs"');
    expect(captured.stdout()).toContain("Would write reposetup.json.");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(captured.stdout()).not.toContain("DATABASE_URL");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("writes reposetup.json that create --config can dry-run", async () => {
    const source = await nextExportFixture();
    const exportResult = await runCli(["export"], {
      cwd: source,
      io: captureIo().io,
    });
    expect(exportResult.exitCode).toBe(EXIT_CODES.SUCCESS);

    const exported = await readFile(path.join(source, "reposetup.json"), "utf8");
    expect(exported).toContain('"schemaVersion": 1');
    expect(exported).not.toContain("DATABASE_URL");
    expect(exported).not.toContain(source);

    const target = await mkdtemp(path.join(os.tmpdir(), "reposetup-recreate-"));
    tempDirs.push(target);
    await writeFile(path.join(target, "reposetup.json"), exported);
    await writeFile(path.join(target, "marker.txt"), "keep me\n");
    const before = await snapshotTree(target);
    const captured = captureIo();
    const recreate = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd: target,
      io: captured.io,
    });

    expect(recreate.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Dry-run for example-next-app");
    expect(captured.stdout()).toContain("create-next-app");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(target)).toEqual(before);
  });

  it("does not overwrite reposetup.json without --yes", async () => {
    const root = await nextExportFixture();
    await writeFile(path.join(root, "reposetup.json"), '{"keep":true}\n');
    const captured = captureIo();
    const result = await runCli(["export"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.GENERAL_FAILURE);
    expect(captured.stderr()).toContain("FILE_ALREADY_EXISTS");
    expect(await readFile(path.join(root, "reposetup.json"), "utf8")).toBe('{"keep":true}\n');
  });
});

async function nextExportFixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-export-cli-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "example-next-app",
      dependencies: {
        next: "16.0.0",
        "@prisma/client": "7.10.0",
        tailwindcss: "4.0.0",
        zod: "4.0.0",
      },
      devDependencies: {
        prisma: "7.10.0",
        typescript: "5.9.0",
        vitest: "5.0.0",
        prettier: "3.0.0",
      },
      packageManager: "pnpm@12.5.1",
    }),
  );
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(path.join(root, "tsconfig.json"), "{}\n");
  await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
  await writeFile(path.join(root, "postcss.config.mjs"), "export default {};\n");
  await writeFile(path.join(root, "vitest.config.mts"), "export default {};\n");
  await writeFile(path.join(root, ".prettierrc"), "{}\n");
  await writeFile(path.join(root, ".env.example"), "DATABASE_URL=file:./dev.db\n");
  await mkdir(path.join(root, "app"));
  await writeFile(path.join(root, "app", "globals.css"), '@import "tailwindcss";\n');
  await mkdir(path.join(root, "prisma"));
  await writeFile(
    path.join(root, "prisma", "schema.prisma"),
    'generator client {\n  provider = "prisma-client"\n}\n\ndatasource db {\n  provider = "sqlite"\n}\n',
  );
  return root;
}
