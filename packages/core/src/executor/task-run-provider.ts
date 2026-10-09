import { routeTask, taskRemainingAllowance, type TaskRoutingAuthority } from "../tasks/routing.js";
import { prepareTaskContext, checkTaskContextFreshness } from "../tasks/context.js";
import { taskContentHash } from "../tasks/canonical.js";
import { parseTaskDocument, taskFailure, type TaskParseResult } from "../tasks/parse.js";
import {
  taskPreparedProviderRequestSchema,
  taskProviderObservationSchema,
  type TaskProviderAdapter,
} from "../tasks/provider.js";
import type { TaskRunCheckpoint } from "../tasks/checkpoint.js";
import type { TaskPlan } from "../tasks/plan-schema.js";
import type { TaskCompilationPolicy } from "../tasks/compile.js";
import type { TaskRunAdapter, TaskRunSave, TaskRunFailureReceipt } from "./task-run-types.js";
import type { TaskErrorCode } from "../tasks/errors.js";
import type { TaskMaterializedContext } from "../tasks/context-types.js";
import type { ExecutionAttempt } from "../tasks/run-schema.js";
import { classifyTaskFailure, taskRepairAction } from "../tasks/failure.js";
import { buildTaskRepairContext } from "../tasks/repair-context.js";
import { taskOwnedWriteRevisions } from "../tasks/application.js";
import { invalidateTaskConsumers } from "../tasks/invalidation.js";
import { taskRequestFootprint } from "../tasks/request-footprint.js";

