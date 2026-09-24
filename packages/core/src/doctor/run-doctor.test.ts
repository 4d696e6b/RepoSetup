import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import { errorsFromDoctor, failedDoctorChecks, runDoctor } from "./run-doctor.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
  tempDirs.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    await writeFile(path.join(root, relativePath), content);
  }
  return root;
}

function lookup(definitions: ReturnType<typeof fakeIntegration>[]): RegistryLookup {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  return {
    get(id) {
      return byId.get(id);
    },
    list() {
      return [...byId.values()];
    },
    byCategory(category) {
      return [...byId.values()].filter((definition) => definition.category === category);
    },
  };
}

const nodeProject = {
  "package.json": JSON.stringify({ name: "fixture-app" }),
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
};

describe("runDoctor", () => {
  it("returns PROJECT_NOT_FOUND outside a project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-"));
    tempDirs.push(root);

    const result = await runDoctor({
      startDir: root,
      registry: lookup([]),
      commandExists: async () => true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("passes a healthy Node.js pnpm fixture when PATH checks succeed", async () => {
    const root = await fixture(nodeProject);
    const commands: string[] = [];

    const result = await runDoctor({
      startDir: root,
      registry: lookup([]),
      commandExists: async (command) => {
        commands.push(command);
        return true;
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(commands).toEqual(["node", "pnpm"]);
    expect(failedDoctorChecks(result.result)).toEqual([]);
    expect(result.result.checks.map((check) => check.id)).toEqual([
      "prerequisite:node",
      "prerequisite:pnpm",
    ]);
    expect(await readFile(path.join(root, "package.json"), "utf8")).toBe(
      nodeProject["package.json"],
    );
  });

  it("reports conflicting lockfiles and missing environment placeholders", async () => {
    const root = await fixture({
      ...nodeProject,
      "package-lock.json": JSON.stringify({ lockfileVersion: 3 }),
      ".env": "DATABASE_URL=real-secret-value\n",
    });

    const result = await runDoctor({
      startDir: root,
      registry: lookup([]),
      commandExists: async () => true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({ id: "lockfiles", code: "CONFIG_INVALID" }),
      expect.objectContaining({ id: "environment-example", code: "VERIFICATION_FAILED" }),
    ]);
  });

  it("reports a missing Node.js binary as PREREQUISITE_MISSING", async () => {
    const root = await fixture(nodeProject);

    const result = await runDoctor({
      startDir: root,
      registry: lookup([]),
      commandExists: async (command) => command !== "node",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const failed = failedDoctorChecks(result.result);
    expect(failed).toEqual([
      expect.objectContaining({
        id: "prerequisite:node",
        ok: false,
        code: "PREREQUISITE_MISSING",
        message: "node was not found on PATH.",
      }),
    ]);
    expect(errorsFromDoctor(result.result)[0]?.code).toBe("PREREQUISITE_MISSING");
  });

  it("reports a missing package from integration verify", async () => {
    const root = await fixture({
      ...nodeProject,
      "next.config.mjs": "export default {};\n",
    });
    const nextjs = fakeIntegration({
      id: "nextjs",
      name: "Next.js",
      category: "framework",
      detect: async (context) => ({
        detected: await context.files.exists("next.config.mjs"),
        confidence: "likely",
        evidence: [{ kind: "config", detail: "Found next.config.mjs", path: "next.config.mjs" }],
      }),
      verify: async (context) => {
        if (context.packageJson !== undefined && "next" in context.packageJson.dependencies) {
          return { ok: true };
        }
        return {
          ok: false,
          message: "package.json does not include next.",
          suggestion: "Add next to the project. Doctor does not install packages.",
        };
      },
    });

    const result = await runDoctor({
      startDir: root,
      registry: lookup([nextjs]),
      commandExists: async () => true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({
        id: "nextjs",
        code: "VERIFICATION_FAILED",
        message: "package.json does not include next.",
      }),
    ]);
  });

  it("reports a verification failure without mutating files", async () => {
    const root = await fixture({
      ...nodeProject,
      "broken.txt": "keep\n",
    });
    const before = await readFile(path.join(root, "broken.txt"), "utf8");
    const broken = fakeIntegration({
      id: "broken",
      name: "Broken",
      category: "utility",
      detect: async () => ({
        detected: true,
        confidence: "certain",
        evidence: [{ kind: "file", detail: "Found broken.txt", path: "broken.txt" }],
      }),
      verify: async () => ({
        ok: false,
        message: "intentional verification failure",
        suggestion: "Repair the fixture. Doctor does not rewrite files.",
      }),
    });

    const result = await runDoctor({
      startDir: root,
      registry: lookup([broken]),
      commandExists: async () => true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({
        id: "broken",
        code: "VERIFICATION_FAILED",
        message: "intentional verification failure",
      }),
    ]);
    expect(await readFile(path.join(root, "broken.txt"), "utf8")).toBe(before);
    expect(await readFile(path.join(root, "package.json"), "utf8")).toBe(
      nodeProject["package.json"],
    );
  });

  it("PATH-checks python and uv for a uv project", async () => {
    const root = await fixture({
      "pyproject.toml": "[project]\nname = 'demo'\n",
      "uv.lock": "version = 1\n",
    });
    const commands: string[] = [];

    const result = await runDoctor({
      startDir: root,
      registry: lookup([]),
      commandExists: async (command) => {
        commands.push(command);
        return false;
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(commands).toEqual(["python", "uv"]);
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({ id: "prerequisite:python", code: "PREREQUISITE_MISSING" }),
      expect.objectContaining({ id: "prerequisite:uv", code: "PREREQUISITE_MISSING" }),
    ]);
  });

  it("does not PATH-check bun in this phase", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({ name: "bun-app" }),
      "bun.lock": "{}\n",
    });
    const commands: string[] = [];

    const result = await runDoctor({
      startDir: root,
      registry: lookup([]),
      commandExists: async (command) => {
        commands.push(command);
        return false;
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(commands).not.toContain("bun");
  });
});
