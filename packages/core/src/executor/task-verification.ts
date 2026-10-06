import { validateTaskPlan, type TaskCompilationPolicy } from "../tasks/compile.js";
import { freezeTaskValue } from "../tasks/canonical.js";
import { taskFailure, type TaskParseResult } from "../tasks/parse.js";
import { taskHashSchema, taskRunIdSchema, TASK_REQUIRED_CHECK_IDS } from "../tasks/primitives.js";
import { evaluateTaskVerification } from "../tasks/verification.js";
import {
  validateTaskVerificationPolicy,
  type TaskCheckObservation,
  type TaskVerificationPolicy,
} from "../tasks/verification-policy.js";
import {
  compareTaskVerifierSnapshots,
  type TaskVerifierSnapshot,
} from "../tasks/verifier-files.js";
import type { TaskVerificationResult } from "../tasks/evidence-schema.js";
import type { ProcessRunRequest, ProcessRunResult, ProcessRunner } from "./types.js";

export type TaskToolEvidence = Pick<
  TaskCheckObservation,
  "reportStatus" | "outputHash" | "testInventory"
>;
export type TaskReviewRequest = Readonly<{
  planId: string;
  runId: string;
  target: TaskVerificationResult["target"];
  checkId: "task.acceptance" | "phase.acceptance";
  definitionRevision: string;
  checkedRevision: string;
  inputRevision: string;
  criterionIds: readonly string[];
}>;
export type TaskReviewDecision = {
  request: TaskReviewRequest;
  approved: boolean;
  evidenceArtifactIds: string[];
};
/** Trusted host ports. These are not config, artifact import or model tool APIs. */
export interface TaskVerificationAdapter {
  snapshot(): Promise<TaskParseResult<TaskVerifierSnapshot>>;
  verifyDefinitions(): Promise<TaskParseResult<true>>;
  prepare(checkId: "ts.typecheck" | "ts.lint" | "ts.unit"): Promise<
    TaskParseResult<{
      request: Readonly<ProcessRunRequest>;
      readEvidence(result: ProcessRunResult): Promise<TaskParseResult<TaskToolEvidence>>;
      dispose(): Promise<TaskParseResult<true>>;
    }>
  >;
  review?(request: TaskReviewRequest): Promise<TaskReviewDecision | null>;
}
export type TaskVerificationExecution =
  { dryRun: true; checkIds: string[] } | { dryRun: false; verification: TaskVerificationResult };
const issued = new WeakSet<TaskVerificationResult>();

