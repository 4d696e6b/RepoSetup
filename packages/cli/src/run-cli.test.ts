import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { IntegrationDefinition, ProcessRunRequest, RepoSetupConfig } from "@reposetup/core";
import { createRegistry } from "@reposetup/registry";
import { afterEach, describe, expect, it } from "vitest";

import { EXIT_CODES } from "./exit-codes.js";
import { runCli } from "./run-cli.js";
import type { CliFs, CliIo, CreateAnswers } from "./types.js";

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
    expect(captured.stdout()).toContain("search");
    expect(captured.stdout()).toContain("info");
    expect(captured.stdout()).toContain("registry");
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
    expect(captured.stdout()).toContain("Executed 3 operations.");
    expect(captured.stderr()).toBe("");
    expect(await readdir(root)).toEqual(
      expect.arrayContaining(["db.txt", "reposetup.json", "src"]),
    );
    expect(await readFile(path.join(root, "db.txt"), "utf8")).toBe("engine=sqlite");
    expect(runs).toEqual([
      {
        command: "pnpm",
        args: ["add", "fake-orm"],
        cwd: path.resolve(root),
      },
    ]);
  });

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
      "pnpm create next-app@latest . --ts --eslint --app --no-tailwind --use-pnpm --yes",
    );
    expect(captured.stdout()).toContain("pnpm add --save-dev --save-exact prettier");
    expect(captured.stdout()).toContain("No files or commands were executed.");
    expect(await snapshotTree(root)).toEqual(before);
  });

  it("validates the built-in registry by default", async () => {
    const captured = captureIo();
    const result = await runCli(["registry", "validate"], { io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("Registry is valid (10 integrations).");
  });
});
