import { mkdir, mkdtemp, realpath, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  compileTaskPlan,
  executeManagedTaskPhase,
  executeTaskBenchmark,
  executeTaskBenchmarkReplay,
  executeTaskCompilation,
  freezeTaskBenchmarkDecomposition,
  inspectTaskBenchmarkRun,
  prepareTaskCompilationContext,
  projectTaskBenchmarkCompilation,
  projectTaskBenchmarkRunRequests,
  taskByteHash,
  taskContentHash,
  type TaskBenchmarkExecutionPorts,
  type TaskBenchmarkRunEvidence,
  type TaskCompilationCheckpoint,
  type TaskParseResult,
} from "../../packages/core/dist/index.js";
import { createTaskBenchmarkStore } from "../../packages/cli/src/tasks/benchmark-store.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import {
  createCandidateEvaluationSession,
  type FinalCandidateEvidence,
} from "./candidate-evaluation.js";
import { fixtureManifest, workspaceRoot } from "./fixture-tools.js";
import { createManagedBenchmarkFailureHost, HASH, strong } from "./managed-benchmark-host.js";
function checked<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
const elapsed = (start: number) => Math.ceil(performance.now() - start);
/** Diagnostic failure-path driver only. Real frozen bytes/Git/state/oracles, simulated
 * provider and E definition ports. No candidate code is changed or accepted. */
