import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createBuiltInRegistry } from "@reposetup/integrations";
import { afterEach, describe, expect, it } from "vitest";

import { EXIT_CODES } from "./exit-codes.js";
import { runCli } from "./run-cli.js";
import type { CliIo } from "./types.js";

const tempDirs: string[] = [];
const registry = createBuiltInRegistry();

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

async function nodeApp(root: string, extra: Record<string, unknown> = {}): Promise<void> {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "idempotency-app",
      dependencies: { next: "16.0.0", ...extra },
    }),
  );
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
}

async function pythonApp(root: string, packages: readonly string[]): Promise<void> {
  const deps = packages.map((name) => `"${name}"`).join(", ");
  await writeFile(
    path.join(root, "pyproject.toml"),
    `[project]\nname = "idempotency-api"\ndependencies = [${deps}]\n`,
  );
  await writeFile(path.join(root, "uv.lock"), "version = 1\n");
  await writeFile(path.join(root, "main.py"), "from fastapi import FastAPI\napp = FastAPI()\n");
}

describe("add idempotency (built-in catalog)", () => {
  it("is a no-op the second time for each addable Node integration", async () => {
    const cases: Array<{ id: string; setup: (root: string) => Promise<void> }> = [
      {
        id: "zod",
        setup: (root) => nodeApp(root, { zod: "4.0.0" }),
      },
      {
        id: "prettier",
        setup: async (root) => {
          await nodeApp(root, { prettier: "3.0.0" });
          await writeFile(path.join(root, ".prettierrc"), "{}\n");
          await writeFile(
            path.join(root, ".prettierignore"),
            "# Ignore artifacts:\nbuild\ncoverage\n",
          );
        },
      },
      {
        id: "vitest",
        setup: async (root) => {
          await writeFile(
            path.join(root, "package.json"),
            JSON.stringify({
              name: "idempotency-app",
              scripts: { test: "vitest" },
              dependencies: { next: "16.0.0" },
              devDependencies: {
                vitest: "3.0.0",
                "@vitejs/plugin-react": "5.0.0",
                jsdom: "26.0.0",
                "@testing-library/react": "16.0.0",
                "@testing-library/dom": "10.0.0",
                "vite-tsconfig-paths": "5.0.0",
              },
            }),
          );
          await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
          await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
          await writeFile(path.join(root, "vitest.config.mts"), "export default {}\n");
          await mkdir(path.join(root, "app", "api", "health"), { recursive: true });
          await writeFile(
            path.join(root, "app", "api", "health", "route.ts"),
            "export function GET() { return Response.json({ ok: true }); }\n",
          );
          await writeFile(path.join(root, "health.test.ts"), "export {};\n");
        },
      },
      {
        id: "prisma",
        setup: async (root) => {
          await nodeApp(root, {
            prisma: "7.0.0",
            "@prisma/client": "7.0.0",
            "@prisma/adapter-better-sqlite3": "7.0.0",
            dotenv: "16.0.0",
            "@types/better-sqlite3": "7.0.0",
          });
          await mkdir(path.join(root, "prisma"));
          await mkdir(path.join(root, "lib"));
          await mkdir(path.join(root, "generated", "prisma"), { recursive: true });
          await writeFile(
            path.join(root, "prisma/schema.prisma"),
            'datasource db { provider = "sqlite" url = env("DATABASE_URL") }\n',
          );
          await writeFile(path.join(root, ".env.example"), "DATABASE_URL=file:./dev.db\n");
          await writeFile(path.join(root, "lib/prisma.ts"), "export {}\n");
        },
      },
      {
        id: "drizzle",
        setup: async (root) => {
          await writeFile(
            path.join(root, "package.json"),
            JSON.stringify({
              name: "idempotency-app",
              dependencies: {
                next: "16.0.0",
                "drizzle-orm": "0.44.0",
                pg: "8.0.0",
                dotenv: "16.0.0",
              },
              devDependencies: {
                "drizzle-kit": "0.31.0",
                tsx: "4.0.0",
                "@types/pg": "8.0.0",
              },
            }),
          );
          await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
          await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
          await writeFile(
            path.join(root, ".env.example"),
            "DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE\n",
          );
          await mkdir(path.join(root, "src/db"), { recursive: true });
          await writeFile(path.join(root, "drizzle.config.ts"), "export default {}\n");
          await writeFile(path.join(root, "src/db/schema.ts"), "export {}\n");
          await writeFile(path.join(root, "src/db/index.ts"), "export {}\n");
        },
      },
      {
        id: "mongoose",
        setup: async (root) => {
          await nodeApp(root, { mongoose: "8.0.0" });
          await writeFile(path.join(root, ".env.example"), "MONGODB_URI=mongodb://localhost/app\n");
          await mkdir(path.join(root, "src"));
          await writeFile(path.join(root, "src/mongoose.js"), "export {}\n");
        },
      },
    ];

    for (const item of cases) {
      const root = await mkdtemp(path.join(os.tmpdir(), `reposetup-idem-${item.id}-`));
      tempDirs.push(root);
      await item.setup(root);
      const first = captureIo();
      const firstResult = await runCli(["add", item.id, "--yes"], {
        cwd: root,
        registry,
        io: first.io,
        runProcess: async (request) => ({
          exitCode: 0,
          stdout: request.args.includes("--version") ? "v24.0.0\n" : "",
          stderr: "",
        }),
      });
      expect(firstResult.exitCode, first.stderr()).toBe(EXIT_CODES.SUCCESS);
      expect(first.stdout()).toContain(`No changes. Integration "${item.id}" is already present.`);

      const second = captureIo();
      const secondResult = await runCli(["add", item.id, "--yes"], {
        cwd: root,
        registry,
        io: second.io,
        runProcess: async () => {
          throw new Error(`second add for ${item.id} must not spawn`);
        },
      });
      expect(secondResult.exitCode, second.stderr()).toBe(EXIT_CODES.SUCCESS);
      expect(second.stdout()).toContain(`No changes. Integration "${item.id}" is already present.`);
    }
  });

  it("is a no-op the second time for each addable Python integration", async () => {
    const cases = [
      { id: "pydantic", packages: ["fastapi", "pydantic"] },
      { id: "pytest", packages: ["fastapi", "pytest"] },
      { id: "ruff", packages: ["fastapi", "ruff"] },
    ] as const;

    for (const item of cases) {
      const root = await mkdtemp(path.join(os.tmpdir(), `reposetup-idem-${item.id}-`));
      tempDirs.push(root);
      await pythonApp(root, item.packages);
      const captured = captureIo();
      const result = await runCli(["add", item.id, "--yes"], {
        cwd: root,
        registry,
        io: captured.io,
        runProcess: async () => {
          throw new Error(`add ${item.id} must not spawn when already declared`);
        },
      });
      expect(result.exitCode, captured.stderr()).toBe(EXIT_CODES.SUCCESS);
      expect(captured.stdout()).toContain(
        `No changes. Integration "${item.id}" is already present.`,
      );
    }
  });

  it("does not duplicate Zod when add is executed then repeated after install", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-idem-zod-twice-"));
    tempDirs.push(root);
    await nodeApp(root);
    const runs: string[] = [];

    const first = captureIo();
    const firstResult = await runCli(["add", "zod", "--yes"], {
      cwd: root,
      registry,
      io: first.io,
      runProcess: async (request) => {
        runs.push(`${request.command} ${request.args.join(" ")}`);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    });
    expect(firstResult.exitCode, first.stderr()).toBe(EXIT_CODES.SUCCESS);
    expect(first.stdout()).not.toContain("already present");
    expect(runs.some((line) => line.includes("zod"))).toBe(true);

    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    pkg.dependencies.zod = "4.0.0";
    await writeFile(path.join(root, "package.json"), JSON.stringify(pkg));

    const secondRuns: string[] = [];
    const second = captureIo();
    const secondResult = await runCli(["add", "zod", "--yes"], {
      cwd: root,
      registry,
      io: second.io,
      runProcess: async (request) => {
        secondRuns.push(`${request.command} ${request.args.join(" ")}`);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    });
    expect(secondResult.exitCode, second.stderr()).toBe(EXIT_CODES.SUCCESS);
    expect(second.stdout()).toContain('No changes. Integration "zod" is already present.');
    expect(secondRuns).toEqual([]);
  });
});
