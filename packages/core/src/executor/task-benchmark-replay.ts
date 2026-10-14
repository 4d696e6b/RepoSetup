import { taskContentHash } from "../tasks/canonical.js";
import {
  sealTaskCompilationCheckpoint,
  taskCompilationAllowanceId,
  validateTaskCompilationCheckpoint,
  type TaskCompilationCheckpoint,
} from "../tasks/compilation-state.js";
import {
  replayTaskBenchmarkDecomposition,
  validateTaskBenchmarkDecomposition,
  type TaskBenchmarkPlanBinding,
} from "../tasks/benchmark-decomposition.js";
import { taskFailure, type TaskParseResult } from "../tasks/parse.js";
import { taskReviewSchema } from "../tasks/review-schema.js";
import type { TaskRunAdapter } from "./task-run-types.js";
import { taskCompilationReplayClaims } from "./task-compilation-receipt.js";

type ReplayResult =
  | { dryRun: true; binding: TaskBenchmarkPlanBinding }
  | { dryRun: false; binding: TaskBenchmarkPlanBinding; checkpoint: TaskCompilationCheckpoint };
const invalid = () =>
  taskFailure(
    "TASK_BENCHMARK_INVALID",
    "Benchmark replay requires the original current-process compilation receipt and two distinct reviewed roots.",
  );

/** Retain the full source charge in a fresh trial's private compilation slot.
 * No provider call, project write or imported acceptance. The two analytical charges
 * retain the same source call identity; they must not be counted as two cash charges.
 * An interrupted intent requires review, never automatic completion/recovery. */
