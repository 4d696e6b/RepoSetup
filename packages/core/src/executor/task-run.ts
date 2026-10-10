import { applyTaskRunProposal } from "./task-run-application.js";
import { reconcileTaskRun } from "./task-run-recovery.js";
import { verifyTaskRunAttempt } from "./task-run-acceptance.js";
import { randomUUID } from "node:crypto";
import { validateTaskPlan, type TaskCompilationPolicy } from "../tasks/compile.js";
import { taskContentHash, freezeTaskValue } from "../tasks/canonical.js";
import { parseTaskDocument, taskFailure, type TaskParseResult } from "../tasks/parse.js";
import { prepareTaskContext } from "../tasks/context.js";
import {
  checkTaskAppliedContextFreshness,
  auditTaskApplication,
  checkTaskRunPostimages,
  taskOwnedWriteRevisions,
} from "../tasks/application.js";
import {
  sealTaskRunCheckpoint,
  validateTaskRunCheckpoint,
  type TaskRunCheckpoint,
} from "../tasks/checkpoint.js";
import { executionAttemptSchema } from "../tasks/run-schema.js";
import { taskResourceLimitsSchema, taskRunIdSchema } from "../tasks/primitives.js";
import type { TaskMaterializedContext } from "../tasks/context-types.js";
import { validateTaskVerificationPolicy } from "../tasks/verification-policy.js";
import type { TaskVerificationPolicy } from "../tasks/verification-policy.js";
import type { TaskErrorCode } from "../tasks/errors.js";
import type { ProcessRunner } from "./types.js";
import { executeTaskVerification, type TaskVerificationAdapter } from "./task-verification.js";
import type {
  TaskRunAdapter,
  TaskRunLease,
  TaskRunAcceptanceReceipt,
  TaskRunFailureReceipt,
} from "./task-run-types.js";
import { taskRunOperationSchema, type TaskRunOperation } from "./task-run-operation.js";
import type { TaskProviderAdapter } from "../tasks/provider.js";
import { requestTaskRunProposal } from "./task-run-provider.js";
import {
  routeTask,
  taskRemainingAllowance,
  validateTaskRoutingAuthority,
  taskRoutingAuthorityId,
  type TaskRoutingAuthority,
} from "../tasks/routing.js";
import { buildTaskRepairContext } from "../tasks/repair-context.js";
import { invalidateTaskConsumers } from "../tasks/invalidation.js";
import {
  validateTaskCompilationCheckpoint,
  taskCompilationAllowanceId,
} from "../tasks/compilation-state.js";

export type { TaskRunOperation } from "./task-run-operation.js";
export type TaskRunExecution =
  | { dryRun: true; operation: TaskRunOperation["type"]; writePaths: string[] }
  | { dryRun: false; checkpoint: TaskRunCheckpoint; packet?: TaskMaterializedContext };
const liveAccepted = new Map<string, Map<string, TaskRunAcceptanceReceipt>>();
const liveFailed = new Map<string, Map<string, TaskRunFailureReceipt>>();
const unknownUsage = () => ({
  inputTokens: { provenance: "unknown" as const },
  outputTokens: { provenance: "unknown" as const },
  reasoningTokens: { provenance: "unknown" as const },
  cachedInputTokens: { provenance: "unknown" as const },
  totalTokens: { provenance: "unknown" as const },
  costMicrousd: { provenance: "unknown" as const },
  providerCallId: null,
  durationMs: 0,
  priceCatalogRevision: null,
  reserved: { calls: 0, inputTokens: 0, outputTokens: 0, costMicrousd: 0 },
});

