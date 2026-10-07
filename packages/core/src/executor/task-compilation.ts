import { prepareTaskCompilationContext } from "../tasks/compilation-context.js";
import { taskContentHash } from "../tasks/canonical.js";
import { taskFailure, parseTaskDocument, type TaskParseResult } from "../tasks/parse.js";
import { compileTaskPlan, validateTaskPlan } from "../tasks/compile.js";
import { taskReviewSchema, type TaskReview } from "../tasks/review-schema.js";
import { taskResourceLimitsSchema } from "../tasks/primitives.js";
import { taskContainsPrivateMaterial } from "../tasks/portable-input.js";
import {
  taskPreparedProviderRequestSchema,
  taskProviderObservationSchema,
  type TaskProviderAdapter,
} from "../tasks/provider.js";
import {
  sealTaskCompilationCheckpoint,
  validateTaskCompilationCheckpoint,
  taskCompilationAllowanceId,
  type TaskCompilationCheckpoint,
} from "../tasks/compilation-state.js";
import type { TaskRunAdapter } from "./task-run-types.js";

/** One durable, explicitly allowed decomposition call. Repeated identical approval is read-only,
 * never a second request. Unknown/interrupted calls remain retained review-owned state. */
export async function executeTaskCompilation(input: {
  review: TaskReview;
  adapter: TaskRunAdapter;
  provider: TaskProviderAdapter;
  resourceLimits: unknown;
  initialDurationMs?: number;
  maxOutputTokens: number;
  timeoutMs: number;
  expectedContextId: string;
  allowProviderUsage: boolean;
  dryRun?: boolean;
  signal?: AbortSignal;
}): Promise<
  TaskParseResult<{ dryRun: true } | { dryRun: false; checkpoint: TaskCompilationCheckpoint }>
