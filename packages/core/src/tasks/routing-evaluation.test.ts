import { expect, it } from "vitest";
import { measuredRoutingFixture } from "./routing-evaluation.test-helper.js";
import {
  assessTaskRoutingEvaluation,
  sealTaskRoutingEvaluation,
  validateTaskRoutingEvaluation,
} from "./routing-evaluation.js";
import { routeTask, taskRoutingAuthorityId, validateTaskRoutingAuthority } from "./routing.js";
import { taskContentHash } from "./canonical.js";
import { sealTaskModelCatalog } from "./model-catalog.js";
import type { TaskRoutingEvaluation } from "./routing-evaluation-schema.js";

function mutate(
  f: ReturnType<typeof measuredRoutingFixture>,
  edit: (e: TaskRoutingEvaluation) => void,
) {
  const e = structuredClone(f.evaluation);
  edit(e);
  const { evaluationId, ...payload } = e;
  expect(evaluationId).toBeDefined();
  f.evaluation = sealTaskRoutingEvaluation(payload);
}
it("admits effort-specific quality before cost and retains a reproducible receipt", () => {
  const f = measuredRoutingFixture();
  const r = routeTask(f);
  expect(r).toMatchObject({
    success: true,
    data: {
      selected: { modelProfileId: "cheap", nativeEffortId: "high" },
      evaluation: {
        claimCount: 5,
        claimAlpha: 0.01,
        assessments: expect.arrayContaining([
          expect.objectContaining({ nativeEffortId: "low", status: "quality_inconclusive" }),
          expect.objectContaining({
            modelProfileId: "cheap",
            nativeEffortId: "high",
            status: "admissible",
          }),
        ]),
      },
    },
  });
  if (!r.success) return;
  const { routingId, ...payload } = r.data;
  expect(routingId).toBe(taskContentHash(payload));
  expect(Object.isFrozen(r.data.evaluation?.assessments)).toBe(true);
});
it("uses projected full-policy cost, not upper cost or single-call sticker price, as the objective", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.candidates[1]!.cost!.expectedTotalMicrousd = 1100;
    e.candidates[1]!.cost!.upperTotalMicrousd = 1100;
  });
  expect(routeTask(f)).toMatchObject({
    success: true,
    data: { selected: { modelProfileId: "strong" } },
  });
});
it("keeps planning horizon budgets and runtime reservations independent", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.horizonBudgetMicrousd = 250;
  });
  expect(routeTask(f).success).toBe(false);
  const g = measuredRoutingFixture();
  g.remaining.costMicrousd = 0;
  expect(routeTask(g)).toMatchObject({ success: false, error: { code: "TASK_BUDGET_EXHAUSTED" } });
});
it.each(["missing", "incomplete", "dependence", "resource", "confirmation"])(
  "does not silently fill absent %s evidence",
  (kind) => {
    const f = measuredRoutingFixture();
    mutate(f, (e) => {
      for (const c of e.candidates) {
        if (kind === "missing") c.cost = null;
        if (kind === "incomplete") c.outcomes[0] = null;
        if (kind === "dependence") e.sampling = "unsupported_dependence";
        if (kind === "resource") c.resources = [];
        if (kind === "confirmation") {
          e.scope = "live";
          c.confirmation = "not_run";
        }
      }
    });
    const r = assessTaskRoutingEvaluation(f.evaluation);
    expect(r.success && r.data.assessments.every((a) => a.status === "insufficient_evidence")).toBe(
      true,
    );
  },
);
it("does not reselect after a held-out failure, including the reference", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.candidates[1]!.confirmation = "failed";
    e.candidates[1]!.confirmationEvidenceHash = taskContentHash("failed");
  });
  expect(routeTask(f).success).toBe(false);
  const r = assessTaskRoutingEvaluation(f.evaluation);
  expect(
    r.success && r.data.assessments.every((a) => a.reasons.includes("confirmation_failed")),
  ).toBe(true);
});
it("does not elevate offline evidence to live qualification and requires empirical evidence on live routes", () => {
  const f = measuredRoutingFixture();
  f.qualificationScope = "live";
  expect(routeTask(f).success).toBe(false);
  const g = measuredRoutingFixture();
  g.catalog = sealTaskModelCatalog({
    kind: "task_model_catalog",
    schemaVersion: 1,
    profiles: g.catalog.profiles.map((p) => ({
      ...p,
      qualification:
        p.qualification.status === "qualified"
          ? { ...p.qualification, scope: "live" }
          : p.qualification,
    })),
  });
  const { evaluation, ...noEvidence } = g;
  expect(evaluation).toBeDefined();
  expect(routeTask({ ...noEvidence, qualificationScope: "live" })).toMatchObject({
    success: false,
    error: {
      details: {
        rejectedCandidates: expect.arrayContaining([
          expect.objectContaining({ reasons: expect.arrayContaining(["evaluation_missing"]) }),
        ]),
      },
    },
  });
});
it.each(["caseIds", "units", "identity", "split", "cost"])(
  "rejects corrupted or incomparable %s",
  (kind) => {
    const f = measuredRoutingFixture();
    mutate(f, (e) => {
      if (kind === "caseIds") e.caseIds[1] = e.caseIds[0]!;
      if (kind === "units") e.candidates[0]!.resources[0]!.unit = "bytes";
      if (kind === "identity") e.candidates[0]!.configuration.timeoutMs++;
      if (kind === "split") e.heldOutCasesHash = e.selectionCasesHash;
      if (kind === "cost") e.candidates[0]!.cost!.expectedTotalMicrousd = 5000;
    });
    expect(validateTaskRoutingEvaluation(f.evaluation).success).toBe(false);
  },
);
it.each(["task", "policy", "catalog", "expired"])("invalidates stale %s evidence", (kind) => {
  const f = measuredRoutingFixture();
  if (kind === "task") f.task.objective += " changed";
  if (kind === "policy")
    mutate(f, (e) => {
      e.workflowRevision = taskContentHash("old");
    });
  if (kind === "catalog")
    mutate(f, (e) => {
      e.catalogRevision = taskContentHash("old");
    });
  if (kind === "expired") f.now = "2026-11-07T00:00:00.000Z";
  expect(routeTask(f)).toMatchObject({
    success: false,
    error: { code: "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED" },
  });
});
it("rejects changed token/timeout/tariff configuration without downgrading evidence requirements", () => {
  for (const field of ["maxOutputTokens", "timeoutMs"] as const) {
    const f = measuredRoutingFixture();
    f[field] = 2048;
    expect(routeTask(f).success).toBe(false);
  }
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.candidates.forEach((c) => {
      c.cost!.tariffRevision = taskContentHash("new-price");
    });
  });
  expect(routeTask(f).success).toBe(false);
});
it("ties on expected cost, upper cost, utilization, then immutable identity independently of registry order", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.candidates.forEach((c) => {
      c.outcomes.fill(true);
      c.cost!.expectedTotalMicrousd = 100;
      c.cost!.upperTotalMicrousd = 200;
    });
  });
  const a = routeTask(f);
  mutate(f, (e) => {
    e.candidates.reverse();
  });
  const b = routeTask(f);
  expect(a).toMatchObject({ success: true });
  expect(b).toMatchObject({ success: true });
  if (a.success && b.success) expect(a.data.selected).toEqual(b.data.selected);
});
it("preserves explicit effort and first-repair policy instead of quietly switching configurations", () => {
  const f = measuredRoutingFixture();
  f.preferences.effortPreference = { type: "explicit", nativeEffortId: "low" };
  mutate(f, (e) => {
    e.executionPreferencesHash = taskContentHash(f.preferences);
  });
  expect(routeTask(f)).toMatchObject({
    success: true,
    data: { selected: { modelProfileId: "strong", nativeEffortId: "low" } },
  });
  f.repair = {
    implementationFailures: 1,
    previousConfiguration: {
      adapterId: "openai-responses-v1",
      providerId: "openai-responses-v1",
      modelProfileId: "cheap",
      nativeEffortId: "low",
    },
  };
  expect(routeTask(f).success).toBe(false);
});
it("pins empirical evidence into trusted authority identity and rejects tampering", () => {
  const f = measuredRoutingFixture();
  const authority = {
    catalog: f.catalog,
    preferences: f.preferences,
    qualificationScope: f.qualificationScope,
    evaluation: f.evaluation,
  };
  expect(validateTaskRoutingAuthority(authority).success).toBe(true);
  const before = taskRoutingAuthorityId(authority);
  mutate(f, (e) => {
    e.quality.minimumPassRate = 0.7;
  });
  expect(taskRoutingAuthorityId({ ...authority, evaluation: f.evaluation })).not.toBe(before);
  expect(
    validateTaskRoutingAuthority({
      ...authority,
      evaluation: { ...authority.evaluation, horizonRequests: 2 },
    }).success,
  ).toBe(false);
});

