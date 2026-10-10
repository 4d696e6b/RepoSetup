import * as z from "zod";
import { taskContentHash, freezeTaskValue } from "./canonical.js";
import {
  taskContextSchema,
  taskConfigurationSchema,
  taskRoutingSchema,
  type RoutingDecision,
} from "./evidence-schema.js";
import { taskPreferencesSchema } from "./preferences-schema.js";
import { taskSchema } from "./plan-schema.js";
import {
  taskCounterSchema,
  taskHashSchema,
  taskPositiveCounterSchema,
  taskTimestampSchema,
} from "./primitives.js";
import { validateTaskModelCatalog, type TaskModelCatalog } from "./model-catalog.js";
import { taskFailure, type TaskParseResult } from "./parse.js";

export const TASK_ROUTING_POLICY_REVISION = taskContentHash({
  revision: 1,
  contextFramingTokens: 8192,
  conservative: "strong_floor",
  balanced: "declared_floor",
  selection: "estimated_cost_then_catalog_order",
  repair: "third_attempt_independent_escalation",
});
const requestSchema = z.strictObject({
  task: taskSchema,
  planId: taskHashSchema,
  context: taskContextSchema,
  preferences: taskPreferencesSchema,
  allowProviderUsage: z.boolean(),
  qualificationScope: z.enum(["offline", "live"]),
  now: taskTimestampSchema,
  maxOutputTokens: taskPositiveCounterSchema.max(16384),
  remaining: z.strictObject({
    calls: taskCounterSchema,
    inputTokens: taskCounterSchema,
    outputTokens: taskCounterSchema,
    costMicrousd: taskCounterSchema,
    wallTimeMs: taskCounterSchema,
  }),
  repair: z
    .strictObject({
      implementationFailures: taskCounterSchema.max(2),
      previousConfiguration: taskConfigurationSchema,
    })
    .optional(),
});
export type TaskRoutingInput = z.infer<typeof requestSchema> & { catalog: TaskModelCatalog };
type Rejection = RoutingDecision["rejectedCandidates"][number];

