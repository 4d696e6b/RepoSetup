import * as z from "zod";
import {
  taskHashSchema,
  taskIdSchema,
  taskCounterSchema,
  taskPositiveCounterSchema,
  taskTimestampSchema,
} from "./primitives.js";

const probability = z.number().min(0).max(1);
const bound = z.strictObject({
  interpretation: z.enum(["deterministic_cap", "expected_upper", "predictive_upper"]),
  assumptionsHash: taskHashSchema,
});
export const taskRoutingEvaluationCandidateSchema = z.strictObject({
  configurationId: taskHashSchema,
  configuration: z.strictObject({
    modelProfileId: taskIdSchema,
    nativeEffortId: taskIdSchema,
    immutableModelRevision: taskIdSchema,
    promptRevision: taskHashSchema,
    maxInputTokens: taskPositiveCounterSchema,
    maxOutputTokens: taskPositiveCounterSchema.max(16384),
    timeoutMs: taskPositiveCounterSchema.max(120000),
  }),
  // Null denotes a missing terminal observation, never a successful omission.
  outcomes: z.array(z.boolean().nullable()).min(1).max(10000),
  cost: z
    .strictObject({
      expectedTotalMicrousd: taskCounterSchema,
      upperTotalMicrousd: taskCounterSchema,
      tariffRevision: taskHashSchema,
      accountingRevision: taskHashSchema,
      allAttemptsAndOverheadIncluded: z.boolean(),
      bound,
    })
    .nullable(),
  resources: z
    .array(
      z.strictObject({
        resourceId: taskIdSchema,
        unit: taskIdSchema,
        statistic: taskIdSchema,
        upper: z.number().nonnegative().finite(),
        bound,
      }),
    )
    .max(16),
});
/** Host-reviewed evidence only. Never accepted from plans, preferences or model replies. */
export const taskRoutingEvaluationSchema = z.strictObject({
  kind: z.literal("task_routing_evaluation"),
  schemaVersion: z.literal(1),
  evaluationId: taskHashSchema,
  catalogRevision: taskHashSchema,
  workflowRevision: taskHashSchema,
  taskHash: taskHashSchema,
  executionPreferencesHash: taskHashSchema,
  scope: z.enum(["offline", "live"]),
  reviewedAt: taskTimestampSchema,
  validUntil: taskTimestampSchema,
  protocolHash: taskHashSchema,
  populationHash: taskHashSchema,
  selectionCasesHash: taskHashSchema,
  heldOutCasesHash: taskHashSchema,
  sampling: z.enum(["independent_problem_trials", "unsupported_dependence"]),
  metric: z.literal("single_completion_test_pass"),
  caseIds: z.array(taskIdSchema).min(1).max(10000),
  referenceConfigurationId: taskHashSchema,
  // Selection-set winner frozen before any held-out confirmation.
  frozenSelectionConfigurationId: taskHashSchema.optional(),
  quality: z.strictObject({
    minimumPassRate: probability,
    maximumDegradation: probability,
    familyAlpha: z.number().min(0.000001).max(0.1),
  }),
  horizonRequests: taskPositiveCounterSchema.max(1000000000),
  horizonBudgetMicrousd: taskCounterSchema,
  resourceLimits: z
    .array(
      z.strictObject({
        resourceId: taskIdSchema,
        unit: taskIdSchema,
        statistic: taskIdSchema,
        limit: z.number().positive().finite(),
      }),
    )
    .max(16),
  // A configuration may not be selected using its held-out confirmation outcomes.
  candidates: z
    .array(
      taskRoutingEvaluationCandidateSchema.extend({
        confirmation: z.enum(["not_run", "passed", "failed"]),
        confirmationEvidenceHash: taskHashSchema.optional(),
      }),
    )
    .min(1)
    .max(128),
});
export type TaskRoutingEvaluation = z.infer<typeof taskRoutingEvaluationSchema>;

export const taskRoutingAssessmentSchema = z.strictObject({
  configurationId: taskHashSchema,
  modelProfileId: taskIdSchema,
  nativeEffortId: taskIdSchema,
  status: z.enum([
    "admissible",
    "insufficient_evidence",
    "quality_inconclusive",
    "operationally_rejected",
    "confirmation_rejected",
  ]),
  reasons: z
    .array(
      z.enum([
        "incomplete_observations",
        "unsupported_dependence",
        "missing_cost",
        "incomplete_cost",
        "missing_resource",
        "quality_floor_unproven",
        "degradation_unproven",
        "horizon_budget",
        "resource_limit",
        "confirmation_required",
        "confirmation_failed",
      ]),
    )
    .max(16),
  qualityLower: probability.optional(),
  degradationUpper: z.number().min(-1).max(1).optional(),
  expectedTotalMicrousd: taskCounterSchema.optional(),
  upperTotalMicrousd: taskCounterSchema.optional(),
  resourceUtilization: z.number().nonnegative().finite().optional(),
});
export type TaskRoutingAssessment = z.infer<typeof taskRoutingAssessmentSchema>;
export const taskRoutingEvaluationReceiptSchema = z.strictObject({
  evaluationId: taskHashSchema,
  method: z.literal("exact_binomial_paired_union_bonferroni_v1"),
  claimCount: taskPositiveCounterSchema,
  claimAlpha: z.number().positive().max(0.1),
  selectedConfigurationId: taskHashSchema,
  assessments: z.array(taskRoutingAssessmentSchema).min(1).max(128),
});
