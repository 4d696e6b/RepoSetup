import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  exportProject,
  parseRepoSetupConfig,
  planInstallation,
  serializeRepoSetupConfig,
} from "@reposetup/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("export recreates golden stacks", () => {
  it("exports a Next.js/SQLite fixture that planInstallation can recreate", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-export-next-"));
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

    const exported = await exportProject({
      startDir: root,
      registry: createBuiltInRegistry(),
    });
    expect(exported.ok).toBe(true);
    if (!exported.ok) {
      return;
    }

    const json = serializeRepoSetupConfig(exported.config);
    expect(json).not.toContain("DATABASE_URL");
    expect(json).not.toContain("file:./dev.db");
    expect(json).not.toContain(root);

    const parsed = parseRepoSetupConfig(JSON.parse(json));
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const planned = planInstallation(parsed.config, createBuiltInRegistry());
    expect(planned.valid).toBe(true);
    expect(planned.errors).toEqual([]);
    expect(planned.orderedIntegrations.map((item) => item.id)).toEqual([
      "node",
      "pnpm",
      "nextjs",
      "prettier",
      "sqlite",
      "prisma",
      "tailwind",
      "vitest",
      "zod",
    ]);
  });

  it("exports a FastAPI fixture that planInstallation can recreate", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-export-fastapi-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "pyproject.toml"),
      '[project]\nname = "example-fastapi-app"\ndependencies = ["fastapi[standard]", "pydantic", "SQLAlchemy", "alembic"]\n[dependency-groups]\ndev = ["pytest", "ruff"]\n',
    );
    await writeFile(path.join(root, "uv.lock"), "version = 1\n");
    await writeFile(path.join(root, "main.py"), "from fastapi import FastAPI\n");
    await writeFile(path.join(root, "alembic.ini"), "[alembic]\n");
    await writeFile(
      path.join(root, ".env.example"),
      "DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public\n",
    );

    const exported = await exportProject({
      startDir: root,
      registry: createBuiltInRegistry(),
    });
    expect(exported.ok).toBe(true);
    if (!exported.ok) {
      return;
    }

    const json = serializeRepoSetupConfig(exported.config);
    expect(json).not.toContain("PASSWORD");
    expect(json).not.toContain("DATABASE_URL");

    const parsed = parseRepoSetupConfig(JSON.parse(json));
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const planned = planInstallation(parsed.config, createBuiltInRegistry());
    expect(planned.valid).toBe(true);
    expect(planned.orderedIntegrations.map((item) => item.id)).toEqual(
      expect.arrayContaining(["python", "uv", "fastapi", "pydantic", "sqlalchemy", "alembic"]),
    );
  });
});
