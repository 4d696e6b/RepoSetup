import * as z from "zod";
import { taskChangeSetSchema } from "./change-schema.js";
import {
  taskArtifactRevisionSchema,
  taskEffectiveConfigurationSchema,
  taskErrorCodeSchema,
  taskRoutingSchema,
  taskUnresolvedReferenceSchema,
  taskUsageSchema,
} from "./evidence-schema.js";
import { taskCriterionSchema } from "./plan-schema.js";
import {
  taskAttemptIdSchema,
  taskEnvelope,
  taskHashSchema,
  taskIdSchema,
  taskPathSchema,
  taskResourceLimitsSchema,
  taskRunIdSchema,
  taskScopeSchema,
  taskSourceRefSchema,
  taskStatementSchema,
} from "./primitives.js";

const proposalReplies = [
  z.strictObject({ type: z.literal("change_set"), changeSet: taskChangeSetSchema }),
  z.strictObject({ type: z.literal("no_change"), rationale: taskStatementSchema }),
  z.strictObject({
    type: z.literal("context_request"),
    references: z
      .array(
        z.strictObject({
          source: taskSourceRefSchema,
          reason: taskStatementSchema,
        }),
      )
      .min(1)
      .max(128),
  }),
] as const;
const identity = {
  planId: taskHashSchema,
  taskId: taskIdSchema,
  attemptId: taskAttemptIdSchema,
  inputRevision: taskHashSchema,
};
const enforcementSchema = z.enum(["managed", "advisory", "unconfirmed"]);
export const taskHandoffSchema = z.strictObject({
  ...taskEnvelope("task_handoff"),
  ...identity,
  handoffId: taskHashSchema,
  runId: taskRunIdSchema,
  contextId: taskHashSchema,
  objective: taskStatementSchema,
  requirementIds: z.array(taskIdSchema).min(1),
  constraints: z.array(taskStatementSchema).max(128),
  scope: taskScopeSchema,
  criteria: z.array(taskCriterionSchema).min(1).max(128),
  requiredCheckIds: z.array(taskIdSchema).min(1),
  acceptedPredecessorArtifacts: z.array(taskArtifactRevisionSchema).max(512),
  recommendedRouting: taskRoutingSchema,
  resourceLimits: taskResourceLimitsSchema,
  enforcement: z.strictObject({
    routing: enforcementSchema,
    scope: enforcementSchema,
    budgets: enforcementSchema,
    verification: enforcementSchema,
  }),
  unresolvedReferences: z.array(taskUnresolvedReferenceSchema).max(128),
});
export const taskHandoffResultSchema = z.strictObject({
  ...taskEnvelope("task_handoff_result"),
  ...identity,
  handoffId: taskHashSchema,
  reply: z.discriminatedUnion("type", [
    ...proposalReplies,
    z.strictObject({
      type: z.literal("externally_applied"),
      effects: z
        .array(
          z.strictObject({
            path: taskPathSchema,
            beforeHash: taskHashSchema.nullable(),
            afterHash: taskHashSchema,
          }),
        )
        .max(20),
      completionClaims: z.array(taskStatementSchema).max(128),
    }),
    z.strictObject({
      type: z.literal("blocked"),
      code: taskErrorCodeSchema,
      explanation: taskStatementSchema,
    }),
  ]),
  reportedConfiguration: taskEffectiveConfigurationSchema,
  reportedUsage: taskUsageSchema,
});
export const taskProviderReplySchema = z.strictObject({
  ...taskEnvelope("task_provider_reply"),
  ...identity,
  reply: z.discriminatedUnion("type", proposalReplies),
});
export type TaskPacket = z.infer<typeof taskHandoffSchema>;
export type TaskHandoffResult = z.infer<typeof taskHandoffResultSchema>;