async function dispatchUntilAbort(
  provider: TaskProviderAdapter,
  request: Parameters<TaskProviderAdapter["dispatch"]>[0],
  signal?: AbortSignal,
): Promise<unknown> {
  if (signal?.aborted) throw new Error("cancelled");
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      provider.dispatch(request, signal),
      new Promise<never>((_resolve, reject) => {
        if (!signal) return;
        onAbort = () => reject(new Error("cancelled"));
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) onAbort();
      }),
    ]);
  } finally {
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

function aggregateUsage(
  calls: Pick<NonNullable<TaskRunCheckpoint["providerCalls"]>[number], "usage" | "reservation">[],
  durationMs: number,
): ExecutionAttempt["usage"] {
  const usages = calls.map((c) => c.usage);
  const sum = (
    key:
      | "inputTokens"
      | "outputTokens"
      | "totalTokens"
      | "reasoningTokens"
      | "cachedInputTokens"
      | "costMicrousd",
  ) => {
    const values = usages.map((u) => u?.[key]);
    if (!values.length || values.some((v) => !v || v.provenance === "unknown"))
      return { provenance: "unknown" as const };
    const value = values.reduce((total, v) => total + (v && "value" in v ? v.value : 0), 0);
    return {
      provenance: values.some((v) => v?.provenance === "estimated")
        ? ("estimated" as const)
        : ("reported" as const),
      value,
    };
  };
  return {
    inputTokens: sum("inputTokens"),
    outputTokens: sum("outputTokens"),
    totalTokens: sum("totalTokens"),
    reasoningTokens: sum("reasoningTokens"),
    cachedInputTokens: sum("cachedInputTokens"),
    costMicrousd: sum("costMicrousd"),
    providerCallId: usages.at(-1)?.providerCallId ?? null,
    durationMs,
    priceCatalogRevision: usages.at(-1)?.priceCatalogRevision ?? null,
    reserved: calls.reduce(
      (r, call) => ({
        calls: r.calls + 1,
        inputTokens: r.inputTokens + call.reservation.inputTokens,
        outputTokens: r.outputTokens + call.reservation.outputTokens,
        costMicrousd: r.costMicrousd + call.reservation.costMicrousd,
      }),
      { calls: 0, inputTokens: 0, outputTokens: 0, costMicrousd: 0 },
    ),
  };
}

/** Serial bounded dispatch under the existing executor lease. Every reservation is
 * durable before dispatch, and retained permanently; uncertain calls are never replayed. */
export async function requestTaskRunProposal(input: {
  checkpoint: TaskRunCheckpoint;
  plan: TaskPlan;
  compilationPolicy: TaskCompilationPolicy;
  adapter: TaskRunAdapter;
  provider: TaskProviderAdapter;
  routing?: TaskRoutingAuthority;
  op: {
    maxOutputTokens: number;
    timeoutMs: number;
    allowProviderUsage: true;
    allowRepair?: boolean | undefined;
  };
  operationSignal: AbortSignal | undefined;
  save: TaskRunSave;
  failures: Map<string, TaskRunFailureReceipt>;
  bindingCurrent(attemptId: string): Promise<TaskParseResult<true>>;
  apply(
    op: { type: "apply"; proposal: unknown } | { type: "no_change" },
  ): Promise<TaskParseResult<true>>;
}): Promise<TaskParseResult<true>> {
  const { checkpoint: c, plan, provider, save } = input;
  const opened = c.run.attempts.find((a) => a.attemptId === c.run.activeAttemptId);
  if (
    !opened ||
    opened.status !== "prepared" ||
    taskContentHash(opened.requestedConfiguration) !== taskContentHash(provider.configuration)
  )
    return taskFailure(
      "TASK_STATE_CONFLICT",
      "Managed dispatch requires one freshly prepared attempt with the reviewed provider configuration.",
    );
  if (
    (c.providerCalls ?? []).some(
      (call) =>
        call.status === "pending" ||
        call.usage?.inputTokens.provenance === "unknown" ||
        call.usage?.outputTokens.provenance === "unknown" ||
        call.usage?.costMicrousd.provenance === "unknown",
    )
  )
    return taskFailure(
      "TASK_NEEDS_REVIEW",
      "Prior provider usage is uncertain; no replay or allowance reset is permitted.",
    );
  const attemptId = opened.attemptId;
  const task = plan.tasks.find((t) => t.taskId === opened.taskId)!;
  const state = () => c.run.attempts.find((a) => a.attemptId === attemptId)!;
  const binding = () => c.bindings.find((b) => b.attemptId === attemptId)!;
  const stop = async (
    code: TaskErrorCode,
    outcome: ExecutionAttempt["proposalOutcome"] = "invalid",
  ) => {
    const a = state();
    a.status = code === "TASK_EXECUTION_ABORTED" ? "cancelled" : "needs_review";
    a.proposalOutcome = outcome;
    a.finishedAt = new Date().toISOString();
    a.failure = {
      code,
      class: classifyTaskFailure(code),
      affectedTaskIds: [a.taskId],
      affectedEvidenceIds: [],
      suggestedAction:
        "Review the retained call allowance and unchanged or journaled project effects before continuing.",
    };
    c.run.tasks.find((t) => t.taskId === a.taskId)!.status =
      a.status === "cancelled" ? "cancelled" : "needs_review";
    c.run.tasks.find((t) => t.taskId === a.taskId)!.reasonCode = code;
    c.run.status = a.status === "cancelled" ? "cancelled" : "needs_review";
    if (input.op.allowRepair && code === "TASK_OUTPUT_INCOMPLETE") {
      a.status = "failed";
      if (taskRepairAction(a) === "increase_output") {
        c.run.activeAttemptId = null;
        c.run.tasks.find((t) => t.taskId === a.taskId)!.status = "needs_repair";
        c.run.status = "blocked";
        if (a.attemptNumber >= c.run.resourceLimits.maxImplementationAttemptsPerTask) {
          c.run.tasks.find((t) => t.taskId === a.taskId)!.status = "blocked";
          c.run.tasks.find((t) => t.taskId === a.taskId)!.reasonCode =
            "TASK_ATTEMPT_LIMIT_EXCEEDED";
          c.run.status = "failed";
        }
      } else a.status = "needs_review";
    }
    invalidateTaskConsumers(plan, c.run, a.taskId);
    const stored = await save("transition", a.taskId, code);
    if (stored.success && input.op.allowRepair && taskRepairAction(state()) === "increase_output") {
      input.failures.set(a.taskId, {
        attemptHash: taskContentHash(state()),
        bindingHash: taskContentHash(binding()),
      });
      return { success: true as const, data: true as const };
    }
    return stored.success
      ? taskFailure(
          code,
          "Managed request stopped; inspect durable call metadata and retained project effects.",
        )
      : stored;
  };
  const initial = await prepareTaskContext({
    plan,
    policy: input.compilationPolicy,
    taskId: task.taskId,
    repository: input.adapter.repository,
    acceptedArtifacts: c.run.acceptedArtifacts,
    ownedWriteRevisions: taskOwnedWriteRevisions(c, task.taskId, opened.attemptNumber),
  });
  if (!initial.success) return initial;
  let packet: TaskMaterializedContext = initial.data;
  if (packet.context.contextId !== opened.contextId) return stop("TASK_CONTEXT_STALE");
  const requests: NonNullable<Parameters<typeof prepareTaskContext>[0]["requests"]> = [];
  for (let round = 0; round < 4; round++) {
    if (input.operationSignal?.aborted) return stop("TASK_EXECUTION_ABORTED");
    const fresh = await checkTaskContextFreshness(packet, input.adapter.repository);
    if (!fresh.success) return stop("TASK_CONTEXT_STALE");
    const current = await input.adapter.snapshot();
    if (!current.success || current.data.revision !== binding().beforeSnapshot.revision)
      return stop("TASK_PROJECT_DRIFT");
    if (binding().routing) {
      if (!input.routing) return stop("TASK_PROVIDER_CONFIGURATION_UNSUPPORTED");
      const previous = c.run.attempts.find(
        (a) => a.attemptId === binding().repair?.previousAttemptId,
      );
      const current = routeTask({
        ...input.routing,
        task,
        planId: plan.planId,
        context: packet.context,
        allowProviderUsage: true,
        now: new Date().toISOString(),
        maxOutputTokens: input.op.maxOutputTokens,
        remaining: taskRemainingAllowance(c.run),
        ...(previous
          ? {
              repair: {
                previousConfiguration: previous.requestedConfiguration,
                implementationFailures: c.run.attempts.filter(
                  (a) =>
                    a.taskId === task.taskId &&
                    a.attemptNumber < opened.attemptNumber &&
                    a.failure?.class === "implementation",
                ).length,
              },
            }
          : {}),
      });
      if (!current.success) return stop(current.error.code as TaskErrorCode);
      const selected = current.data.selected;
      if (
        binding().routing!.catalogRevision !== current.data.catalogRevision ||
        binding().routing!.policyRevision !== current.data.policyRevision ||
        taskContentHash(binding().routing!.selected) !== taskContentHash(selected)
      )
        return stop("TASK_PROVIDER_CONFIGURATION_UNSUPPORTED");
    }
    const inputDocument = {
      identity: {
        planId: plan.planId,
        taskId: task.taskId,
        attemptId,
        inputRevision: state().inputRevision,
      },
      task,
      requirements: plan.requirements.filter((r) => task.requirementIds.includes(r.requirementId)),
      context: packet,
      ...(binding().repair ? { repair: binding().repair } : {}),
    };
    const prepared = provider.prepare({
      purpose: "coding",
      document: inputDocument,
      maxOutputTokens: input.op.maxOutputTokens,
      timeoutMs: Math.min(
        input.op.timeoutMs,
        Math.max(1, c.run.resourceLimits.maxWallTimeMs - c.run.resourceLedger.consumed.durationMs),
      ),
    });
    if (!prepared.success) return stop(prepared.error.code as TaskErrorCode);
    // Validate without replacing the adapter-minted transient object used for dispatch.
    const valid = taskPreparedProviderRequestSchema.safeParse(prepared.data);
    if (
      !valid.success ||
      valid.data.purpose !== "coding" ||
      taskContentHash(valid.data.configuration) !== taskContentHash(state().requestedConfiguration)
    )
      return stop("TASK_PROVIDER_OUTPUT_INVALID");
    const r = prepared.data.reservation;
    if (binding().routing) {
      const selected = binding().routing!.selected;
      const profile = input.routing?.catalog.profiles.find(
        (p) => p.profileId === selected.modelProfileId,
      );
      if (
        !profile ||
        Date.now() < Date.parse(profile.reviewedAt) ||
        Date.now() >= Date.parse(profile.validUntil) ||
        r.outputTokens !== selected.maxOutputTokens ||
        r.inputTokens + r.outputTokens > selected.maxContextTokens ||
        prepared.data.priceCatalogRevision !== profile.price.catalogRevision ||
        r.costMicrousd <
          Math.ceil(
            r.inputTokens * profile.price.inputMicrousdPerToken +
              r.outputTokens * profile.price.outputMicrousdPerToken,
          )
      )
        return stop("TASK_PROVIDER_CONFIGURATION_UNSUPPORTED");
    }
    const held = c.run.resourceLedger.reservations;
    const ceilings = c.run.resourceLimits;
    for (const [key, limit] of [
      ["calls", ceilings.maxProviderCalls],
      ["inputTokens", ceilings.maxInputTokens],
      ["outputTokens", ceilings.maxOutputTokens],
      ["costMicrousd", ceilings.maxCostMicrousd],
    ] as const) {
      const total = held.reduce((n, reservation) => n + reservation[key], r[key]);
      if (!Number.isSafeInteger(total) || total > limit) return stop("TASK_BUDGET_EXHAUSTED");
    }
    c.providerCalls ??= [];
    const callId = `call-${c.providerCalls.length + 1}`;
    c.run.resourceLedger.reservations.push({ reservationId: callId, attemptId, ...r });
    c.providerCalls.push({
      callId,
      attemptId,
      requestHash: prepared.data.requestHash,
      contextId: state().contextId,
      inputRevision: state().inputRevision,
      requestedConfiguration: state().requestedConfiguration,
      effectiveConfiguration: { provenance: "unknown" },
      reservation: r,
      status: "pending",
      usage: null,
      requestFootprint: taskRequestFootprint(inputDocument, prepared.data),
    });
    state().status = "requesting";
    state().usage = aggregateUsage(
      c.providerCalls.filter((call) => call.attemptId === attemptId),
      state().usage.durationMs,
    );
    c.run.resourceLedger.consumed = aggregateUsage(
      c.compilation ? [c.compilation, ...c.providerCalls] : c.providerCalls,
      c.run.resourceLedger.consumed.durationMs,
    );
    c.run.executionMode = "managed";
    c.run.supportQualification.reasons = [
      "Local executor/check qualification is separate from live provider and model capability qualification.",
    ];
    const reserved = await save("request", task.taskId);
    if (!reserved.success) return reserved;
    let observed: unknown;
    try {
      observed = await dispatchUntilAbort(provider, prepared.data, input.operationSignal);
    } catch {
      return stop(
        input.operationSignal?.aborted ? "TASK_EXECUTION_ABORTED" : "TASK_PROVIDER_FAILED",
      );
    } // Pending intent stays uncertain, never replayed.
    const parsed = taskProviderObservationSchema.safeParse(observed);
    if (!parsed.success) return stop("TASK_PROVIDER_OUTPUT_INVALID");
    const call = c.providerCalls!.find((call) => call.callId === callId)!;
    call.status = parsed.data.outcome;
    call.usage = parsed.data.usage;
    call.effectiveConfiguration = parsed.data.effectiveConfiguration;
    state().effectiveConfiguration = parsed.data.effectiveConfiguration;
    const allCalls = c.providerCalls!;
    const attemptCalls = allCalls.filter((call) => call.attemptId === attemptId);
    state().usage = aggregateUsage(
      attemptCalls,
      attemptCalls.reduce((n, call) => n + (call.usage?.durationMs ?? 0), 0),
    );
    c.run.resourceLedger.consumed = aggregateUsage(
      c.compilation ? [c.compilation, ...allCalls] : allCalls,
      c.run.resourceLedger.consumed.durationMs,
    );
    state().status = "proposal_received";
    const received = await save("request", task.taskId);
    if (!received.success) return received;
    if (input.operationSignal?.aborted) return stop("TASK_EXECUTION_ABORTED");
    const usage = parsed.data.usage;
    for (const key of ["inputTokens", "outputTokens", "costMicrousd"] as const)
      if ("value" in usage[key] && usage[key].value > r[key]) return stop("TASK_BUDGET_EXHAUSTED");
    if (
      (binding().routing &&
        ["completed", "incomplete"].includes(parsed.data.outcome) &&
        parsed.data.effectiveConfiguration.provenance === "unknown") ||
      (parsed.data.effectiveConfiguration.provenance !== "unknown" &&
        taskContentHash(parsed.data.effectiveConfiguration.configuration) !==
          taskContentHash(state().requestedConfiguration))
    )
      return stop("TASK_PROVIDER_CONFIGURATION_UNSUPPORTED");
    if (parsed.data.outcome !== "completed") {
      const code =
        parsed.data.outcome === "refused"
          ? "TASK_PROVIDER_REFUSED"
          : parsed.data.outcome === "incomplete"
            ? "TASK_OUTPUT_INCOMPLETE"
            : parsed.data.outcome === "cancelled"
              ? "TASK_EXECUTION_ABORTED"
              : parsed.data.outcome === "invalid"
                ? "TASK_PROVIDER_OUTPUT_INVALID"
                : "TASK_PROVIDER_FAILED";
      return stop(
        code,
        parsed.data.outcome === "refused"
          ? "refused"
          : parsed.data.outcome === "incomplete"
            ? "incomplete"
            : "invalid",
      );
    }
    if (
      [usage.inputTokens, usage.outputTokens, usage.costMicrousd].some(
        (u) => u.provenance === "unknown",
      )
    )
      return stop("TASK_NEEDS_REVIEW");
    const document = parseTaskDocument(parsed.data.document);
    if (
      !document.success ||
      document.data.kind !== "task_provider_reply" ||
      document.data.planId !== plan.planId ||
      document.data.taskId !== task.taskId ||
      document.data.attemptId !== attemptId ||
      document.data.inputRevision !== state().inputRevision
    )
      return stop("TASK_PROVIDER_OUTPUT_INVALID");
    const reply = document.data.reply;
    if (reply.type === "context_request") {
      if (round === 3) return stop("TASK_CONTEXT_LIMIT_EXCEEDED");
      for (const reference of reply.references) requests.push(reference.source);
      if (
        requests.length > 128 ||
        new Set(requests.map((ref) => taskContentHash(ref))).size !== requests.length
      )
        return stop("TASK_CONTEXT_LIMIT_EXCEEDED");
      const expanded = await prepareTaskContext({
        plan,
        policy: input.compilationPolicy,
        taskId: task.taskId,
        repository: input.adapter.repository,
        requests,
        acceptedArtifacts: c.run.acceptedArtifacts,
        ownedWriteRevisions: taskOwnedWriteRevisions(c, task.taskId, opened.attemptNumber),
      });
      if (!expanded.success) return stop(expanded.error.code as TaskErrorCode);
      if (expanded.data.context.contextId === packet.context.contextId)
        return stop("TASK_CONTEXT_UNRESOLVED");
      packet = expanded.data;
      binding().context = packet.context;
      binding().writeTargets = packet.writeTargets;
      state().contextId = packet.context.contextId;
      state().inputRevision = packet.context.inputRevision;
      if (binding().repair) {
        const previous = c.run.attempts.find(
          (a) => a.attemptId === binding().repair!.previousAttemptId,
        )!;
        const repair = buildTaskRepairContext(previous, packet);
        if (!repair.success) return stop(repair.error.code as TaskErrorCode);
        binding().repair = repair.data;
      }
      if (binding().routing) {
        const { routingId: _old, ...payload } = binding().routing!;
        void _old;
        const updated = { ...payload, contextId: packet.context.contextId };
        binding().routing = { ...updated, routingId: taskContentHash(updated) };
        state().routingId = binding().routing!.routingId;
      }
      state().status = "prepared";
      const stored = await save("transition", task.taskId);
      if (!stored.success) return stored;
      continue;
    }
    if (!(await input.bindingCurrent(attemptId)).success) return stop("TASK_CONTEXT_STALE");
    const applied = await input.apply(
      reply.type === "change_set"
        ? { type: "apply", proposal: reply.changeSet }
        : { type: "no_change" },
    );
    return applied.success ? applied : stop(applied.error.code as TaskErrorCode);
  }
  return stop("TASK_CONTEXT_LIMIT_EXCEEDED");
}
