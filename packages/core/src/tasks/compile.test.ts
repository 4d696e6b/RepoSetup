import { describe, expect, it } from "vitest";
import { compileTaskPlan, validateTaskPlan, type TaskCompilationPolicy } from "./compile.js";
import { taskContentHash } from "./canonical.js";
import { makeCompilation, makeTask } from "./fixtures.test-helper.js";

function rejected(input: ReturnType<typeof makeCompilation>, code: string): void {
  const result = compileTaskPlan(input);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.code).toBe(code);
}
describe("pure task compilation", () => {
  it("covers requirements, freezes nested values and orders artifact dependencies", () => {
    const input = makeCompilation();
    const before = structuredClone(input);
    const result = compileTaskPlan(input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(input).toEqual(before);
    expect(result.data.orderedTaskIds).toEqual(["producer", "consumer"]);
    expect(result.data.coverage[0]).toEqual({
      requirementId: "req-one",
      taskIds: ["producer"],
      taskCriterionIds: ["producer-criterion"],
      phaseCriterionIds: ["req-one-phase"],
      requiredArtifactIds: ["producer-output"],
    });
    expect(Object.isFrozen(result.data.tasks[0]?.scope.write)).toBe(true);
    expect(validateTaskPlan(result.data, input.policy).success).toBe(true);
  });
  it("canonicalizes sets and declaration order while preserving ordered criteria", () => {
    const input = makeCompilation();
    const original = compileTaskPlan(input);
    input.draft.tasks.reverse();
    input.draft.tasks.forEach((task) => task.requiredCheckIds.reverse());
    const reordered = compileTaskPlan(input);
    expect(reordered).toEqual(original);
    input.draft.tasks[0]!.criteria[0]!.statement = "Changed acceptance behavior.";
    const changed = compileTaskPlan(input);
    expect(changed.success).toBe(true);
    if (changed.success && original.success)
      expect(changed.data.planId).not.toBe(original.data.planId);
  });
  it("chooses lexical ready order without locale dependence", () => {
    const input = makeCompilation();
    input.draft.dependencies = [];
    const result = compileTaskPlan(input);
    if (!result.success) throw result.error;
    expect(result.data.orderedTaskIds).toEqual(["consumer", "producer"]);
  });
  it("does not fabricate decomposition", () => {
    const input = makeCompilation();
    const result = compileTaskPlan({
      phase: input.phase,
      project: input.project,
      policy: input.policy,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_DECOMPOSITION_REQUIRED");
  });
  it.each([
    [
      "duplicate task",
      "TASK_ID_DUPLICATE",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks.push(x.draft.tasks[0]!);
      },
    ],
    [
      "duplicate requirement",
      "TASK_ID_DUPLICATE",
      (x: ReturnType<typeof makeCompilation>) => {
        x.phase.requirements.push(x.phase.requirements[0]!);
      },
    ],
    [
      "uncovered requirement",
      "TASK_REQUIREMENT_UNCOVERED",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks.pop();
        x.draft.dependencies = [];
      },
    ],
    [
      "dangling requirement",
      "TASK_REFERENCE_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks[0]!.requirementIds = ["missing"];
      },
    ],
    [
      "unowned criterion",
      "TASK_REFERENCE_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks[0]!.criteria[0]!.requirementIds = ["req-two"];
      },
    ],
    [
      "missing output criterion",
      "TASK_ARTIFACT_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks[0]!.outputs[0]!.criterionIds = ["absent"];
      },
    ],
    [
      "duplicate criterion",
      "TASK_ID_DUPLICATE",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks[1]!.criteria[0]!.criterionId = "producer-criterion";
      },
    ],
    [
      "wrong producer",
      "TASK_ARTIFACT_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.dependencies[0]!.requiredArtifactIds = ["consumer-output"];
      },
    ],
    [
      "dangling edge",
      "TASK_REFERENCE_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.dependencies[0]!.consumerTaskId = "absent";
      },
    ],
    [
      "self edge",
      "TASK_DEPENDENCY_CYCLE",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.dependencies[0]!.consumerTaskId = "producer";
      },
    ],
    [
      "duplicate edge",
      "TASK_ARTIFACT_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.dependencies.push(x.draft.dependencies[0]!);
      },
    ],
    [
      "cycle",
      "TASK_DEPENDENCY_CYCLE",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.dependencies.push({
          predecessorTaskId: "consumer",
          consumerTaskId: "producer",
          requiredArtifactIds: ["consumer-output"],
        });
      },
    ],
    [
      "stale selection",
      "TASK_PLAN_REVISION_STALE",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.selectionHash = `sha256:${"c".repeat(64)}`;
      },
    ],
    [
      "blocking decision",
      "TASK_AMBIGUOUS_REQUIREMENT",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.unresolvedQuestions.push({
          questionId: "architecture",
          question: "Which API?",
          requirementIds: ["req-one"],
          blocking: true,
        });
      },
    ],
    [
      "missing profile check",
      "TASK_REFERENCE_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks[0]!.requiredCheckIds.pop();
      },
    ],
    [
      "untrusted check",
      "TASK_REFERENCE_INVALID",
      (x: ReturnType<typeof makeCompilation>) => {
        x.draft.tasks[0]!.requiredCheckIds.push("shell.test");
      },
    ],
  ])("rejects %s", (_name, code, mutate) => {
    const input = makeCompilation();
    mutate(input);
    rejected(input, code);
  });
  it("raises evidenced capability floors without selecting effort/model or mutating a draft", () => {
    const input = makeCompilation();
    input.draft.tasks[0]!.capabilityRequirements.features = ["security_sensitive"];
    const result = compileTaskPlan(input);
    if (!result.success) throw result.error;
    expect(
      result.data.tasks.find((task) => task.taskId === "producer")?.capabilityRequirements
        .minimumCapabilityClass,
    ).toBe("strong");
    expect(input.draft.tasks[0]!.capabilityRequirements.minimumCapabilityClass).toBe("baseline");
    expect("nativeEffortId" in result.data.tasks[0]!.capabilityRequirements).toBe(false);
  });
  it("revalidates semantic coverage even after a tampered plan is rehashed", () => {
    const input = makeCompilation();
    const result = compileTaskPlan(input);
    if (!result.success) throw result.error;
    const { planId, ...payload } = structuredClone(result.data);
    expect(planId).toBe(result.data.planId);
    payload.coverage[0]!.taskIds = ["consumer"];
    const forged = { ...payload, planId: taskContentHash(payload) };
    const validated = validateTaskPlan(forged, input.policy);
    expect(validated.success).toBe(false);
    if (!validated.success) expect(validated.error.code).toBe("TASK_PLAN_INVALID");
  });
  it("intersects reviewed authority and refuses overlapping/case-aliased owners", () => {
    const input = makeCompilation();
    input.draft.tasks[1] = makeTask("consumer", "req-two", "src/contracts.ts");
    rejected(input, "TASK_OWNERSHIP_CONFLICT");
    input.draft.tasks[1] = makeTask("consumer", "req-two", "src/Contracts.ts");
    input.policy.authority.write.push("src/Contracts.ts");
    input.policy.caseSensitivePaths = false;
    rejected(input, "TASK_OWNERSHIP_CONFLICT");
    input.draft.tasks[1] = makeTask("consumer", "req-two", "src/contracts.ts/child.ts");
    input.policy.authority.write.push("src/contracts.ts/child.ts");
    rejected(input, "TASK_OWNERSHIP_CONFLICT");
  });
  it("merges policy denies before validating outputs, and rejects unreviewed reads", () => {
    const input = makeCompilation();
    const policy: TaskCompilationPolicy = input.policy;
    policy.authority.deny = [{ type: "file", path: "src/contracts.ts" }];
    rejected({ ...input, policy: policy as typeof input.policy }, "TASK_SCOPE_VIOLATION");
    const fresh = makeCompilation();
    fresh.draft.tasks[0]!.scope.read.push({ type: "subtree", path: "other" });
    rejected(fresh, "TASK_SCOPE_VIOLATION");
  });
  it("rejects a changed check policy when validating an existing frozen plan", () => {
    const input = makeCompilation();
    const result = compileTaskPlan(input);
    if (!result.success) throw result.error;
    const policy = { ...input.policy, checkCatalogRevision: `sha256:${"b".repeat(64)}` };
    expect(validateTaskPlan(result.data, policy).success).toBe(false);
  });
});
