import * as z from "zod";
import {
  taskArtifactRevisionSchema,
  taskConfigurationSchema,
  taskEffectiveConfigurationSchema,
  taskErrorCodeSchema,
  taskUsageSchema,
  taskVerificationSchema,
} from "./evidence-schema.js";
import {
  PHASE_RUN_STATES,
  TASK_STATES,
  taskAttemptIdSchema,
  taskCounterSchema,
  taskEnvelope,
  taskHashSchema,
  taskIdSchema,
  taskPathSchema,
  taskPositiveCounterSchema,
  taskProjectSchema,
  taskResourceLimitsSchema,
  taskRunIdSchema,
  taskStatementSchema,
  taskTimestampSchema,
} from "./primitives.js";

export const taskApplicationSchema = z
  .strictObject({
    status: z.enum(["not_applied", "applied", "partially_applied", "rejected"]),
    effects: z
      .array(
        z.strictObject({
          path: taskPathSchema,
          beforeHash: taskHashSchema.nullable(),
          afterHash: taskHashSchema,
          changeIndex: taskCounterSchema,
          sequence: taskPositiveCounterSchema,
        }),
      )
      .max(128),
    failureCode: taskErrorCodeSchema.nullable(),
    resultingProjectRevision: taskHashSchema.nullable(),
  })
  .refine(
    (application) =>
      application.status !== "partially_applied" ||
      (application.effects.length > 0 && application.failureCode !== null),
  );
export const executionAttemptSchema = z
  .strictObject({
    ...taskEnvelope("execution_attempt"),
    attemptId: taskAttemptIdSchema,
    runId: taskRunIdSchema,
    planId: taskHashSchema,
    taskId: taskIdSchema,
    attemptNumber: taskPositiveCounterSchema.refine((value) => value <= 3),
    contextId: taskHashSchema,
    inputRevision: taskHashSchema,
    routingId: taskHashSchema,
    requestedConfiguration: taskConfigurationSchema,
    effectiveConfiguration: taskEffectiveConfigurationSchema,
    startedAt: taskTimestampSchema,
    finishedAt: taskTimestampSchema.nullable(),
    status: z.enum([
      "prepared",
      "requesting",
      "proposal_received",
      "applying",
      "verifying",
      "accepted",
      "failed",
      "blocked",
      "needs_review",
      "cancelled",
      "interrupted",
    ]),
    proposalOutcome: z.enum([
      "pending",
      "change_set",
      "no_change",
      "refused",
      "incomplete",
      "invalid",
    ]),
    application: taskApplicationSchema,
    verification: taskVerificationSchema.nullable(),
    failure: z
      .strictObject({
        code: taskErrorCodeSchema,
        class: z.enum([
          "implementation",
          "missing_context",
          "stale_context",
          "output_incomplete",
          "infrastructure",
          "policy_violation",
          "ambiguity",
          "budget",
          "cancellation",
          "project_drift",
        ]),
        affectedTaskIds: z.array(taskIdSchema),
        affectedEvidenceIds: z.array(taskIdSchema),
        suggestedAction: taskStatementSchema,
      })
      .nullable(),
    usage: taskUsageSchema,
  })
  .refine(
    (attempt) =>
      attempt.attemptId === `${attempt.runId}/${attempt.taskId}/${attempt.attemptNumber}`,
  );

export const phaseRunSchema = z.strictObject({
  ...taskEnvelope("phase_run"),
  runId: taskRunIdSchema,
  stateRevision: taskPositiveCounterSchema,
  planId: taskHashSchema,
  project: taskProjectSchema.extend({
    latestProjectRevision: taskHashSchema,
    lastReconciledRevision: taskHashSchema,
  }),
  executionMode: z.enum(["handoff", "managed"]),
  supportQualification: z.strictObject({
    status: z.enum(["qualified", "unconfirmed", "unsupported"]),
    reasons: z.array(taskStatementSchema).max(128),
    profileRevision: taskPositiveCounterSchema,
  }),
  status: z.enum(PHASE_RUN_STATES),
  tasks: z
    .array(
      z.strictObject({
        taskId: taskIdSchema,
        status: z.enum(TASK_STATES),
        attemptIds: z.array(taskAttemptIdSchema).max(3),
        reasonCode: taskErrorCodeSchema.nullable(),
        acceptedVerificationId: taskHashSchema.nullable(),
      }),
    )
    .min(1)
    .max(96),
  attempts: z.array(executionAttemptSchema).max(288),
  resourceLimits: taskResourceLimitsSchema,
  resourceLedger: z.strictObject({
    reservations: z
      .array(
        z.strictObject({
          reservationId: taskIdSchema,
          attemptId: taskAttemptIdSchema.nullable(),
          calls: taskCounterSchema,
          inputTokens: taskCounterSchema,
          outputTokens: taskCounterSchema,
          costMicrousd: taskCounterSchema,
        }),
      )
      .max(10000),
    consumed: taskUsageSchema,
  }),
  acceptedArtifacts: z.array(taskArtifactRevisionSchema).max(512),
  activeAttemptId: taskAttemptIdSchema.nullable(),
  finalVerification: taskVerificationSchema.nullable(),
  events: z
    .array(
      z.strictObject({
        sequence: taskPositiveCounterSchema,
        previousStateRevision: taskCounterSchema,
        eventId: taskIdSchema,
        durationMs: taskCounterSchema,
        type: z.enum(["transition", "request", "effect", "verification", "reconciliation"]),
        metadata: z.strictObject({
          taskId: taskIdSchema.optional(),
          attemptId: taskAttemptIdSchema.optional(),
          code: taskErrorCodeSchema.optional(),
          revision: taskHashSchema.optional(),
        }),
      }),
    )
    .max(10000),
});
export type ExecutionAttempt = z.infer<typeof executionAttemptSchema>;
export type PhaseRun = z.infer<typeof phaseRunSchema>;
