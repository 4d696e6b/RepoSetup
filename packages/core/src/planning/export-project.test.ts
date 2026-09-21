import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import { exportProject } from "./export-project.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

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

const node = fakeIntegration({
  id: "node",
  category: "runtime",
  detect: async (context) => ({
    detected: await context.files.exists("package.json"),
    confidence: "certain",
    evidence: [],
  }),
});

const pnpm = fakeIntegration({
  id: "pnpm",
  category: "package-manager",
  detect: async (context) => ({
    detected: await context.files.exists("pnpm-lock.yaml"),
    confidence: "certain",
    evidence: [],
  }),
});

const nextjs = fakeIntegration({
  id: "nextjs",
  name: "Next.js",
  category: "framework",
  detect: async (context) => ({
    detected: context.packageJson?.dependencies.next !== undefined,
    confidence: "certain",
    evidence: [],
  }),
});

const zod = fakeIntegration({
  id: "zod",
  category: "validation",
  detect: async (context) => ({
    detected: context.packageJson?.dependencies.zod !== undefined,
    confidence: "certain",
    evidence: [],
  }),
});

describe("exportProject", () => {
  it("exports a detected Next.js stack without copying env values", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-export-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "example-next-app",
        dependencies: { next: "16.0.0", zod: "4.0.0" },
        devDependencies: { typescript: "5.9.0" },
      }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "tsconfig.json"), "{}\n");
    await writeFile(
      path.join(root, ".env.example"),
      "DATABASE_URL=postgresql://secret-user:secret-pass@localhost:5432/app\n",
    );

    const result = await exportProject({
      startDir: root,
      registry: lookup([node, pnpm, nextjs, zod]),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.config.schemaVersion).toBe(1);
    expect(result.config.project).toEqual({ name: "example-next-app" });
    expect(result.config.runtime.id).toBe("node");
    expect(result.config.packageManager).toBe("pnpm");
    expect(result.config.framework).toEqual({ id: "nextjs", options: { typescript: true } });
    expect(result.config.integrations).toEqual([{ id: "zod" }]);
    expect(JSON.stringify(result.config)).not.toContain("secret-pass");
    expect(JSON.stringify(result.config)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result.config.project)).not.toContain(root);
  });

  it("fails when no framework is detected", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-export-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "lib" }));
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    const result = await exportProject({
      startDir: root,
      registry: lookup([node, pnpm]),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("MISSING_REQUIREMENT");
  });
});