export async function executeTaskBenchmarkReplay(input: {
  sourceCheckpoint: unknown;
  decomposition: unknown;
  review: unknown;
  logicalVerificationRevision: string;
  treatment: "compiled_fixed" | "compiled_routed";
  adapter: TaskRunAdapter;
  dryRun?: boolean;
  signal?: AbortSignal;
}): Promise<TaskParseResult<ReplayResult>> {
  const started = performance.now();
  const source = validateTaskCompilationCheckpoint(input.sourceCheckpoint),
    frozen = validateTaskBenchmarkDecomposition(input.decomposition),
    review = taskReviewSchema.safeParse(input.review);
  if (!source.success || !frozen.success || !review.success) return invalid();
  const s = source.data;
  const decomposition = frozen.data;
  if (
    s.status !== "completed" ||
    !s.usage ||
    s.benchmarkReplay ||
    !["compiled_fixed", "compiled_routed"].includes(input.treatment) ||
    taskContentHash(s.plan) !== taskContentHash(decomposition.sourcePlan) ||
    s.reviewHash !==
      taskContentHash({
        kind: "task_review",
        schemaVersion: 1,
        phase: decomposition.sourcePlan.phase,
        project: decomposition.sourcePlan.project,
        policy: decomposition.sourcePolicy,
      }) ||
    review.data.project.rootIdentity === decomposition.sourcePlan.project.rootIdentity ||
    input.adapter.rootInstance === s.rootInstance
  )
    return invalid();
  const binding = replayTaskBenchmarkDecomposition(input);
  if (!binding.success) return binding;
  const planBinding = binding.data;
  if (input.dryRun) return { success: true, data: { dryRun: true, binding: planBinding } };
  const claims = taskCompilationReplayClaims(input.sourceCheckpoint as TaskCompilationCheckpoint);
  if (!claims) return invalid();
  const previousClaim = claims.get(input.treatment);
  if (
    (previousClaim && previousClaim.root !== input.adapter.rootInstance) ||
    [...claims].some(
      ([treatment, claim]) =>
        treatment !== input.treatment && claim.root === input.adapter.rootInstance,
    )
  )
    return invalid();
  if (input.signal?.aborted)
    return taskFailure("TASK_EXECUTION_ABORTED", "Replay cancelled before private state effects.");
  const claim = previousClaim ?? { root: input.adapter.rootInstance, attempted: false };
  claims.set(input.treatment, claim);
  const acquired = await input.adapter.acquire();
  if (!acquired.success) return acquired;
  const lease = acquired.data;
  let result: TaskParseResult<ReplayResult>;
  try {
    result = await retain();
  } catch {
    result = taskFailure(
      "TASK_EXECUTION_INTERRUPTED",
      "Replay stopped; retain its private intent for review.",
    );
  }
  try {
    const released = await lease.release();
    return released.success ? result : released;
  } catch {
    return taskFailure("TASK_EXECUTION_LOCKED", "Replay lease could not be safely released.");
  }

  async function retain(): Promise<TaskParseResult<ReplayResult>> {
    if (!lease.loadCompilation || !lease.saveCompilation)
      return taskFailure(
        "TASK_PREREQUISITE_MISSING",
        "Replay requires private compilation ledger ports.",
      );
    const snapshot = await input.adapter.snapshot();
    if (!snapshot.success) return snapshot;
    if (
      snapshot.data.rootIdentity !== review.data!.project.rootIdentity ||
      taskContentHash(snapshot.data.entries) !== review.data!.project.baselineTreeHash
    )
      return taskFailure(
        "TASK_PROJECT_DRIFT",
        "Fresh replay baseline differs from the independent review.",
      );
    const compilationId = taskCompilationAllowanceId(review.data!);
    const benchmarkReplay = {
      kind: "task_benchmark_compilation_replay" as const,
      schemaVersion: 1 as const,
      sourceCompilationId: s.compilationId,
      sourceCheckpointHash: s.checkpointHash,
      sourceRootInstance: s.rootInstance,
      sourcePlanId: decomposition.sourcePlan.planId,
      decompositionId: planBinding.decompositionId,
      bindingId: planBinding.bindingId,
      treatment: input.treatment,
      sourceUsage: s.usage!,
    };
    const loaded = await lease.loadCompilation(compilationId);
    if (!loaded.success) return loaded;
    if (loaded.data) {
      const checked = validateTaskCompilationCheckpoint(loaded.data);
      if (!checked.success) return checked;
      const c = checked.data;
      if (
        c.status !== "completed" ||
        c.rootInstance !== input.adapter.rootInstance ||
        c.reviewHash !== taskContentHash(review.data) ||
        !c.benchmarkReplay ||
        taskContentHash(c.benchmarkReplay) !== taskContentHash(benchmarkReplay) ||
        taskContentHash(c.plan) !== taskContentHash(planBinding.plan) ||
        taskContentHash(c.limits) !== taskContentHash(s.limits) ||
        taskContentHash(c.reservation) !== taskContentHash(s.reservation) ||
        c.contextId !== s.contextId ||
        c.requestHash !== s.requestHash ||
        taskContentHash(c.requestFootprint ?? null) !==
          taskContentHash(s.requestFootprint ?? null) ||
        taskContentHash(c.requestedConfiguration) !== taskContentHash(s.requestedConfiguration) ||
        taskContentHash(c.effectiveConfiguration) !== taskContentHash(s.effectiveConfiguration)
      )
        return taskFailure(
          "TASK_NEEDS_REVIEW",
          "Replay allowance contains different or uncertain private state; no reset is permitted.",
        );
      return { success: true, data: { dryRun: false, binding: planBinding, checkpoint: c } };
    }
    if (claim.attempted)
      return taskFailure(
        "TASK_NEEDS_REVIEW",
        "An attempted replay charge is absent; do not recreate or reset it.",
      );
    if (input.signal?.aborted)
      return taskFailure("TASK_EXECUTION_ABORTED", "Replay cancelled before intent retention.");
    const duration = () =>
      s.usage!.durationMs + Math.max(0, Math.ceil(performance.now() - started));
    if (duration() >= s.limits.maxWallTimeMs)
      return taskFailure(
        "TASK_BUDGET_EXHAUSTED",
        "Compilation and replay overhead exhaust this trial's wall allowance.",
      );
    const pending = sealTaskCompilationCheckpoint({
      kind: "task_compilation_checkpoint",
      schemaVersion: 1,
      compilationId,
      stateRevision: 1,
      rootInstance: input.adapter.rootInstance,
      reviewHash: taskContentHash(review.data),
      // These describe the original request, explicitly identified by benchmarkReplay.
      contextId: s.contextId,
      requestHash: s.requestHash,
      requestedConfiguration: s.requestedConfiguration,
      effectiveConfiguration: s.effectiveConfiguration,
      limits: s.limits,
      reservation: s.reservation,
      status: "pending",
      usage: null,
      plan: null,
      benchmarkReplay,
      ...(s.requestFootprint ? { requestFootprint: s.requestFootprint } : {}),
    });
    claim.attempted = true;
    const intent = await lease.saveCompilation(pending, null);
    if (!intent.success) return intent;
    const refreshed = await input.adapter.snapshot();
    if (!refreshed.success) return refreshed;
    if (taskContentHash(refreshed.data) !== taskContentHash(snapshot.data))
      return taskFailure(
        "TASK_PROJECT_DRIFT",
        "Replay baseline changed while retaining the charge.",
      );
    const elapsed = duration();
    if (input.signal?.aborted || elapsed >= s.limits.maxWallTimeMs)
      return taskFailure(
        input.signal?.aborted ? "TASK_EXECUTION_ABORTED" : "TASK_BUDGET_EXHAUSTED",
        "Replay stopped after retention; its intent requires review.",
      );
    const { checkpointHash: _pendingHash, ...payload } = pending;
    void _pendingHash;
    const completed = sealTaskCompilationCheckpoint({
      ...payload,
      stateRevision: 2,
      status: "completed",
      plan: planBinding.plan,
      usage: { ...s.usage!, durationMs: elapsed },
    });
    const saved = await lease.saveCompilation(completed, 1);
    if (!saved.success) return saved;
    return { success: true, data: { dryRun: false, binding: planBinding, checkpoint: completed } };
  }
}
