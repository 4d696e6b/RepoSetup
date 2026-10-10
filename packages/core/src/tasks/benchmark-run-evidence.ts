import * as z from "zod";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { validateTaskPlan, type TaskCompilationPolicy } from "./compile.js";
import { taskRunCheckpointSchema, validateTaskRunCheckpoint } from "./checkpoint.js";
import {
  validateTaskCompilationCheckpoint,
  taskCompilationCheckpointSchema,
} from "./compilation-state.js";
import { taskFailure } from "./parse.js";
import { taskContainsPrivateMaterial } from "./portable-input.js";
import { executionAttemptSchema, phaseRunSchema } from "./run-schema.js";
import { taskHashSchema, taskRunIdSchema, TASK_DOCUMENT_LIMITS } from "./primitives.js";
import { taskVerifierSnapshotSchema } from "./verifier-files.js";

const compilationReceipt = taskCompilationCheckpointSchema.pick({
  compilationId: true,
  checkpointHash: true,
  rootInstance: true,
  requestHash: true,
  contextId: true,
  requestedConfiguration: true,
  effectiveConfiguration: true,
  reservation: true,
  usage: true,
  requestFootprint: true,
  benchmarkReplay: true,
});
export const taskBenchmarkRunEvidenceSchema = z.strictObject({
  kind: z.literal("task_benchmark_run_evidence"),
  schemaVersion: z.literal(1),
  recordHash: taskHashSchema,
  provenance: z.literal("durable_ledger_diagnostic"),
  qualificationEligible: z.literal(false),
  acceptanceAuthenticated: z.literal(false),
  runId: taskRunIdSchema,
  planId: taskHashSchema,
  checkpointHash: taskHashSchema,
  rootInstance: taskHashSchema,
  policyRevision: taskHashSchema,
  status: phaseRunSchema.shape.status,
  currentProjectRevision: taskHashSchema.nullable(),
  projectMatchesCheckpoint: z.boolean().nullable(),
  resourceLimits: phaseRunSchema.shape.resourceLimits,
  resourceLedger: phaseRunSchema.shape.resourceLedger,
  compilationCharge: taskRunCheckpointSchema.shape.compilation.unwrap().nullable(),
  compilationReceipt: compilationReceipt.nullable(),
  codingRequests: taskRunCheckpointSchema.shape.providerCalls.unwrap(),
  attempts: z
    .array(
      z.strictObject({
        attemptId: executionAttemptSchema.shape.attemptId,
        taskId: executionAttemptSchema.shape.taskId,
        status: executionAttemptSchema.shape.status,
        evidenceHash: taskHashSchema,
        failureCode: executionAttemptSchema.shape.failure.unwrap().shape.code.nullable(),
        verificationId: taskHashSchema.nullable(),
        application: executionAttemptSchema.shape.application,
      }),
    )
    .max(288),
  tasks: phaseRunSchema.shape.tasks,
  phaseVerificationPending: z.boolean(),
  finalVerificationId: taskHashSchema.nullable(),
});
export type TaskBenchmarkRunEvidence = z.infer<typeof taskBenchmarkRunEvidenceSchema>;
const invalid = () =>
  taskFailure(
    "TASK_BENCHMARK_INVALID",
    "Benchmark ledger evidence differs from the reviewed plan, private run or compilation charge.",
  );

/** Integrity/privacy only; the two false qualification/acceptance markers are mandatory. */
export function validateTaskBenchmarkRunEvidence(value: unknown) {
  const record = taskBenchmarkRunEvidenceSchema.safeParse(value);
  if (!record.success) return invalid();
  const { recordHash, ...payload } = record.data;
  if (
    recordHash !== taskContentHash(payload) ||
    Buffer.byteLength(JSON.stringify(record.data)) > TASK_DOCUMENT_LIMITS.bytes ||
    taskContainsPrivateMaterial(record.data)
  )
    return invalid();
  return { success: true as const, data: freezeTaskValue(record.data) };
}

