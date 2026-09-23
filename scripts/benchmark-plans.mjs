import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const recipes = [
  "examples/reposetup.next-sqlite.json",
  "tests/e2e/fixtures/golden-react-vite.json",
  "tests/e2e/fixtures/golden-express.json",
  "examples/reposetup.fastapi.json",
  "examples/reposetup.flask.json",
];
const trials = Number(process.env.REPOSETUP_BENCHMARK_TRIALS ?? 5);
if (!Number.isInteger(trials) || trials < 1)
  throw new Error("REPOSETUP_BENCHMARK_TRIALS must be a positive integer");
const outputPath = process.env.REPOSETUP_BENCHMARK_OUTPUT ?? "benchmark-plans.json";
const rows = [];
for (const recipe of recipes) {
  const config = await readFile(recipe);
  const times = [];
  let processOperations = 0;
  for (let trial = 0; trial < trials; trial += 1) {
    const started = process.hrtime.bigint();
    const result = spawnSync(
      process.execPath,
      ["packages/cli/dist/bin.js", "create", "--config", recipe, "--dry-run", "--yes"],
      { encoding: "utf8" },
    );
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    if (result.status !== 0) throw new Error(`${recipe} failed: ${result.stderr}`);
    times.push(elapsedMs);
    processOperations = (
      result.stdout.match(/run_command|install_package|check_prerequisite|verify/g) ?? []
    ).length;
  }
  times.sort((a, b) => a - b);
  rows.push({
    recipe,
    configSha256: createHash("sha256").update(config).digest("hex"),
    trials,
    medianMs: times[Math.floor(times.length / 2)],
    minMs: times[0],
    maxMs: times.at(-1),
    processOperations,
  });
}
await writeFile(
  outputPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), mode: "dry-run-planning-only", rows }, null, 2)}\n`,
);
log(JSON.stringify(rows, null, 2));
