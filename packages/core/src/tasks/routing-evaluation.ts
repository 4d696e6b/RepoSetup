import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskBinomialBounds } from "./binomial-bounds.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import {
  taskRoutingEvaluationSchema,
  type TaskRoutingEvaluation,
  type TaskRoutingAssessment,
} from "./routing-evaluation-schema.js";

export function sealTaskRoutingEvaluation(
  value: Omit<TaskRoutingEvaluation, "evaluationId">,
): TaskRoutingEvaluation {
  return freezeTaskValue({ ...value, evaluationId: taskContentHash(value) });
}
export function validateTaskRoutingEvaluation(
  value: unknown,
): TaskParseResult<TaskRoutingEvaluation> {
  const parsed = taskRoutingEvaluationSchema.safeParse(value);
  if (!parsed.success) return invalid();
  const { evaluationId, ...payload } = parsed.data;
  const e = parsed.data;
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
  if (
    evaluationId !== taskContentHash(payload) ||
    e.selectionCasesHash === e.heldOutCasesHash ||
    e.selectionCasesHash !== taskContentHash(e.caseIds) ||
    Date.parse(e.reviewedAt) >= Date.parse(e.validUntil) ||
    !unique(e.caseIds) ||
    !unique(e.candidates.map((c) => c.configurationId)) ||
    !unique(
      e.candidates.map(
        (c) => `${c.configuration.modelProfileId}/${c.configuration.nativeEffortId}`,
      ),
    ) ||
    !unique(e.resourceLimits.map((r) => r.resourceId)) ||
    !e.candidates.some((c) => c.configurationId === e.referenceConfigurationId) ||
    (e.frozenSelectionConfigurationId !== undefined &&
      !e.candidates.some((c) => c.configurationId === e.frozenSelectionConfigurationId)) ||
    e.candidates.some(
      (c) =>
        c.configurationId !== taskContentHash(c.configuration) ||
        c.outcomes.length !== e.caseIds.length ||
        !unique(c.resources.map((r) => r.resourceId)) ||
        (c.confirmation !== "not_run" && !c.confirmationEvidenceHash) ||
        (c.cost && c.cost.expectedTotalMicrousd > c.cost.upperTotalMicrousd) ||
        c.resources.some((r) => {
          const limit = e.resourceLimits.find((l) => l.resourceId === r.resourceId);
          return (
            !limit ||
            limit.unit !== r.unit ||
            limit.statistic !== r.statistic ||
            !Number.isFinite(r.upper / limit.limit)
          );
        }),
    )
  )
    return invalid();
  return { success: true, data: freezeTaskValue(e) };
}
const invalid = () =>
  taskFailure(
    "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
    "Routing evaluation identity, pairing, units or provenance is invalid.",
  );

/** Computes quality gates before any cost ranking; no inferred billing or model qualification. */
export function assessTaskRoutingEvaluation(value: TaskRoutingEvaluation) {
  const checked = validateTaskRoutingEvaluation(value);
  if (!checked.success) return checked;
  const e = checked.data;
  const reference = e.candidates.find((c) => c.configurationId === e.referenceConfigurationId)!;
  // One floor per candidate and one non-identity paired comparison per candidate.
  const claimCount = 2 * e.candidates.length - 1;
  const claimAlpha = e.quality.familyAlpha / claimCount;
  const assessments: TaskRoutingAssessment[] = e.candidates.map((c) => {
    const reasons: TaskRoutingAssessment["reasons"] = [];
    const complete = !c.outcomes.includes(null) && !reference.outcomes.includes(null);
    if (!complete) reasons.push("incomplete_observations");
    if (e.sampling !== "independent_problem_trials") reasons.push("unsupported_dependence");
    let qualityLower: number | undefined, degradationUpper: number | undefined;
    if (complete && e.sampling === "independent_problem_trials") {
      qualityLower = taskBinomialBounds(
        c.outcomes.filter(Boolean).length,
        e.caseIds.length,
        claimAlpha,
      ).lower;
      if (c.configurationId === reference.configurationId) degradationUpper = 0;
      else {
        let losses = 0,
          gains = 0;
        c.outcomes.forEach((pass, i) => {
          if (reference.outcomes[i] && !pass) losses++;
          if (!reference.outcomes[i] && pass) gains++;
        });
        degradationUpper = Math.min(
          1,
          Math.max(
            -1,
            taskBinomialBounds(losses, e.caseIds.length, claimAlpha / 2).upper -
              taskBinomialBounds(gains, e.caseIds.length, claimAlpha / 2).lower,
          ),
        );
      }
      if (qualityLower < e.quality.minimumPassRate) reasons.push("quality_floor_unproven");
      if (degradationUpper > e.quality.maximumDegradation) reasons.push("degradation_unproven");
    }
    if (!c.cost) reasons.push("missing_cost");
    else {
      if (!c.cost.allAttemptsAndOverheadIncluded) reasons.push("incomplete_cost");
      if (c.cost.upperTotalMicrousd > e.horizonBudgetMicrousd) reasons.push("horizon_budget");
    }
    let resourceUtilization = 0;
    for (const limit of e.resourceLimits) {
      const resource = c.resources.find((r) => r.resourceId === limit.resourceId);
      if (!resource) {
        if (!reasons.includes("missing_resource")) reasons.push("missing_resource");
      } else {
        const ratio = resource.upper / limit.limit;
        resourceUtilization = Math.max(resourceUtilization, ratio);
        if (ratio > 1 && !reasons.includes("resource_limit")) reasons.push("resource_limit");
      }
    }
    if (e.candidates.some((candidate) => candidate.confirmation === "failed"))
      reasons.push("confirmation_failed");
    if (
      e.scope === "live" &&
      (!e.frozenSelectionConfigurationId ||
        (c.configurationId === e.frozenSelectionConfigurationId && c.confirmation !== "passed"))
    )
      reasons.push("confirmation_required");
    const status = reasons.includes("confirmation_failed")
      ? ("confirmation_rejected" as const)
      : reasons.some((r) =>
            [
              "incomplete_observations",
              "unsupported_dependence",
              "missing_cost",
              "incomplete_cost",
              "missing_resource",
              "confirmation_required",
            ].includes(r),
          )
        ? ("insufficient_evidence" as const)
        : reasons.some((r) =>
              ["horizon_budget", "resource_limit", "confirmation_failed"].includes(r),
            )
          ? ("operationally_rejected" as const)
          : reasons.length
            ? ("quality_inconclusive" as const)
            : ("admissible" as const);
    return {
      configurationId: c.configurationId,
      modelProfileId: c.configuration.modelProfileId,
      nativeEffortId: c.configuration.nativeEffortId,
      status,
      reasons,
      ...(qualityLower !== undefined ? { qualityLower, degradationUpper } : {}),
      ...(c.cost
        ? {
            expectedTotalMicrousd: c.cost.expectedTotalMicrousd,
            upperTotalMicrousd: c.cost.upperTotalMicrousd,
          }
        : {}),
      ...(Number.isFinite(resourceUtilization) ? { resourceUtilization } : {}),
    };
  });
  return {
    success: true as const,
    data: freezeTaskValue({
      evaluationId: e.evaluationId,
      method: "exact_binomial_paired_union_bonferroni_v1" as const,
      claimCount,
      claimAlpha,
      assessments,
    }),
  };
}
