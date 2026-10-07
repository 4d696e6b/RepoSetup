import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { failedDoctorChecks, runDoctor } from "@reposetup/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-doctor-fix-"));
  tempDirs.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    const absolute = path.join(root, relativePath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
  }
  return root;
}

describe("built-in doctor fixtures", () => {
  it("passes a healthy Next.js fixture", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({ name: "healthy-app", dependencies: { next: "16.0.0" } }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "next.config.mjs": "export default {};\n",
    });

    const result = await runDoctor({
      startDir: root,
      registry: createBuiltInRegistry(),
      commandExists: async () => true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([]);
  });

  it("reports a missing Next.js package", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({ name: "broken-next" }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "next.config.mjs": "export default {};\n",
    });

    const result = await runDoctor({
      startDir: root,
      registry: createBuiltInRegistry(),
      commandExists: async () => true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({
        id: "nextjs",
        message: "package.json does not include next.",
      }),
    ]);
  });

  it("reports a missing Prettier config file", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({
        name: "broken-prettier",
        devDependencies: { prettier: "3.0.0" },
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    });

    const result = await runDoctor({
      startDir: root,
      registry: createBuiltInRegistry(),
      commandExists: async () => true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({
        id: "prettier",
        message: "Expected a Prettier config file.",
      }),
    ]);
  });

  it("reports a missing Node.js prerequisite", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({ name: "healthy-app", dependencies: { next: "16.0.0" } }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "next.config.mjs": "export default {};\n",
    });

    const result = await runDoctor({
      startDir: root,
      registry: createBuiltInRegistry(),
      commandExists: async (command) => command !== "node",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({
        id: "prerequisite:node",
        code: "PREREQUISITE_MISSING",
      }),
    ]);
  });

  it("reports a Prisma env verification failure without mutating files", async () => {
    const files = {
      "package.json": JSON.stringify({
        name: "broken-prisma",
        dependencies: { "@prisma/client": "7.10.0", prisma: "7.10.0" },
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
    };
    const root = await fixture(files);
    const before = await readFile(path.join(root, "prisma/schema.prisma"), "utf8");

    const result = await runDoctor({
      startDir: root,
      registry: createBuiltInRegistry(),
      commandExists: async () => true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({
        id: "prisma",
        code: "VERIFICATION_FAILED",
        message: expect.stringContaining(".env.example is missing DATABASE_URL."),
      }),
    ]);
    expect(await readFile(path.join(root, "prisma/schema.prisma"), "utf8")).toBe(before);
  });

  it("reports a missing Python prerequisite without mutating files", async () => {
    const files = {
      "pyproject.toml": '[project]\nname = "demo"\ndependencies = ["fastapi[standard]"]\n',
      "uv.lock": "version = 1\n",
      "main.py": "from fastapi import FastAPI\n",
    };
    const root = await fixture(files);
    const before = await readFile(path.join(root, "pyproject.toml"), "utf8");

    const result = await runDoctor({
      startDir: root,
      registry: createBuiltInRegistry(),
      commandExists: async (command) => command !== "python",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(failedDoctorChecks(result.result)).toEqual([
      expect.objectContaining({
        id: "prerequisite:python",
        code: "PREREQUISITE_MISSING",
      }),
    ]);
    expect(await readFile(path.join(root, "pyproject.toml"), "utf8")).toBe(before);
  });
});