it("selects task-specific host evidence from a bounded registry without heuristic fallback", () => {
  const f = measuredRoutingFixture();
  const { evaluation, ...request } = f;
  expect(routeTask({ ...request, evaluations: [evaluation] })).toMatchObject({ success: true });
  expect(routeTask({ ...request, evaluations: [] }).success).toBe(false);
  expect(routeTask({ ...request, evaluations: [evaluation, evaluation] }).success).toBe(false);
  expect(routeTask({ ...f, evaluations: [evaluation] }).success).toBe(false);
  request.task = { ...request.task, objective: "Changed task" };
  expect(routeTask({ ...request, evaluations: [evaluation] }).success).toBe(false);
});

it("rejects a supplied broken reference rather than inventing a fallback", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.candidates[2]!.outcomes[0] = null;
  });
  expect(routeTask(f).success).toBe(false);
});

it("keeps a small, apparently perfect sample inconclusive instead of equating a tie with equivalence", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.caseIds = e.caseIds.slice(0, 10);
    e.selectionCasesHash = taskContentHash(e.caseIds);
    e.candidates.forEach((c) => {
      c.outcomes = Array(10).fill(true);
    });
  });
  const r = assessTaskRoutingEvaluation(f.evaluation);
  expect(r.success).toBe(true);
  if (!r.success) return;
  expect(r.data.assessments[0]!.degradationUpper).toBeGreaterThan(0.05);
  expect(r.data.assessments[0]!.reasons).toContain("degradation_unproven");
  expect(r.data.assessments[2]!.degradationUpper).toBe(0); // Identity only.
});