/** Pure, explainable selection. An offline qualification can never authorize live routing. */
export function routeTask(input: TaskRoutingInput): TaskParseResult<RoutingDecision> {
  const { catalog: rawCatalog, ...rawRequest } = input;
  const catalog = validateTaskModelCatalog(rawCatalog);
  if (!catalog.success) return catalog;
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success)
    return taskFailure(
      "TASK_PREFERENCES_INVALID",
      "Routing inputs or remaining finite allowances are invalid.",
    );
  const r = parsed.data;
  if (
    r.context.planId !== r.planId ||
    r.context.taskId !== r.task.taskId ||
    r.context.unresolvedReferences.some((ref) => ref.required)
  )
    return taskFailure(
      "TASK_CONTEXT_UNRESOLVED",
      "Routing requires the current task's resolved context.",
    );
  const { contextId, ...contextPayload } = r.context;
  if (contextId !== taskContentHash(contextPayload))
    return taskFailure("TASK_CONTEXT_STALE", "Routing context identity is stale.");
  const escalation = (r.repair?.implementationFailures ?? 0) >= 2;
  const previous = catalog.data.profiles.find(
    (p) => p.profileId === r.repair?.previousConfiguration.modelProfileId,
  );
  if (
    r.repair &&
    (!previous ||
      previous.adapterId !== r.repair.previousConfiguration.adapterId ||
      previous.providerId !== r.repair.previousConfiguration.providerId)
  )
    return taskFailure(
      "TASK_CAPABILITY_UNAVAILABLE",
      "Repair's previous mapping is absent from the reviewed catalog.",
    );
  const strong =
    r.task.capabilityRequirements.minimumCapabilityClass === "strong" ||
    r.preferences.qualityPreference === "conservative" ||
    (escalation &&
      previous?.qualification.status === "qualified" &&
      previous.qualification.capabilityClass === "baseline");
  const rejected: Rejection[] = [];
  const candidates: { selected: RoutingDecision["selected"]; cost: number }[] = [];
  for (const profile of catalog.data.profiles) {
    const preference = r.preferences.providerAvailability.find(
      (p) => p.providerId === profile.providerId,
    );
    let effortId =
      r.preferences.effortPreference.type === "explicit"
        ? r.preferences.effortPreference.nativeEffortId
        : profile.efforts[0]!.nativeEffortId;
    if (
      r.repair &&
      r.preferences.effortPreference.type === "minimum_supported" &&
      (!escalation ||
        (previous?.qualification.status === "qualified" &&
          previous.qualification.capabilityClass === "strong")) &&
      profile.profileId === previous?.profileId
    ) {
      effortId = r.repair.previousConfiguration.nativeEffortId;
      if (escalation && r.preferences.effortPreference.type === "minimum_supported") {
        const index = profile.efforts.findIndex((e) => e.nativeEffortId === effortId);
        effortId = profile.efforts[index + 1]?.nativeEffortId ?? effortId;
      }
    }
    const effort = profile.efforts.find((e) => e.nativeEffortId === effortId);
    const reasons: Rejection["reasons"] = [];
    if (!preference?.enabled) reasons.push("adapter_unavailable");
    if (!profile.available || !preference?.modelProfileIds.includes(profile.profileId))
      reasons.push("model_unavailable");
    if (
      profile.qualification.status !== "qualified" ||
      (r.qualificationScope === "live" && profile.qualification.scope !== "live")
    )
      reasons.push("model_unqualified");
    if (
      Date.parse(r.now) < Date.parse(profile.reviewedAt) ||
      Date.parse(r.now) >= Date.parse(profile.validUntil)
    )
      reasons.push("qualification_expired");
    if (!effort) reasons.push("unsupported_effort");
    const qualification = profile.qualification;
    if (
      qualification.status === "qualified" &&
      ((strong && qualification.capabilityClass !== "strong") ||
        r.task.capabilityRequirements.features.some((f) => !qualification.features.includes(f)))
    )
      reasons.push("missing_capabilities");
    // A focused first repair preserves the requested model, independently of price.
    if (
      r.repair &&
      !escalation &&
      profile.profileId !== r.repair.previousConfiguration.modelProfileId
    )
      reasons.push("repair_configuration_policy");
    if (
      escalation &&
      previous?.qualification.status === "qualified" &&
      previous.qualification.capabilityClass === "strong" &&
      profile.profileId !== previous.profileId
    )
      reasons.push("repair_configuration_policy");
    const inputTokens = r.context.size.estimatedInputTokens + 8192;
    if (
      !Number.isSafeInteger(inputTokens) ||
      inputTokens + r.maxOutputTokens > profile.maxContextTokens
    )
      reasons.push("context_capacity");
    if (
      r.maxOutputTokens > profile.maxOutputTokens ||
      (effort && r.maxOutputTokens < effort.minimumOutputTokens)
    )
      reasons.push("output_capacity");
    const cost = Math.ceil(
      inputTokens * profile.price.inputMicrousdPerToken +
        r.maxOutputTokens * profile.price.outputMicrousdPerToken,
    );
    if (r.preferences.executionMode !== "managed" || !r.allowProviderUsage)
      reasons.push("allowance_required");
    if (
      !Number.isSafeInteger(cost) ||
      r.remaining.calls < 1 ||
      r.remaining.inputTokens < inputTokens ||
      r.remaining.outputTokens < r.maxOutputTokens ||
      r.remaining.costMicrousd < cost ||
      r.remaining.wallTimeMs === 0
    )
      reasons.push("budget_exhausted");
    if (reasons.length)
      rejected.push({ modelProfileId: profile.profileId, nativeEffortId: effortId, reasons });
    else
      candidates.push({
        cost,
        selected: {
          adapterId: profile.adapterId,
          providerId: profile.providerId,
          modelProfileId: profile.profileId,
          nativeEffortId: effortId,
          maxContextTokens: profile.maxContextTokens,
          maxOutputTokens: r.maxOutputTokens,
          enforcement: "managed",
          effectiveConfiguration: { provenance: "unknown" },
        },
      });
  }
  candidates.sort((a, b) => a.cost - b.cost); // Stable sort preserves reviewed catalog ties.
  if (!candidates.length) {
    const code = rejected.every((c) => c.reasons.includes("budget_exhausted"))
      ? "TASK_BUDGET_EXHAUSTED"
      : !r.allowProviderUsage
        ? "TASK_PROVIDER_ALLOWANCE_REQUIRED"
        : "TASK_CAPABILITY_UNAVAILABLE";
    const failure = taskFailure(
      code,
      "No qualified model/native effort pair satisfies the current capability, capacity and allowance requirements.",
    );
    return { ...failure, error: { ...failure.error, details: { rejectedCandidates: rejected } } };
  }
  const payload = {
    kind: "routing_decision" as const,
    schemaVersion: 1 as const,
    planId: r.planId,
    taskId: r.task.taskId,
    contextId,
    catalogRevision: catalog.data.catalogRevision,
    policyRevision: TASK_ROUTING_POLICY_REVISION,
    requiredCapabilities: {
      ...r.task.capabilityRequirements,
      minimumCapabilityClass: strong ? ("strong" as const) : ("baseline" as const),
    },
    selected: candidates[0]!.selected,
    rejectedCandidates: rejected,
    rationale: r.repair
      ? "Failure-specific repair preserves the model initially; repeated implementation failures independently raise capability or native effort within reviewed limits."
      : "Capability and native effort were filtered independently; estimated price and stable catalog order select among eligible pairs.",
  };
  const result = taskRoutingSchema.safeParse({ ...payload, routingId: taskContentHash(payload) });
  return result.success
    ? { success: true, data: freezeTaskValue(result.data) }
    : taskFailure(
        "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
        "Routing decision exceeds the reviewed boundary.",
      );
}