/** Only this executor invokes tool processes and allocates/disposes adapter scratch. No project rollback. */
export async function executeTaskVerification(input: {
  plan: unknown;
  compilationPolicy: TaskCompilationPolicy;
  policy: TaskVerificationPolicy;
  runId: string;
  target: TaskVerificationResult["target"];
  inputRevision: string;
  expectedRevision: string;
  adapter: TaskVerificationAdapter;
  runProcess: ProcessRunner;
  acceptedTasks?: readonly TaskVerificationResult[];
  signal?: AbortSignal;
  dryRun?: boolean;
}): Promise<TaskParseResult<TaskVerificationExecution>> {
  input = { ...input };
  const plan = validateTaskPlan(input.plan, input.compilationPolicy);
  if (!plan.success) return plan;
  const policy = validateTaskVerificationPolicy(input.policy);
  if (!policy.success) return policy;
  if (
    !taskRunIdSchema.safeParse(input.runId).success ||
    !taskHashSchema.safeParse(input.inputRevision).success ||
    !taskHashSchema.safeParse(input.expectedRevision).success
  )
    return taskFailure("TASK_CHECK_BLOCKED", "Verification identities are invalid.");
  if (plan.data.checkCatalogRevision !== policy.data.catalogRevision)
    return taskFailure(
      "TASK_CHECK_DEFINITION_CHANGED",
      "Verification catalog differs from the plan.",
    );
  const target = structuredClone(input.target);
  const task =
    target.type === "task" ? plan.data.tasks.find((t) => t.taskId === target.taskId) : undefined;
  if (
    (target.type === "task" && !task) ||
    (target.type === "phase" && target.phaseId !== plan.data.phase.phaseId)
  )
    return taskFailure("TASK_REFERENCE_INVALID", "Verification target is absent.");
  const checkIds = [
    ...new Set([
      ...TASK_REQUIRED_CHECK_IDS.filter((id) => id !== "task.acceptance"),
      ...(task?.requiredCheckIds ?? []),
      ...(task?.criteria.flatMap((c) => c.checkIds) ??
        plan.data.phaseCriteria.map((c) => c.checkId)),
      target.type === "task" ? "task.acceptance" : "phase.acceptance",
    ]),
  ].sort();
  if (checkIds.some((id) => !policy.data.definitions.some((d) => d.checkId === id)))
    return taskFailure("TASK_CHECK_BLOCKED", "A required reviewed check definition is missing.");
  if (input.dryRun) return { success: true, data: freezeTaskValue({ dryRun: true, checkIds }) };
  // Serialized pass records, even correctly hashed, are not executor receipts.
  if (
    target.type === "phase" &&
    plan.data.tasks.some(
      (t) =>
        !(input.acceptedTasks ?? []).some(
          (v) =>
            issued.has(v) &&
            v.outcome === "pass" &&
            v.planId === plan.data.planId &&
            v.runId === input.runId &&
            v.target.type === "task" &&
            v.target.taskId === t.taskId &&
            v.checkedRevision === input.expectedRevision,
        ),
    )
  )
    return taskFailure(
      "TASK_ACCEPTANCE_UNCOVERED",
      "Final phase verification requires current executor-issued task evidence.",
    );
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const observations: TaskCheckObservation[] = [];
  let before: TaskVerifierSnapshot;
  let after: TaskVerifierSnapshot;
  let immutableInputsConfirmed = true;
  let complete = true;
  const changes = new Set<string>();
  try {
    const definitions = await input.adapter.verifyDefinitions();
    if (!definitions.success) return definitions;
    const snapshot = await input.adapter.snapshot();
    if (!snapshot.success) return snapshot;
    const identity = compareTaskVerifierSnapshots(snapshot.data, snapshot.data);
    if (!identity.success) return identity;
    if (
      snapshot.data.rootIdentity !== plan.data.project.rootIdentity ||
      snapshot.data.revision !== input.expectedRevision
    )
      return taskFailure(
        "TASK_PROJECT_DRIFT",
        "Verification project or expected revision changed.",
      );
    before = freezeTaskValue(structuredClone(snapshot.data));
    after = before;
    const audit = async () => {
      const current = await input.adapter.snapshot();
      if (!current.success) {
        complete = false;
        return false;
      }
      const comparison = compareTaskVerifierSnapshots(before, current.data);
      after = freezeTaskValue(structuredClone(current.data));
      if (!comparison.success) {
        complete = false;
        return false;
      }
      for (const p of comparison.data.unexpectedChanges) changes.add(p);
      const definition = await input.adapter.verifyDefinitions();
      immutableInputsConfirmed &&= definition.success;
      return comparison.data.unchanged && definition.success;
    };
    // Tool order is fixed and sequential. Acceptance always follows the mandatory tools.
    for (const checkId of ["ts.typecheck", "ts.lint", "ts.unit"] as const) {
      if (input.signal?.aborted || !(await audit())) {
        complete = false;
        break;
      }
      const definition = policy.data.definitions.find((d) => d.checkId === checkId)!;
      const observed: TaskCheckObservation = {
        checkId,
        definitionRevision: definition.definitionRevision,
        checkedRevision: before.revision,
        provenance: "executor",
        disposition: "unavailable",
        reportStatus: "incomplete",
        exitCode: null,
        timedOut: false,
        truncated: false,
        durationMs: 0,
        outputHash: null,
        evidenceArtifactIds: [],
        testInventory: null,
      };
      observations.push(observed);
      const prepared = await input.adapter.prepare(checkId);
      if (!prepared.success) break;
      const checkStarted = performance.now();
      try {
        // Never inherit environment or expose raw output callbacks through this boundary.
        const request = prepared.data.request;
        if (
          !request.env ||
          !Number.isSafeInteger(request.timeoutMs) ||
          request.timeoutMs! < 1 ||
          request.timeoutMs! > 120000
        )
          throw new Error("unqualified process request");
        const executed = await input.runProcess({
          command: request.command,
          args: [...request.args],
          cwd: request.cwd,
          env: { ...request.env },
          timeoutMs: request.timeoutMs!,
          ...(request.terminationGraceMs === undefined
            ? {}
            : { terminationGraceMs: request.terminationGraceMs }),
          ...(input.signal === undefined ? {} : { signal: input.signal }),
        });
        observed.durationMs = Math.max(0, Math.ceil(performance.now() - checkStarted));
        observed.exitCode = executed.exitCode;
        observed.disposition = executed.notFound
          ? "unavailable"
          : executed.aborted
            ? "interrupted"
            : "completed";
        observed.timedOut = executed.timedOut === true;
        observed.truncated = executed.outputTruncated === true;
        const evidence = await prepared.data.readEvidence(executed);
        if (evidence.success) {
          observed.reportStatus = evidence.data.reportStatus;
          observed.outputHash = evidence.data.outputHash;
          observed.testInventory = evidence.data.testInventory;
          if (observed.reportStatus === "valid")
            observed.evidenceArtifactIds = [...definition.evidenceArtifactIds];
        }
      } catch {
        observed.disposition = "interrupted";
      } finally {
        try {
          if (!(await prepared.data.dispose()).success) complete = false;
        } catch {
          complete = false;
        }
      }
      if (
        !(await audit()) ||
        !complete ||
        observed.reportStatus !== "valid" ||
        observed.exitCode !== 0 ||
        observed.timedOut ||
        observed.truncated ||
        observed.disposition !== "completed"
      )
        break;
    }
    const preliminary = evaluateTaskVerification({
      plan: plan.data,
      runId: input.runId,
      target,
      inputRevision: input.inputRevision,
      policy: policy.data,
      observations,
      audit: {
        beforeRevision: before.revision,
        afterRevision: after.revision,
        currentRevision: after.revision,
        immutableInputsConfirmed,
        complete,
        unexpectedChanges: [...changes],
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Math.max(0, Math.ceil(performance.now() - started)),
      },
    });
    const toolsValid =
      preliminary.success &&
      preliminary.data.checks
        .filter((c) => c.checkId.startsWith("ts."))
        .every((c) => c.status === "pass");
    const toolsPassed =
      toolsValid &&
      observations.length === 3 &&
      observations.every(
        (o) =>
          o.reportStatus === "valid" &&
          o.exitCode === 0 &&
          o.disposition === "completed" &&
          !o.timedOut &&
          !o.truncated,
      );
    if (
      toolsPassed &&
      complete &&
      immutableInputsConfirmed &&
      changes.size === 0 &&
      (await audit()) &&
      !input.signal?.aborted
    ) {
      for (const checkId of checkIds.filter(
        (id) => id === "task.acceptance" || id === "phase.acceptance",
      )) {
        const definition = policy.data.definitions.find((d) => d.checkId === checkId)!;
        if (definition.authority !== "reviewer" || !input.adapter.review) continue;
        const request: TaskReviewRequest = freezeTaskValue({
          planId: plan.data.planId,
          runId: input.runId,
          target,
          checkId: checkId as TaskReviewRequest["checkId"],
          definitionRevision: definition.definitionRevision,
          checkedRevision: before.revision,
          inputRevision: input.inputRevision,
          criterionIds: [...definition.criterionIds],
        });
        const decision = await input.adapter.review(request);
        if (!decision) continue;
        // The host must answer this exact request; stale or imported claims cannot be rebound.
        if (decision.request !== request) {
          complete = false;
          break;
        }
        observations.push({
          checkId: request.checkId,
          definitionRevision: definition.definitionRevision,
          checkedRevision: before.revision,
          provenance: "reviewer",
          disposition: "completed",
          reportStatus: "valid",
          exitCode: decision.approved ? 0 : 1,
          timedOut: false,
          truncated: false,
          durationMs: 0,
          outputHash: before.revision,
          evidenceArtifactIds: decision.evidenceArtifactIds,
          testInventory: null,
        });
      }
    }
    await audit();
    if (input.signal?.aborted) complete = false;
    const evaluated = evaluateTaskVerification({
      plan: plan.data,
      runId: input.runId,
      target,
      inputRevision: input.inputRevision,
      policy: policy.data,
      observations,
      audit: {
        beforeRevision: before.revision,
        afterRevision: after.revision,
        currentRevision: after.revision,
        immutableInputsConfirmed,
        complete,
        unexpectedChanges: [...changes].sort(),
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Math.max(0, Math.ceil(performance.now() - started)),
      },
    });
    if (!evaluated.success) return evaluated;
    issued.add(evaluated.data);
    return {
      success: true,
      data: freezeTaskValue({ dryRun: false, verification: evaluated.data }),
    };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Trusted verification could not establish complete evidence.",
    );
  }
}
