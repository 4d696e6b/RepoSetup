import * as z from "zod";
import {
  taskCapabilitySchema,
  taskEnvelope,
  taskHashSchema,
  taskIdSchema,
  taskLineRangeSchema,
  taskPathSchema,
  taskPositiveCounterSchema,
  taskProjectSchema,
  taskScopeSchema,
  taskSourceRefSchema,
  taskStatementSchema,
  TASK_DOCUMENT_LIMITS,
} from "./primitives.js";

export const taskRequirementSchema = z.strictObject({
  requirementId: taskIdSchema,
  text: taskStatementSchema,
  sourceRefs: z.array(taskSourceRefSchema).min(1).max(128),
  phaseCriterionIds: z.array(taskIdSchema).min(1).max(128),
});
export const taskPhaseCriterionSchema = z.strictObject({
  criterionId: taskIdSchema,
  statement: taskStatementSchema,
  evidenceKind: z.enum(["trusted_check", "reviewer_evidence"]),
  checkId: taskIdSchema,
});
export const taskPhaseSelectionSchema = z.strictObject({
  phaseId: taskIdSchema,
  sourcePath: taskPathSchema,
  sourceFileHash: taskHashSchema,
  lineRange: taskLineRangeSchema,
  selectionHash: taskHashSchema,
  requirements: z.array(taskRequirementSchema).min(1).max(512),
  phaseCriteria: z.array(taskPhaseCriterionSchema).min(1).max(512),
});
export const taskCriterionSchema = z.strictObject({
  criterionId: taskIdSchema,
  statement: taskStatementSchema,
  requirementIds: z.array(taskIdSchema).min(1).max(512),
  evidenceKind: z.enum(["trusted_check", "reviewer_evidence"]),
  checkIds: z.array(taskIdSchema).min(1).max(128),
});
export const taskOutputSchema = z.strictObject({
  artifactId: taskIdSchema,
  kind: z.enum(["file_snapshot", "reviewed_evidence"]),
  paths: z.array(taskPathSchema).min(1).max(20),
  criterionIds: z.array(taskIdSchema).min(1).max(128),
});
export const taskSchema = z.strictObject({
  taskId: taskIdSchema,
  objective: taskStatementSchema,
  requirementIds: z.array(taskIdSchema).min(1).max(512),
  kind: z.enum(["implementation", "test", "documentation", "investigation"]),
  constraints: z.array(taskStatementSchema).max(128),
  scope: taskScopeSchema,
  criteria: z.array(taskCriterionSchema).min(1).max(128),
  requiredCheckIds: z.array(taskIdSchema).min(1).max(128),
  outputs: z.array(taskOutputSchema).min(1).max(128),
  capabilityRequirements: taskCapabilitySchema,
});
export const taskDependencySchema = z.strictObject({
  predecessorTaskId: taskIdSchema,
  consumerTaskId: taskIdSchema,
  requiredArtifactIds: z.array(taskIdSchema).min(1).max(128),
});
export const taskQuestionSchema = z.strictObject({
  questionId: taskIdSchema,
  question: taskStatementSchema,
  requirementIds: z.array(taskIdSchema).min(1).max(512),
  blocking: z.boolean(),
});
const draftFields = {
  tasks: z.array(taskSchema).min(1).max(TASK_DOCUMENT_LIMITS.tasks),
  dependencies: z.array(taskDependencySchema).max(9216),
  unresolvedQuestions: z.array(taskQuestionSchema).max(128),
};
export const taskPlanDraftSchema = z.strictObject({
  ...taskEnvelope("task_plan_draft"),
  phaseId: taskIdSchema,
  selectionHash: taskHashSchema,
  ...draftFields,
});
export const taskCoverageSchema = z.strictObject({
  requirementId: taskIdSchema,
  taskIds: z.array(taskIdSchema).min(1),
  taskCriterionIds: z.array(taskIdSchema).min(1),
  phaseCriterionIds: z.array(taskIdSchema).min(1),
  requiredArtifactIds: z.array(taskIdSchema),
});
export const taskPlanSchema = z.strictObject({
  ...taskEnvelope("task_plan"),
  planId: taskHashSchema,
  phase: taskPhaseSelectionSchema,
  project: taskProjectSchema,
  supportProfileId: z.literal("managed-ts-node-v1"),
  supportProfileRevision: taskPositiveCounterSchema,
  checkCatalogRevision: taskHashSchema,
  requirements: z.array(taskRequirementSchema).min(1).max(512),
  phaseCriteria: z.array(taskPhaseCriterionSchema).min(1).max(512),
  ...draftFields,
  orderedTaskIds: z.array(taskIdSchema).min(1).max(TASK_DOCUMENT_LIMITS.tasks),
  coverage: z.array(taskCoverageSchema).min(1).max(512),
});
export type Task = z.infer<typeof taskSchema>;
export type TaskDependency = z.infer<typeof taskDependencySchema>;
export type PhaseSelection = z.infer<typeof taskPhaseSelectionSchema>;
export type TaskPlanDraft = z.infer<typeof taskPlanDraftSchema>;
export type TaskPlan = z.infer<typeof taskPlanSchema>;
