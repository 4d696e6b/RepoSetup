import { freezeTaskValue } from "./canonical.js";
import { validateTaskBenchmarkRunEvidence } from "./benchmark-run-evidence.js";
import { validateTaskCompilationCheckpoint } from "./compilation-state.js";
import {
  taskBenchmarkCompilationSchema,
  taskBenchmarkRequestSchema,
  type TaskBenchmarkCompilation,
  type TaskBenchmarkRequest,
} from "./benchmark-report.js";
import { taskCounterSchema, TASK_DOCUMENT_LIMITS } from "./primitives.js";
import { taskContainsPrivateMaterial } from "./portable-input.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import type { TaskRunCheckpoint } from "./checkpoint.js";
import type { TaskCompilationCheckpoint } from "./compilation-state.js";
type TaskUsage = NonNullable<TaskCompilationCheckpoint["usage"]>;

const invalid = () =>
  taskFailure(
    "TASK_BENCHMARK_INVALID",
    "Actual benchmark request evidence is invalid or differs from its compilation source.",
  );
type Call = NonNullable<TaskRunCheckpoint["providerCalls"]>[number];
function project(
  input: Pick<
    Call,
    | "requestHash"
    | "requestedConfiguration"
    | "effectiveConfiguration"
    | "usage"
    | "reservation"
    | "requestFootprint"
  > & {
    status: TaskBenchmarkRequest["outcome"];
    purpose: TaskBenchmarkRequest["purpose"];
    sourceCheckpointHash: string;
  },
): TaskParseResult<TaskBenchmarkRequest> {
  const usage = input.usage;
  const measured = (value: TaskUsage["inputTokens"] | undefined) =>
    value?.provenance === "reported"
      ? { provenance: "reported" as const, value: value.value }
      : { provenance: "unknown" as const };
  const record = taskBenchmarkRequestSchema.safeParse({
    requestHash: input.requestHash,
    purpose: input.purpose,
    requested: input.requestedConfiguration,
    effective: input.effectiveConfiguration,
    outcome: input.status,
    durationMs: usage?.durationMs ?? null,
    priceRevision:
      input.requestFootprint?.priceCatalogRevision ?? usage?.priceCatalogRevision ?? null,
    contextBytes: input.requestFootprint?.inputDocumentBytes ?? null,
    // A reservation is a ceiling, not a token estimate or actual provider usage.
    estimatedInputTokens: null,
    inputTokens: measured(usage?.inputTokens),
    outputTokens: measured(usage?.outputTokens),
    cachedInputTokens: measured(usage?.cachedInputTokens),
    reasoningTokens: measured(usage?.reasoningTokens),
    calculatedCostMicrousd:
      usage?.costMicrousd.provenance === "estimated" ? usage.costMicrousd.value : null,
    chargedCostMicrousd: measured(usage?.costMicrousd),
    reservation: input.reservation,
    ledgerUsage: usage,
    sourceCheckpointHash: input.sourceCheckpointHash,
  });
  return record.success ? { success: true, data: freezeTaskValue(record.data) } : invalid();
}

/** Pure projection of all coding intents, not acceptance or imported execution authority.
 * Host/estimated token values remain in ledgerUsage and are never provider-reported measurements. */
export function projectTaskBenchmarkRunRequests(
  value: unknown,
): TaskParseResult<readonly TaskBenchmarkRequest[]> {
  const evidence = validateTaskBenchmarkRunEvidence(value);
  if (!evidence.success) return evidence;
  const requests: TaskBenchmarkRequest[] = [];
  for (const call of evidence.data.codingRequests) {
    const projected = project({
      ...call,
      purpose: call.purpose ?? "unknown",
      sourceCheckpointHash: evidence.data.checkpointHash,
    });
    if (!projected.success) return projected;
    requests.push(projected.data);
  }
  return { success: true, data: freezeTaskValue(requests) };
}

/** Original compilation only. Fresh-root analytical replay checkpoints must not become
 * second cash calls. Preserve pending/refused/invalid usage and the measured full host duration. */
export function projectTaskBenchmarkCompilation(input: {
  checkpoint: unknown;
  elapsedMs: number;
}): TaskParseResult<TaskBenchmarkCompilation> {
  const checked = validateTaskCompilationCheckpoint(input.checkpoint);
  if (!checked.success || !taskCounterSchema.safeParse(input.elapsedMs).success) return invalid();
  const c: TaskCompilationCheckpoint = checked.data;
  if (
    c.benchmarkReplay ||
    input.elapsedMs < (c.usage?.durationMs ?? 0) ||
    Buffer.byteLength(JSON.stringify(c)) > TASK_DOCUMENT_LIMITS.bytes ||
    taskContainsPrivateMaterial(c)
  )
    return invalid();
  const request = project({
    ...c,
    purpose: "compile",
    sourceCheckpointHash: c.checkpointHash,
    status: c.status,
  });
  if (!request.success) return request;
  const result = taskBenchmarkCompilationSchema.safeParse({
    compilationId: c.compilationId,
    outcome: c.status === "completed" ? "completed" : "failed",
    planId: c.plan?.planId ?? null,
    taskCount: c.plan?.tasks.length ?? 0,
    elapsedMs: input.elapsedMs,
    requests: [request.data],
  });
  return result.success ? { success: true, data: freezeTaskValue(result.data) } : invalid();
}
