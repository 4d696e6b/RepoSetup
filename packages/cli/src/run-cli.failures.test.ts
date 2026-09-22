import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { IntegrationDefinition, ProcessRunRequest } from "@reposetup/core";
import { createRegistry } from "@reposetup/registry";
import { afterEach, describe, expect, it } from "vitest";

import { EXIT_CODES } from "./exit-codes.js";
import { runCli } from "./run-cli.js";
import type { CliFs, CliIo } from "./types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

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
  if (overrides.requirements !== undefined) {
    definition.requirements = overrides.requirements;
  }
  return definition;
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

describe("runCli failure qualifications", () => {
  it("reports UNKNOWN_INTEGRATION for info without printing a success body", async () => {
    const captured = captureIo();
    const result = await runCli(["info", "missing-id"], { io: captured.io });
    expect(result.exitCode).toBe(EXIT_CODES.INVALID_INPUT);
    expect(captured.stderr()).toContain("UNKNOWN_INTEGRATION");
    expect(captured.stdout()).toBe("");
  });

  it("reports a dependency cycle with a resolution exit code", async () => {
    const cwd = "/virtual-cycle";
    const configPath = path.resolve(cwd, "reposetup.json");
    const alpha = fakeIntegration({
      id: "alpha",
      category: "framework",
      requirements: [
        { kind: "requires", target: { type: "integration", id: "beta" }, reason: "cycle" },
      ],
    });
    const beta = fakeIntegration({
      id: "beta",
      category: "utility",
      requirements: [
        { kind: "requires", target: { type: "integration", id: "alpha" }, reason: "cycle" },
      ],
    });
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--dry-run"], {
      cwd,
      registry: createRegistry([alpha, beta]),
      io: captured.io,
      fs: fsFromFiles({
        [configPath]: JSON.stringify({
          schemaVersion: 1,
          project: { name: "cycle-app" },
          runtime: { id: "node" },
          packageManager: "pnpm",
          framework: { id: "alpha" },
          integrations: [{ id: "beta" }],
        }),
      }),
    });

    expect(result.exitCode).toBe(EXIT_CODES.RESOLUTION_FAILURE);
    expect(captured.stderr()).toContain("DEPENDENCY_CYCLE");
    expect(captured.stdout()).not.toContain("Executed ");
  });

  it("does not mutate when a spawned command returns non-zero", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-cmdfail-"));
    tempDirs.push(root);
    const framework = fakeIntegration({
      id: "alpha",
      category: "framework",
      plan: () => [
        {
          type: "create_file",
          path: "keep.txt",
          content: "ok\n",
          behavior: "fail_if_exists",
          description: "Write keep.txt",
        },
        {
          type: "run_command",
          command: "pnpm",
          args: ["add", "broken"],
          cwd: ".",
          description: "Failing install",
        },
        {
          type: "create_file",
          path: "after.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Must not run",
        },
      ],
    });
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({
        schemaVersion: 1,
        project: { name: "fail-app" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "alpha" },
        integrations: [],
      }),
    );
    const captured = captureIo();
    const runs: ProcessRunRequest[] = [];
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: createRegistry([framework]),
      io: captured.io,
      runProcess: async (request) => {
        runs.push(request);
        return { exitCode: 1, stdout: "SECRET=1", stderr: "boom" };
      },
    });

    expect(result.exitCode).toBe(EXIT_CODES.GENERAL_FAILURE);
    expect(captured.stderr()).toContain("COMMAND_FAILED");
    expect(captured.stderr()).toContain("boom");
    expect(captured.stderr()).toContain("SECRET=<redacted>");
    expect(captured.stderr()).not.toContain("SECRET=1");
    expect(captured.stdout()).not.toContain("SECRET=1");
    expect(captured.stdout()).not.toContain("Executed ");
    expect(await readFile(path.join(root, "keep.txt"), "utf8")).toBe("ok\n");
    await expect(readFile(path.join(root, "after.txt"), "utf8")).rejects.toThrow();
    expect(runs).toEqual([expect.objectContaining({ command: "pnpm", args: ["add", "broken"] })]);
  });

  it("reports a missing Node prerequisite before mutating", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-missing-node-"));
    tempDirs.push(root);
    const framework = fakeIntegration({
      id: "alpha",
      category: "framework",
      plan: () => [
        {
          type: "check_prerequisite",
          id: "node",
          description: "Require Node.js",
        },
        {
          type: "create_file",
          path: "app.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Must not write",
        },
      ],
    });
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({
        schemaVersion: 1,
        project: { name: "missing-node" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "alpha" },
        integrations: [],
      }),
    );
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: createRegistry([framework]),
      io: captured.io,
      commandExists: async () => false,
    });

    expect(result.exitCode).toBe(EXIT_CODES.PREREQUISITE_MISSING);
    expect(captured.stderr()).toContain("PREREQUISITE_MISSING");
    expect(captured.stdout()).not.toContain("Executed ");
    await expect(readFile(path.join(root, "app.txt"), "utf8")).rejects.toThrow();
  });

  it("reports a missing Python prerequisite", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-missing-python-"));
    tempDirs.push(root);
    const framework = fakeIntegration({
      id: "alpha",
      category: "framework",
      plan: () => [
        {
          type: "check_prerequisite",
          id: "python",
          description: "Require Python",
        },
      ],
    });
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({
        schemaVersion: 1,
        project: { name: "missing-python" },
        runtime: { id: "python" },
        packageManager: "uv",
        framework: { id: "alpha" },
        integrations: [],
      }),
    );
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: createRegistry([framework]),
      io: captured.io,
      commandExists: async (command) => command !== "python3" && command !== "python",
    });

    expect(result.exitCode).toBe(EXIT_CODES.PREREQUISITE_MISSING);
    expect(captured.stderr()).toContain("PREREQUISITE_MISSING");
  });

  it("reports a missing package manager", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-missing-pnpm-"));
    tempDirs.push(root);
    const framework = fakeIntegration({
      id: "alpha",
      category: "framework",
      plan: () => [
        {
          type: "check_prerequisite",
          id: "pnpm",
          description: "Require pnpm",
        },
      ],
    });
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({
        schemaVersion: 1,
        project: { name: "missing-pnpm" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "alpha" },
        integrations: [],
      }),
    );
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: createRegistry([framework]),
      io: captured.io,
      commandExists: async (command) => command !== "pnpm",
    });

    expect(result.exitCode).toBe(EXIT_CODES.PREREQUISITE_MISSING);
    expect(captured.stderr()).toContain("pnpm");
  });

  it("does not overwrite an existing file on a second create", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-exists-"));
    tempDirs.push(root);
    const framework = fakeIntegration({
      id: "alpha",
      category: "framework",
      plan: () => [
        {
          type: "create_file",
          path: "app.txt",
          content: "first\n",
          behavior: "fail_if_exists",
          description: "Write app.txt",
        },
      ],
    });
    const config = JSON.stringify({
      schemaVersion: 1,
      project: { name: "exists-app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "alpha" },
      integrations: [],
    });
    await writeFile(path.join(root, "reposetup.json"), config);
    await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: createRegistry([framework]),
      io: captureIo().io,
    });
    await writeFile(path.join(root, "app.txt"), "user\n");
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      registry: createRegistry([framework]),
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.GENERAL_FAILURE);
    expect(captured.stderr()).toContain("FILE_ALREADY_EXISTS");
    expect(await readFile(path.join(root, "app.txt"), "utf8")).toBe("user\n");
  });

  it("prints a warning for malformed package.json instead of inventing a stack", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-bad-pkg-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), "{ not json");
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const captured = captureIo();
    const result = await runCli(["stack"], { cwd: root, io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("pnpm");
    expect(captured.stdout()).not.toContain("Next.js");
  });

  it("shows both package managers when a project is ambiguous", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-ambiguous-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "both" }));
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "package-lock.json"), "{}\n");
    const captured = captureIo();
    const result = await runCli(["stack"], { cwd: root, io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(captured.stdout()).toContain("pnpm");
    expect(captured.stdout()).toContain("npm");
  });

  it("does not write files for a path-traversal project name", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-traversal-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "reposetup.json"),
      JSON.stringify({
        schemaVersion: 1,
        project: { name: ".." },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "nextjs" },
        integrations: [],
      }),
    );
    const before = await readdir(root);
    const captured = captureIo();
    const result = await runCli(["create", "--config", "reposetup.json", "--yes"], {
      cwd: root,
      io: captured.io,
    });

    expect(result.exitCode).toBe(EXIT_CODES.INVALID_INPUT);
    expect(captured.stderr()).toContain("PROJECT_NAME_INVALID");
    expect(await readdir(root)).toEqual(before);
  });

  it("keeps an existing export file when overwrite is not confirmed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-export-conflict-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", dependencies: { next: "16.0.0" } }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await mkdir(path.join(root, "app"));
    await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
    await writeFile(path.join(root, "reposetup.json"), "{}\n");
    const captured = captureIo();
    const result = await runCli(["export"], { cwd: root, io: captured.io });

    expect(result.exitCode).toBe(EXIT_CODES.GENERAL_FAILURE);
    expect(captured.stderr()).toContain("FILE_ALREADY_EXISTS");
    expect(await readFile(path.join(root, "reposetup.json"), "utf8")).toBe("{}\n");
  });
});
