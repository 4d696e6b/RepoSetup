import { describe, expect, it } from "vitest";
import {
  parseTaskDocument,
  parseTaskJson,
  taskContentHash,
  compileTaskPlan,
  taskPlanDraftSchema,
  taskPreferencesSchema,
  taskContextSchema,
  taskRoutingSchema,
  taskChangeSetSchema,
  taskVerificationSchema,
  executionAttemptSchema,
  phaseRunSchema,
  taskHandoffSchema,
  taskHandoffResultSchema,
  taskProviderReplySchema,
  taskUsageSchema,
} from "./index.js";
import {
  CONFIGURATION,
  HASH,
  LIMITS,
  makeCompilation,
  RUN,
  USAGE,
} from "./fixtures.test-helper.js";

const common = { schemaVersion: 1, planId: HASH, taskId: "producer", inputRevision: HASH };
const attemptId = `${RUN}/producer/1`;
const unknown = { provenance: "unknown" };
function contentAddressed<T extends object>(payload: T, field: string) {
  return { ...payload, [field]: taskContentHash(payload) };
}
function documents(): Record<string, unknown>[] {
  const input = makeCompilation();
  const compiled = compileTaskPlan(input);
  if (!compiled.success) throw compiled.error;
  const preferences = {
    kind: "task_preferences",
    schemaVersion: 1,
    executionMode: "handoff",
    qualityPreference: "conservative",
    supportProfileId: "managed-ts-node-v1",
    providerAvailability: [],
    effortPreference: { type: "minimum_supported" },
    resourceLimits: LIMITS,
    exclusions: [],
  };
  const context = contentAddressed(
    {
      ...common,
      kind: "task_context",
      sources: [],
      rules: [],
      predecessorArtifacts: [],
      size: { bytes: 0, estimatedInputTokens: 0, estimatorId: "local-byte-estimate" },
      unresolvedReferences: [],
    },
    "contextId",
  );
  const routing = contentAddressed(
    {
      schemaVersion: 1,
      kind: "routing_decision",
      planId: HASH,
      taskId: "producer",
      contextId: HASH,
      catalogRevision: HASH,
      policyRevision: HASH,
      requiredCapabilities: input.draft.tasks[0]!.capabilityRequirements,
      selected: {
        ...CONFIGURATION,
        maxContextTokens: 32000,
        maxOutputTokens: 4096,
        enforcement: "advisory",
        effectiveConfiguration: unknown,
      },
      rejectedCandidates: [],
      rationale: "Reviewed capability floor and separate effort.",
    },
    "routingId",
  );
  const changes = contentAddressed(
    {
      ...common,
      kind: "change_set",
      attemptId,
      changes: [
        {
          type: "create_text",
          path: "src/contracts.ts",
          expectedState: "absent",
          content: "export {};\n",
        },
      ],
    },
    "changeSetId",
  );
  const verification = contentAddressed(
    {
      schemaVersion: 1,
      kind: "task_verification_result",
      planId: HASH,
      runId: RUN,
      target: { type: "task", taskId: "producer" },
      checkedRevision: HASH,
      inputRevision: HASH,
      checkCatalogRevision: HASH,
      outcome: "blocked",
      checks: [],
      criterionCoverage: [],
      unexpectedChanges: [],
      startedAt: "2026-10-06T00:00:00Z",
      finishedAt: "2026-10-06T00:00:01Z",
      durationMs: 1000,
    },
    "verificationId",
  );
  const attempt = {
    ...common,
    kind: "execution_attempt",
    runId: RUN,
    attemptId,
    attemptNumber: 1,
    contextId: HASH,
    routingId: HASH,
    requestedConfiguration: CONFIGURATION,
    effectiveConfiguration: unknown,
    startedAt: "2026-10-06T00:00:00Z",
    finishedAt: null,
    status: "prepared",
    proposalOutcome: "pending",
    application: {
      status: "not_applied",
      effects: [],
      failureCode: null,
      resultingProjectRevision: null,
    },
    verification: null,
    failure: null,
    usage: USAGE,
  };
  const run = {
    schemaVersion: 1,
    kind: "phase_run",
    runId: RUN,
    stateRevision: 1,
    planId: HASH,
    project: { ...input.project, latestProjectRevision: HASH, lastReconciledRevision: HASH },
    executionMode: "handoff",
    supportQualification: { status: "unconfirmed", reasons: [], profileRevision: 1 },
    status: "prepared",
    tasks: [
      {
        taskId: "producer",
        status: "queued",
        attemptIds: [],
        reasonCode: null,
        acceptedVerificationId: null,
      },
    ],
    attempts: [],
    resourceLimits: LIMITS,
    resourceLedger: { reservations: [], consumed: USAGE },
    acceptedArtifacts: [],
    activeAttemptId: null,
    finalVerification: null,
    events: [],
  };
  const handoff = contentAddressed(
    {
      ...common,
      kind: "task_handoff",
      attemptId,
      runId: RUN,
      contextId: HASH,
      objective: "Implement the input contract.",
      requirementIds: ["req-one"],
      constraints: [],
      scope: input.draft.tasks[0]!.scope,
      criteria: input.draft.tasks[0]!.criteria,
      requiredCheckIds: input.draft.tasks[0]!.requiredCheckIds,
      acceptedPredecessorArtifacts: [],
      recommendedRouting: routing,
      resourceLimits: LIMITS,
      enforcement: {
        routing: "advisory",
        scope: "advisory",
        budgets: "advisory",
        verification: "unconfirmed",
      },
      unresolvedReferences: [],
    },
    "handoffId",
  );
  const reply = {
    type: "no_change",
    rationale: "No source changes are needed; acceptance still required.",
  };
  return [
    input.draft,
    compiled.data,
    preferences,
    context,
    routing,
    changes,
    verification,
    attempt,
    run,
    handoff,
    {
      ...common,
      kind: "task_handoff_result",
      attemptId,
      handoffId: HASH,
      reply,
      reportedConfiguration: unknown,
      reportedUsage: USAGE,
    },
    { ...common, kind: "task_provider_reply", attemptId, reply },
  ];
}
describe("strict task contracts", () => {
  it("retains bounded opaque provider call identities without treating them as logical IDs", () => {
    expect(taskUsageSchema.parse({ ...USAGE, providerCallId: "resp_AbC123" }).providerCallId).toBe(
      "resp_AbC123",
    );
    for (const providerCallId of ["", "x".repeat(257), "call\nidentity", "call identity"]) {
      expect(taskUsageSchema.safeParse({ ...USAGE, providerCallId }).success).toBe(false);
    }
  });
  it("accepts every version 1 envelope without granting execution authority", () => {
    for (const document of documents()) {
      expect(parseTaskDocument(document).success, String(document.kind)).toBe(true);
      expect(parseTaskJson(JSON.stringify(document)).success, String(document.kind)).toBe(true);
    }
  });
  it("rejects unknown versions, root fields, and nested executable/secret fields for every envelope", () => {
    for (const document of documents()) {
      const version = parseTaskDocument({ ...document, schemaVersion: 2 });
      expect(version.success).toBe(false);
      if (!version.success) expect(version.error.code).toBe("TASK_SCHEMA_VERSION_UNSUPPORTED");
      expect(parseTaskDocument({ ...document, command: "untrusted-process" }).success).toBe(false);
      expect(
        parseTaskDocument({ ...document, credentials: "synthetic-secret-marker" }).success,
      ).toBe(false);
    }
    const draft = makeCompilation().draft;
    const result = parseTaskDocument({
      ...draft,
      tasks: [
        { ...draft.tasks[0], scope: { ...draft.tasks[0]!.scope, hook: "synthetic-secret-marker" } },
      ],
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain("synthetic-secret-marker");
  });
  it("rejects duplicate and escaped duplicate JSON keys, including deeply nested ones", () => {
    const json = JSON.stringify(makeCompilation().draft);
    expect(
      parseTaskJson(json.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'))
        .success,
    ).toBe(false);
    expect(
      parseTaskJson(json.replace('"schemaVersion":1', '"schemaVersion":1,"\\u0073chemaVersion":1'))
        .success,
    ).toBe(false);
    expect(parseTaskJson(json.replace('"write":[', '"read":[],"write":[')).success).toBe(false);
  });
  it("rejects malformed UTF-8, lone surrogates, excessive depth/bytes, and prototype-like kinds", () => {
    expect(parseTaskJson(new Uint8Array([0xc3, 0x28])).success).toBe(false);
    const draft = makeCompilation().draft;
    draft.tasks[0]!.objective = "\ud800";
    expect(parseTaskDocument(draft).success).toBe(false);
    expect(parseTaskJson("[".repeat(40) + "0" + "]".repeat(40)).success).toBe(false);
    expect(parseTaskJson(" ".repeat(1048577)).success).toBe(false);
    const result = parseTaskDocument({ kind: "__proto__", schemaVersion: 1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_PLAN_INVALID");
  });
  it("rejects invalid counters, authority settings and effort/config mixing", () => {
    const preferences = documents().find((value) => value.kind === "task_preferences")!;
    for (const limit of [0, -1, 1.5, Infinity, NaN, "3"]) {
      expect(
        taskPreferencesSchema.safeParse({
          ...preferences,
          resourceLimits: { ...LIMITS, maxProviderCalls: limit },
        }).success,
      ).toBe(false);
    }
    expect(
      taskPreferencesSchema.safeParse({
        ...preferences,
        resourceLimits: { ...LIMITS, maxImplementationAttemptsPerTask: 4 },
      }).success,
    ).toBe(false);
    expect(
      taskPreferencesSchema.safeParse({
        ...preferences,
        providerAvailability: [
          { providerId: "other-provider", enabled: true, modelProfileIds: [] },
        ],
      }).success,
    ).toBe(false);
    expect(
      taskPreferencesSchema.safeParse({
        ...preferences,
        effortPreference: { type: "explicit", nativeEffortId: "high", modelProfileId: "strong" },
      }).success,
    ).toBe(false);
  });
  it("keeps capability and native effort independent in advisory routing", () => {
    const routing = documents().find((value) => value.kind === "routing_decision")!;
    const parsed = taskRoutingSchema.parse(routing);
    expect(parsed.requiredCapabilities.minimumCapabilityClass).toBe("baseline");
    expect(parsed.selected.nativeEffortId).toBe("low");
    expect(parsed.selected.effectiveConfiguration).toEqual(unknown);
  });
  it("rejects arbitrary patches, deletion and empty ChangeSets; cannot forge an attempt identity", () => {
    const changes = documents().find((value) => value.kind === "change_set")!;
    expect(taskChangeSetSchema.safeParse({ ...changes, changes: [] }).success).toBe(false);
    expect(
      taskChangeSetSchema.safeParse({ ...changes, changes: [{ type: "delete", path: "src/a.ts" }] })
        .success,
    ).toBe(false);
    expect(
      taskChangeSetSchema.safeParse({
        ...changes,
        changes: [{ type: "patch", patch: "arbitrary" }],
      }).success,
    ).toBe(false);
    const attempt = documents().find((value) => value.kind === "execution_attempt")!;
    expect(
      executionAttemptSchema.safeParse({ ...attempt, attemptId: `${RUN}/different/1` }).success,
    ).toBe(false);
  });
  it("all exported schema boundaries reject unknown nested fields", () => {
    const schemas = [
      taskPlanDraftSchema,
      taskPreferencesSchema,
      taskContextSchema,
      taskRoutingSchema,
      taskChangeSetSchema,
      taskVerificationSchema,
      executionAttemptSchema,
      phaseRunSchema,
      taskHandoffSchema,
      taskHandoffResultSchema,
      taskProviderReplySchema,
    ];
    const values = documents();
    for (const schema of schemas) {
      const input = values.find((value) => schema.safeParse(value).success)!;
      const key = Object.keys(input).find(
        (field) =>
          input[field] !== null &&
          typeof input[field] === "object" &&
          (!Array.isArray(input[field]) ||
            (input[field].length > 0 && typeof input[field][0] === "object")),
      );
      expect(key).toBeDefined();
      const member = input[key!];
      const replacement = Array.isArray(member)
        ? [{ ...member[0], command: "disallowed" }, ...member.slice(1)]
        : { ...(member as object), command: "disallowed" };
      expect(schema.safeParse({ ...input, [key!]: replacement }).success).toBe(false);
    }
  });
});
