import { access, mkdir } from "node:fs/promises";
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

async function createProject(configPath: string): Promise<{ cwd: string; created: CliRunResult }> {
  // Framework generators validate the final directory name. mkdtemp's random
  // suffix can contain uppercase letters, which Next.js rejects.
  const parent = await createTempWorkspace("reposetup-golden-");
  tempDirs.push(parent);
  const cwd = path.join(parent, "project");
  await mkdir(cwd);
  const created = await runNodeCli(monorepoBin, ["create", "--config", configPath, "--yes"], {
    cwd,
  });
  return { cwd, created };
}

async function expectHealthyCli(cwd: string, expectedIds: readonly string[]): Promise<void> {
  const stack = await runNodeCli(monorepoBin, ["stack"], { cwd });
  expect(stack.exitCode, stack.stderr).toBe(0);
  for (const id of expectedIds) {
    expect(stack.stdout.toLowerCase()).toContain(id.toLowerCase());
  }

  const doctor = await runNodeCli(monorepoBin, ["doctor"], { cwd });
  expect(doctor.exitCode, `${doctor.stdout}\n${doctor.stderr}`).toBe(0);
}

describe("golden stack real execution", () => {
  it.skipIf(!runNextGolden)(
    "Golden A — Next.js / SQLite create, Prisma generate, typecheck/build, stack, doctor",
    async () => {
      const { cwd, created } = await createProject(
        path.join(repoRoot, "examples/reposetup.next-sqlite.json"),
      );
      expect(created.exitCode, created.stderr).toBe(0);
      expect(created.stdout).toContain("Executed ");

      await access(path.join(cwd, "package.json"));
      await access(path.join(cwd, "lib/prisma.ts"));
      await access(path.join(cwd, "vitest.config.mts"));
      await access(path.join(cwd, ".env.example"));
      await access(path.join(cwd, "generated/prisma"));

      const typecheck = await runProcess("pnpm", ["exec", "tsc", "--noEmit"], { cwd });
      expect(typecheck.exitCode, `${typecheck.stdout}\n${typecheck.stderr}`).toBe(0);

      const vitest = await runProcess("pnpm", ["exec", "vitest", "run", "--passWithNoTests"], {
        cwd,
      });
      expect(vitest.exitCode, `${vitest.stdout}\n${vitest.stderr}`).toBe(0);

      const built = await runProcess("pnpm", ["exec", "next", "build"], { cwd });
      expect(built.exitCode, `${built.stdout}\n${built.stderr}`).toBe(0);

      await expectHealthyCli(cwd, ["next", "prisma", "pnpm"]);
    },
  );

  it("Golden B — React + Vite create, build, test, stack, doctor", async () => {
    const { cwd, created } = await createProject(fixturePath("golden-react-vite.json"));
    expect(created.exitCode, created.stderr).toBe(0);

    await access(path.join(cwd, "package.json"));
    await access(path.join(cwd, "vite.config.ts"));

    const build = await runProcess("pnpm", ["run", "build"], { cwd });
    expect(build.exitCode, `${build.stdout}\n${build.stderr}`).toBe(0);

    const test = await runProcess("pnpm", ["exec", "vitest", "run", "--passWithNoTests"], { cwd });
    expect(test.exitCode, `${test.stdout}\n${test.stderr}`).toBe(0);

    await expectHealthyCli(cwd, ["vite", "react", "pnpm"]);
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

    const vitest = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd });
    expect(vitest.exitCode, `${vitest.stdout}\n${vitest.stderr}`).toBe(0);

    await expectHealthyCli(cwd, ["express", "prisma", "pnpm"]);
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
});
