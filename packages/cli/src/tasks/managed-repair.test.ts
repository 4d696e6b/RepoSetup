import { describe, it, expect, vi } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  executeManagedTaskPhase,
  taskContentHash,
  taskByteHash,
  sealTaskModelCatalog,
  sealTaskRunCheckpoint,
  validateTaskRunCheckpoint,
  type TaskParseResult,
  type TaskPreferences,
} from "@reposetup/core";
import {
  createOpenAITaskProvider,
  PROVIDER_PRICE_REVISION,
  PROVIDER_TRANSPORT_PROFILES,
} from "./provider-adapter.js";
import { runFixture, LIMITS, HASH } from "./run-fixture.test-helper.js";
function data<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
const catalog = sealTaskModelCatalog({
  kind: "task_model_catalog",
  schemaVersion: 1,
  profiles: ["gpt-6-luna", "gpt-6.1-sol"].map((profileId) => ({
    profileId,
    adapterId: "openai-responses-v1",
    providerId: "openai-responses-v1",
    available: true,
    reviewedAt: new Date(Date.now() - 86400000).toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    qualification: {
      status: "qualified",
      scope: "offline",
      evidenceHash: HASH,
      capabilityClass: profileId === "gpt-6-luna" ? "baseline" : "strong",
      features: ["local_logic"],
    },
    efforts: [
      { nativeEffortId: profileId === "gpt-6-luna" ? "none" : "low", minimumOutputTokens: 512 },
    ],
    maxContextTokens: 1050000,
    maxOutputTokens: 16384,
    price: {
      catalogRevision: PROVIDER_PRICE_REVISION,
      inputMicrousdPerToken:
        1.1 *
        PROVIDER_TRANSPORT_PROFILES[profileId as keyof typeof PROVIDER_TRANSPORT_PROFILES].input,
      outputMicrousdPerToken:
        1.1 *
        PROVIDER_TRANSPORT_PROFILES[profileId as keyof typeof PROVIDER_TRANSPORT_PROFILES].output,
    },
  })),
});
async function fixture(
  mode:
    | "repair"
    | "incomplete"
    | "unknown"
    | "refused"
    | "infrastructure"
    | "configuration"
    | "incomplete_configuration"
    | "incomplete_unknown_configuration",
) {
  const f = await runFixture();
  const transport = vi.fn<typeof fetch>(async (_url, options) => {
    const request = JSON.parse(options!.body as string),
      document = JSON.parse(request.input),
      id = document.identity;
    const n = Number(id.attemptId.split("/").at(-1));
    const changes =
      id.taskId === "consumer"
        ? [
            {
              type: "create_text",
              path: "src/c.ts",
              expectedState: "absent",
              content: "export const c = 3;\n",
            },
          ]
        : n === 1 || mode !== "repair"
          ? f.producerChanges
          : n === 2
            ? []
            : [
                {
                  type: "replace_text",
                  path: "src/a.ts",
                  expectedFileHash: taskByteHash("export const a = 2;\r\n"),
                  oldText: "2",
                  newText: "3",
                },
              ];
    if (n > 1)
      expect(document.repair).toMatchObject({
        taskId: "producer",
        action: mode === "repair" ? "repair_implementation" : "increase_output",
      });
    const reply = changes.length
      ? { type: "change_set", changeSet: { kind: "change_set", schemaVersion: 1, ...id, changes } }
      : {
          type: "no_change",
          rationale: "Retain the current implementation for another independent check.",
        };
    return new Response(
      JSON.stringify({
        model:
          mode === "configuration" || mode === "incomplete_configuration"
            ? "different-model"
            : mode === "incomplete_unknown_configuration"
              ? undefined
              : request.model,
        reasoning: mode === "incomplete_unknown_configuration" ? undefined : request.reasoning,
        service_tier: "default",
        status:
          [
            "incomplete",
            "unknown",
            "incomplete_configuration",
            "incomplete_unknown_configuration",
          ].includes(mode) &&
          n === 1 &&
          id.taskId === "producer"
            ? "incomplete"
            : "completed",
        error: null,
        usage:
          mode === "unknown" ? null : { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
        output: [
          {
            type: "message",
            status: "completed",
            content:
              mode === "refused"
                ? [{ type: "refusal", refusal: "No" }]
                : [
                    {
                      type: "output_text",
                      text: JSON.stringify({
                        kind: "task_provider_reply",
                        schemaVersion: 1,
                        ...id,
                        reply,
                      }),
                    },
                  ],
          },
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );
  });
  const resolveProvider = (c: { modelProfileId: string; nativeEffortId: string }) =>
    createOpenAITaskProvider({
      model: c.modelProfileId,
      effort: c.nativeEffortId,
      environment: { OPENAI_API_KEY: "fake-test-only" },
      transport,
    });
  const provider = data(resolveProvider({ modelProfileId: "gpt-6.1-sol", nativeEffortId: "low" }));
  const { planId: _old, ...payload } = f.plan;
  void _old;
  const project = {
    ...payload.project,
    baselineTreeHash: taskContentHash(data(await f.adapter.snapshot()).entries),
  };
  const next = { ...payload, project };
  const plan = { ...next, planId: taskContentHash(next) };
  const runner = vi.fn(async (r: { args: readonly string[] }) => {
    if (r.args.includes("--show-toplevel"))
      return { exitCode: 0, stdout: `${f.root}\n`, stderr: "" };
    if (r.args.includes("HEAD"))
      return { exitCode: 0, stdout: `${project.baselineCommit}\n`, stderr: "" };
    if (r.args.includes("status")) return { exitCode: 0, stdout: "", stderr: "" };
    const code = await readFile(path.join(f.root, "src/a.ts"), "utf8");
    const exitCode = mode === "repair" && !code.includes("3;") ? 1 : 0;
    f.exitCode = exitCode;
    return {
      exitCode,
      stdout: "",
      stderr: "",
      ...(mode === "infrastructure" ? { timedOut: true } : {}),
    };
  });
  const execute = (
    options: {
      routed?: boolean;
      output?: number;
      limits?: typeof LIMITS;
      scope?: "offline" | "live";
    } = {},
  ) => {
    const limits = options.limits ?? LIMITS;
    const preferences: TaskPreferences = {
      kind: "task_preferences",
      schemaVersion: 1,
      executionMode: "managed",
      qualityPreference: "balanced",
      supportProfileId: "managed-ts-node-v1",
      providerAvailability: [
        {
          providerId: "openai-responses-v1",
          enabled: true,
          modelProfileIds: ["gpt-6-luna", "gpt-6.1-sol"],
        },
      ],
      effortPreference: { type: "minimum_supported" },
      resourceLimits: limits,
      exclusions: [],
    };
    return executeManagedTaskPhase({
      plan,
      compilationPolicy: f.policy,
      resourceLimits: limits,
      projectRoot: f.root,
      gitExecutable: "/trusted/git",
      adapter: f.adapter,
      provider,
      verification: { policy: f.verificationPolicy, adapter: f.verifier, runProcess: runner },
      allowProviderUsage: true,
      maxOutputTokens: options.output ?? 8192,
      timeoutMs: 1000,
      allowRepair: true,
      ...(options.routed
        ? {
            routing: { catalog, preferences, qualificationScope: options.scope ?? "offline" },
            resolveProvider,
          }
        : {}),
    });
  };
  return { f, transport, execute, plan };
}
describe("serial managed repair and trusted routing (offline SDK transport)", () => {
  it("repairs only the failed producer and independently escalates baseline capability on its third attempt", async () => {
    const { f, transport, execute } = await fixture("repair");
    try {
      const r = await execute({ routed: true });
      expect(r, JSON.stringify(r)).toMatchObject({ success: true });
      if (!r.success) return;
      expect(
        r.checkpoint.run.attempts.map((a) => [
          a.taskId,
          a.requestedConfiguration.modelProfileId,
          a.requestedConfiguration.nativeEffortId,
        ]),
      ).toEqual([
        ["producer", "gpt-6-luna", "none"],
        ["producer", "gpt-6-luna", "none"],
        ["producer", "gpt-6.1-sol", "low"],
        ["consumer", "gpt-6-luna", "none"],
      ]);
      expect(r.checkpoint.bindings.every((b) => Boolean(b.routing))).toBe(true);
      expect(r.checkpoint.run.resourceLedger.reservations).toHaveLength(4);
      expect(r.checkpoint.run.attempts[2]!.effectiveConfiguration).toMatchObject({
        provenance: "provider_reported",
        configuration: { modelProfileId: "gpt-6.1-sol", nativeEffortId: "low" },
      });
      expect(validateTaskRunCheckpoint(r.checkpoint).success).toBe(true);
      expect(transport).toHaveBeenCalledTimes(4);
      expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("3;");
    } finally {
      await f.cleanup();
    }
  });
  it("increases known incomplete output within the approved ceiling, retaining the original reservation and configuration", async () => {
    const { f, transport, execute } = await fixture("incomplete");
    try {
      const r = await execute({ routed: true });
      expect(r, JSON.stringify(r)).toMatchObject({ success: true });
      if (!r.success) return;
      const requests = transport.mock.calls.map(([, o]) => JSON.parse(o!.body as string));
      expect(requests.map((r) => r.max_output_tokens)).toEqual([4096, 8192, 4096]);
      expect(requests.slice(0, 2).map((r) => r.model)).toEqual(["gpt-6-luna", "gpt-6-luna"]);
      expect(r.checkpoint.run.attempts[0]!.application.effects).toEqual([]);
      expect(r.checkpoint.run.resourceLedger.reservations).toHaveLength(3);
    } finally {
      await f.cleanup();
    }
  });
  it.each([
    "unknown",
    "refused",
    "infrastructure",
    "configuration",
    "incomplete_configuration",
    "incomplete_unknown_configuration",
  ] as const)("does not auto-repair %s failure", async (mode) => {
    const { f, transport, execute } = await fixture(mode);
    try {
      expect(await execute({ routed: true })).toMatchObject({ success: false });
      expect(transport).toHaveBeenCalledOnce();
    } finally {
      await f.cleanup();
    }
  });
  it.each(["output", "calls"] as const)(
    "persists a terminal %s ceiling before any extra call or attempt",
    async (ceiling) => {
      const { f, transport, execute, plan } = await fixture(
        ceiling === "output" ? "incomplete" : "repair",
      );
      try {
        const r = await execute({
          output: ceiling === "output" ? 4096 : 8192,
          limits: ceiling === "calls" ? { ...LIMITS, maxProviderCalls: 1 } : LIMITS,
        });
        expect(r).toMatchObject({
          success: false,
          error: {
            code: ceiling === "output" ? "TASK_OUTPUT_INCOMPLETE" : "TASK_BUDGET_EXHAUSTED",
          },
        });
        if (r.success || !r.runId) return;
        const c = await f.requireRun({ type: "reconcile", runId: r.runId }, { plan });
        expect(c.run.attempts).toHaveLength(1);
        expect(c.run.tasks[0]!.status).toBe("blocked");
        expect(transport).toHaveBeenCalledOnce();
        expect(c.run.resourceLedger.reservations).toHaveLength(1);
      } finally {
        await f.cleanup();
      }
    },
  );
  it("rechecks trusted selection before dispatch and rejects a rehashed stored capacity claim", async () => {
    const f = await runFixture();
    try {
      const transport = vi.fn<typeof fetch>();
      const provider = data(
        createOpenAITaskProvider({
          model: "gpt-6.1-sol",
          effort: "low",
          environment: { OPENAI_API_KEY: "fake-test-only" },
          transport,
        }),
      );
      const preferences: TaskPreferences = {
        kind: "task_preferences",
        schemaVersion: 1,
        executionMode: "managed",
        qualityPreference: "conservative",
        supportProfileId: "managed-ts-node-v1",
        providerAvailability: [
          { providerId: "openai-responses-v1", enabled: true, modelProfileIds: ["gpt-6.1-sol"] },
        ],
        effortPreference: { type: "explicit", nativeEffortId: "low" },
        resourceLimits: LIMITS,
        exclusions: [],
      };
      const routing = { catalog, preferences, qualificationScope: "offline" as const };
      const created = await f.requireRun({ type: "create", resourceLimits: LIMITS }, { routing });
      const runId = created.run.runId;
      const c = await f.requireRun(
        { type: "begin_routed", runId, taskId: "producer", maxOutputTokens: 4096 },
        { routing },
      );
      const forged = structuredClone(c);
      forged.bindings[0]!.routing!.selected.maxContextTokens = 2000000;
      const { routingId: _id, ...decision } = forged.bindings[0]!.routing!;
      void _id;
      forged.bindings[0]!.routing!.routingId = taskContentHash(decision);
      forged.run.attempts[0]!.routingId = forged.bindings[0]!.routing!.routingId;
      const { checkpointHash: _hash, ...payload } = forged;
      void _hash;
      const sealed = sealTaskRunCheckpoint(payload);
      expect(validateTaskRunCheckpoint(sealed).success).toBe(true); // integrity alone is not authority
      await writeFile(
        path.join(f.stateRoot, taskByteHash(f.root).slice(7), `${runId}.json`),
        JSON.stringify(sealed),
      );
      expect(
        await f.execute(
          {
            type: "request",
            runId,
            allowProviderUsage: true,
            maxOutputTokens: 4096,
            timeoutMs: 1000,
          },
          { routing, provider },
        ),
      ).toMatchObject({
        success: false,
        error: { code: "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED" },
      });
      expect(transport).not.toHaveBeenCalled();
      expect(await f.execute({ type: "reconcile", runId })).toMatchObject({
        success: false,
        error: { code: "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED" },
      });
    } finally {
      await f.cleanup();
    }
  });
  it("cannot use synthetic offline capability qualification to authorize live routing", async () => {
    const { f, transport, execute } = await fixture("repair");
    try {
      expect(await execute({ routed: true, scope: "live" })).toMatchObject({
        success: false,
        error: { code: "TASK_CAPABILITY_UNAVAILABLE" },
      });
      expect(transport).not.toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });
});