/** Pure diagnostic extraction, including failures and pending reservations. Never fill
 * missing usage/footprints with zero, combine source charges with coding requests, or
 * promote a serialized verification into current-process acceptance. */
export function collectTaskBenchmarkRunEvidence(input: {
  plan: unknown;
  policy: TaskCompilationPolicy;
  checkpoint: unknown;
  compilationCheckpoint?: unknown;
  currentSnapshot?: unknown;
}) {
  const plan = validateTaskPlan(input.plan, input.policy),
    checked = validateTaskRunCheckpoint(input.checkpoint);
  if (!plan.success || !checked.success) return invalid();
  const c = checked.data;
  if (
    c.run.planId !== plan.data.planId ||
    c.policyRevision !== taskContentHash(input.policy) ||
    c.run.project.rootIdentity !== plan.data.project.rootIdentity ||
    c.run.project.baselineCommit !== plan.data.project.baselineCommit ||
    c.run.project.baselineTreeHash !== plan.data.project.baselineTreeHash ||
    taskContentHash(c.baselineSnapshot.entries) !== plan.data.project.baselineTreeHash
  )
    return invalid();
  let receipt: z.infer<typeof compilationReceipt> | null = null;
  if (input.compilationCheckpoint !== undefined) {
    const compilation = validateTaskCompilationCheckpoint(input.compilationCheckpoint);
    if (!compilation.success || !c.compilation) return invalid();
    const s = compilation.data;
    if (
      s.status !== "completed" ||
      s.compilationId !== c.compilation.compilationId ||
      s.rootInstance !== c.rootInstance ||
      s.plan?.planId !== c.run.planId ||
      taskContentHash(s.usage) !== taskContentHash(c.compilation.usage) ||
      taskContentHash(s.reservation) !== taskContentHash(c.compilation.reservation) ||
      taskContentHash(s.benchmarkReplay ?? null) !==
        taskContentHash(c.compilation.benchmarkReplay ?? null)
    )
      return invalid();
    receipt = compilationReceipt.strip().parse(s);
  }
  let currentProjectRevision: string | null = null;
  if (input.currentSnapshot !== undefined) {
    const snapshot = taskVerifierSnapshotSchema.safeParse(input.currentSnapshot);
    if (!snapshot.success || snapshot.data.rootIdentity !== c.run.project.rootIdentity)
      return invalid();
    currentProjectRevision = snapshot.data.revision;
  }
  const payload = {
    kind: "task_benchmark_run_evidence" as const,
    schemaVersion: 1 as const,
    provenance: "durable_ledger_diagnostic" as const,
    qualificationEligible: false as const,
    acceptanceAuthenticated: false as const,
    runId: c.run.runId,
    planId: c.run.planId,
    checkpointHash: c.checkpointHash,
    rootInstance: c.rootInstance,
    policyRevision: c.policyRevision,
    status: c.run.status,
    currentProjectRevision,
    projectMatchesCheckpoint:
      currentProjectRevision === null
        ? null
        : currentProjectRevision === c.run.project.latestProjectRevision,
    resourceLimits: c.run.resourceLimits,
    resourceLedger: c.run.resourceLedger,
    compilationCharge: c.compilation ?? null,
    compilationReceipt: receipt,
    codingRequests: c.providerCalls ?? [],
    attempts: c.run.attempts.map((attempt) => ({
      attemptId: attempt.attemptId,
      taskId: attempt.taskId,
      status: attempt.status,
      evidenceHash: taskContentHash(attempt),
      failureCode: attempt.failure?.code ?? null,
      verificationId: attempt.verification?.verificationId ?? null,
      application: attempt.application,
    })),
    tasks: c.run.tasks,
    phaseVerificationPending: c.phaseVerificationPending,
    finalVerificationId: c.run.finalVerification?.verificationId ?? null,
  };
  return validateTaskBenchmarkRunEvidence({
    ...payload,
    recordHash: taskContentHash(payload),
  });
}
