import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import { detectProject } from "./detect-project.js";

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

describe("detectProject", () => {
  it("returns PROJECT_NOT_FOUND outside a project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-detect-"));
    tempDirs.push(root);

    const result = await detectProject({ startDir: root, registry: lookup([]) });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("identifies a Next.js pnpm fixture through ecosystem and integration detect", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-detect-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "fixture-next",
        dependencies: { next: "16.0.0" },
        devDependencies: { typescript: "5.9.0" },
      }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "tsconfig.json"), "{}\n");
    await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
    await mkdir(path.join(root, "app"));
    await writeFile(path.join(root, "app", "page.tsx"), "export default function Page() {}\n");

    const nextjs = fakeIntegration({
      id: "nextjs",
      name: "Next.js",
      category: "framework",
      detect: async (context) => {
        const exists = await context.files.exists("next.config.mjs");
        const hasNext = context.packageJson?.dependencies.next !== undefined;
        return {
          detected: exists || hasNext === true,
          confidence: hasNext === true ? "certain" : "likely",
          evidence: [],
        };
      },
    });

    const result = await detectProject({ startDir: root, registry: lookup([nextjs]) });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.stack.runtimes.map((item) => item.id)).toEqual(["node"]);
    expect(result.stack.packageManagers.map((item) => item.id)).toEqual(["pnpm"]);
    expect(result.stack.frameworks).toEqual([
      expect.objectContaining({ id: "nextjs", confidence: "certain" }),
    ]);
    expect(result.stack.language).toEqual(
      expect.objectContaining({ id: "typescript", confidence: "certain" }),
    );
  });

  it("identifies a Python uv fixture without inferring pip", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-detect-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "pyproject.toml"), "[project]\nname = 'api'\n");
    await writeFile(path.join(root, "uv.lock"), "version = 1\n");
    await writeFile(path.join(root, "requirements.txt"), "fastapi\n");

    const result = await detectProject({ startDir: root, registry: lookup([]) });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.stack.runtimes.map((item) => item.id)).toEqual(["python"]);
    expect(result.stack.packageManagers.map((item) => item.id)).toEqual(["uv"]);
    expect(result.stack.packageManagers[0]?.confidence).toBe("certain");
  });

  it("does not mutate the fixture while detecting", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-detect-"));
    tempDirs.push(root);
    const marker = path.join(root, "package.json");
    await writeFile(marker, JSON.stringify({ name: "readonly" }));
    const before = await stat(marker);
    const contents = await readFile(marker, "utf8");

    await detectProject({ startDir: root, registry: lookup([]) });

    expect(await readFile(marker, "utf8")).toBe(contents);
    const after = await stat(marker);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(after.size).toBe(before.size);
  });

  it("warns when package.json is malformed and does not invent dependencies", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-detect-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), "{ not json");
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    const result = await detectProject({ startDir: root, registry: lookup([]) });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.stack.runtimes.map((item) => item.id)).toEqual([]);
    expect(result.stack.packageManagers.map((item) => item.id)).toEqual(["pnpm"]);
    expect(result.stack.warnings).toContain(
      "package.json exists but is not valid JSON; Node dependency detection was skipped.",
    );
  });
});