/** Executor-owned durable lifecycle. No imported acceptance, rollback or automatic retry. */
export async function executeTaskRun(input: {
  plan: unknown;
  compilationPolicy: TaskCompilationPolicy;
  operation: TaskRunOperation;
  adapter: TaskRunAdapter;
  provider?: TaskProviderAdapter;
  routing?: TaskRoutingAuthority;
  verification?: {
    policy: TaskVerificationPolicy;
    adapter: TaskVerificationAdapter;
    runProcess: ProcessRunner;
  };
  expectedStateRevision?: number;
  recoverLockToken?: string;
  dryRun?: boolean;
  signal?: AbortSignal;
}): Promise<TaskParseResult<TaskRunExecution>> {
  const validated = validateTaskPlan(input.plan, input.compilationPolicy);
  if (!validated.success) return validated;
  const plan = validated.data;
  const routing = input.routing ? validateTaskRoutingAuthority(input.routing) : null;
  if (routing && !routing.success) return routing;
  const routingAuthority = routing?.success ? routing.data : undefined;
  if (
    routingAuthority &&
    taskContentHash(routingAuthority.preferences.resourceLimits) !==
      taskContentHash(
        input.operation.type === "create"
          ? input.operation.resourceLimits
          : routingAuthority.preferences.resourceLimits,
      )
  )
    return taskFailure(
      "TASK_PREFERENCES_INVALID",
      "Routed run limits must match the reviewed preferences.",
    );
  if (input.verification) {
    const policy = validateTaskVerificationPolicy(input.verification.policy);
    if (!policy.success) return policy;
    if (policy.data.catalogRevision !== plan.checkCatalogRevision)
      return taskFailure(
        "TASK_CHECK_DEFINITION_CHANGED",
        "Run check catalog differs from the frozen plan.",
      );
  }
  const parsedOperation = taskRunOperationSchema.safeParse(input.operation);
  if (!parsedOperation.success)
    return taskFailure("TASK_RUN_STATE_INVALID", "Host operation is unknown or malformed.");
  const op = parsedOperation.data;
  if (
    plan.tasks.some((t) =>
      t.scope.write.some((p) => input.verification?.adapter.immutableProjectPaths?.includes(p)),
    )
  )
    return taskFailure(
      "TASK_SCOPE_VIOLATION",
      "Write authority overlaps independently qualified definitions or oracles.",
    );
  if (op.type !== "create" && !taskRunIdSchema.safeParse(op.runId).success)
    return taskFailure("TASK_RUN_STATE_INVALID", "Run identity is invalid.");
  const limits =
    op.type === "create" ? taskResourceLimitsSchema.safeParse(op.resourceLimits) : null;
  if (limits && !limits.success)
    return taskFailure("TASK_RUN_STATE_INVALID", "Resource ceilings are invalid.");
  if (op.type === "apply") {
    const proposal = parseTaskDocument(op.proposal);
    if (!proposal.success) return proposal;
    if (
      proposal.data.kind !== "change_set" ||
      proposal.data.planId !== plan.planId ||
      !proposal.data.attemptId.startsWith(`${op.runId}/`)
    )
      return taskFailure(
        "TASK_CHANGESET_INVALID",
        "Proposal is not a ChangeSet for this run and plan.",
      );
  }
  if (input.dryRun)
    return {
      success: true,
      data: freezeTaskValue({
        dryRun: true,
        operation: op.type,
        writePaths: plan.tasks.flatMap((t) => t.scope.write),
      }),
    };
  if (input.signal?.aborted)
    return taskFailure("TASK_EXECUTION_ABORTED", "Task operation was cancelled before effects.");
  const acquired = await input.adapter.acquire(input.recoverLockToken);
  if (!acquired.success) return acquired;
  const lease: TaskRunLease = acquired.data;
  const start = performance.now();
  let result: TaskParseResult<TaskRunExecution>;
  let budgetTimer: ReturnType<typeof setTimeout> | undefined;
  let operationSignal = input.signal;
  try {
    result = await run();
  } catch {
    result = taskFailure(
      "TASK_EXECUTION_INTERRUPTED",
      "Task operation stopped; inspect durable intents and retain observed effects.",
    );
  }
  clearTimeout(budgetTimer);
  try {
    const released = await lease.release();
    if (!released.success) return released;
  } catch {
    return taskFailure("TASK_EXECUTION_LOCKED", "Project lease could not be safely released.");
  }
  return result;

  async function run(): Promise<TaskParseResult<TaskRunExecution>> {
    const snapshot = await input.adapter.snapshot();
    if (!snapshot.success) return snapshot;
    if (snapshot.data.rootIdentity !== plan.project.rootIdentity)
      return taskFailure(
        "TASK_PROJECT_DRIFT",
        "Run project identity differs from the reviewed plan.",
      );
    let c: TaskRunCheckpoint;
    let durableRevision: number | null;
    if (op.type === "create") {
      if (
        op.expectedBaselineTreeHash !== undefined &&
        taskContentHash(snapshot.data.entries) !== op.expectedBaselineTreeHash
      )
        return taskFailure(
          "TASK_PROJECT_DRIFT",
          "Reviewed baseline changed before leased run creation.",
        );
      const runId = randomUUID();
      let compilation: TaskRunCheckpoint["compilation"];
      if (lease.loadCompilation) {
        const phaseCompilationId = taskCompilationAllowanceId({
          kind: "task_review",
          schemaVersion: 1,
          phase: plan.phase,
          project: plan.project,
          policy: input.compilationPolicy,
        });
        const retained = await lease.loadCompilation(phaseCompilationId);
        if (!retained.success) return retained;
        if (retained.data && op.managedCompilationId !== phaseCompilationId)
          return taskFailure(
            "TASK_NEEDS_REVIEW",
            "This phase has a retained compilation allowance; preserve its managed receipt identity instead of resetting or omitting it.",
          );
      }
      if (op.managedCompilationId !== undefined) {
        if (!lease.loadCompilation)
          return taskFailure(
            "TASK_PREREQUISITE_MISSING",
            "Compilation ledger is required for a managed receipt.",
          );
        const loaded = await lease.loadCompilation(op.managedCompilationId);
        if (!loaded.success) return loaded;
        const checked = validateTaskCompilationCheckpoint(loaded.data);
        if (!checked.success) return checked;
        if (
          checked.data.status !== "completed" ||
          checked.data.plan?.planId !== plan.planId ||
          checked.data.rootInstance !== input.adapter.rootInstance ||
          !checked.data.usage
        )
          return taskFailure(
            "TASK_NEEDS_REVIEW",
            "Managed compilation receipt lacks current completed private authority.",
          );
        const usage = checked.data.usage;
        const reserved = checked.data.reservation;
        if (
          reserved.calls > limits!.data!.maxProviderCalls ||
          reserved.inputTokens > limits!.data!.maxInputTokens ||
          reserved.outputTokens > limits!.data!.maxOutputTokens ||
          reserved.costMicrousd > limits!.data!.maxCostMicrousd ||
          usage.durationMs >= limits!.data!.maxWallTimeMs
        )
          return taskFailure(
            "TASK_BUDGET_EXHAUSTED",
            "Compilation already exceeds this phase allowance.",
          );
        compilation = {
          compilationId: checked.data.compilationId,
          reservation: reserved,
          usage,
          ...(checked.data.benchmarkReplay
            ? { benchmarkReplay: checked.data.benchmarkReplay }
            : {}),
        };
      }
      c = sealTaskRunCheckpoint({
        kind: "task_run_checkpoint",
        schemaVersion: 1,
        policyRevision: taskContentHash(input.compilationPolicy),
        phaseVerificationPending: false,
        rootInstance: input.adapter.rootInstance,
        ...(routingAuthority
          ? { routingAuthorityId: taskRoutingAuthorityId(routingAuthority) }
          : {}),
        ...(compilation ? { compilation } : {}),
        baselineSnapshot: snapshot.data,
        run: {
          kind: "phase_run",
          schemaVersion: 1,
          runId,
          stateRevision: 1,
          planId: plan.planId,
          project: {
            ...plan.project,
            latestProjectRevision: snapshot.data.revision,
            lastReconciledRevision: snapshot.data.revision,
          },
          executionMode: "handoff",
          supportQualification: {
            status: "unconfirmed",
            reasons: ["External host dispatch is advisory; no provider is invoked."],
            profileRevision: plan.supportProfileRevision,
          },
          status: "prepared",
          tasks: plan.tasks.map((t) => ({
            taskId: t.taskId,
            status: "queued",
            attemptIds: [],
            reasonCode: null,
            acceptedVerificationId: null,
          })),
          attempts: [],
          resourceLimits: limits!.data!,
          resourceLedger: {
            reservations: compilation
              ? [{ reservationId: "compilation", attemptId: null, ...compilation.reservation }]
              : [],
            consumed: compilation ? compilation.usage : unknownUsage(),
          },
          acceptedArtifacts: [],
          activeAttemptId: null,
          finalVerification: null,
          events: [],
        },
        bindings: [],
        journal: [],
      });
      const { checkpointHash: _initial, ...createdPayload } = c;
      void _initial;
      c = sealTaskRunCheckpoint({
        ...createdPayload,
        run: {
          ...c.run,
          resourceLedger: {
            ...c.run.resourceLedger,
            consumed: {
              ...c.run.resourceLedger.consumed,
              durationMs:
                c.run.resourceLedger.consumed.durationMs +
                (op.initialDurationMs ?? 0) +
                Math.max(0, Math.ceil(performance.now() - start)),
            },
          },
        },
      });
      if (c.run.resourceLedger.consumed.durationMs >= c.run.resourceLimits.maxWallTimeMs)
        return taskFailure(
          "TASK_BUDGET_EXHAUSTED",
          "Compilation and startup already exhaust the phase wall-time allowance.",
        );
      const saved = await lease.save(c, null);
      if (!saved.success) return saved;
      return { success: true, data: { dryRun: false, checkpoint: c } };
    }
    const loaded = await lease.load(op.runId);
    if (!loaded.success) return loaded;
    if (!loaded.data) return taskFailure("TASK_RUN_STATE_INVALID", "Run checkpoint is absent.");
    const checked = validateTaskRunCheckpoint(loaded.data);
    if (!checked.success) return checked;
    c = structuredClone(checked.data);
    durableRevision = c.run.stateRevision;
    if (
      c.routingAuthorityId !==
      (routingAuthority ? taskRoutingAuthorityId(routingAuthority) : undefined)
    )
      return taskFailure(
        "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
        "Routed state requires the identical trusted catalog, preferences and policy.",
      );
    if (c.rootInstance !== input.adapter.rootInstance)
      return taskFailure("TASK_PROJECT_DRIFT", "Physical project root changed since run creation.");
    if (
      c.run.planId !== plan.planId ||
      c.run.project.rootIdentity !== plan.project.rootIdentity ||
      c.policyRevision !== taskContentHash(input.compilationPolicy) ||
      JSON.stringify(c.run.tasks.map((t) => t.taskId).sort()) !==
        JSON.stringify(plan.tasks.map((t) => t.taskId).sort())
    )
      return taskFailure(
        "TASK_PLAN_REVISION_STALE",
        "Checkpoint does not match the reviewed plan/policy.",
      );
    if (
      input.expectedStateRevision !== undefined &&
      input.expectedStateRevision !== durableRevision
    )
      return taskFailure(
        "TASK_STATE_CONFLICT",
        "State revision differs from the caller's expected revision.",
      );
    if (c.run.status === "succeeded")
      return taskFailure(
        "TASK_STATE_CONFLICT",
        "Succeeded runs are immutable historical evidence.",
      );
    for (const b of c.bindings) {
      const task = plan.tasks.find((t) => t.taskId === b.context.taskId);
      if (
        !task ||
        taskContentHash([...b.writeTargets.map((t) => t.path)].sort()) !==
          taskContentHash([...task.scope.write].sort()) ||
        b.context.inputRevision !==
          taskContentHash({
            planId: plan.planId,
            taskId: task.taskId,
            requirements: plan.requirements.filter((r) =>
              task.requirementIds.includes(r.requirementId),
            ),
            sources: b.context.sources,
            rules: b.context.rules,
            writeTargets: b.writeTargets,
            artifacts: b.context.predecessorArtifacts,
          })
      )
        return taskFailure(
          "TASK_RUN_STATE_INVALID",
          "Original input/write binding differs from the reviewed plan.",
        );
      const refs = [
        { path: plan.phase.sourcePath, fileHash: plan.phase.sourceFileHash },
        ...plan.requirements
          .filter((r) => task.requirementIds.includes(r.requirementId))
          .flatMap((r) => r.sourceRefs),
      ];
      const attemptNumber = c.run.attempts.find((a) => a.attemptId === b.attemptId)!.attemptNumber;
      const owned = taskOwnedWriteRevisions(c, task.taskId, attemptNumber);
      if (
        refs.some(
          (ref) =>
            !b.context.sources.some(
              (s) =>
                s.path === ref.path &&
                (s.fileHash === ref.fileHash ||
                  (ref.path !== plan.phase.sourcePath &&
                    owned.some((p) => p.path === ref.path && p.fileHash === s.fileHash) &&
                    c.journal.some(
                      (e) =>
                        e.type === "file" &&
                        e.path === ref.path &&
                        e.status === "applied" &&
                        e.beforeHash === ref.fileHash &&
                        c.run.attempts.some(
                          (a) =>
                            a.attemptId === e.attemptId &&
                            a.taskId === task.taskId &&
                            a.attemptNumber < attemptNumber,
                        ),
                    ))) &&
                s.inclusionReasons.includes("requirement"),
            ),
        )
      )
        return taskFailure(
          "TASK_RUN_STATE_INVALID",
          "A required original phase/requirement input is missing.",
        );
    }
    if (
      op.type !== "reconcile" &&
      (c.phaseVerificationPending ||
        c.bindings.some((b) => b.verificationPending) ||
        c.providerCalls?.some((call) => call.status === "pending"))
    )
      return taskFailure(
        "TASK_EXECUTION_INTERRUPTED",
        "Unfinished verification requires explicit reconciliation before another operation.",
      );
    const budgetController = new AbortController();
    const remaining = c.run.resourceLimits.maxWallTimeMs - c.run.resourceLedger.consumed.durationMs;
    if (remaining > 0) {
      budgetTimer = setTimeout(() => budgetController.abort(), Math.min(remaining, 2147483647));
      budgetTimer.unref();
    } else budgetController.abort();
    operationSignal = input.signal
      ? AbortSignal.any([input.signal, budgetController.signal])
      : budgetController.signal;
    let accountedDuration = 0;
    const receipts = liveAccepted.get(c.run.runId) ?? new Map<string, TaskRunAcceptanceReceipt>();
    liveAccepted.set(c.run.runId, receipts);
    const failures = liveFailed.get(c.run.runId) ?? new Map<string, TaskRunFailureReceipt>();
    liveFailed.set(c.run.runId, failures);
    if (input.verification && op.type !== "reconcile") {
      const definitions = await input.verification.adapter.verifyDefinitions();
      if (!definitions.success) return definitions;
    }
    const save = async (
      type: "transition" | "effect" | "verification" | "reconciliation" | "request",
      taskId?: string,
      code?: TaskErrorCode,
    ): Promise<TaskParseResult<true>> => {
      const elapsed = Math.max(0, Math.ceil(performance.now() - start));
      c.run.resourceLedger.consumed.durationMs += Math.max(0, elapsed - accountedDuration);
      accountedDuration = elapsed;
      if (
        type === "verification" &&
        c.run.resourceLedger.consumed.durationMs > c.run.resourceLimits.maxWallTimeMs &&
        (c.run.status === "succeeded" ||
          (taskId && c.run.tasks.find((t) => t.taskId === taskId)?.status === "accepted"))
      )
        return taskFailure(
          "TASK_BUDGET_EXHAUSTED",
          "Observed elapsed work exceeds the finite phase allowance; acceptance is not committed.",
        );
      c.run.stateRevision = durableRevision! + 1;
      c.run.events.push({
        sequence: c.run.events.length + 1,
        previousStateRevision: durableRevision!,
        eventId: `event-${c.run.events.length + 1}`,
        durationMs: Math.max(0, Math.ceil(performance.now() - start)),
        type,
        metadata: {
          ...(taskId ? { taskId } : {}),
          ...(code ? { code } : {}),
          revision: c.run.project.latestProjectRevision,
        },
      });
      const { checkpointHash: _old, ...payload } = structuredClone(c);
      void _old;
      const sealed = sealTaskRunCheckpoint(payload);
      const valid = validateTaskRunCheckpoint(sealed);
      if (!valid.success) return valid;
      const stored = await lease.save(sealed, durableRevision);
      if (!stored.success) return stored;
      Object.assign(c, structuredClone(sealed));
      durableRevision = c.run.stateRevision;
      if (c.rootInstance !== input.adapter.rootInstance)
        return taskFailure(
          "TASK_PROJECT_DRIFT",
          "Physical project root changed since run creation.",
        );
      return { success: true, data: true };
    };
    const finish = (): TaskParseResult<TaskRunExecution> => {
      const { checkpointHash: _old, ...payload } = c;
      void _old;
      return { success: true, data: { dryRun: false, checkpoint: sealTaskRunCheckpoint(payload) } };
    };
    const invalidated = new Set<string>();
    const invalidate = (taskId: string) => {
      for (const id of invalidateTaskConsumers(plan, c.run, taskId)) {
        invalidated.add(id);
        receipts.delete(id);
      }
      const root = c.run.tasks.find((t) => t.taskId === taskId)!;
      root.status = "invalidated";
      root.reasonCode = "TASK_VERIFICATION_STALE";
    };
    const bindingCurrent = async (attemptId: string) => {
      const b = c.bindings.find((b) => b.attemptId === attemptId)!;
      for (const artifact of b.context.predecessorArtifacts) {
        const current = c.run.acceptedArtifacts.find(
          (a) =>
            a.artifactId === artifact.artifactId && a.producerTaskId === artifact.producerTaskId,
        );
        if (
          !current ||
          current.acceptanceRevision !== artifact.acceptanceRevision ||
          taskContentHash(current.paths) !== taskContentHash(artifact.paths)
        )
          return taskFailure(
            "TASK_VERIFICATION_STALE",
            "Accepted predecessor artifact revision changed.",
          );
      }
      return checkTaskAppliedContextFreshness(b, b.postimages, input.adapter.repository);
    };
    // Persist transitive invalidation rather than returning an old pass flag on drift.
    for (const t of c.run.tasks.filter((t) => t.status === "accepted")) {
      const a = c.run.attempts.find((a) => a.attemptId === t.attemptIds.at(-1))!;
      if (!(await bindingCurrent(a.attemptId)).success) invalidate(t.taskId);
    }
    if (invalidated.size) {
      c.run.status = "needs_review";
      const stored = await save("reconciliation", undefined, "TASK_VERIFICATION_STALE");
      return stored.success ? finish() : stored;
    }
    if (op.type !== "reconcile") {
      const postimages = await checkTaskRunPostimages(c.journal, input.adapter.repository);
      if (!postimages.success) return postimages;
      const recorded = c.journal.filter((e) => e.status === "applied");
      const audit = auditTaskApplication(
        c.baselineSnapshot,
        snapshot.data,
        recorded.filter((e) => e.type === "file").map((e) => e.path),
        recorded.filter((e) => e.type === "directory").map((e) => e.path),
      );
      if (!audit.success) {
        c.run.status = "needs_review";
        const stored = await save("reconciliation", undefined, "TASK_UNEXPECTED_CHANGES");
        return stored.success ? audit : stored;
      }
    }
    if (op.type === "reconcile") {
      const reconciled = await reconcileTaskRun({
        checkpoint: c,
        adapter: input.adapter,
        lease,
        bindingCurrent,
        reviewed: op.reviewed === true,
        save,
      });
      return reconciled.success ? finish() : reconciled;
    }
    if (op.type === "stop") {
      if (c.run.activeAttemptId !== null)
        return taskFailure(
          "TASK_STATE_CONFLICT",
          "An active attempt needs reconciliation before a terminal policy stop.",
        );
      const state = c.run.tasks.find((t) => t.taskId === op.taskId);
      if (!state || state.status === "accepted")
        return taskFailure("TASK_STATE_CONFLICT", "A policy stop cannot rewrite accepted work.");
      state.status = "blocked";
      state.reasonCode = op.code;
      for (const id of invalidateTaskConsumers(plan, c.run, op.taskId)) {
        receipts.delete(id);
        failures.delete(id);
      }
      c.run.status =
        op.code === "TASK_BUDGET_EXHAUSTED" || op.code === "TASK_ATTEMPT_LIMIT_EXCEEDED"
          ? "failed"
          : "blocked";
      const stopped = await save("transition", op.taskId, op.code);
      return stopped.success ? finish() : stopped;
    }
    if (c.run.resourceLedger.consumed.durationMs >= c.run.resourceLimits.maxWallTimeMs)
      return taskFailure("TASK_BUDGET_EXHAUSTED", "Run wall-time allowance is exhausted.");
    if (op.type === "begin" || op.type === "begin_routed") {
      if ((op.type === "begin_routed") !== Boolean(routingAuthority))
        return taskFailure(
          "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
          "Routed attempts require trusted routing authority and cannot use explicit overrides.",
        );
      const task = plan.tasks.find((t) => t.taskId === op.taskId);
      const state = c.run.tasks.find((t) => t.taskId === op.taskId);
      if (!task || !state) return taskFailure("TASK_REFERENCE_INVALID", "Attempt task is absent.");
      if (
        c.run.activeAttemptId !== null ||
        !["queued", "ready", "needs_repair", "blocked"].includes(state.status)
      )
        return taskFailure(
          "TASK_STATE_CONFLICT",
          "Run/task must be reconciled before opening another attempt.",
        );
      const predecessors = plan.dependencies.filter((e) => e.consumerTaskId === task.taskId);
      if (
        predecessors.some(
          (e) =>
            !c.run.tasks.some((t) => t.taskId === e.predecessorTaskId && t.status === "accepted") ||
            !receipts.has(e.predecessorTaskId) ||
            receipts.get(e.predecessorTaskId)?.verification.verificationId !==
              c.run.tasks.find((t) => t.taskId === e.predecessorTaskId)?.acceptedVerificationId ||
            receipts.get(e.predecessorTaskId)?.bindingHash !==
              taskContentHash(
                c.bindings.find(
                  (b) =>
                    b.attemptId ===
                    c.run.tasks.find((t) => t.taskId === e.predecessorTaskId)?.attemptIds.at(-1),
                ),
              ) ||
            receipts.get(e.predecessorTaskId)?.artifactHash !==
              taskContentHash(
                c.run.acceptedArtifacts.filter((a) => a.producerTaskId === e.predecessorTaskId),
              ),
        )
      )
        return taskFailure(
          "TASK_NEEDS_REVIEW",
          "Predecessors need current executor acceptance; persisted claims require fresh verification after restart.",
        );
      const attemptNumber = state.attemptIds.length + 1;
      if (attemptNumber > c.run.resourceLimits.maxImplementationAttemptsPerTask)
        return taskFailure(
          "TASK_ATTEMPT_LIMIT_EXCEEDED",
          "Implementation attempt ceiling is exhausted.",
        );
      const previous = c.run.attempts.find((a) => a.attemptId === state.attemptIds.at(-1));
      if (
        state.status === "needs_repair" &&
        (!previous ||
          failures.get(task.taskId)?.attemptHash !== taskContentHash(previous) ||
          failures.get(task.taskId)?.bindingHash !==
            taskContentHash(c.bindings.find((b) => b.attemptId === previous.attemptId)))
      )
        return taskFailure(
          "TASK_NEEDS_REVIEW",
          "Repair requires current executor failure evidence; restarted or imported claims need fresh verification.",
        );
      const packet = await prepareTaskContext({
        plan,
        policy: input.compilationPolicy,
        taskId: task.taskId,
        repository: input.adapter.repository,
        acceptedArtifacts: c.run.acceptedArtifacts,
        ownedWriteRevisions: taskOwnedWriteRevisions(c, task.taskId),
      });
      if (!packet.success) return packet;
      const decision =
        op.type === "begin_routed" && routingAuthority
          ? routeTask({
              ...routingAuthority,
              task,
              planId: plan.planId,
              context: packet.data.context,
              allowProviderUsage: true,
              now: new Date().toISOString(),
              maxOutputTokens: op.maxOutputTokens,
              remaining: taskRemainingAllowance(c.run),
              ...(state.status === "needs_repair" && previous
                ? {
                    repair: {
                      implementationFailures: c.run.attempts.filter(
                        (a) => a.taskId === task.taskId && a.failure?.class === "implementation",
                      ).length,
                      previousConfiguration: previous.requestedConfiguration,
                    },
                  }
                : {}),
            })
          : null;
      if (decision && !decision.success) return decision;
      const selected = decision?.success ? decision.data.selected : null;
      const configuration = selected
        ? {
            adapterId: selected.adapterId,
            providerId: selected.providerId,
            modelProfileId: selected.modelProfileId,
            nativeEffortId: selected.nativeEffortId,
          }
        : op.type === "begin"
          ? op.requestedConfiguration
          : null;
      const routingId = decision?.success
        ? decision.data.routingId
        : op.type === "begin"
          ? op.routingId
          : null;
      const attemptId = `${c.run.runId}/${task.taskId}/${attemptNumber}`;
      const repair =
        state.status === "needs_repair" && previous
          ? buildTaskRepairContext(previous, packet.data)
          : null;
      if (repair && !repair.success) return repair;
      const a = executionAttemptSchema.safeParse({
        kind: "execution_attempt",
        schemaVersion: 1,
        attemptId,
        runId: c.run.runId,
        planId: plan.planId,
        taskId: task.taskId,
        attemptNumber,
        contextId: packet.data.context.contextId,
        inputRevision: packet.data.context.inputRevision,
        routingId,
        requestedConfiguration: configuration,
        effectiveConfiguration: { provenance: "unknown" },
        startedAt: new Date().toISOString(),
        finishedAt: null,
        status: "prepared",
        proposalOutcome: "pending",
        application: {
          status: "not_applied",
          effects: [],
          failureCode: null,
          resultingProjectRevision: null,
        },
        verification: null,
        failure: null,
        usage: unknownUsage(),
      });
      if (!a.success)
        return taskFailure("TASK_RUN_STATE_INVALID", "Requested attempt metadata is invalid.");
      c.run.attempts.push(a.data);
      c.run.activeAttemptId = attemptId;
      c.run.status = "active";
      state.attemptIds.push(attemptId);
      state.status = "running";
      state.reasonCode = null;
      c.bindings.push({
        attemptId,
        verificationPending: false,
        context: packet.data.context,
        writeTargets: packet.data.writeTargets,
        postimages: [],
        beforeSnapshot: snapshot.data,
        ...(repair?.success ? { repair: repair.data } : {}),
        ...(decision?.success ? { routing: decision.data } : {}),
      });
      c.run.project.latestProjectRevision = snapshot.data.revision;
      const stored = await save("transition", task.taskId);
      if (!stored.success) return stored;
      const completed = finish();
      return completed.success && !completed.data.dryRun
        ? { success: true, data: { ...completed.data, packet: packet.data } }
        : completed;
    }
    if (op.type === "request") {
      if (!input.provider)
        return taskFailure("TASK_PROVIDER_UNAVAILABLE", "A trusted provider port is required.");
      const requested = await requestTaskRunProposal({
        checkpoint: c,
        plan,
        compilationPolicy: input.compilationPolicy,
        adapter: input.adapter,
        provider: input.provider,
        ...(routingAuthority ? { routing: routingAuthority } : {}),
        op,
        operationSignal,
        save,
        failures,
        bindingCurrent,
        apply: async (proposal) => {
          const current = await input.adapter.snapshot();
          if (!current.success) return current;
          return applyTaskRunProposal({
            checkpoint: c,
            plan,
            op: proposal,
            adapter: input.adapter,
            lease,
            bindingCurrent,
            operationSignal,
            snapshot: current.data,
            save,
          });
        },
      });
      return requested.success ? finish() : requested;
    }
    if (op.type === "apply" || op.type === "no_change") {
      const applied = await applyTaskRunProposal({
        checkpoint: c,
        plan,
        op,
        adapter: input.adapter,
        lease,
        bindingCurrent,
        operationSignal,
        snapshot: snapshot.data,
        save,
      });
      return applied.success ? finish() : applied;
    }
    if (!input.verification)
      return taskFailure("TASK_CHECK_BLOCKED", "Qualified verification ports are required.");
    const verify = (taskId: string) =>
      verifyTaskRunAttempt({
        checkpoint: c,
        plan,
        taskId,
        adapter: input.adapter,
        compilationPolicy: input.compilationPolicy,
        verification: input.verification!,
        bindingCurrent,
        operationSignal,
        receipts,
        failures,
        save,
      });
    if (op.type === "verify") {
      const verified = await verify(op.taskId);
      return verified.success ? finish() : verified;
    }
    if (c.run.activeAttemptId !== null || c.run.tasks.some((t) => t.status !== "accepted"))
      return taskFailure(
        "TASK_ACCEPTANCE_UNCOVERED",
        "Phase completion requires every task to be accepted.",
      );
    for (const taskId of plan.orderedTaskIds) {
      const verified = await verify(taskId);
      if (!verified.success) return verified;
      if (c.run.tasks.find((t) => t.taskId === taskId)!.status !== "accepted") return finish();
    }
    const current = await input.adapter.snapshot();
    if (!current.success) return current;
    const phaseInput = taskContentHash({ planId: plan.planId, artifacts: c.run.acceptedArtifacts });
    c.phaseVerificationPending = true;
    const phaseIntent = await save("transition");
    if (!phaseIntent.success) return phaseIntent;
    const phase = await executeTaskVerification({
      plan,
      compilationPolicy: input.compilationPolicy,
      ...input.verification,
      runId: c.run.runId,
      target: { type: "phase", phaseId: plan.phase.phaseId },
      inputRevision: phaseInput,
      expectedRevision: current.data.revision,
      acceptedTasks: [...receipts.values()].map((r) => r.verification),
      ...(operationSignal ? { signal: operationSignal } : {}),
    });
    if (!phase.success) return phase;
    if (phase.data.dryRun)
      return taskFailure("TASK_CHECK_BLOCKED", "A dry-run cannot finalize a run.");
    for (const task of c.run.tasks)
      if (!(await bindingCurrent(task.attemptIds.at(-1)!)).success)
        return taskFailure(
          "TASK_VERIFICATION_STALE",
          "Phase input changed during final acceptance.",
        );
    const finalSnapshot = await input.adapter.snapshot();
    if (
      !finalSnapshot.success ||
      finalSnapshot.data.revision !== phase.data.verification.checkedRevision ||
      operationSignal?.aborted
    )
      return taskFailure(
        "TASK_VERIFICATION_STALE",
        "Final acceptance changed or exceeded its allowance before the durable commit.",
      );
    c.run.finalVerification = phase.data.verification;
    c.phaseVerificationPending = false;
    c.run.status = phase.data.verification.outcome === "pass" ? "succeeded" : "needs_review";
    const stored = await save("verification");
    return stored.success ? finish() : stored;
  }
}
