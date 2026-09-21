import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { planRemove, UNSAFE_REMOVE_MESSAGE } from "@reposetup/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function nextApp(extra: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-remove-builtin-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "package.json"),
    extra["package.json"] ??
      JSON.stringify({
        name: "example-next-app",
        dependencies: { next: "16.0.0", zod: "4.0.0" },
        devDependencies: { prettier: "3.0.0", typescript: "5.9.0" },
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

async function fastapiApp(extra: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-remove-python-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "pyproject.toml"),
    extra["pyproject.toml"] ??
      '[project]\nname = "example-fastapi-app"\ndependencies = ["fastapi[standard]", "pydantic"]\n',
  );
  await writeFile(path.join(root, "uv.lock"), extra["uv.lock"] ?? "version = 1\n");
  await writeFile(path.join(root, "main.py"), extra["main.py"] ?? "from fastapi import FastAPI\n");
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

describe("built-in remove plans", () => {
  it("removes Zod with pnpm remove and does not reverse the Next.js scaffold", async () => {
    const root = await nextApp();
    const result = await planRemove({
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
        type: "run_command",
        command: "pnpm",
        args: ["remove", "zod"],
      }),
    ]);
    expect(
      result.result.operations.some(
        (operation) => operation.type === "run_command" && operation.args.includes("create"),
      ),
    ).toBe(false);
  });

  it("is a no-op when Zod is already absent", async () => {
    const root = await nextApp({
      "package.json": JSON.stringify({
        name: "example-next-app",
        dependencies: { next: "16.0.0" },
      }),
    });
    const result = await planRemove({
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

  it("removes the Prettier package without deleting config files", async () => {
    const root = await nextApp({
      ".prettierrc": "{}\n",
      ".prettierignore": "build\n",
    });
    const result = await planRemove({
      startDir: root,
      integrationId: "prettier",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.operations.map((operation) => operation.type)).toEqual([
      "run_command",
      "show_message",
    ]);
    expect(result.result.operations[0]).toEqual(
      expect.objectContaining({
        args: ["remove", "prettier"],
      }),
    );
    expect(
      result.result.operations.some(
        (operation) =>
          operation.type === "create_file" ||
          operation.type === "modify_text" ||
          (operation.type === "run_command" && operation.args.includes("rm")),
      ),
    ).toBe(false);
  });

  it("refuses Prisma because there is no safe removal recipe", async () => {
    const root = await nextApp();
    const result = await planRemove({
      startDir: root,
      integrationId: "prisma",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.message).toBe(UNSAFE_REMOVE_MESSAGE);
  });

  it("removes Pydantic with uv remove", async () => {
    const root = await fastapiApp();
    const result = await planRemove({
      startDir: root,
      integrationId: "pydantic",
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.operations).toEqual([
      expect.objectContaining({
        type: "run_command",
        command: "uv",
        args: ["remove", "pydantic"],
      }),
    ]);
  });

  it("refuses pip projects because uninstall does not update requirements.txt", async () => {
    const root = await fastapiApp({
      "pyproject.toml":
        '[project]\nname = "example-fastapi-app"\ndependencies = ["fastapi[standard]", "pydantic"]\n',
    });
    await writeFile(path.join(root, "requirements.txt"), "fastapi[standard]\npydantic\n");
    const result = await planRemove({
      startDir: root,
      integrationId: "pydantic",
      registry: createBuiltInRegistry(),
      packageManager: "pip",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.message).toBe(UNSAFE_REMOVE_MESSAGE);
  });
});
