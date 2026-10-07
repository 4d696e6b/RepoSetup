import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  taskBenchmarkOracleResultSchema,
  taskContentHash,
  validateTaskBenchmarkFixture,
  type TaskBenchmarkFixture,
} from "../../packages/core/dist/index.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import {
  fixtureRoot,
  fixtureManifest,
  inventory,
  typescriptRoot,
  workspaceRoot,
} from "./fixture-tools.js";
/** Qualification infrastructure only: frozen trusted code, no model, script/config commands or installations. */
export async function qualifyFixture(
  manifest: TaskBenchmarkFixture,
  variant: "seed" | "reference" | string,
) {
  const checked = validateTaskBenchmarkFixture(manifest);
  if (!checked.success) throw new Error(checked.error.message);
  const fresh = await fixtureManifest(manifest.fixtureId);
  if (taskContentHash(fresh) !== taskContentHash(manifest))
    throw new Error("Fixture/source/tool artifact freeze changed");
  if (
    !["seed", "reference", ...manifest.incorrectVariants.map((v) => v.variantId)].includes(variant)
  )
    throw new Error("Unknown frozen variant");
  const started = performance.now(),
    root = await mkdtemp(path.join(tmpdir(), "reposetup-i-oracle-"));
  const project = path.join(root, "project"),
    source = path.join(fixtureRoot, manifest.fixtureId);
  const processRunner = createDefaultProcessRunner();
  const env = { PATH: path.dirname(process.execPath), LANG: "C", LC_ALL: "C", CI: "1", TZ: "UTC" };
  try {
    await cp(path.join(source, "seed"), project, { recursive: true });
    if (variant !== "seed")
      await cp(
        path.join(source, variant === "reference" ? "reference" : path.join("incorrect", variant)),
        project,
        { recursive: true },
      );
    const publicInventory = await inventory(project);
    // Model-readable hydration has no oracle source, reference or mutation files.
    if (publicInventory.some((r) => r.path.includes("holdout") || r.path.includes("type-oracle")))
      throw new Error("Holdout leaked into public hydration");
    const compile = async (typeOracle: boolean) => {
      if (typeOracle)
        await cp(
          path.join(source, "oracle/type-oracle.ts"),
          path.join(project, "test/type-oracle.ts"),
        );
      return processRunner({
        command: process.execPath,
        args: [
          path.join(typescriptRoot, "bin/tsc"),
          "--project",
          path.join(project, "tsconfig.json"),
          "--outDir",
          path.join(root, "emitted"),
          "--rootDir",
          project,
        ],
        cwd: project,
        env,
        timeoutMs: 120000,
      });
    };
    const typecheck = await compile(false);
    if (typecheck.timedOut || typecheck.outputTruncated || typecheck.aborted)
      throw new Error("Bounded compiler infrastructure failed");
    if (typecheck.exitCode !== 0)
      return {
        fixtureId: manifest.fixtureId,
        fixtureRevision: manifest.fixtureRevision,
        variant,
        typecheck: false,
        compatibility: null,
        publicAcceptance: null,
        holdout: null,
        typeContract: false,
        durationMs: Math.ceil(performance.now() - started),
        publicInventoryHash: taskContentHash(publicInventory),
      };
    const emitted = path.join(root, "emitted");
    await mkdir(path.join(emitted, "test/public"), { recursive: true });
    await cp(path.join(project, "test/public"), path.join(emitted, "test/public"), {
      recursive: true,
    });
    await writeFile(path.join(emitted, "package.json"), JSON.stringify({ type: "module" }));
    const evaluate = async (suite: "compat" | "public" | "holdout") => {
      if (suite === "holdout")
        await cp(
          path.join(source, "oracle/holdout.mjs"),
          path.join(emitted, "test/public/holdout.mjs"),
        );
      const observed = await processRunner({
        command: process.execPath,
        args: [path.join(workspaceRoot, "tests/tasks/run-oracle.mjs"), emitted, suite],
        cwd: root,
        env,
        timeoutMs: 10000,
      });
      if (observed.timedOut || observed.outputTruncated || observed.aborted)
        throw new Error("Bounded oracle infrastructure failed");
      const result = taskBenchmarkOracleResultSchema.parse(JSON.parse(observed.stdout));
      if (new Set(result.results.map((t) => t.testId)).size !== result.results.length)
        throw new Error("Duplicate oracle test identity");
      if (
        suite === "holdout" &&
        taskContentHash(result.results.map((r) => r.testId).sort()) !==
          taskContentHash(
            manifest.testInventory
              .filter((t) => t.kind === "runtime")
              .map((t) => t.testId)
              .sort(),
          )
      )
        throw new Error("Holdout test inventory changed");
      return {
        passed: observed.exitCode === 0 && result.results.every((r) => r.passed),
        results: result.results,
      };
    };
    const compatibility = await evaluate("compat"),
      publicAcceptance = await evaluate("public"),
      holdout = await evaluate("holdout");
    if (taskContentHash(await inventory(project)) !== taskContentHash(publicInventory))
      throw new Error("Oracle changed protected fixture inputs");
    let typeContract = true;
    if (manifest.testInventory.some((t) => t.kind === "type")) {
      const result = await compile(true);
      if (result.timedOut || result.outputTruncated || result.aborted)
        throw new Error("Type oracle infrastructure failed");
      typeContract = result.exitCode === 0;
    }
    return {
      fixtureId: manifest.fixtureId,
      fixtureRevision: manifest.fixtureRevision,
      variant,
      typecheck: true,
      compatibility,
      publicAcceptance,
      holdout,
      typeContract,
      durationMs: Math.ceil(performance.now() - started),
      publicInventoryHash: taskContentHash(publicInventory),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
