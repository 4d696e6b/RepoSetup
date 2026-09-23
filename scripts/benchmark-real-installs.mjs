import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { platform, arch, release } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const allRecipes = [
  "examples/reposetup.next-sqlite.json",
  "tests/e2e/fixtures/golden-react-vite.json",
  "tests/e2e/fixtures/golden-express.json",
  "examples/reposetup.fastapi.json",
  "examples/reposetup.flask.json",
];
const selectedRecipes = process.env.REPOSETUP_REAL_BENCHMARK_RECIPES?.split(",").filter(Boolean);
const recipes =
  selectedRecipes === undefined
    ? allRecipes
    : allRecipes.filter((recipe) => selectedRecipes.includes(recipe));
const trials = Number(process.env.REPOSETUP_REAL_BENCHMARK_TRIALS ?? 5);
const outputPath = process.env.REPOSETUP_REAL_BENCHMARK_OUTPUT ?? "benchmark-real-installs.json";
const workspaceRoot = resolve(process.env.REPOSETUP_BENCHMARK_WORKSPACE_ROOT ?? process.cwd());
const cliBin = resolve(
  process.env.REPOSETUP_BENCHMARK_CLI_BIN ?? join(workspaceRoot, "packages/cli/dist/bin.js"),
);

if (process.env.REPOSETUP_ALLOW_REAL_INSTALL_BENCHMARK !== "1") {
  throw new Error(
    "Set REPOSETUP_ALLOW_REAL_INSTALL_BENCHMARK=1 to allow benchmark-owned real package installs.",
  );
}
if (!Number.isInteger(trials) || trials < 1) {
  throw new Error("REPOSETUP_REAL_BENCHMARK_TRIALS must be a positive integer");
}
if (recipes.length === 0) {
  throw new Error("REPOSETUP_REAL_BENCHMARK_RECIPES did not select a supported recipe");
}

const temporaryRoot = process.env.TMPDIR ?? process.env.TEMP ?? process.env.TMP ?? "/tmp";
const benchmarkRoot = await mkdtemp(join(temporaryRoot, "reposetup-real-benchmark-"));
const rows = [];
try {
  await mkdir(join(benchmarkRoot, "projects"), { recursive: true });
  for (const recipe of recipes) {
    const configPath = resolve(workspaceRoot, recipe);
    const config = await readFile(configPath);
    for (const cacheMode of ["cold", "warm"]) {
      const cacheRoot = join(benchmarkRoot, "caches", cacheMode, recipeId(recipe));
      const measurements = [];
      for (let trial = 1; trial <= trials; trial += 1) {
        if (cacheMode === "cold") {
          await rm(cacheRoot, { recursive: true, force: true });
        }
        await mkdir(cacheRoot, { recursive: true });
        const trialRoot = await mkdtemp(join(benchmarkRoot, "projects", `${recipeId(recipe)}-`));
        const projectRoot = join(trialRoot, "project");
        await mkdir(projectRoot);
        const started = process.hrtime.bigint();
        const result = spawnSync(
          process.execPath,
          [cliBin, "create", "--config", configPath, "--yes"],
          {
            cwd: projectRoot,
            encoding: "utf8",
            env: benchmarkEnvironment(cacheRoot),
            timeout: 30 * 60_000,
          },
        );
        const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
        measurements.push({
          trial,
          elapsedMs,
          exitCode: result.status ?? 1,
          timedOut: result.signal === "SIGTERM",
          stderr: trimOutput(result.stderr ?? result.error?.message ?? ""),
        });
        await rm(trialRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      }
      rows.push({
        recipe,
        configSha256: createHash("sha256").update(config).digest("hex"),
        cacheMode,
        measurements,
        successfulMedianMs: median(
          measurements
            .filter((measurement) => measurement.exitCode === 0)
            .map((measurement) => measurement.elapsedMs),
        ),
      });
    }
  }
} finally {
  await rm(benchmarkRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: "real-create-with-benchmark-owned-caches",
  source: process.env.GITHUB_SHA ?? "local",
  environment: {
    platform: platform(),
    architecture: arch(),
    osRelease: release(),
    node: process.version,
    npmUserAgent: process.env.npm_config_user_agent ?? null,
  },
  trials,
  rows,
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
log(JSON.stringify(report, null, 2));
if (rows.some((row) => row.measurements.some((measurement) => measurement.exitCode !== 0))) {
  process.exitCode = 1;
}

function benchmarkEnvironment(cacheRoot) {
  return {
    ...process.env,
    npm_config_cache: join(cacheRoot, "npm"),
    PNPM_HOME: join(cacheRoot, "pnpm-home"),
    XDG_CACHE_HOME: join(cacheRoot, "xdg"),
    UV_CACHE_DIR: join(cacheRoot, "uv"),
    npm_config_fund: "false",
    npm_config_audit: "false",
    npm_config_update_notifier: "false",
  };
}

function recipeId(recipe) {
  return recipe.replaceAll(/[^a-z0-9]+/gi, "-").replaceAll(/(^-|-$)/g, "");
}

function median(values) {
  if (values.length === 0) {
    return null;
  }
  values.sort((left, right) => left - right);
  return values[Math.floor(values.length / 2)];
}

function trimOutput(value) {
  return value.length > 4000 ? `${value.slice(-4000)}\n[truncated]` : value;
}