export async function runManagedBenchmarkFailureBlock() {
  const driverStarted = performance.now();
  const parent = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-managed-block-")));
  const host = createManagedBenchmarkFailureHost(parent);
  const {
    c,
    f,
    roots,
    policy,
    verificationPolicy,
    taskDraft,
    fresh,
    provider,
    routing,
    projectRoots,
    inputs,
  } = host;
  const ledgerEvidence: TaskBenchmarkRunEvidence[] = [],
    evaluations: FinalCandidateEvidence[] = [];
  let sourceCheckpoint: TaskCompilationCheckpoint | undefined;
  let sourceSpan = 0,
    processCalls = 0;
  try {
    const gitSource = async (args: string[]) => {
      const result = await createDefaultProcessRunner()({
        command: "git",
        args,
        cwd: workspaceRoot,
        env: { PATH: process.env.PATH ?? "", LANG: "C", LC_ALL: "C" },
        timeoutMs: 30000,
      });
      if (result.exitCode !== 0 || result.timedOut || result.aborted || result.outputTruncated)
        throw new Error("Source identity unavailable");
      return result.stdout.trim();
    };
    const sourceSha = await gitSource(["rev-parse", "HEAD"]);
    const sourceDirty = (await gitSource(["status", "--porcelain"])).length > 0;
    c.sourceRevision = taskContentHash({ sourceSha, sourceDirty });
    c.runnerRevision = taskContentHash(
      await Promise.all(
        ["managed-benchmark-failure.ts", "managed-benchmark-host.ts"].map(async (name) => ({
          name,
          hash: taskByteHash(await readFile(path.join(workspaceRoot, "tests/tasks", name))),
        })),
      ),
    );
    c.supportRevision = taskContentHash(policy);
    if (!["darwin", "linux"].includes(process.platform) || !["arm64", "x64"].includes(process.arch))
      throw new Error("Unsupported diagnostic host");
    c.host = {
      ...c.host,
      platform: process.platform as "darwin" | "linux",
      architecture: process.arch as "arm64" | "x64",
      nodeVersion: process.version,
    };
    if (taskContentHash(await fixtureManifest(f.fixtureId)) !== taskContentHash(f))
      throw new Error("Freeze changed");
    const stateRoot = path.join(parent, "campaign");
    await mkdir(stateRoot, { mode: 0o700 });
    const store = checked(await createTaskBenchmarkStore({ stateRoot, campaign: c }));
    const controller = new AbortController();
    let finished = 0;
    const ports: TaskBenchmarkExecutionPorts = {
      now: store.now,
      retain: async (event) => {
        const saved = await store.retain(event);
        if (saved.success && event.event.type === "trial_finished" && ++finished === 3)
          controller.abort();
        return saved;
      },
      prepareBlock: async ({ fixture, block }) => {
        if (fixture.fixtureId !== f.fixtureId || block !== 0)
          throw new Error("Only first diagnostic block");
        for (const name of ["whole", "fixed", "routed", "source"] as const)
          roots[name] = await fresh(name);
        return {
          ready: true,
          failureCode: null,
          setupMs: {
            whole: roots.whole!.setupMs,
            fixed: roots.fixed!.setupMs + roots.source!.setupMs,
            routed: roots.routed!.setupMs + roots.source!.setupMs,
          },
        };
      },
      compile: async () => {
        const r = roots.source!,
          started = performance.now();
        const context = checked(
          await prepareTaskCompilationContext({
            review: r.review,
            repository: r.adapter.repository,
          }),
        );
        const result = checked(
          await executeTaskCompilation({
            review: r.review,
            adapter: r.adapter,
            provider: provider(strong, "compile"),
            resourceLimits: f.resourceLimits,
            maxOutputTokens: 256,
            timeoutMs: 1000,
            expectedContextId: context.contextId,
            allowProviderUsage: true,
          }),
        );
        if (result.dryRun) throw new Error("Unexpected preview");
        sourceCheckpoint = result.checkpoint;
        sourceSpan = elapsed(started);
        return checked(
          projectTaskBenchmarkCompilation({ checkpoint: sourceCheckpoint, elapsedMs: sourceSpan }),
        );
      },
      runTrial: async (slot) => {
        const r = roots[slot.treatment]!,
          started = performance.now();
        let plan,
          managedCompilationId: string | undefined,
          initialDurationMs = r.setupMs;
        if (slot.treatment === "whole")
          plan = checked(compileTaskPlan({ ...r.review, draft: taskDraft(r.review, true) }));
        else {
          if (!sourceCheckpoint) throw new Error("Missing shared compilation");
          const decomposition = checked(
            freezeTaskBenchmarkDecomposition({
              plan: sourceCheckpoint.plan,
              policy,
              logicalVerificationRevision: HASH,
            }),
          );
          const replay = checked(
            await executeTaskBenchmarkReplay({
              sourceCheckpoint,
              decomposition,
              review: r.review,
              logicalVerificationRevision: HASH,
              treatment: slot.treatment === "fixed" ? "compiled_fixed" : "compiled_routed",
              adapter: r.adapter,
            }),
          );
          if (replay.dryRun) throw new Error("Unexpected preview");
          plan = replay.checkpoint.plan!;
          managedCompilationId = replay.checkpoint.compilationId;
          initialDurationMs +=
            roots.source!.setupMs +
            Math.max(0, sourceSpan + elapsed(started) - replay.checkpoint.usage!.durationMs);
        }
        const outcome = await executeManagedTaskPhase({
          plan,
          compilationPolicy: policy,
          resourceLimits: f.resourceLimits,
          ...(managedCompilationId ? { managedCompilationId } : {}),
          initialDurationMs,
          projectRoot: r.project,
          gitExecutable: r.git.executable,
          adapter: r.adapter,
          provider: provider(strong, slot.treatment === "whole" ? "pending" : "refused"),
          ...(slot.treatment === "routed"
            ? {
                routing,
                resolveProvider: (configuration) => ({
                  success: true as const,
                  data: provider(configuration, "refused"),
                }),
              }
            : {}),
          verification: {
            policy: verificationPolicy,
            adapter: r.verifier,
            runProcess: async (request) => {
              processCalls++;
              return createDefaultProcessRunner()(request);
            },
          },
          allowProviderUsage: true,
          maxOutputTokens: 256,
          timeoutMs: 1000,
          allowRepair: true,
        });
        if (outcome.success || outcome.runId === null)
          throw new Error(
            outcome.success
              ? "Unexpected managed acceptance"
              : `${outcome.error.code}: ${outcome.error.message}`,
          );
        const evidence = checked(
          await inspectTaskBenchmarkRun({ plan, policy, runId: outcome.runId, adapter: r.adapter }),
        );
        ledgerEvidence.push(evidence);
        const evaluator = checked(
          await createCandidateEvaluationSession({
            manifest: f,
            projectRoot: r.project,
            recordFinalEvidence: async (record) => {
              evaluations.push(record);
            },
          }),
        );
        const final = checked(
          await evaluator.finish({
            expectedRevision: checked(await evaluator.snapshot()).revision,
            terminalReason: "limit_reached",
          }),
        );
        if (final.passed) throw new Error("Seed must fail independent acceptance");
        const record = evaluations.at(-1)!;
        if (checked(await r.adapter.snapshot()).revision !== r.snapshot.revision)
          throw new Error("Project changed");
        return {
          fixtureId: f.fixtureId,
          fixtureRevision: f.fixtureRevision,
          block: slot.block,
          treatment: slot.treatment,
          order: slot.order,
          authorityHash: taskContentHash({ seedRevision: f.seedRevision, write: f.write }),
          resourceLimitsHash: taskContentHash(f.resourceLimits),
          setupMs: r.setupMs + (slot.treatment === "whole" ? 0 : roots.source!.setupMs),
          executionMs: elapsed(started),
          compilation: slot.compilation,
          requests: checked(projectTaskBenchmarkRunRequests(evidence)),
          attemptEvidenceHashes: evidence.attempts.map((a) => a.evidenceHash),
          outcome: "failed",
          failureCode: outcome.error.code,
          failureStage: "execution",
          finalEvidenceHash: final.evidenceHash,
          protectedInputsUnchanged: true,
          forbiddenEffects: 0,
          checks: [
            { checkId: "ts.typecheck", passed: record.typecheck, executedTests: null },
            {
              checkId: "compatibility",
              passed: record.compatibility?.passed ?? false,
              executedTests: record.compatibility?.results.length ?? null,
            },
          ],
          publicCriteria: [],
          publicTests: [
            ...(record.compatibility?.results ?? []),
            ...(record.publicAcceptance?.results ?? []),
          ],
          holdout: [...(record.holdout?.results ?? []), ...record.typeContract].map((t) => ({
            testId: t.testId,
            passed: t.passed,
          })),
        };
      },
    };
    let portFailure: unknown;
    const diagnose = async <T>(work: () => Promise<T>) => {
      try {
        return await work();
      } catch (error) {
        portFailure = error;
        throw error;
      }
    };
    const execution = checked(
      await executeTaskBenchmark({
        campaign: c,
        signal: controller.signal,
        ports: {
          ...ports,
          prepareBlock: (...args: Parameters<TaskBenchmarkExecutionPorts["prepareBlock"]>) =>
            diagnose(() => ports.prepareBlock(...args)),
          compile: (...args: Parameters<TaskBenchmarkExecutionPorts["compile"]>) =>
            diagnose(() => ports.compile(...args)),
          runTrial: (...args: Parameters<TaskBenchmarkExecutionPorts["runTrial"]>) =>
            diagnose(() => ports.runTrial(...args)),
        },
      }),
    );
    if (portFailure) throw portFailure;
    const audit = checked(await store.inspect());
    return {
      campaign: c,
      sourceSha,
      sourceDirty,
      driverElapsedMs: elapsed(driverStarted),
      execution,
      audit,
      ledgerEvidence,
      evaluations,
      inputs,
      projectRoots,
      ...host.counts(),
      processCalls,
      sourceCheckpoint,
      dispose: () => rm(parent, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(parent, { recursive: true, force: true });
    throw error;
  }
}
