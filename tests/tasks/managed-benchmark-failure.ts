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
  type TaskRunCheckpoint,
  type TaskPlan,
  type TaskBenchmarkExecutionPorts,
  type TaskBenchmarkRunEvidence,
  type TaskCompilationCheckpoint,
  type TaskParseResult,
} from "../../packages/core/dist/index.js";
import { createTaskBenchmarkStore } from "../../packages/cli/src/tasks/benchmark-store.js";
import { createTaskBenchmarkEvidenceStore } from "../../packages/cli/src/tasks/benchmark-evidence-store.js";
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
/** Bounded first-block diagnostic, never a complete comparative campaign. */
export async function runManagedBenchmarkBlock(
  options: {
    createHost?: (parent: string) => Promise<
      ReturnType<typeof createManagedBenchmarkFailureHost> & {
        disposeHost?: () => Promise<void>;
        onPlan?: (treatment: string, plan: TaskPlan) => void;
      }
    >;
    acceptedTreatment?: "fixed";
    maxOutputTokens?: number;
    runnerFiles?: string[];
    logicalVerificationRevision?: string;
  } = {},
) {
  const driverStarted = performance.now();
  const parent = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-managed-block-")));
  let disposeHost: (() => Promise<void>) | undefined;
  let host: ReturnType<typeof createManagedBenchmarkFailureHost> & {
    disposeHost?: () => Promise<void>;
    onPlan?: (treatment: string, plan: TaskPlan) => void;
  };
  try {
    host = options.createHost
      ? await options.createHost(parent)
      : createManagedBenchmarkFailureHost(parent);
  } catch (error) {
    await rm(parent, { recursive: true, force: true });
    throw error;
  }
  if ("disposeHost" in host) disposeHost = host.disposeHost;
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
    evaluations: FinalCandidateEvidence[] = [],
    acceptedCheckpoints: TaskRunCheckpoint[] = [];
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
        [
          "managed-benchmark-failure.ts",
          "managed-benchmark-host.ts",
          ...(options.runnerFiles ?? []),
        ].map(async (name) => ({
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
    const evidenceStore = checked(
      await createTaskBenchmarkEvidenceStore({ stateRoot, campaign: c }),
    );
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
            maxOutputTokens: options.maxOutputTokens ?? 256,
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
              logicalVerificationRevision: options.logicalVerificationRevision ?? HASH,
            }),
          );
          const replay = checked(
            await executeTaskBenchmarkReplay({
              sourceCheckpoint,
              decomposition,
              review: r.review,
              logicalVerificationRevision: options.logicalVerificationRevision ?? HASH,
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
        host.onPlan?.(slot.treatment, plan);
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
          maxOutputTokens: options.maxOutputTokens ?? 256,
          timeoutMs: 1000,
          allowRepair: true,
        });
        const expectedAcceptance = slot.treatment === options.acceptedTreatment;
        if (outcome.success !== expectedAcceptance || (!outcome.success && outcome.runId === null))
          throw new Error(
            outcome.success
              ? "Unexpected managed acceptance"
              : `${outcome.error.code}: ${outcome.error.message}`,
          );
        const runId = outcome.success ? outcome.checkpoint.run.runId : outcome.runId!;
        if (outcome.success) acceptedCheckpoints.push(outcome.checkpoint);
        const evidence = checked(
          await inspectTaskBenchmarkRun({ plan, policy, runId, adapter: r.adapter }),
        );
        ledgerEvidence.push(evidence);
        const evaluator = checked(
          await createCandidateEvaluationSession({
            manifest: f,
            projectRoot: r.project,
            recordFinalEvidence: async (record) => {
              const journal = checked(await store.inspect());
              checked(
                await evidenceStore.retain({
                  events: journal.events,
                  artifact: {
                    kind: "task_benchmark_final_evidence",
                    schemaVersion: 1,
                    campaignId: store.campaignId,
                    fixtureId: f.fixtureId,
                    block: slot.block,
                    treatment: slot.treatment,
                    record,
                    finalEvidenceHash: taskContentHash(record),
                  },
                }),
              );
              evaluations.push(record);
            },
          }),
        );
        const final = checked(
          await evaluator.finish({
            expectedRevision: checked(await evaluator.snapshot()).revision,
            terminalReason: expectedAcceptance ? "declared_complete" : "limit_reached",
          }),
        );
        if (final.passed !== expectedAcceptance)
          throw new Error("Independent acceptance differs from the reviewed diagnostic outcome");
        const record = evaluations.at(-1)!;
        const after = checked(await r.adapter.snapshot());
        if (!expectedAcceptance && after.revision !== r.snapshot.revision)
          throw new Error("Project changed");
        const owned = new Set(f.write);
        for (const file of f.write) {
          let directory = path.posix.dirname(file);
          while (directory !== ".") {
            owned.add(directory);
            directory = path.posix.dirname(directory);
          }
        }
        if (
          expectedAcceptance &&
          taskContentHash(after.entries.filter((e) => !owned.has(e.path))) !==
            taskContentHash(r.snapshot.entries.filter((e) => !owned.has(e.path)))
        )
          throw new Error("Protected project inputs changed");
        const checks = [{ checkId: "ts.typecheck", passed: record.typecheck, executedTests: null }];
        const acceptedChecks: {
          checkId: string;
          passed: boolean;
          executedTests: number | null;
          provenance: "executor" | "reviewer";
          reviewedCriteria?: number;
        }[] = [];
        if (outcome.success) {
          const run = outcome.checkpoint.run,
            finalVerification = run.finalVerification!;
          for (const check of finalVerification.checks) {
            if (check.provenance === "model_claim") throw new Error("Unauthenticated final check");
            acceptedChecks.push({
              checkId: check.checkId,
              passed: check.status === "pass",
              executedTests: check.executedTests,
              provenance: check.provenance,
              ...(check.provenance === "reviewer"
                ? {
                    reviewedCriteria: finalVerification.criterionCoverage.filter(
                      (r) => r.satisfied && r.checkIds.includes(check.checkId),
                    ).length,
                  }
                : {}),
            });
          }
          const reviewed = new Set<string>();
          for (const task of run.tasks) {
            const attempt = [...run.attempts].reverse().find((a) => a.taskId === task.taskId);
            const verification = attempt?.verification;
            if (
              task.status !== "accepted" ||
              !verification ||
              verification.outcome !== "pass" ||
              verification.checkedRevision !== finalVerification.checkedRevision ||
              !verification.checks.some(
                (c) =>
                  c.checkId === "task.acceptance" &&
                  c.status === "pass" &&
                  c.provenance === "reviewer",
              )
            )
              throw new Error("Final task review is absent or stale");
            for (const row of verification.criterionCoverage)
              if (row.satisfied && row.checkIds.includes("task.acceptance"))
                reviewed.add(row.criterionId);
          }
          acceptedChecks.push({
            checkId: "task.acceptance",
            passed: true,
            executedTests: null,
            provenance: "reviewer",
            reviewedCriteria: reviewed.size,
          });
        }
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
          outcome: outcome.success ? "accepted" : "failed",
          failureCode: outcome.success ? null : outcome.error.code,
          failureStage: outcome.success ? null : "execution",
          finalEvidenceHash: final.evidenceHash,
          protectedInputsUnchanged: true,
          forbiddenEffects: 0,
          checks: [
            ...(outcome.success ? acceptedChecks : checks),
            {
              checkId: "compatibility",
              passed: record.compatibility?.passed ?? false,
              executedTests: record.compatibility?.results.length ?? null,
            },
          ],
          publicCriteria: outcome.success
            ? f.requirements.map((requirement) => ({
                criterionId: requirement.requirementId,
                passed: outcome.checkpoint.run.finalVerification!.criterionCoverage.some(
                  (row) =>
                    row.criterionId === `${requirement.requirementId}-phase` && row.satisfied,
                ),
              }))
            : [],
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
    const retainedEvidence = checked(await evidenceStore.inspect(audit.events));
    return {
      campaign: c,
      sourceSha,
      sourceDirty,
      driverElapsedMs: elapsed(driverStarted),
      execution,
      audit,
      retainedEvidence,
      evidenceFolder: evidenceStore.folderPath,
      ledgerEvidence,
      evaluations,
      acceptedCheckpoints,
      inputs,
      projectRoots,
      ...host.counts(),
      processCalls,
      sourceCheckpoint,
      dispose: async () => {
        await disposeHost?.();
        await rm(parent, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await disposeHost?.();
    await rm(parent, { recursive: true, force: true });
    throw error;
  }
}
/** Real frozen bytes/Git/state/oracles, simulated provider and unreached E definitions. */
export const runManagedBenchmarkFailureBlock = () => runManagedBenchmarkBlock();