export function taskRemainingAllowance(run: {
  resourceLimits: import("./run-schema.js").PhaseRun["resourceLimits"];
  resourceLedger: import("./run-schema.js").PhaseRun["resourceLedger"];
}): TaskRoutingInput["remaining"] {
  const held = run.resourceLedger.reservations;
  const remaining = (
    key: "calls" | "inputTokens" | "outputTokens" | "costMicrousd",
    limit: number,
  ) => Math.max(0, limit - held.reduce((n, r) => n + r[key], 0));
  return {
    calls: remaining("calls", run.resourceLimits.maxProviderCalls),
    inputTokens: remaining("inputTokens", run.resourceLimits.maxInputTokens),
    outputTokens: remaining("outputTokens", run.resourceLimits.maxOutputTokens),
    costMicrousd: remaining("costMicrousd", run.resourceLimits.maxCostMicrousd),
    wallTimeMs: Math.max(
      0,
      run.resourceLimits.maxWallTimeMs - run.resourceLedger.consumed.durationMs,
    ),
  };
}

/** Trusted executor input. Never decoded from plan/preferences as qualification evidence. */
export type TaskRoutingAuthority = {
  catalog: TaskModelCatalog;
  preferences: import("./preferences-schema.js").TaskPreferences;
  qualificationScope: "offline" | "live";
};
export function validateTaskRoutingAuthority(
  value: TaskRoutingAuthority,
): TaskParseResult<TaskRoutingAuthority> {
  const catalog = validateTaskModelCatalog(value.catalog);
  if (!catalog.success) return catalog;
  const preferences = taskPreferencesSchema.safeParse(value.preferences);
  if (!preferences.success || !["offline", "live"].includes(value.qualificationScope))
    return taskFailure("TASK_PREFERENCES_INVALID", "Trusted routing authority is invalid.");
  return {
    success: true,
    data: freezeTaskValue({
      catalog: catalog.data,
      preferences: preferences.data,
      qualificationScope: value.qualificationScope,
    }),
  };
}
export function taskRoutingAuthorityId(value: TaskRoutingAuthority): string {
  return taskContentHash({ ...value, policyRevision: TASK_ROUTING_POLICY_REVISION });
}