> {
  const review = taskReviewSchema.safeParse(input.review);
  const limits = taskResourceLimitsSchema.safeParse(input.resourceLimits);
  if (!review.success || !limits.success)
    return taskFailure(
      "TASK_SELECTION_INVALID",
      "Reviewed compilation authority and finite limits are required.",
    );
  const initialDuration = input.initialDurationMs ?? 0;
  if (!Number.isSafeInteger(initialDuration) || initialDuration < 0)
    return taskFailure("TASK_PREFERENCES_INVALID", "Compilation startup duration is invalid.");
  if (input.dryRun) return { success: true, data: { dryRun: true } };
  if (initialDuration >= limits.data.maxWallTimeMs)
    return taskFailure(
      "TASK_BUDGET_EXHAUSTED",
      "Compilation startup exhausted the reviewed wall-time allowance.",
    );
  if (!input.allowProviderUsage)
    return taskFailure(
      "TASK_PROVIDER_ALLOWANCE_REQUIRED",
      "Compilation needs explicit provider usage allowance.",
    );
  if (input.signal?.aborted)
    return taskFailure("TASK_EXECUTION_ABORTED", "Compilation cancelled before state/calls.");
  const acquired = await input.adapter.acquire();
  if (!acquired.success) return acquired;
  const lease = acquired.data;
  const start = performance.now();
  let result: Awaited<ReturnType<typeof executeTaskCompilation>>;
  try {
    result = await execute();
  } catch {
    result = taskFailure(
      "TASK_EXECUTION_INTERRUPTED",
      "Compilation stopped; inspect retained intent before any new allowance.",
    );
  }
  const released = await lease.release();
  return released.success ? result : released;

  async function execute(): Promise<Awaited<ReturnType<typeof executeTaskCompilation>>> {
    if (!lease.loadCompilation || !lease.saveCompilation)
      return taskFailure(
        "TASK_PREREQUISITE_MISSING",
        "Private compilation ledger ports are required.",
      );
    const packet = await prepareTaskCompilationContext({
      review: review.data!,
      repository: input.adapter.repository,
    });
    if (!packet.success) return packet;
    if (packet.data.contextId !== input.expectedContextId)
      return taskFailure(
        "TASK_CONTEXT_STALE",
        "Compilation context differs from the approved preview.",
      );
    const prepared = input.provider.prepare({
      purpose: "decomposition",
      document: { review: review.data!, context: packet.data },
      maxOutputTokens: input.maxOutputTokens,
      timeoutMs: Math.min(input.timeoutMs, limits.data!.maxWallTimeMs),
    });
    if (!prepared.success) return prepared;
    const valid = taskPreparedProviderRequestSchema.safeParse(prepared.data);
    if (
      !valid.success ||
      valid.data.purpose !== "decomposition" ||
      taskContentHash(valid.data.configuration) !== taskContentHash(input.provider.configuration)
    )
      return taskFailure(
        "TASK_PROVIDER_OUTPUT_INVALID",
        "Prepared compilation request is invalid.",
      );
    const compilationId = taskCompilationAllowanceId(review.data!);
    const previous = await lease.loadCompilation(compilationId);
    if (!previous.success) return previous;
    if (previous.data) {
      const c = validateTaskCompilationCheckpoint(previous.data);
      if (!c.success) return c;
      if (
        c.data.rootInstance !== input.adapter.rootInstance ||
        c.data.reviewHash !== taskContentHash(review.data!) ||
        c.data.contextId !== packet.data.contextId
      )
        return taskFailure(
          "TASK_CONTEXT_STALE",
          "Retained compilation authority differs from this project/review.",
        );
      if (c.data.status !== "completed")
        return taskFailure(
          "TASK_NEEDS_REVIEW",
          "This compilation allowance already has a failed or uncertain call; no replay/reset is permitted.",
        );
      if (
        taskContentHash(c.data.requestedConfiguration) !==
        taskContentHash(input.provider.configuration)
      )
        return taskFailure(
          "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
          "A retained compilation uses a different configuration; its allowance cannot be reset.",
        );
      const plan = validateTaskPlan(c.data.plan, review.data!.policy);
      if (!plan.success) return plan;
      if (
        taskContentHash(plan.data.phase) !== taskContentHash(review.data!.phase) ||
        taskContentHash(plan.data.project) !== taskContentHash(review.data!.project)
      )
        return taskFailure(
          "TASK_PLAN_REVISION_STALE",
          "Retained compiled plan differs from the reviewed phase/project.",
        );
      return { success: true, data: { dryRun: false, checkpoint: c.data } };
    }
    const r = prepared.data.reservation,
      ceilings = limits.data!;
    if (
      r.calls > ceilings.maxProviderCalls ||
      r.inputTokens > ceilings.maxInputTokens ||
      r.outputTokens > ceilings.maxOutputTokens ||
      r.costMicrousd > ceilings.maxCostMicrousd
    )
      return taskFailure(
        "TASK_BUDGET_EXHAUSTED",
        "Compilation reservation exceeds the reviewed phase allowance.",
      );
    const snapshot = await input.adapter.snapshot();
    if (!snapshot.success) return snapshot;
    if (taskContentHash(snapshot.data.entries) !== review.data!.project.baselineTreeHash)
      return taskFailure(
        "TASK_PROJECT_DRIFT",
        "Compilation requires the reviewed complete baseline inventory.",
      );
    const fresh = await prepareTaskCompilationContext({
      review: review.data!,
      repository: input.adapter.repository,
    });
    if (!fresh.success) return fresh;
    if (fresh.data.contextId !== packet.data.contextId)
      return taskFailure("TASK_CONTEXT_STALE", "Compilation inputs changed before dispatch.");
    let c = sealTaskCompilationCheckpoint({
      kind: "task_compilation_checkpoint",
      schemaVersion: 1,
      compilationId,
      stateRevision: 1,
      reviewHash: taskContentHash(review.data!),
      rootInstance: input.adapter.rootInstance,
      contextId: packet.data.contextId,
      requestHash: prepared.data.requestHash,
      requestedConfiguration: prepared.data.configuration,
      effectiveConfiguration: { provenance: "unknown" },
      limits: ceilings,
      reservation: r,
      status: "pending",
      usage: null,
      plan: null,
    });
    const stored = await lease.saveCompilation(c, null);
    if (!stored.success) return stored;
    if (
      input.signal?.aborted ||
      performance.now() - start + initialDuration >= ceilings.maxWallTimeMs
    )
      return taskFailure(
        input.signal?.aborted ? "TASK_EXECUTION_ABORTED" : "TASK_BUDGET_EXHAUSTED",
        "Reserved compilation stopped before dispatch; intent remains review-owned.",
      );
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(
        1,
        Math.min(
          prepared.data.timeoutMs,
          ceilings.maxWallTimeMs - initialDuration - Math.ceil(performance.now() - start),
        ),
      ),
    );
    timer.unref();
    const signal = input.signal
      ? AbortSignal.any([controller.signal, input.signal])
      : controller.signal;
    let onAbort: (() => void) | undefined;
    let observed: unknown;
    try {
      observed = await Promise.race([
        input.provider.dispatch(prepared.data, signal),
        new Promise<never>((_resolve, reject) => {
          onAbort = () => reject(new Error("cancelled"));
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) onAbort();
        }),
      ]);
    } catch {
      return taskFailure(
        signal.aborted ? "TASK_EXECUTION_ABORTED" : "TASK_PROVIDER_FAILED",
        "Compilation call is uncertain; retained reservation cannot be replayed.",
      );
    } finally {
      clearTimeout(timer);
      if (onAbort) signal.removeEventListener("abort", onAbort);
    }
    const observation = taskProviderObservationSchema.safeParse(observed);
    if (!observation.success)
      return taskFailure(
        "TASK_PROVIDER_OUTPUT_INVALID",
        "Compilation call is uncertain; retained reservation requires review.",
      );
    const usage = {
      ...observation.data.usage,
      durationMs: initialDuration + Math.max(0, Math.ceil(performance.now() - start)),
    };
    const exceeded =
      usage.durationMs >= ceilings.maxWallTimeMs ||
      (["inputTokens", "outputTokens", "costMicrousd"] as const).some(
        (key) => "value" in usage[key] && usage[key].value > r[key],
      );
    const unknown = [usage.inputTokens, usage.outputTokens, usage.costMicrousd].some(
      (u) => u.provenance === "unknown",
    );
    let status: TaskCompilationCheckpoint["status"] =
      exceeded || unknown || signal.aborted ? "needs_review" : observation.data.outcome;
    let plan: TaskCompilationCheckpoint["plan"] = null;
    let error = taskFailure(
      "TASK_PROVIDER_OUTPUT_INVALID",
      "Compilation reply was invalid or unaccepted.",
    ).error;
    if (status === "completed") {
      const draft = parseTaskDocument(observation.data.document);
      const compiled =
        draft.success &&
        draft.data.kind === "task_plan_draft" &&
        !taskContainsPrivateMaterial(draft.data)
          ? compileTaskPlan({
              phase: review.data!.phase,
              project: review.data!.project,
              policy: review.data!.policy,
              draft: draft.data,
            })
          : taskFailure(
              "TASK_PROVIDER_OUTPUT_INVALID",
              "Compilation reply is not a safe structured draft.",
            );
      const after = await input.adapter.snapshot();
      const context = await prepareTaskCompilationContext({
        review: review.data!,
        repository: input.adapter.repository,
      });
      if (
        !after.success ||
        after.data.revision !== snapshot.data.revision ||
        !context.success ||
        context.data.contextId !== packet.data.contextId
      ) {
        status = "needs_review";
        error = taskFailure(
          "TASK_CONTEXT_STALE",
          "Compilation inputs changed during the call.",
        ).error;
      } else if (!compiled.success) {
        status = "invalid";
        error = compiled.error;
      } else plan = compiled.data;
    } else
      error = taskFailure(
        exceeded
          ? "TASK_BUDGET_EXHAUSTED"
          : signal.aborted || status === "cancelled"
            ? "TASK_EXECUTION_ABORTED"
            : unknown
              ? "TASK_NEEDS_REVIEW"
              : status === "refused"
                ? "TASK_PROVIDER_REFUSED"
                : status === "incomplete"
                  ? "TASK_OUTPUT_INCOMPLETE"
                  : status === "failed"
                    ? "TASK_PROVIDER_FAILED"
                    : "TASK_PROVIDER_OUTPUT_INVALID",
        "Compilation stopped; allowance and usage are retained in private state.",
      ).error;
    const { checkpointHash: _old, ...payload } = c;
    void _old;
    c = sealTaskCompilationCheckpoint({
      ...payload,
      stateRevision: 2,
      status,
      usage,
      effectiveConfiguration: observation.data.effectiveConfiguration,
      plan,
    });
    const saved = await lease.saveCompilation(c, 1);
    if (!saved.success) return saved;
    return status === "completed"
      ? { success: true, data: { dryRun: false, checkpoint: c } }
      : { success: false, error };
  }
}
