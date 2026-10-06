import { describe, expect, it } from "vitest";
import { makeCompilation, RUN, HASH } from "./fixtures.test-helper.js";
import {
  compileTaskPlan,
  createPortableHandoff,
  selectPortableTask,
  DEFAULT_HANDOFF_PREFERENCES,
  parseTaskDocument,
  parsePortablePlanInput,
  taskContentHash,
  taskContainsPrivateMaterial,
  taskByteHash,
  taskReviewSchema,
} from "./index.js";
import type { TaskMaterializedContext } from "./context-types.js";
function fixture() {
  const input = makeCompilation();
  const compiled = compileTaskPlan(input);
  if (!compiled.success) throw compiled.error;
  const payload = {
    kind: "task_context" as const,
    schemaVersion: 1 as const,
    planId: compiled.data.planId,
    taskId: "producer",
    inputRevision: HASH,
    sources: [],
    rules: [],
    predecessorArtifacts: [],
    size: { bytes: 0, estimatedInputTokens: 0, estimatorId: "test-estimator" },
    unresolvedReferences: [],
  };
  const materialized: TaskMaterializedContext = {
    context: { ...payload, contextId: taskContentHash(payload) },
    files: [],
    writeTargets: [],
  };
  return {
    input,
    plan: compiled.data,
    materialized,
    taskId: "producer",
    runId: RUN,
    attemptNumber: 1,
    preferences: DEFAULT_HANDOFF_PREFERENCES,
  };
}
describe("advisory portable handoff", () => {
  it("selects only independent candidates and blocks dependent work without acceptance authority", () => {
    const f = fixture();
    expect(selectPortableTask(f.plan)).toEqual({ success: true, data: "producer" });
    const blocked = selectPortableTask(f.plan, "consumer");
    expect(blocked.success).toBe(false);
    if (!blocked.success) expect(blocked.error.code).toBe("TASK_CHECK_BLOCKED");
    expect(selectPortableTask(f.plan, "absent").success).toBe(false);
  });
  it("carries capability, native effort, requirements and outputs without fictional model routing", () => {
    const f = fixture();
    const result = createPortableHandoff(f);
    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    expect(result.data.handoff.recommendedRouting).toBeNull();
    expect(result.data.handoff.capabilityRequirements.minimumCapabilityClass).toBe("baseline");
    expect(result.data.handoff.effortPreference).toEqual({ type: "minimum_supported" });
    expect(result.data.handoff.requirements.map((item) => item.requirementId)).toEqual(["req-one"]);
    expect(result.data.handoff.outputs[0]!.artifactId).toBe("producer-output");
    expect(result.data.handoff.enforcement).toEqual({
      routing: "advisory",
      scope: "advisory",
      budgets: "advisory",
      verification: "unconfirmed",
    });
    expect(result.data.handoff.attemptId).toBe(`${RUN}/producer/1`);
    expect(parseTaskDocument(result.data.handoff).success).toBe(true);
    expect(Object.isFrozen(result.data.handoff)).toBe(true);
  });
  it("rejects invalid identities, attempt ceilings, mismatched context, managed mode and packet overflow", () => {
    const f = fixture();
    expect(createPortableHandoff({ ...f, runId: "invalid" }).success).toBe(false);
    expect(createPortableHandoff({ ...f, attemptNumber: 4 }).success).toBe(false);
    expect(
      createPortableHandoff({ ...f, preferences: { ...f.preferences, executionMode: "managed" } })
        .success,
    ).toBe(false);
    expect(
      createPortableHandoff({
        ...f,
        materialized: {
          ...f.materialized,
          context: { ...f.materialized.context, taskId: "consumer" },
        },
      }).success,
    ).toBe(false);
    const files = Array.from({ length: 4 }, (_, index) => ({
      path: `src/context-${index}.ts`,
      text: "x".repeat(65536),
    }));
    const contextPayload = {
      ...f.materialized.context,
      sources: files.map((file) => ({
        path: file.path,
        fileHash: taskContentHash(file.text),
        selectionHash: taskByteHash(file.text),
        byteLength: 65536,
        inclusionReasons: ["local_import" as const],
        required: false,
      })),
    };
    const { contextId: previousId, ...payload } = contextPayload;
    expect(previousId).toBe(f.materialized.context.contextId);
    const overflow = createPortableHandoff({
      ...f,
      materialized: {
        ...f.materialized,
        context: { ...payload, contextId: taskContentHash(payload) },
        files,
      },
    });
    expect(overflow.success).toBe(false);
    if (!overflow.success) expect(overflow.error.code).toBe("TASK_CONTEXT_LIMIT_EXCEEDED");
  });
  it("accepts strict compilation receipts or raw plans and rejects duplicate/unknown wrapper fields", () => {
    const f = fixture();
    const receipt = {
      version: 1,
      kind: "task_compilation",
      dryRun: true,
      baselineGit: "not_checked",
      plan: f.plan,
    };
    expect(parsePortablePlanInput(JSON.stringify(receipt)).success).toBe(true);
    expect(parsePortablePlanInput(JSON.stringify(f.plan)).success).toBe(true);
    expect(parsePortablePlanInput(JSON.stringify({ ...receipt, command: "bad" })).success).toBe(
      false,
    );
    expect(
      parsePortablePlanInput(
        JSON.stringify(receipt).replace('"version":1', '"version":1,"version":1'),
      ).success,
    ).toBe(false);
  });
  it("strictly separates review authority from model drafts and screens metadata string values", () => {
    const f = fixture();
    const review = {
      kind: "task_review",
      schemaVersion: 1,
      phase: f.input.phase,
      project: f.input.project,
      policy: f.input.policy,
    };
    expect(taskReviewSchema.safeParse(review).success).toBe(true);
    expect(taskReviewSchema.safeParse({ ...review, providerKey: "private" }).success).toBe(false);
    expect(taskContainsPrivateMaterial({ objective: 'api_key="synthetic-private-value"' })).toBe(
      true,
    );
    expect(taskContainsPrivateMaterial({ objective: "Implement public types." })).toBe(false);
  });
});
