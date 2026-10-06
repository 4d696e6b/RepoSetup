import { describe, expect, it } from "vitest";
import { makeCompilation, HASH, RUN } from "./fixtures.test-helper.js";
import { compileTaskPlan } from "./compile.js";
import { evaluateTaskVerification } from "./verification.js";
import {
  taskVerificationCatalogHash,
  validateTaskVerificationPolicy,
  type TaskCheckObservation,
  type TaskVerificationPolicy,
} from "./verification-policy.js";

function fixture(phase = false) {
  const compilation = makeCompilation();
  const ids = [
    "ts.typecheck",
    "ts.lint",
    "ts.unit",
    "task.acceptance",
    "phase.acceptance",
  ] as const;
  const definitions: TaskVerificationPolicy["definitions"] = ids.map((checkId) => ({
    checkId,
    definitionRevision: HASH,
    requiredTestIds: checkId === "ts.unit" ? ["independent-test"] : [],
    authority: "executor",
    criterionIds:
      checkId === "phase.acceptance"
        ? compilation.phase.phaseCriteria.map((c) => c.criterionId)
        : ["producer-criterion"],
    evidenceArtifactIds: ["independent-evidence"],
  }));
  const policy: TaskVerificationPolicy = {
    schemaVersion: 1,
    definitions,
    catalogRevision: taskVerificationCatalogHash(definitions),
  };
  compilation.policy.checkCatalogRevision = policy.catalogRevision;
  const compiled = compileTaskPlan(compilation);
  if (!compiled.success) throw new Error(compiled.error.message);
  const observations: TaskCheckObservation[] = ids
    .filter((id) => (phase ? id !== "task.acceptance" : id !== "phase.acceptance"))
    .map((checkId) => ({
      checkId,
      definitionRevision: HASH,
      checkedRevision: HASH,
      provenance: "executor",
      disposition: "completed",
      exitCode: 0,
      timedOut: false,
      truncated: false,
      durationMs: 1,
      outputHash: HASH,
      evidenceArtifactIds: ["independent-evidence"],
      testInventory:
        checkId === "ts.unit"
          ? {
              discovered: ["independent-test"],
              passed: ["independent-test"],
              failed: [],
              skipped: [],
              todo: [],
              focused: false,
              complete: true,
            }
          : null,
    }));
  return {
    plan: compiled.data,
    runId: RUN,
    target: phase
      ? { type: "phase" as const, phaseId: "phase-one" }
      : { type: "task" as const, taskId: "producer" },
    inputRevision: HASH,
    policy,
    observations,
    audit: {
      beforeRevision: HASH,
      afterRevision: HASH,
      currentRevision: HASH,
      immutableInputsConfirmed: true,
      complete: true,
      unexpectedChanges: [] as string[],
      startedAt: "2026-10-06T00:00:00Z",
      finishedAt: "2026-10-06T00:00:01Z",
      durationMs: 1000,
    },
  };
}
function result(input: ReturnType<typeof fixture>) {
  const evaluated = evaluateTaskVerification(input);
  if (!evaluated.success) throw new Error(evaluated.error.code);
  return evaluated.data;
}
describe("trusted task evidence evaluation", () => {
  it("passes only independent current-revision checks and criterion evidence, and freezes the result", () => {
    const input = fixture();
    const output = result(input);
    expect(output.outcome).toBe("pass");
    expect(output.criterionCoverage.every((c) => c.satisfied)).toBe(true);
    expect(Object.isFrozen(output.checks)).toBe(true);
    expect(result(fixture()).verificationId).toBe(output.verificationId);
  });
  it("requires a separate phase oracle plus typecheck, lint and unit checks", () => {
    const input = fixture(true);
    expect(result(input).outcome).toBe("pass");
    input.observations = input.observations.filter((o) => o.checkId !== "phase.acceptance");
    expect(result(input).outcome).toBe("blocked");
    expect(result(input).criterionCoverage.every((c) => !c.satisfied)).toBe(true);
  });
  it("does not accept model claims, even with complete pass-like evidence", () => {
    const input = fixture();
    input.observations.forEach((o) => (o.provenance = "model_claim"));
    expect(result(input).outcome).toBe("needs_review");
    expect(result(input).checks.every((c) => c.failureCode === "TASK_NEEDS_REVIEW")).toBe(true);
  });
  it.each(["timedOut", "truncated"] as const)("blocks %s reports", (flag) => {
    const input = fixture();
    input.observations[0]![flag] = true;
    expect(result(input).outcome).toBe("blocked");
  });
  it("blocks missing tools and omitted mandatory checks", () => {
    const input = fixture();
    input.observations[0]!.disposition = "unavailable";
    expect(result(input).checks.find((c) => c.checkId === "ts.typecheck")?.failureCode).toBe(
      "TASK_PREREQUISITE_MISSING",
    );
    input.observations = [];
    expect(result(input).outcome).toBe("blocked");
  });
  it("fails nonzero execution and never satisfies criteria after any failed check", () => {
    const input = fixture();
    input.observations[0]!.exitCode = 1;
    expect(result(input).outcome).toBe("fail");
    expect(result(input).criterionCoverage.every((c) => !c.satisfied)).toBe(true);
  });
  it("fails zero tests despite exit zero", () => {
    const input = fixture();
    const tests = input.observations.find((o) => o.checkId === "ts.unit")!.testInventory!;
    tests.discovered = [];
    tests.passed = [];
    expect(result(input).checks.find((c) => c.checkId === "ts.unit")?.failureCode).toBe(
      "TASK_CHECK_ZERO_TESTS",
    );
  });
  it.each(["skipped", "todo", "focused", "missing", "failed"])(
    "fails %s required tests",
    (state) => {
      const input = fixture();
      const tests = input.observations.find((o) => o.checkId === "ts.unit")!.testInventory!;
      if (state === "focused") tests.focused = true;
      else if (state === "missing") {
        tests.discovered = ["other-test"];
        tests.passed = ["other-test"];
      } else {
        tests.passed = [];
        tests[state as "skipped" | "todo" | "failed"] = ["independent-test"];
      }
      expect(result(input).outcome).toBe("fail");
    },
  );
  it("blocks incomplete and contradictory test reports", () => {
    const input = fixture();
    const tests = input.observations.find((o) => o.checkId === "ts.unit")!.testInventory!;
    tests.failed = [...tests.passed];
    expect(result(input).outcome).toBe("blocked");
    tests.failed = [];
    tests.complete = false;
    expect(result(input).outcome).toBe("blocked");
  });
  it("rejects stale check definitions and stale checked revisions", () => {
    const input = fixture();
    input.observations[0]!.definitionRevision = `sha256:${"b".repeat(64)}`;
    expect(result(input).outcome).toBe("blocked");
    input.observations[0]!.definitionRevision = HASH;
    input.observations[0]!.checkedRevision = `sha256:${"b".repeat(64)}`;
    expect(result(input).outcome).toBe("fail");
  });
  it("fails project writes, current drift and unconfirmed immutable inputs", () => {
    for (const mutate of [
      (input: ReturnType<typeof fixture>) => input.audit.unexpectedChanges.push("src/new.ts"),
      (input: ReturnType<typeof fixture>) =>
        (input.audit.afterRevision = `sha256:${"b".repeat(64)}`),
      (input: ReturnType<typeof fixture>) =>
        (input.audit.currentRevision = `sha256:${"b".repeat(64)}`),
      (input: ReturnType<typeof fixture>) => (input.audit.immutableInputsConfirmed = false),
    ]) {
      const input = fixture();
      mutate(input);
      expect(result(input).outcome).toBe("fail");
    }
    const input = fixture();
    input.audit.complete = false;
    expect(result(input).outcome).toBe("blocked");
  });
  it("requires criterion bindings and current independent evidence, not just a passing check", () => {
    const input = fixture();
    input.policy.definitions.forEach((d) => (d.criterionIds = []));
    input.policy.catalogRevision = taskVerificationCatalogHash(input.policy.definitions);
    input.plan = { ...input.plan, checkCatalogRevision: input.policy.catalogRevision };
    expect(result(input).outcome).toBe("needs_review");
    const absent = fixture();
    absent.observations.forEach((o) => (o.evidenceArtifactIds = []));
    expect(result(absent).outcome).toBe("needs_review");
    const forged = fixture();
    forged.observations[0]!.evidenceArtifactIds = ["model-evidence"];
    expect(result(forged).outcome).toBe("needs_review");
  });
  it("requires explicitly bound reviewer authority for reviewer criteria", () => {
    const input = fixture();
    input.plan = {
      ...input.plan,
      tasks: input.plan.tasks.map((t) =>
        t.taskId === "producer"
          ? {
              ...t,
              criteria: t.criteria.map((c) => ({
                ...c,
                evidenceKind: "reviewer_evidence" as const,
                checkIds: ["task.acceptance"],
              })),
            }
          : t,
      ),
    };
    expect(result(input).outcome).toBe("needs_review");
    input.policy.definitions.find((d) => d.checkId === "task.acceptance")!.authority = "reviewer";
    input.policy.catalogRevision = taskVerificationCatalogHash(input.policy.definitions);
    input.plan = { ...input.plan, checkCatalogRevision: input.policy.catalogRevision };
    input.observations.find((o) => o.checkId === "task.acceptance")!.provenance = "reviewer";
    expect(result(input).outcome).toBe("pass");
  });
  it("rejects duplicates, extra fields, catalog tampering and observations for a different target", () => {
    const input = fixture();
    expect(validateTaskVerificationPolicy({ ...input.policy, command: "anything" }).success).toBe(
      false,
    );
    expect(validateTaskVerificationPolicy({ ...input.policy, catalogRevision: HASH }).success).toBe(
      false,
    );
    input.policy.definitions.push(input.policy.definitions[0]!);
    expect(validateTaskVerificationPolicy(input.policy).success).toBe(false);
    const duplicate = fixture();
    duplicate.observations.push(duplicate.observations[0]!);
    expect(evaluateTaskVerification(duplicate).success).toBe(false);
    const other = fixture(true);
    other.target = { type: "task", taskId: "absent" };
    expect(evaluateTaskVerification(other).success).toBe(false);
  });
});