it("does not admit excellent quality with incomplete full-policy costs or an over-limit resource", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) => {
    e.candidates[1]!.cost!.allAttemptsAndOverheadIncluded = false;
    e.candidates[2]!.resources[0]!.upper = 1001;
  });
  expect(routeTask(f).success).toBe(false);
  const r = assessTaskRoutingEvaluation(f.evaluation);
  if (!r.success) throw new Error("invalid fixture");
  expect(r.data.assessments[1]!.reasons).toContain("incomplete_cost");
  expect(r.data.assessments[2]!.reasons).toContain("resource_limit");
});

it("accepts live evidence only for the selection-set winner frozen before held-out confirmation", () => {
  const f = measuredRoutingFixture();
  f.qualificationScope = "live";
  f.catalog = sealTaskModelCatalog({
    kind: "task_model_catalog",
    schemaVersion: 1,
    profiles: f.catalog.profiles.map((p) => ({
      ...p,
      qualification:
        p.qualification.status === "qualified"
          ? { ...p.qualification, scope: "live" }
          : p.qualification,
    })),
  });
  mutate(f, (e) => {
    e.catalogRevision = f.catalog.catalogRevision;
    e.scope = "live";
    e.frozenSelectionConfigurationId = e.candidates[1]!.configurationId;
    e.candidates[1]!.confirmation = "passed";
    e.candidates[1]!.confirmationEvidenceHash = taskContentHash("reviewed-confirmation");
  });
  expect(routeTask(f)).toMatchObject({
    success: true,
    data: { selected: { modelProfileId: "cheap", nativeEffortId: "high" } },
  });
  // Confirming an expensive alternative does not allow reselection on held-out data.
  mutate(f, (e) => {
    e.frozenSelectionConfigurationId = e.candidates[2]!.configurationId;
    e.candidates[2]!.confirmation = "passed";
    e.candidates[2]!.confirmationEvidenceHash = taskContentHash("alternative-confirmation");
  });
  expect(routeTask(f).success).toBe(false);
});
it("includes missing and inconclusive candidate assessment in no-selection error diagnostics", () => {
  const f = measuredRoutingFixture();
  mutate(f, (e) =>
    e.candidates.forEach((c) => {
      c.cost = null;
    }),
  );
  const r = routeTask(f);
  expect(r.success).toBe(false);
  if (r.success) return;
  expect(r.error.details).toMatchObject({
    evaluation: {
      assessments: expect.arrayContaining([
        expect.objectContaining({
          status: "insufficient_evidence",
          reasons: expect.arrayContaining(["missing_cost"]),
        }),
      ]),
    },
  });
});

it("invalidates evidence after execution preference drift and blocks shortened runtime deadline budgets", () => {
  const f = measuredRoutingFixture();
  f.preferences.resourceLimits.maxProviderCalls--;
  expect(routeTask(f)).toMatchObject({
    success: false,
    error: { code: "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED" },
  });
  const g = measuredRoutingFixture();
  g.remaining.wallTimeMs = 999;
  expect(routeTask(g)).toMatchObject({
    success: false,
    error: {
      details: {
        rejectedCandidates: expect.arrayContaining([
          expect.objectContaining({
            modelProfileId: "cheap",
            nativeEffortId: "high",
            reasons: expect.arrayContaining(["budget_exhausted"]),
          }),
        ]),
      },
    },
  });
});
