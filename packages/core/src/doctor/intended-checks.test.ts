import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RepoSetupConfig } from "../config/types.js";
import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import { failedDoctorChecks, runDoctor } from "./run-doctor.js";

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-intended-"));
  dirs.push(root);
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(root, name), value);
  return root;
}
const next = fakeIntegration({
  id: "nextjs",
  category: "framework",
  detect: async (context) => ({
    detected: await context.files.exists("next.config.mjs"),
    confidence: "certain",
    evidence: [{ kind: "config", detail: "Found Next config", path: "next.config.mjs" }],
  }),
  verify: async (context) => ({
    ok: await context.files.exists("next.config.mjs"),
    message: "Next config must exist.",
  }),
});
const zod = fakeIntegration({
  id: "zod",
  category: "validation",
  plan: () => [
    {
      type: "install_package",
      packageManager: "pnpm",
      packages: ["zod@4.6.5"],
      cwd: ".",
      description: "Install Zod",
    },
  ],
  detect: async (context) => ({
    detected: context.packageJson?.dependencies.zod !== undefined,
    confidence: "certain",
    evidence: [{ kind: "dependency", detail: "Found Zod declaration", path: "package.json" }],
  }),
  verify: async (context) => ({
    ok: context.packageJson?.dependencies.zod !== undefined,
    message: "Zod declaration must exist.",
  }),
});
const prettier = fakeIntegration({
  id: "prettier",
  category: "formatting",
  verify: async () => ({ ok: false, message: "Unexpected Prettier is unhealthy." }),
  detect: async (context) => ({
    detected: await context.files.exists(".prettierrc"),
    confidence: "likely",
    evidence: [{ kind: "config", detail: "Found Prettier config", path: ".prettierrc" }],
  }),
});
const definitions = [next, zod, prettier];
const registry: RegistryLookup = {
  get: (id) => definitions.find((item) => item.id === id),
  list: () => definitions,
  byCategory: (category) => definitions.filter((item) => item.category === category),
};
const config: RepoSetupConfig = {
  schemaVersion: 1,
  project: { name: "app" },
  runtime: { id: "node" },
  packageManager: "pnpm",
  framework: { id: "nextjs" },
  integrations: [{ id: "zod" }],
};
const run = (root: string, expectedConfig: RepoSetupConfig = config) =>
  runDoctor({
    startDir: root,
    registry,
    expectedConfig,
    commandExists: async () => true,
    commandVersion: async () => "v24.21.0",
  });

describe("intended-stack doctor", () => {
  it("finds a missing expected dependency even after detection loses the integration", async () => {
    const manifest = JSON.stringify({ name: "app", dependencies: { next: "16.3.5" } });
    const root = await project({
      "package.json": manifest,
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "next.config.mjs": "export default {};\n",
    });
    const result = await run(root);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.mode).toBe("intended");
    expect(failedDoctorChecks(result.result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "intended:zod", code: "INTENDED_VERIFICATION_FAILED" }),
        expect.objectContaining({
          id: "intended-dependency:zod",
          code: "INTENDED_DEPENDENCY_MISSING",
        }),
      ]),
    );
    expect(await readFile(path.join(root, "package.json"), "utf8")).toBe(manifest);
  });

  it("reports custom versions and extra integrations as informational evidence", async () => {
    const root = await project({
      "package.json": JSON.stringify({
        name: "app",
        dependencies: { next: "16.3.5", zod: "^3.0.0" },
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "next.config.mjs": "export default {};\n",
      ".prettierrc": "{}\n",
    });
    const result = await run(root);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(failedDoctorChecks(result.result)).toEqual([]);
    expect(result.result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "intended-version:zod",
          level: "info",
          confidence: "certain",
        }),
        expect.objectContaining({ id: "extra:prettier", level: "info" }),
      ]),
    );
    expect(JSON.stringify(result.result)).not.toContain("^3.0.0");
  });

  it("identifies conflicting manager evidence without modifying files", async () => {
    const root = await project({
      "package.json": JSON.stringify({
        name: "app",
        dependencies: { next: "16.3.5", zod: "4.6.5" },
      }),
      "package-lock.json": "{}\n",
      "next.config.mjs": "export default {};\n",
    });
    const result = await run(root);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(failedDoctorChecks(result.result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "intended-context:package-manager",
          code: "INTENDED_CONTEXT_MISMATCH",
        }),
      ]),
    );
    expect(await readFile(path.join(root, "package-lock.json"), "utf8")).toBe("{}\n");
  });

  it("reports a missing intended framework file even when framework detection disappears", async () => {
    const root = await project({
      "package.json": JSON.stringify({
        name: "app",
        dependencies: { next: "16.3.5", zod: "4.6.5" },
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    });
    const result = await run(root);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(failedDoctorChecks(result.result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "intended:nextjs", code: "INTENDED_VERIFICATION_FAILED" }),
      ]),
    );
  });

  it("detects a missing TypeScript setup requested by the intended framework", async () => {
    const root = await project({
      "package.json": JSON.stringify({
        name: "app",
        dependencies: { next: "16.3.5", zod: "4.6.5" },
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "next.config.mjs": "export default {};\n",
    });
    const result = await run(root, {
      ...config,
      framework: { id: "nextjs", options: { typescript: true } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(failedDoctorChecks(result.result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "intended-context:typescript",
          code: "INTENDED_CONTEXT_MISMATCH",
        }),
      ]),
    );
  });

  it("treats a custom runtime version as an informational difference", async () => {
    const root = await project({
      "package.json": JSON.stringify({
        name: "app",
        dependencies: { next: "16.3.5", zod: "4.6.5" },
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "next.config.mjs": "export default {};\n",
    });
    const result = await run(root, { ...config, runtime: { id: "node", version: "25" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "intended-runtime-version", level: "info" }),
      ]),
    );
    expect(failedDoctorChecks(result.result)).toEqual([]);
  });

  it("rejects malformed schemaVersion 1 input before scanning the project", async () => {
    const root = await project({ "package.json": "{}" });
    const malformed = { ...config, schemaVersion: 2 } as unknown as RepoSetupConfig;
    const result = await run(root, malformed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONFIG_INVALID");
  });
});
