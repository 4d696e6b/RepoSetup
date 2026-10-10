import { createRequire } from "node:module";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TASK_BENCHMARK_FIXTURE_IDS,
  taskByteHash,
  taskContentHash,
  sealTaskBenchmarkFixture,
  validateTaskBenchmarkFixture,
  type TaskBenchmarkFixture,
} from "../../packages/core/dist/index.js";
const require = createRequire(import.meta.url);
export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const fixtureRoot = path.join(workspaceRoot, "tests/tasks/fixtures");
export const typescriptRoot = path.dirname(require.resolve("typescript/package.json"));
const managedToolRoots = ["typescript", "eslint", "typescript-eslint", "vitest"].map((name) => ({
  name,
  root: path.dirname(require.resolve(`${name}/package.json`)),
}));
export async function inventory(
  root: string,
  options: { ignorePackageLaunchers?: boolean } = {},
): Promise<TaskBenchmarkFixture["seedFiles"]> {
  const rows: TaskBenchmarkFixture["seedFiles"] = [];
  async function walk(folder: string) {
    for (const name of (await readdir(folder)).sort()) {
      // pnpm generates these wrappers with absolute checkout paths. They are not
      // package payload and trusted recipes launch pinned entry points directly.
      if (
        options.ignorePackageLaunchers &&
        path.relative(root, path.join(folder, name)).split(path.sep).join("/") ===
          "node_modules/.bin"
      )
        continue;
      const full = path.join(folder, name),
        stat = await lstat(full);
      if (stat.isSymbolicLink()) throw new Error("Fixture links are forbidden");
      if (stat.isDirectory()) await walk(full);
      else if (stat.isFile()) {
        const bytes = await readFile(full);
        rows.push({
          path: path.relative(root, full).split(path.sep).join("/"),
          fileHash: taskByteHash(bytes),
          bytes: bytes.length,
        });
      } else throw new Error("Special fixture file");
    }
  }
  await walk(root);
  return rows.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
export async function fixtureManifest(fixtureId: string): Promise<TaskBenchmarkFixture> {
  if (
    !TASK_BENCHMARK_FIXTURE_IDS.includes(fixtureId as (typeof TASK_BENCHMARK_FIXTURE_IDS)[number])
  )
    throw new Error("Unknown fixture identity");
  const root = path.join(fixtureRoot, fixtureId);
  const descriptor = JSON.parse(await readFile(path.join(root, "descriptor.json"), "utf8"));
  const seedFiles = await inventory(path.join(root, "seed")),
    oracleFiles = await inventory(path.join(root, "oracle"));
  const manifest = sealTaskBenchmarkFixture({
    kind: "task_benchmark_fixture",
    schemaVersion: 1,
    ...descriptor,
    seedFiles,
    seedRevision: taskContentHash(seedFiles),
    oracleFiles,
    oracleRevision: taskContentHash(oracleFiles),
    phaseDocumentHash: seedFiles.find((r) => r.path === "docs/phase.md")!.fileHash,
    lockfileHash: taskByteHash(await readFile(path.join(workspaceRoot, "pnpm-lock.yaml"))),
    dependencyArtifactId: taskContentHash(
      await Promise.all(
        managedToolRoots.map(async ({ name, root }) => ({
          name,
          files: await inventory(root, { ignorePackageLaunchers: true }),
        })),
      ),
    ),
    recipeRevision: taskContentHash(
      await Promise.all(
        [
          "fixture-tools.ts",
          "fixture-qualification.ts",
          "managed-checks.ts",
          "candidate-projection.ts",
          "candidate-evaluation.ts",
          "run-oracle.mjs",
        ].map(async (name) => ({
          path: name,
          fileHash: taskByteHash(await readFile(path.join(workspaceRoot, "tests/tasks", name))),
        })),
      ),
    ),
    supportProfileId: "managed-ts-node-v1",
    referenceFiles: await inventory(path.join(root, "reference")),
    incorrectVariants: await Promise.all(
      descriptor.incorrectVariants.map(async (variantId: string) => ({
        variantId,
        files: await inventory(path.join(root, "incorrect", variantId)),
      })),
    ),
    resourceLimits: {
      maxImplementationAttemptsPerTask: 3,
      maxProviderCalls: 24,
      maxInputTokens: 240000,
      maxOutputTokens: 48000,
      maxWallTimeMs: 1800000,
      maxCostMicrousd: 10000000,
    },
  });
  const checked = validateTaskBenchmarkFixture(manifest);
  if (!checked.success) throw new Error(checked.error.message);
  return checked.data;
}
