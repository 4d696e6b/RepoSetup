import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createVerificationFixture } from "../packages/cli/src/tasks/verification-fixture.test-helper.js";
import { createTaskGitFixture } from "../packages/cli/src/tasks/git-fixture.test-helper.js";
import { createTaskRunAdapter } from "../packages/cli/src/tasks/application-adapter.js";
import { createDefaultFs } from "../packages/cli/src/io.js";
import { runCli } from "../packages/cli/src/run-cli.js";
import { taskByteHash, taskContentHash, type TaskReview } from "../packages/core/dist/index.js";

/** Offline-only developer preparation. No credential read, provider construction or dispatch.
 * Leaves a private disposable fixture for separately approved CLI calls and manual review. */
async function prepare() {
  if (process.argv.length !== 3 || !/^v24\./.test(process.version))
    throw new Error("Provide the absolute workspace root using preinstalled Node 24.");
  const workspace = path.resolve(process.argv[2]!);
  const f = await createVerificationFixture(
    async (request) => ({ request, approved: false, evidenceArtifactIds: [] }),
    false,
    true,
    workspace,
  );
  // Failures retain only this private fixture for inspection; never roll back project effects.
  process.stderr.write(`Disposable smoke fixture: ${f.parent}\n`);
  const phaseText =
    "Implement exported add(a, b), returning the sum for finite numeric inputs and preserving its API. Decompose into exactly one implementation task with taskId add, criterionId task-criterion, checkId task.acceptance, all required checks, and only src/add.ts writable.\n";
  await writeFile(path.join(f.projectRoot, "docs/phase.md"), phaseText);
  const git = await createTaskGitFixture(f.projectRoot, f.parent);
  const sourceIdentity = async (args: string[]) => {
    const result = await f.input.runProcess({
      command: git.executable,
      args,
      cwd: workspace,
      env: {
        PATH: path.dirname(git.executable),
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_TERMINAL_PROMPT: "0",
        LANG: "C",
        LC_ALL: "C",
      },
      timeoutMs: 10000,
    });
    if (result.exitCode !== 0 || result.timedOut || result.aborted || result.outputTruncated)
      throw new Error("Source identity unavailable.");
    return result.stdout.trim();
  };
  const sourceSha = await sourceIdentity(["rev-parse", "HEAD"]);
  const sourceDirty = (await sourceIdentity(["status", "--porcelain"])).length > 0;
  const sdkVersion = JSON.parse(
    await readFile(path.join(workspace, "packages/cli/node_modules/openai/package.json"), "utf8"),
  ).version;
  const runnerHash = taskByteHash(await readFile(process.argv[1]!));
  const stateRoot = path.join(f.parent, "state");
  await mkdir(stateRoot, { mode: 0o700 });
  const adapter = await createTaskRunAdapter({
    projectRoot: f.projectRoot,
    stateRoot,
    authority: f.input.compilationPolicy.authority,
  });
  if (!adapter.success) throw new Error(adapter.error.code);
  const baseline = await adapter.data.snapshot();
  if (!baseline.success) throw new Error(baseline.error.code);
  const phaseHash = taskByteHash(phaseText);
  const review: TaskReview = {
    kind: "task_review",
    schemaVersion: 1,
    phase: {
      ...f.input.plan.phase,
      sourceFileHash: phaseHash,
      selectionHash: phaseHash,
      requirements: f.input.plan.phase.requirements.map((r) => ({
        ...r,
        sourceRefs: [{ path: "docs/phase.md", fileHash: phaseHash }],
      })),
    },
    project: {
      rootIdentity: taskByteHash(f.projectRoot),
      baselineCommit: git.baselineCommit,
      baselineTreeHash: taskContentHash(baseline.data.entries),
    },
    policy: f.input.compilationPolicy,
  };
  const resourceLimits = {
    maxImplementationAttemptsPerTask: 1,
    maxProviderCalls: 2,
    maxInputTokens: 100000,
    maxOutputTokens: 8192,
    maxWallTimeMs: 900000,
    maxCostMicrousd: 1000000,
  };
  const artifact = (name: string) => path.join(f.parent, `${name}.json`);
  const save = (name: string, value: unknown) =>
    writeFile(artifact(name), JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  await save("review", review);
  await save("preferences", {
    kind: "task_preferences",
    schemaVersion: 1,
    executionMode: "managed",
    qualityPreference: "conservative",
    supportProfileId: "managed-ts-node-v1",
    providerAvailability: [
      { providerId: "openai-responses-v1", enabled: true, modelProfileIds: ["gpt-6.1-sol"] },
    ],
    effortPreference: { type: "explicit", nativeEffortId: "low" },
    resourceLimits,
    exclusions: [],
  });
  await save("authority", {
    kind: "task_execution_authority",
    schemaVersion: 1,
    checks: f.checks,
    policy: f.input.policy,
  });
  const common = [
    "--root",
    f.projectRoot,
    "--review",
    artifact("review"),
    "--preferences",
    artifact("preferences"),
    "--state-root",
    stateRoot,
    "--effort",
    "low",
    "--max-output-tokens",
    "4096",
    "--timeout-ms",
    "120000",
    "--json",
  ];
  const output: string[] = [];
  const preview = await runCli(["task", "compile", "--managed", ...common, "--dry-run"], {
    cwd: workspace,
    fs: createDefaultFs(),
    io: { writeOut: (text) => output.push(text), writeErr: (text) => output.push(text) },
    createTaskCompilationHost: async () => {
      throw new Error("Offline preparation must not construct a provider.");
    },
    runProcess: async () => {
      throw new Error("Dry-run must not execute processes.");
    },
  });
  if (preview.exitCode !== 0)
    throw new Error("Compilation preview failed; inspect private fixture inputs.");
  const summary = JSON.parse(output.at(-1)!);
  await save("compile-preview", summary);
  await save("preparation", {
    kind: "task_provider_smoke_preparation",
    schemaVersion: 1,
    qualification: false,
    providerCalls: 0,
    sourceSha,
    sourceDirty,
    sdkVersion,
    runnerHash,
    runtime: {
      executable: process.execPath,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    projectRoot: f.projectRoot,
    stateRoot,
    scratchRoot: f.scratchParent,
    baselineCommit: git.baselineCommit,
    oracleHash: taskByteHash(await readFile(path.join(f.projectRoot, "test/add.test.ts"))),
    reviewHash: taskContentHash(review),
    resourceLimits,
    common,
    compileApproval: summary.summaryId,
    receiptPath: artifact("plan"),
    authorityPath: artifact("authority"),
  });
  process.stdout.write(
    JSON.stringify({
      fixture: f.parent,
      preview: artifact("compile-preview"),
      preparation: artifact("preparation"),
      providerCalls: 0,
    }) + "\n",
  );
}
prepare().catch(() => {
  // Do not print arbitrary exception bodies, source packets, provider responses or credentials.
  process.stderr.write("Offline smoke preparation failed; retained fixture requires inspection.\n");
  process.exitCode = 1;
});
