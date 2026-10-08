import { access, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupWorkspace,
  createTempWorkspace,
  fixturePath,
  keepOnFailure,
  monorepoBin,
  repoRoot,
  runNodeCli,
  runProcess,
  type CliRunResult,
} from "./harness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((dir) => cleanupWorkspace(dir, keep)));
});

async function commandAvailable(command: string): Promise<boolean> {
  try {
    const result = await runProcess(command, ["--version"], { cwd: repoRoot });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

const runNextGolden = process.env.CI === "true" || process.env.REPOSETUP_GOLDEN_NEXT === "1";
const hasUv = await commandAvailable("uv");

async function createProject(
  configPath: string,
  typescript?: boolean,
): Promise<{ cwd: string; created: CliRunResult }> {
  // Framework generators validate the final directory name. mkdtemp's random
  // suffix can contain uppercase letters, which Next.js rejects.
  const parent = await createTempWorkspace("reposetup-golden-");
  tempDirs.push(parent);
  const startingDir = path.join(parent, "project");
  await mkdir(startingDir);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.project.path = "app";
  if (typescript !== undefined) config.framework.options = { typescript };
  if (config.runtime.id === "node" && process.env.REPOSETUP_GOLDEN_PACKAGE_MANAGER === "npm")
    config.packageManager = "npm";
  const namedConfig = path.join(parent, "named-project.json");
  await writeFile(namedConfig, JSON.stringify(config));
  const created = await runNodeCli(monorepoBin, ["create", "--config", namedConfig, "--yes"], {
    cwd: startingDir,
    env: { ...process.env, npm_config_cache: path.join(parent, "npm-cache") },
  });
  expect(await readdir(startingDir), created.stderr).toEqual(["app"]);
  const cwd = path.join(startingDir, "app");
  if (created.exitCode !== 0 && config.runtime.id === "node") {
    const versions: Record<string, string> = {};
    for (const name of ["vite", "vitest", "vite-tsconfig-paths", "@types/node"]) {
      try {
        const pkg = JSON.parse(
          await readFile(path.join(cwd, "node_modules", name, "package.json"), "utf8"),
        );
        versions[name] = pkg.version;
      } catch {
        versions[name] = "unavailable";
      }
    }
    created.stderr += `\nInstalled test tooling: ${JSON.stringify(versions)}\n`;
  }
  return { cwd, created };
}

async function expectHealthyCli(cwd: string, expectedIds: readonly string[]): Promise<void> {
  const stack = await runNodeCli(monorepoBin, ["stack"], { cwd });
  expect(stack.exitCode, stack.stderr).toBe(0);
  for (const id of expectedIds) {
    expect(stack.stdout.toLowerCase()).toContain(
      id === "pnpm" && process.env.REPOSETUP_GOLDEN_PACKAGE_MANAGER === "npm"
        ? "npm"
        : id.toLowerCase(),
    );
  }

  const doctor = await runNodeCli(monorepoBin, ["--json", "doctor"], { cwd });
  expect(doctor.exitCode, `${doctor.stdout}\n${doctor.stderr}`).toBe(0);
  const report = JSON.parse(doctor.stdout);
  expect(await realpath(report.result.projectRoot)).toBe(await realpath(cwd));
  expect(report.result.checks).toContainEqual(
    expect.objectContaining({
      id: expectedIds.includes("uv") ? "dependencies:python" : "dependencies:node",
      ok: true,
    }),
  );
}

describe("golden stack real execution", () => {
  it.each(
    ["nextjs", "react-vite"].flatMap((framework) =>
      [true, false].map((typescript) => ({ framework, typescript })),
    ),
  )(
    "Golden J — $framework / TypeScript $typescript / Tailwind / shadcn initializes and builds in a named directory",
    async ({ framework, typescript }) => {
      const { cwd, created } = await createProject(
        fixturePath(`golden-${framework}-shadcn.json`),
        typescript,
      );
      expect(created.exitCode, `${created.stdout}\n${created.stderr}`).toBe(0);
      const components = JSON.parse(await readFile(path.join(cwd, "components.json"), "utf8"));
      expect(components.tsx).toBe(typescript);
      expect(components.tailwind.css.length).toBeGreaterThan(0);
      await access(path.join(cwd, components.tailwind.css));
      const built = await runProcess("pnpm", ["run", "build"], { cwd });
      expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);
      await expectHealthyCli(cwd, [framework === "nextjs" ? "next" : "vite", "shadcn", "tailwind"]);
    },
  );

  it("Golden K — Express / MongoDB / Mongoose builds and rejects a missing URI (no live database)", async () => {
    const { cwd, created } = await createProject(fixturePath("golden-express-mongoose.json"));
    expect(created.exitCode, `${created.stdout}\n${created.stderr}`).toBe(0);
    const built = await runProcess("pnpm", ["run", "build"], { cwd });
    expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);
    const guarded = await runProcess(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import assert from 'node:assert/strict'; delete process.env.MONGODB_URI; const {connectMongo}=await import('./src/mongoose.js'); await assert.rejects(connectMongo, /MONGODB_URI is not set/);",
      ],
      { cwd },
    );
    expect(guarded.exitCode, `${guarded.stdout}\n${guarded.stderr}`).toBe(0);
    expect(await readFile(path.join(cwd, ".env.example"), "utf8")).toContain("MONGODB_URI=");
    await expectHealthyCli(cwd, ["express", "mongodb", "mongoose"]);
  });

  it.skipIf(!runNextGolden)(
    "Golden A — Next.js / SQLite create, Prisma generate, typecheck/build, stack, doctor",
    async () => {
      const { cwd, created } = await createProject(
        path.join(repoRoot, "examples/reposetup.next-sqlite.json"),
      );
      expect(created.exitCode, created.stderr).toBe(0);
      expect(created.stdout).toContain("Executed ");
      expect(created.stdout).not.toContain("Installing skills");
      const files = await readdir(cwd);
      const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
      expect(pkg.devDependencies.vite).toBe("8.3.0");
      expect(pkg.devDependencies.vitest).toBe("5.0.1");
      for (const agentDir of [".agents", ".claude", ".cursor", ".windsurf"]) {
        expect(files).not.toContain(agentDir);
      }

      await access(path.join(cwd, "package.json"));
      await access(path.join(cwd, "lib/prisma.ts"));
      await access(path.join(cwd, "vitest.config.mts"));
      await access(path.join(cwd, ".env.example"));
      await access(path.join(cwd, "generated/prisma"));

      const typecheck = await runProcess("pnpm", ["exec", "tsc", "--noEmit"], { cwd });
      expect(typecheck.exitCode, `${typecheck.stdout}\n${typecheck.stderr}`).toBe(0);

      const vitest = await runProcess("pnpm", ["exec", "vitest", "run"], {
        cwd,
      });
      expect(vitest.exitCode, `${vitest.stdout}\n${vitest.stderr}`).toBe(0);

      const prettier = await runProcess(
        "pnpm",
        [
          "exec",
          "prettier",
          "--check",
          "app/api/health/route.ts",
          "health.test.ts",
          "lib/prisma.ts",
          ".prettierrc",
        ],
        { cwd },
      );
      expect(prettier.exitCode, `${prettier.stdout}\n${prettier.stderr}`).toBe(0);

      const built = await runProcess("pnpm", ["exec", "next", "build"], { cwd });
      expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);

      await expectHealthyCli(cwd, ["next", "prisma", "prettier", "pnpm"]);
    },
  );

  it("Golden B — React + Vite create, build, test, stack, doctor", async () => {
    const { cwd, created } = await createProject(fixturePath("golden-react-vite.json"));
    expect(created.exitCode, created.stderr).toBe(0);

    await access(path.join(cwd, "package.json"));
    await access(path.join(cwd, "vite.config.ts"));

    const build = await runProcess("pnpm", ["run", "build"], { cwd });
    expect(build.exitCode, `${build.stdout}\n${build.stderr}`).toBe(0);

    const test = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd });
    expect(test.exitCode, `${test.stdout}\n${test.stderr}`).toBe(0);

    const prettier = await runProcess(
      "pnpm",
      ["exec", "prettier", "--check", "src", "vite.config.ts", ".prettierrc"],
      { cwd },
    );
    expect(prettier.exitCode, `${prettier.stdout}\n${prettier.stderr}`).toBe(0);

    await expectHealthyCli(cwd, ["vite", "react", "prettier", "pnpm"]);
  });

  it("Golden C — Express endpoint test and PostgreSQL configuration (no live database)", async () => {
    const { cwd, created } = await createProject(fixturePath("golden-express.json"));
    expect(created.exitCode, created.stderr).toBe(0);

    await access(path.join(cwd, "src/app.ts"));
    await access(path.join(cwd, "prisma/schema.prisma"));
    await access(path.join(cwd, "lib/prisma.ts"));
    await access(path.join(cwd, "generated/prisma"));

    const typecheck = await runProcess("pnpm", ["exec", "tsc", "--noEmit"], { cwd });
    expect(typecheck.exitCode, `${typecheck.stdout}\n${typecheck.stderr}`).toBe(0);

    const built = await runProcess("pnpm", ["run", "build"], { cwd });
    expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);
    const manifest = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
    await access(path.join(cwd, manifest.scripts.start.split(" ")[1]));

    const vitest = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd });
    expect(vitest.exitCode, `${vitest.stdout}\n${vitest.stderr}`).toBe(0);

    const prettier = await runProcess(
      "pnpm",
      ["exec", "prettier", "--check", "src", "lib", ".prettierrc"],
      { cwd },
    );
    expect(prettier.exitCode, `${prettier.stdout}\n${prettier.stderr}`).toBe(0);

    await expectHealthyCli(cwd, ["express", "prisma", "prettier", "pnpm"]);
  });

  it("Golden F — Fastify response test and Drizzle schema (no live database)", async () => {
    const { cwd, created } = await createProject(fixturePath("golden-fastify-drizzle.json"));
    expect(created.exitCode, created.stderr).toBe(0);

    await access(path.join(cwd, "src/server.ts"));
    await access(path.join(cwd, "src/server.test.ts"));
    await access(path.join(cwd, "src/db/schema.ts"));
    await access(path.join(cwd, "src/db/schema.test.ts"));
    await access(path.join(cwd, "drizzle.config.ts"));
    await access(path.join(cwd, ".env.example"));
    const workflow = await readFile(path.join(cwd, ".github", "workflows", "node.js.yml"), "utf8");
    if (process.env.REPOSETUP_GOLDEN_PACKAGE_MANAGER === "npm")
      expect(workflow).toContain("npm ci");
    else {
      expect(workflow).toContain('version: "12.5.1"');
      expect(workflow).toContain('node-version: "24"');
      expect(workflow).toContain("pnpm install --frozen-lockfile");
      expect(workflow).toContain("pnpm run lint");
      expect(workflow).toContain("pnpm test");
      expect(workflow).toContain("pnpm run build");
    }

    const typecheck = await runProcess("pnpm", ["exec", "tsc", "--noEmit"], { cwd });
    expect(typecheck.exitCode, `${typecheck.stdout}\n${typecheck.stderr}`).toBe(0);

    const built = await runProcess("pnpm", ["run", "build"], { cwd });
    expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);
    const manifest = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
    await access(path.join(cwd, manifest.scripts.start.split(" ")[1]));

    const lint = await runProcess("pnpm", ["run", "lint"], { cwd });
    expect(lint.exitCode, `${lint.stdout}\n${lint.stderr}`).toBe(0);

    const vitest = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd });
    expect(vitest.exitCode, `${vitest.stdout}\n${vitest.stderr}`).toBe(0);

    await expectHealthyCli(cwd, ["fastify", "drizzle", "pnpm"]);
  });

  it("Golden G — React + Playwright initialization does not download browsers", async () => {
    const { cwd, created } = await createProject(fixturePath("golden-react-playwright.json"));
    expect(created.exitCode, created.stderr).toBe(0);

    await access(path.join(cwd, "playwright.config.ts"));
    await access(path.join(cwd, "tests", "example.spec.ts"));
    const files = await readdir(cwd);
    if (process.env.REPOSETUP_GOLDEN_PACKAGE_MANAGER === "npm") {
      expect(files).toContain("package-lock.json");
      expect(files).not.toContain("pnpm-lock.yaml");
    } else {
      expect(files).toContain("pnpm-lock.yaml");
      expect(files).not.toContain("package-lock.json");
    }
    const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8")) as {
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies?.["@playwright/test"]).toBe("1.63.0");
    expect(`${created.stdout}\n${created.stderr}`).toContain("browsers were not downloaded");

    const listed = await runProcess("pnpm", ["exec", "playwright", "test", "--list"], { cwd });
    expect(listed.exitCode, `${listed.stdout}\n${listed.stderr}`).toBe(0);

    const build = await runProcess("pnpm", ["run", "build"], { cwd });
    expect(build.exitCode, `${build.stdout}\n${build.stderr}`).toBe(0);

    await expectHealthyCli(cwd, ["react", "vite", "playwright", "pnpm"]);
  });

  it("Golden H — React Testing Library and TanStack Query interaction samples run", async () => {
    const { cwd, created } = await createProject(fixturePath("golden-react-phase26.json"));
    expect(created.exitCode, created.stderr).toBe(0);

    await access(path.join(cwd, "src", "testing-library-sample.test.tsx"));
    await access(path.join(cwd, "src", "reposetup-query-provider.tsx"));
    await access(path.join(cwd, "src", "tanstack-query-sample.test.tsx"));

    const test = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd });
    expect(test.exitCode, `${test.stdout}\n${test.stderr}`).toBe(0);

    const build = await runProcess("pnpm", ["run", "build"], { cwd });
    expect(build.exitCode, `${build.stdout}\n${build.stderr}`).toBe(0);

    await expectHealthyCli(cwd, ["react", "vite", "testing library", "tanstack query", "pnpm"]);

    const { cwd: addedCwd } = await createProject(fixturePath("golden-react-vite.json"));
    const added = await runNodeCli(
      monorepoBin,
      ["add", "testing-library", "tanstack-query", "--yes"],
      { cwd: addedCwd },
    );
    expect(added.exitCode, `${added.stdout}\n${added.stderr}`).toBe(0);
    const addedTest = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd: addedCwd });
    expect(addedTest.exitCode, `${addedTest.stdout}\n${addedTest.stderr}`).toBe(0);
    const repeated = await runNodeCli(
      monorepoBin,
      ["add", "testing-library", "tanstack-query", "--yes"],
      { cwd: addedCwd },
    );
    expect(repeated.exitCode, `${repeated.stdout}\n${repeated.stderr}`).toBe(0);
    expect(repeated.stdout).toContain("No changes.");
  });

  it.skipIf(!hasUv)(
    "Golden D — FastAPI create, import check, pytest, ruff, stack, doctor",
    async () => {
      const { cwd, created } = await createProject(fixturePath("golden-fastapi.json"));
      expect(created.exitCode, created.stderr).toBe(0);

      await access(path.join(cwd, "main.py"));
      await access(path.join(cwd, "pyproject.toml"));
      await access(path.join(cwd, "alembic.ini"));

      const imported = await runProcess("uv", ["run", "python", "-c", "import main"], { cwd });
      expect(imported.exitCode, `${imported.stdout}\n${imported.stderr}`).toBe(0);

      const pytest = await runProcess("uv", ["run", "pytest"], { cwd });
      expect(pytest.exitCode, `${pytest.stdout}\n${pytest.stderr}`).toBe(0);

      const ruff = await runProcess("uv", ["run", "ruff", "check", "."], { cwd });
      expect(ruff.exitCode, `${ruff.stdout}\n${ruff.stderr}`).toBe(0);

      await expectHealthyCli(cwd, ["fastapi", "uv"]);
    },
  );

  it.skipIf(!hasUv)(
    "Golden E — Flask create, import check, pytest, ruff, stack, doctor",
    async () => {
      const { cwd, created } = await createProject(fixturePath("golden-flask.json"));
      expect(created.exitCode, created.stderr).toBe(0);

      await access(path.join(cwd, "app.py"));
      await access(path.join(cwd, "pyproject.toml"));
      await access(path.join(cwd, "alembic.ini"));

      const imported = await runProcess("uv", ["run", "python", "-c", "import app"], { cwd });
      expect(imported.exitCode, `${imported.stdout}\n${imported.stderr}`).toBe(0);

      const pytest = await runProcess("uv", ["run", "pytest"], { cwd });
      expect(pytest.exitCode, `${pytest.stdout}\n${pytest.stderr}`).toBe(0);

      const ruff = await runProcess("uv", ["run", "ruff", "check", "."], { cwd });
      expect(ruff.exitCode, `${ruff.stdout}\n${ruff.stderr}`).toBe(0);

      await expectHealthyCli(cwd, ["flask", "uv"]);
    },
  );

  it.skipIf(!hasUv)(
    "Golden I — FastAPI HTTPX and Pydantic Settings tests run without real secrets",
    async () => {
      const { cwd, created } = await createProject(fixturePath("golden-fastapi-phase26.json"));
      expect(created.exitCode, created.stderr).toBe(0);

      await access(path.join(cwd, "test_httpx.py"));
      await access(path.join(cwd, "settings.py"));
      const envExample = await readFile(path.join(cwd, ".env.example"), "utf8");
      expect(envExample).toBe("APP_NAME=RepoSetup app\n");

      const pytest = await runProcess("uv", ["run", "pytest"], { cwd });
      expect(pytest.exitCode, `${pytest.stdout}\n${pytest.stderr}`).toBe(0);

      const ruff = await runProcess("uv", ["run", "ruff", "check", "."], { cwd });
      expect(ruff.exitCode, `${ruff.stdout}\n${ruff.stderr}`).toBe(0);

      await expectHealthyCli(cwd, ["fastapi", "httpx", "pydantic settings", "uv"]);

      const { cwd: addedCwd } = await createProject(fixturePath("golden-fastapi.json"));
      const added = await runNodeCli(monorepoBin, ["add", "httpx", "pydantic-settings", "--yes"], {
        cwd: addedCwd,
      });
      expect(added.exitCode, `${added.stdout}\n${added.stderr}`).toBe(0);
      const addedPytest = await runProcess("uv", ["run", "pytest"], { cwd: addedCwd });
      expect(addedPytest.exitCode, `${addedPytest.stdout}\n${addedPytest.stderr}`).toBe(0);
      const repeated = await runNodeCli(
        monorepoBin,
        ["add", "httpx", "pydantic-settings", "--yes"],
        { cwd: addedCwd },
      );
      expect(repeated.exitCode, `${repeated.stdout}\n${repeated.stderr}`).toBe(0);
      expect(repeated.stdout).toContain("No changes.");
    },
  );
});
