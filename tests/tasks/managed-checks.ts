import { createRequire } from "node:module";
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  taskContentHash,
  validateTaskBenchmarkFixture,
  type TaskBenchmarkFixture,
} from "../../packages/core/dist/index.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import {
  createTaskCheckRecipe,
  taskTestIdentity,
  TASK_CHECK_OUTPUT_BYTES,
  TASK_TOOL_ENTRY_PATHS,
  TASK_TOOL_VERSIONS,
  type TaskToolCheckId,
} from "../../packages/cli/src/tasks/check-recipes.js";
import { parseTaskToolReport } from "../../packages/cli/src/tasks/check-reports.js";
import { fixtureManifest, fixtureRoot, inventory, workspaceRoot } from "./fixture-tools.js";

const require = createRequire(import.meta.url);
const packages: Record<TaskToolCheckId, string> = {
  "ts.typecheck": "typescript",
  "ts.lint": "eslint",
  "ts.unit": "vitest",
};
const configs: Record<TaskToolCheckId, string> = {
  "ts.typecheck": "tsconfig.json",
  "ts.lint": "eslint.config.mjs",
  "ts.unit": "vitest.config.mjs",
};
/** Test-only fixed-recipe probe. Full immutable closure/acceptance qualification stays with E's executor. */
export async function checkManagedFixtureRecipes(
  manifest: TaskBenchmarkFixture,
  variant: "seed" | "reference",
) {
  const checked = validateTaskBenchmarkFixture(manifest);
  if (
    !checked.success ||
    taskContentHash(await fixtureManifest(manifest.fixtureId)) !== taskContentHash(manifest)
  )
    throw new Error("Frozen fixture changed");
  const root = await mkdtemp(path.join(tmpdir(), "reposetup-i-managed-")),
    canonicalRoot = await realpath(root);
  const project = path.join(canonicalRoot, "project"),
    source = path.join(fixtureRoot, manifest.fixtureId),
    scratch = path.join(canonicalRoot, "scratch"),
    home = path.join(scratch, "home"),
    temporary = path.join(scratch, "tmp");
  try {
    await cp(path.join(source, "seed"), project, { recursive: true });
    if (variant === "reference")
      await cp(path.join(source, "reference"), project, { recursive: true });
    const initial = taskContentHash(await inventory(project));
    await mkdir(home, { recursive: true, mode: 0o700 });
    await mkdir(temporary, { recursive: true, mode: 0o700 });
    // Existing frozen workspace dependencies are read-only to this test. No install or lifecycle.
    const link = path.join(project, "node_modules");
    await symlink(path.join(workspaceRoot, "node_modules"), link, "dir");
    const runner = createDefaultProcessRunner();
    const results: {
      checkId: TaskToolCheckId;
      passed: boolean;
      outputHash: string;
      recipeRevision: string;
      discoveredTests: number | null;
    }[] = [];
    for (const checkId of ["ts.typecheck", "ts.lint", "ts.unit"] as const) {
      const packageRoot = path.dirname(require.resolve(`${packages[checkId]}/package.json`));
      const metadata = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
      if (metadata.version !== TASK_TOOL_VERSIONS[checkId])
        throw new Error("Check tool version changed");
      const targets =
        checkId === "ts.lint"
          ? (await inventory(path.join(project, "src")))
              .map((row) => `src/${row.path}`)
              .filter((p) => p.endsWith(".ts"))
          : [];
      const recipe = createTaskCheckRecipe({
        checkId,
        nodeExecutable: process.execPath,
        entryPoint: path.join(packageRoot, TASK_TOOL_ENTRY_PATHS[checkId]),
        projectRoot: project,
        configPath: configs[checkId],
        targets,
        homeDirectory: home,
        temporaryDirectory: temporary,
      });
      const observed = await runner(recipe.request);
      let reportText: string | undefined;
      if (recipe.reportPath !== null) {
        const info = await stat(recipe.reportPath).catch(() => null);
        if (info !== null && info.size <= TASK_CHECK_OUTPUT_BYTES)
          reportText = await readFile(recipe.reportPath, "utf8");
      }
      const parsed = parseTaskToolReport({
        checkId,
        result: observed,
        projectRoot: project,
        ...(checkId === "ts.lint" ? { expectedLintTargets: targets } : {}),
        ...(reportText === undefined ? {} : { reportText }),
      });
      if (!parsed.success)
        throw new Error(`Bounded ${checkId} report was rejected: ${parsed.error.code}`);
      let passed = parsed.data.valid;
      const discovered = parsed.data.inventory?.discovered ?? null;
      if (checkId === "ts.unit" && discovered !== null) {
        const expected = manifest.publicTestIds.map((name) =>
          taskTestIdentity("test/public/managed.test.mjs", name),
        );
        if (taskContentHash([...discovered].sort()) !== taskContentHash([...expected].sort()))
          throw new Error("Managed public test inventory changed");
        passed &&= parsed.data.inventory!.passed.length === expected.length;
      }
      results.push({
        checkId,
        passed,
        outputHash: parsed.data.outputHash,
        recipeRevision: recipe.recipeRevision,
        discoveredTests: discovered?.length ?? null,
      });
    }
    await rm(link);
    const protectedInputsUnchanged = initial === taskContentHash(await inventory(project));
    if (!protectedInputsUnchanged || (await lstat(link).catch(() => null)) !== null)
      throw new Error("Trusted check mutated fixture inputs");
    return {
      fixtureId: manifest.fixtureId,
      fixtureRevision: manifest.fixtureRevision,
      variant,
      protectedInputsUnchanged,
      checks: results,
    };
  } finally {
    await rm(canonicalRoot, { recursive: true, force: true });
  }
}
