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
import {
  assessTaskRoutingEvaluation,
  validateTaskRoutingEvaluation,
} from "./routing-evaluation.js";
import {
  taskRoutingEvaluationSchema,
  type TaskRoutingEvaluation,
} from "./routing-evaluation-schema.js";
import { taskFailure, type TaskParseResult } from "./parse.js";

export const TASK_ROUTING_POLICY_REVISION = taskContentHash({
  revision: 2,
  contextFramingTokens: 8192,
  conservative: "strong_floor",
  balanced: "declared_floor",
  selection: "quality_admission_then_expected_total_upper_utilization_identity",
  liveEvidence: "paired_exact_binomial_required",
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
  evaluation: taskRoutingEvaluationSchema.optional(),
  timeoutMs: taskPositiveCounterSchema.max(120000).optional(),
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
export type TaskRoutingInput = z.infer<typeof requestSchema> & {
  catalog: TaskModelCatalog;
  evaluations?: TaskRoutingEvaluation[];
};
type Rejection = RoutingDecision["rejectedCandidates"][number];

/** Pure, explainable selection. An offline qualification can never authorize live routing. */
export function routeTask(input: TaskRoutingInput): TaskParseResult<RoutingDecision> {
  const { catalog: rawCatalog, evaluations, ...rawRequest } = input;
  const catalog = validateTaskModelCatalog(rawCatalog);
  if (!catalog.success) return catalog;
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success)
    return taskFailure(
      "TASK_PREFERENCES_INVALID",
      "Routing inputs or remaining finite allowances are invalid.",
    );
  const r = parsed.data;
  if (evaluations) {
    if (!Array.isArray(evaluations) || evaluations.length > 64 || r.evaluation)
      return taskFailure(
        "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
        "Use one reviewed evaluation or a bounded task evidence registry.",
      );
    const checked = evaluations.map(validateTaskRoutingEvaluation);
    const invalid = checked.find((r) => !r.success);
    if (invalid && !invalid.success) return invalid;
    if (new Set(evaluations.map((e) => e.taskHash)).size !== evaluations.length)
      return taskFailure(
        "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
        "Task evidence registry contains ambiguous evaluations.",
      );
    r.evaluation = evaluations.find((e) => e.taskHash === taskContentHash(r.task));
    // A supplied registry cannot silently fall back to the legacy offline heuristic.
    if (!r.evaluation)
      return taskFailure(
        "TASK_CAPABILITY_UNAVAILABLE",
        "No reviewed routing evaluation covers this task.",
      );
  }

  const evaluation = r.evaluation ? validateTaskRoutingEvaluation(r.evaluation) : undefined;
  if (evaluation && !evaluation.success) return evaluation;
  const e = evaluation?.success ? evaluation.data : undefined;
  if (
    e &&
    (e.catalogRevision !== catalog.data.catalogRevision ||
      e.workflowRevision !== TASK_ROUTING_POLICY_REVISION ||
      e.taskHash !== taskContentHash(r.task) ||
      e.executionPreferencesHash !== taskContentHash(r.preferences) ||
      Date.parse(r.now) < Date.parse(e.reviewedAt) ||
      Date.parse(r.now) >= Date.parse(e.validUntil) ||
      (r.qualificationScope === "live" && e.scope !== "live"))
  )
    return taskFailure(
      "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
      "Routing evaluation is stale or does not match this task, catalog, policy or qualification scope.",
    );
  const assessment = e ? assessTaskRoutingEvaluation(e) : undefined;
  if (assessment && !assessment.success) return assessment;
  const assessed = assessment?.success ? assessment.data : undefined;

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
  const candidates: {
    selected: RoutingDecision["selected"];
    cost: number;
    upper: number;
    utilization: number;
    configurationId: string;
  }[] = [];
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
    const baseEffortId = effortId;
    const effortIds =
      e && r.preferences.effortPreference.type === "minimum_supported" && !r.repair
        ? profile.efforts.map((effort) => effort.nativeEffortId)
        : [baseEffortId];
    for (const candidateEffortId of effortIds) {
      effortId = candidateEffortId;
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
      const measured = assessed?.assessments.find(
        (a) => a.modelProfileId === profile.profileId && a.nativeEffortId === effortId,
      );
      const measuredCandidate = e?.candidates.find(
        (c) =>
          c.configuration.modelProfileId === profile.profileId &&
          c.configuration.nativeEffortId === effortId,
      );
      if ((r.qualificationScope === "live" && !e) || (e && !measured))
        reasons.push("evaluation_missing");
      if (measured) {
        if (measured.status === "insufficient_evidence") reasons.push("evaluation_insufficient");
        if (measured.status === "quality_inconclusive") reasons.push("evaluation_quality_unproven");
        if (measured.status === "confirmation_rejected")
          reasons.push("evaluation_confirmation_failed");
        if (measured.status === "operationally_rejected")
          reasons.push("evaluation_operational_limit");
      }
      if (
        measuredCandidate &&
        (effort?.configurationId !== measuredCandidate.configurationId ||
          measuredCandidate.configuration.maxOutputTokens !== r.maxOutputTokens ||
          measuredCandidate.configuration.timeoutMs !== r.timeoutMs ||
          measuredCandidate.configuration.maxInputTokens <
            r.context.size.estimatedInputTokens + 8192 ||
          (measuredCandidate.cost &&
            measuredCandidate.cost.tariffRevision !== profile.price.catalogRevision))
      )
        reasons.push("evaluation_configuration_mismatch");
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
        r.remaining.wallTimeMs === 0 ||
        (measuredCandidate !== undefined &&
          r.remaining.wallTimeMs < measuredCandidate.configuration.timeoutMs)
      )
        reasons.push("budget_exhausted");
      if (reasons.length)
        rejected.push({ modelProfileId: profile.profileId, nativeEffortId: effortId, reasons });
      else
        candidates.push({
          cost: measured?.expectedTotalMicrousd ?? cost,
          upper: measured?.upperTotalMicrousd ?? cost,
          utilization: measured?.resourceUtilization ?? 0,
          configurationId: measured?.configurationId ?? profile.profileId,
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
  }
  candidates.sort(
    (a, b) =>
      a.cost - b.cost ||
      (e
        ? a.upper - b.upper ||
          a.utilization - b.utilization ||
          (a.configurationId < b.configurationId
            ? -1
            : a.configurationId > b.configurationId
              ? 1
              : 0)
        : 0),
  );
  // Legacy offline ties retain catalog order; evaluated ties use immutable configuration IDs.
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
    return {
      ...failure,
      error: {
        ...failure.error,
        details: { rejectedCandidates: rejected, ...(assessed ? { evaluation: assessed } : {}) },
      },
    };
  }
  if (e?.scope === "live" && candidates[0]!.configurationId !== e.frozenSelectionConfigurationId)
    return taskFailure(
      "TASK_CAPABILITY_UNAVAILABLE",
      "Current admissible winner differs from the pre-confirmation frozen configuration; new evaluation is required.",
    );
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
    ...(assessed
      ? { evaluation: { ...assessed, selectedConfigurationId: candidates[0]!.configurationId } }
      : {}),
    rationale: assessed
      ? "Exact absolute-quality and paired non-inferiority bounds admit complete, comparable model/effort evidence before projected total cost, upper allowance, resource utilization and immutable identity determine selection. Runtime reservation limits remain independent."
      : r.repair
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
  evaluation?: TaskRoutingEvaluation;
  evaluations?: TaskRoutingEvaluation[];
};
export function validateTaskRoutingAuthority(
  value: TaskRoutingAuthority,
): TaskParseResult<TaskRoutingAuthority> {
  const catalog = validateTaskModelCatalog(value.catalog);
  if (!catalog.success) return catalog;
  const preferences = taskPreferencesSchema.safeParse(value.preferences);
  if (!preferences.success || !["offline", "live"].includes(value.qualificationScope))
    return taskFailure("TASK_PREFERENCES_INVALID", "Trusted routing authority is invalid.");
  if (
    (value.evaluation && value.evaluations) ||
    (value.evaluations && (!Array.isArray(value.evaluations) || value.evaluations.length > 64))
  )
    return taskFailure(
      "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
      "Trusted task evidence registry is invalid.",
    );
  const checkedRegistry = value.evaluations?.map(validateTaskRoutingEvaluation);
  const registryFailure = checkedRegistry?.find((r) => !r.success);
  if (registryFailure && !registryFailure.success) return registryFailure;
  if (
    value.evaluations &&
    new Set(value.evaluations.map((e) => e.taskHash)).size !== value.evaluations.length
  )
    return taskFailure(
      "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
      "Trusted task evidence registry is ambiguous.",
    );
  const evaluation = value.evaluation ? validateTaskRoutingEvaluation(value.evaluation) : undefined;
  if (evaluation && !evaluation.success) return evaluation;
  return {
    success: true,
    data: freezeTaskValue({
      ...(evaluation?.success ? { evaluation: evaluation.data } : {}),
      ...(checkedRegistry
        ? { evaluations: checkedRegistry.flatMap((r) => (r.success ? [r.data] : [])) }
        : {}),
      catalog: catalog.data,
      preferences: preferences.data,
      qualificationScope: value.qualificationScope,
    }),
  };
}
export function taskRoutingAuthorityId(value: TaskRoutingAuthority): string {
  return taskContentHash({ ...value, policyRevision: TASK_ROUTING_POLICY_REVISION });
}
