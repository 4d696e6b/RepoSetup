import type {
  Task,
  TaskBenchmarkFixture,
  TaskPlanDraft,
  TaskReview,
} from "../../packages/core/dist/index.js";

type Blueprint = { id: string; requirements: string[]; write: string[] };
/** Independently authored fixture drafts for simulated compilation-boundary tests,
 * never model capability/quality evidence. Protected scope and all criteria remain frozen. */
const BLUEPRINTS: Record<
  TaskBenchmarkFixture["fixtureId"],
  { tasks: Blueprint[]; edges: [string, string][] }
> = {
  "types-result-v1": {
    tasks: [
      { id: "result", requirements: ["type-1"], write: ["src/result.ts"] },
      {
        id: "page",
        requirements: ["type-2", "type-3", "type-4"],
        write: ["src/page.ts", "test/agent/page.test.ts"],
      },
    ],
    edges: [["result", "page"]],
  },
  "ui-view-model-v1": {
    tasks: [
      {
        id: "view",
        requirements: ["ui-1", "ui-2", "ui-3", "ui-4"],
        write: ["src/view-model.ts", "test/agent/view-model.test.ts"],
      },
    ],
    edges: [],
  },
  "api-offline-v1": {
    tasks: [
      { id: "query", requirements: ["api-2"], write: ["src/query.ts"] },
      {
        id: "handler",
        requirements: ["api-1", "api-3", "api-4"],
        write: ["src/handler.ts", "test/agent/handler.test.ts"],
      },
    ],
    edges: [["query", "handler"]],
  },
  "cross-module-order-v1": {
    tasks: [
      { id: "domain", requirements: ["cross-1"], write: ["src/domain.ts"] },
      { id: "totals", requirements: ["cross-2"], write: ["src/totals.ts"] },
      {
        id: "presenter",
        requirements: ["cross-3", "cross-4"],
        write: ["src/presenter.ts", "test/agent/order.test.ts"],
      },
    ],
    edges: [
      ["domain", "totals"],
      ["domain", "presenter"],
      ["totals", "presenter"],
    ],
  },
  "security-path-policy-v1": {
    tasks: [
      { id: "path", requirements: ["sec-1", "sec-2"], write: ["src/path-policy.ts"] },
      {
        id: "context",
        requirements: ["sec-3", "sec-4"],
        write: ["src/context-policy.ts", "test/agent/policy.test.ts"],
      },
    ],
    edges: [["path", "context"]],
  },
};
export function managedBenchmarkFixtureDraft(input: {
  fixture: TaskBenchmarkFixture;
  review: TaskReview;
  whole: boolean;
  makeTask(id: string, requirements: string[], write: string[]): Task;
}): TaskPlanDraft {
  const { fixture, review, makeTask, whole } = input,
    blueprint = BLUEPRINTS[fixture.fixtureId];
  const tasks = whole
    ? [
        makeTask(
          "whole",
          fixture.requirements.map((r) => r.requirementId),
          fixture.write,
        ),
      ]
    : blueprint.tasks.map((t) => makeTask(t.id, t.requirements, t.write));
  // An optional writable test path is not a promised produced artifact.
  for (const task of tasks)
    for (const output of task.outputs)
      output.paths = output.paths.filter((p) => p.startsWith("src/"));
  return {
    kind: "task_plan_draft",
    schemaVersion: 1,
    phaseId: review.phase.phaseId,
    selectionHash: review.phase.selectionHash,
    tasks,
    dependencies: whole
      ? []
      : blueprint.edges.map(([predecessorTaskId, consumerTaskId]) => ({
          predecessorTaskId,
          consumerTaskId,
          requiredArtifactIds: [`${predecessorTaskId}-output`],
        })),
    unresolvedQuestions: [],
  };
}
