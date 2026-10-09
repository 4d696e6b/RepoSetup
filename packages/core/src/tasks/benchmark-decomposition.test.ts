import { describe, expect, it } from "vitest";
import { makeCompilation, makeTask, HASH } from "./fixtures.test-helper.js";
import { compileTaskPlan, validateTaskPlan } from "./compile.js";
import { taskContentHash } from "./canonical.js";
import {
  freezeTaskBenchmarkDecomposition,
  replayTaskBenchmarkDecomposition,
  validateTaskBenchmarkDecomposition,
  validateTaskBenchmarkPlanBinding,
} from "./benchmark-decomposition.js";
function fixture() {
  const input = makeCompilation();
  const source = compileTaskPlan(input);
  if (!source.success) throw new Error(source.error.code);
  const frozen = freezeTaskBenchmarkDecomposition({
    plan: source.data,
    policy: input.policy,
    logicalVerificationRevision: HASH,
  });
  if (!frozen.success) throw new Error(frozen.error.code);
  const review = {
    kind: "task_review" as const,
    schemaVersion: 1 as const,
    phase: structuredClone(input.phase),
    policy: structuredClone(input.policy),
    project: {
      rootIdentity: taskContentHash("fresh-root"),
      baselineTreeHash: taskContentHash("fresh-inventory"),
      baselineCommit: "c".repeat(40),
    },
  };
  review.policy.checkCatalogRevision = taskContentHash("fresh-qualified-root-bound-catalog");
  return { input, source: source.data, frozen: frozen.data, review };
}
describe("frozen logical decomposition and root-bound plan replay", () => {
  it("reuses identical tasks/dependencies/coverage with fresh baseline and check binding, without changing the source plan", () => {
    const f = fixture(),
      before = structuredClone(f);
    const r = replayTaskBenchmarkDecomposition({
      decomposition: f.frozen,
      review: f.review,
      logicalVerificationRevision: HASH,
    });
    if (!r.success) throw new Error(r.error.code);
    expect(r.data.plan.planId).not.toBe(f.source.planId);
    expect(r.data.plan.project).toEqual(f.review.project);
    expect(r.data.plan.checkCatalogRevision).toBe(f.review.policy.checkCatalogRevision);
    expect(r.data.plan.tasks).toEqual(f.source.tasks);
    expect(r.data.plan.dependencies).toEqual(f.source.dependencies);
    expect(r.data.plan.coverage).toEqual(f.source.coverage);
    expect(validateTaskPlan(r.data.plan, f.review.policy).success).toBe(true);
    expect(r.data).toMatchObject({
      decompositionId: f.frozen.decompositionId,
      sourcePlanId: f.source.planId,
    });
    expect(f).toEqual(before);
    expect(Object.isFrozen(r.data.plan.tasks)).toBe(true);
    expect(
      replayTaskBenchmarkDecomposition({
        decomposition: f.frozen,
        review: f.review,
        logicalVerificationRevision: HASH,
      }),
    ).toEqual(r);
  });
  it("keeps logical identity across independent root-bound sources but distinguishes their full records", () => {
    const f = fixture();
    const bound = replayTaskBenchmarkDecomposition({
      decomposition: f.frozen,
      review: f.review,
      logicalVerificationRevision: HASH,
    });
    if (!bound.success) throw new Error(bound.error.code);
    const other = freezeTaskBenchmarkDecomposition({
      plan: bound.data.plan,
      policy: f.review.policy,
      logicalVerificationRevision: HASH,
    });
    if (!other.success) throw new Error(other.error.code);
    expect(other.data.decompositionId).toBe(f.frozen.decompositionId);
    expect(other.data.recordHash).not.toBe(f.frozen.recordHash);
  });
  it("accepts reordered policy sets without expanding authority", () => {
    const f = fixture();
    f.review.policy.checkIds.reverse();
    f.review.policy.requiredCheckIds.reverse();
    f.review.policy.authority.write.reverse();
    expect(
      replayTaskBenchmarkDecomposition({
        decomposition: f.frozen,
        review: f.review,
        logicalVerificationRevision: HASH,
      }).success,
    ).toBe(true);
  });
  it.each([
    "phase",
    "scope-widen",
    "scope-narrow",
    "profile",
    "path-mode",
    "checks",
    "verification",
    "command",
  ])("rejects changed %s replay authority", (kind) => {
    const f = fixture();
    if (kind === "phase") f.review.phase.requirements[0]!.text = "Different requirement";
    if (kind === "scope-widen") f.review.policy.authority.write.push("src/extra.ts");
    if (kind === "scope-narrow") f.review.policy.authority.write.pop();
    if (kind === "profile") f.review.policy.supportProfileRevision++;
    if (kind === "path-mode") f.review.policy.caseSensitivePaths = false;
    if (kind === "checks") f.review.policy.requiredCheckIds.pop();
    if (kind === "command") Object.assign(f.review, { command: "PRIVATE_MARKER" });
    const r = replayTaskBenchmarkDecomposition({
      decomposition: f.frozen,
      review: f.review,
      logicalVerificationRevision: kind === "verification" ? taskContentHash("changed") : HASH,
    });
    expect(r).toMatchObject({ success: false, error: { code: "TASK_BENCHMARK_INVALID" } });
    expect(JSON.stringify(r)).not.toContain("PRIVATE_MARKER");
  });
  it.each(["hash", "logical-id", "plan-id", "criterion", "verification", "version", "command"])(
    "rejects %s frozen record corruption",
    (kind) => {
      const f = fixture(),
        changed = structuredClone(f.frozen);
      if (kind === "hash") changed.recordHash = taskContentHash("different");
      if (kind === "logical-id") changed.decompositionId = taskContentHash("different");
      if (kind === "plan-id") changed.sourcePlan.planId = taskContentHash("different");
      if (kind === "criterion")
        changed.sourcePlan.tasks[0]!.criteria[0]!.statement = "Different criterion";
      if (kind === "verification")
        changed.logicalVerificationRevision = taskContentHash("different");
      if (kind === "version") Object.assign(changed, { schemaVersion: 2 });
      if (kind === "command") Object.assign(changed, { command: "PRIVATE_MARKER" });
      if (kind !== "hash") {
        const { recordHash: _old, ...payload } = changed;
        void _old;
        changed.recordHash = taskContentHash(payload);
      }
      const r = validateTaskBenchmarkDecomposition(changed);
      expect(r).toMatchObject({ success: false, error: { code: "TASK_BENCHMARK_INVALID" } });
      expect(JSON.stringify(r)).not.toContain("PRIVATE_MARKER");
    },
  );
  it("enforces the benchmark's six-task ceiling without limiting ordinary compilation", () => {
    const f = fixture();
    for (let i = 0; i < 5; i++) {
      f.input.draft.tasks.push(makeTask(`extra-${i}`, "req-one", `src/extra-${i}.ts`));
      f.input.policy.authority.write.push(`src/extra-${i}.ts`);
    }
    const source = compileTaskPlan(f.input);
    if (!source.success) throw new Error(source.error.code);
    expect(
      freezeTaskBenchmarkDecomposition({
        plan: source.data,
        policy: f.input.policy,
        logicalVerificationRevision: HASH,
      }),
    ).toMatchObject({ success: false, error: { code: "TASK_BENCHMARK_INVALID" } });
  });
  it("validates a retained binding by reconstruction and rejects imported baseline/check/command changes", () => {
    const f = fixture();
    const input = { decomposition: f.frozen, review: f.review, logicalVerificationRevision: HASH };
    const bound = replayTaskBenchmarkDecomposition(input);
    if (!bound.success) throw new Error(bound.error.code);
    expect(validateTaskBenchmarkPlanBinding({ ...input, binding: bound.data })).toEqual(bound);
    for (const kind of ["baseline", "catalog", "command"]) {
      const changed = structuredClone(bound.data);
      if (kind === "baseline") changed.plan.project.baselineTreeHash = taskContentHash("changed");
      if (kind === "catalog") changed.plan.checkCatalogRevision = taskContentHash("changed");
      if (kind === "command") Object.assign(changed, { command: "PRIVATE_MARKER" });
      const { bindingId: _old, ...payload } = changed;
      void _old;
      changed.bindingId = taskContentHash(payload);
      const r = validateTaskBenchmarkPlanBinding({ ...input, binding: changed });
      expect(r).toMatchObject({ success: false, error: { code: "TASK_BENCHMARK_INVALID" } });
      expect(JSON.stringify(r)).not.toContain("PRIVATE_MARKER");
    }
  });
  it.each(["private", "oversized"])(
    "blocks %s decomposition artifacts without echoing source material",
    (kind) => {
      const input = makeCompilation();
      if (kind === "private") input.draft.tasks[0]!.objective = 'api_key="synthetic-private-value"';
      else
        input.draft.tasks[0]!.constraints.push(
          ...Array.from({ length: 6 }, () => "x".repeat(200000)),
        );
      const source = compileTaskPlan(input);
      if (!source.success) throw new Error(source.error.code);
      const r = freezeTaskBenchmarkDecomposition({
        plan: source.data,
        policy: input.policy,
        logicalVerificationRevision: HASH,
      });
      expect(r).toMatchObject({ success: false, error: { code: "TASK_BENCHMARK_INVALID" } });
      expect(JSON.stringify(r)).not.toContain("synthetic-private-value");
    },
  );
});
