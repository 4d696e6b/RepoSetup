import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { planAdd } from "@reposetup/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function nextApp(extra: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-builtin-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "package.json"),
    extra["package.json"] ??
      JSON.stringify({
        name: "example-next-app",
        dependencies: { next: "16.0.0" },
        devDependencies: { typescript: "5.9.0" },
      }),
  );
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
  await writeFile(path.join(root, "tsconfig.json"), "{}\n");
  for (const [relative, content] of Object.entries(extra)) {
    if (relative === "package.json") {
      continue;
    }
    const full = path.join(root, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

describe("built-in add plans", () => {
  it("adds Zod to a Next.js fixture", async () => {
    const root = await nextApp();
    const result = await planAdd({
      startDir: root,
      integrationId: "zod",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(true);
    expect(result.result.operations).toEqual([
      expect.objectContaining({
        type: "install_package",
        packages: ["zod@4.6.5"],
        packageManager: "pnpm",
      }),
    ]);
  });

  it("is a no-op when Zod is already a dependency", async () => {
    const root = await nextApp({
      "package.json": JSON.stringify({
        name: "example-next-app",
        dependencies: { next: "16.0.0", zod: "4.0.0" },
      }),
    });
    const result = await planAdd({
      startDir: root,
      integrationId: "zod",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.operations).toEqual([]);
  });

  it("adds Prettier config when the package is already present", async () => {
    const root = await nextApp({
      "package.json": JSON.stringify({
        name: "example-next-app",
        dependencies: { next: "16.0.0" },
        devDependencies: { prettier: "3.0.0" },
      }),
    });
    const result = await planAdd({
      startDir: root,
      integrationId: "prettier",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.operations.map((operation) => operation.type)).toEqual([
      "create_file",
      "create_file",
    ]);
  });

  it("does not add Prisma without SQLite evidence", async () => {
    const root = await nextApp();
    const result = await planAdd({
      startDir: root,
      integrationId: "prisma",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(false);
    expect(result.result.errors.some((error) => error.code === "MISSING_REQUIREMENT")).toBe(true);
  });

  it("plans Prisma against a SQLite Next.js fixture", async () => {
    const root = await nextApp({
      "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
    });
    const result = await planAdd({
      startDir: root,
      integrationId: "prisma",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(true);
    expect(
      result.result.operations.some(
        (operation) => operation.type === "run_command" && operation.args.includes("init"),
      ),
    ).toBe(false);
    expect(
      result.result.operations.some(
        (operation) => operation.type === "create_file" && operation.path === "lib/prisma.ts",
      ),
    ).toBe(true);
  });
});

describe("built-in add plans for Python", () => {
  async function fastapiApp(extra: Record<string, string> = {}): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-python-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "pyproject.toml"),
      extra["pyproject.toml"] ??
        '[project]\nname = "example-fastapi-app"\ndependencies = ["fastapi[standard]"]\n',
    );
    await writeFile(path.join(root, "uv.lock"), extra["uv.lock"] ?? "version = 1\n");
    await writeFile(
      path.join(root, "main.py"),
      extra["main.py"] ?? "from fastapi import FastAPI\n",
    );
    for (const [relative, content] of Object.entries(extra)) {
      if (relative === "pyproject.toml" || relative === "uv.lock" || relative === "main.py") {
        continue;
      }
      const full = path.join(root, relative);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content);
    }
    return root;
  }

  it("adds Pydantic to a FastAPI fixture", async () => {
    const root = await fastapiApp();
    const result = await planAdd({
      startDir: root,
      integrationId: "pydantic",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(true);
    expect(result.result.operations).toEqual([
      expect.objectContaining({
        type: "install_package",
        packages: ["pydantic==2.13.5"],
        packageManager: "uv",
      }),
    ]);
  });

  it("is a no-op when Pydantic is already declared", async () => {
    const root = await fastapiApp({
      "pyproject.toml":
        '[project]\nname = "example-fastapi-app"\ndependencies = ["fastapi[standard]", "pydantic"]\n',
    });
    const result = await planAdd({
      startDir: root,
      integrationId: "pydantic",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.operations).toEqual([]);
  });
});
