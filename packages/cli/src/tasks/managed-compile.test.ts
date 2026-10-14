import { describe as describeOnAllPlatforms, it, expect, vi } from "vitest";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  executeTaskCompilation,
  executeManagedTaskPhase,
  prepareTaskCompilationContext,
  taskContentHash,
  taskByteHash,
  validateTaskCompilationCheckpoint,
  sealTaskCompilationCheckpoint,
  type TaskParseResult,
  type TaskReview,
} from "@reposetup/core";
import { createOpenAITaskProvider } from "./provider-adapter.js";
import { runFixture, LIMITS } from "./run-fixture.test-helper.js";
import { runCli } from "../run-cli.js";
import { createDefaultFs } from "../io.js";

function data<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
async function fixture() {
  const f = await runFixture();
  const baseline = data(await f.adapter.snapshot());
  const review: TaskReview = {
    kind: "task_review",
    schemaVersion: 1,
    phase: f.plan.phase,
    project: { ...f.plan.project, baselineTreeHash: taskContentHash(baseline.entries) },
    policy: f.policy,
  };
  const draft = {
    kind: "task_plan_draft",
    schemaVersion: 1,
    phaseId: review.phase.phaseId,
    selectionHash: review.phase.selectionHash,
    tasks: f.plan.tasks,
    dependencies: f.plan.dependencies,
    unresolvedQuestions: [],
  };
  const transport = vi.fn<typeof fetch>(async (_url, options): Promise<Response> => {
    const req = JSON.parse(options!.body as string),
      input = JSON.parse(req.input);
    // Intent is synced before the actual SDK fetch, including no secret/prompt persistence.
    const dir = path.join(f.stateRoot, taskByteHash(f.root).slice(7));
    const states = (await readdir(dir)).filter(
      (p) => p.startsWith("compilation-") && p.endsWith(".json"),
    );
    expect(states).toHaveLength(1);
    const state = JSON.parse(await readFile(path.join(dir, states[0]!), "utf8"));
    if (req.text.format.name.includes("decomposition")) expect(state.status).toBe("pending");
    const wire = req.text.format.name.includes("decomposition")
      ? draft
      : {
          kind: "task_provider_reply",
          schemaVersion: 1,
          ...input.identity,
          reply: {
            type: "change_set",
            changeSet: {
              kind: "change_set",
              schemaVersion: 1,
              ...input.identity,
              changes:
                input.identity.taskId === "producer"
                  ? f.producerChanges
                  : [
                      {
                        type: "create_text",
                        path: "src/c.ts",
                        expectedState: "absent",
                        content: "export const c = 2;\n",
                      },
                    ],
            },
          },
        };
    return new Response(
      JSON.stringify({
        model: "gpt-6.1-sol",
        reasoning: { effort: "low" },
        service_tier: "default",
        status: "completed",
        error: null,
        usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
        output: [
          {
            type: "message",
            status: "completed",
            content: [{ type: "output_text", text: JSON.stringify(wire) }],
          },
        ],
      }),
      {
        headers: {
          "content-type": "application/json",
          "x-request-id": `req_${transport.mock.calls.length}`,
        },
      },
    );
  });
  const provider = data(
    createOpenAITaskProvider({
      model: "gpt-6.1-sol",
      effort: "low",
      environment: { OPENAI_API_KEY: "fake-compilation-key" },
      transport,
    }),
  );
  const context = data(
    await prepareTaskCompilationContext({ review, repository: f.adapter.repository }),
  );
  const execute = (overrides: Partial<Parameters<typeof executeTaskCompilation>[0]> = {}) =>
    executeTaskCompilation({
      review,
      adapter: f.adapter,
      provider,
      resourceLimits: LIMITS,
      maxOutputTokens: 4096,
      timeoutMs: 1000,
      expectedContextId: context.contextId,
      allowProviderUsage: true,
      ...overrides,
    });
  return { ...f, review, draft, provider, transport, context, compile: execute };
}
// Real task filesystem fixtures target the initial Linux/macOS profile.
// Windows task execution remains unsupported; pure core/provider tests still run.
const describe = describeOnAllPlatforms.skipIf(process.platform === "win32");

describe("managed decomposition ledger and CLI", () => {
  it.each([401, 403, 429, 500])(
    "retains only HTTP %s and outcome for failed calls without releasing allowance",
    async (httpStatus) => {
      const f = await fixture();
      try {
        f.transport.mockImplementationOnce(
          async () =>
            new Response(
              JSON.stringify({
                error: { message: "fake-compilation-key private provider detail", type: "error" },
              }),
              { status: httpStatus, headers: { "content-type": "application/json" } },
            ),
        );
        expect(await f.compile()).toMatchObject({
          success: false,
          error: { code: "TASK_NEEDS_REVIEW" },
        });
        const dir = path.join(f.stateRoot, taskByteHash(f.root).slice(7));
        const name = (await readdir(dir)).find(
          (n) => n.startsWith("compilation-") && n.endsWith(".json"),
        )!;
        const raw = await readFile(path.join(dir, name), "utf8");
        const checkpoint = JSON.parse(raw);
        expect(checkpoint).toMatchObject({
          status: "needs_review",
          plan: null,
          providerResult: { outcome: "failed", httpStatus },
          usage: { inputTokens: { provenance: "unknown" }, reserved: { calls: 1 } },
        });
        expect(validateTaskCompilationCheckpoint(checkpoint).success).toBe(true);
        expect(raw).not.toContain("fake-compilation-key");
        expect(raw).not.toContain("private provider detail");
        // Existing v1 terminal receipts remain valid without the additive diagnostic.
        const { checkpointHash: _hash, providerResult: _result, ...legacy } = checkpoint;
        void _hash;
        void _result;
        expect(
          validateTaskCompilationCheckpoint(sealTaskCompilationCheckpoint(legacy)).success,
        ).toBe(true);
        expect(
          validateTaskCompilationCheckpoint(
            sealTaskCompilationCheckpoint({
              ...legacy,
              providerResult: { outcome: "failed", httpStatus, message: "not permitted" },
            }),
          ).success,
        ).toBe(false);
        expect(
          validateTaskCompilationCheckpoint(
            sealTaskCompilationCheckpoint({
              ...legacy,
              stateRevision: 1,
              status: "pending",
              usage: null,
              providerResult: { outcome: "failed", httpStatus },
            }),
          ).success,
        ).toBe(false);
        expect(await f.compile()).toMatchObject({
          success: false,
          error: { code: "TASK_NEEDS_REVIEW" },
        });
        expect(f.transport).toHaveBeenCalledTimes(1);
      } finally {
        await f.cleanup();
      }
    },
  );
  it("retains cancellation of a hung dispatch and refuses replay", async () => {
    const f = await fixture();
    try {
      const controller = new AbortController();
      const dispatch = vi.spyOn(f.provider, "dispatch").mockImplementation(async () => {
        controller.abort();
        return new Promise<never>(() => {});
      });
      expect(await f.compile({ signal: controller.signal })).toMatchObject({
        success: false,
        error: { code: "TASK_EXECUTION_ABORTED" },
      });
      expect(await f.compile()).toMatchObject({
        success: false,
        error: { code: "TASK_NEEDS_REVIEW" },
      });
      expect(
        await f.compile({
          timeoutMs: 2000,
          maxOutputTokens: 8192,
          resourceLimits: { ...LIMITS, maxProviderCalls: 25 },
        }),
      ).toMatchObject({ success: false, error: { code: "TASK_NEEDS_REVIEW" } });
      expect(dispatch).toHaveBeenCalledTimes(1);
    } finally {
      await f.cleanup();
    }
  });
  it("reserves compilation against coding limits and blocks a call when the remaining phase allowance is exhausted", async () => {
    const f = await fixture();
    try {
      const compiled = data(await f.compile());
      if (compiled.dryRun) throw new Error("dry run");
      const { executeTaskRun } = await import("@reposetup/core");
      const execute = (operation: Parameters<typeof executeTaskRun>[0]["operation"]) =>
        executeTaskRun({
          plan: compiled.checkpoint.plan,
          compilationPolicy: f.policy,
          adapter: f.adapter,
          provider: f.provider,
          operation,
        });
      expect(await execute({ type: "create", resourceLimits: LIMITS })).toMatchObject({
        success: false,
        error: { code: "TASK_NEEDS_REVIEW" },
      });
      const created = data(
        await execute({
          type: "create",
          resourceLimits: { ...LIMITS, maxProviderCalls: 1 },
          managedCompilationId: compiled.checkpoint.compilationId,
        }),
      );
      if (created.dryRun) throw new Error("dry run");
      const runId = created.checkpoint.run.runId;
      data(
        await execute({
          type: "begin",
          runId,
          taskId: "producer",
          requestedConfiguration: f.provider.configuration,
          routingId: taskByteHash("explicit"),
        }),
      );
      expect(
        await execute({
          type: "request",
          runId,
          allowProviderUsage: true,
          maxOutputTokens: 4096,
          timeoutMs: 1000,
        }),
      ).toMatchObject({ success: false, error: { code: "TASK_BUDGET_EXHAUSTED" } });
      expect(f.transport).toHaveBeenCalledTimes(1);
    } finally {
      await f.cleanup();
    }
  });
  it("compiles through the real SDK fake HTTP, reuses the receipt without replay, and includes compilation in the coding phase allowance", async () => {
    const f = await fixture();
    try {
      const first = data(await f.compile());
      if (first.dryRun) throw new Error("dry run");
      expect(first.checkpoint.status).toBe("completed");
      expect(first.checkpoint.usage!.inputTokens).toEqual({ provenance: "reported", value: 10 });
      expect(await f.compile()).toEqual({ success: true, data: first });
      expect(f.transport).toHaveBeenCalledTimes(1);
      const result = await executeManagedTaskPhase({
        plan: first.checkpoint.plan,
        compilationPolicy: f.policy,
        managedCompilationId: first.checkpoint.compilationId,
        resourceLimits: LIMITS,
        projectRoot: f.root,
        gitExecutable: "/trusted/git",
        adapter: f.adapter,
        provider: f.provider,
        verification: {
          policy: f.verificationPolicy,
          adapter: f.verifier,
          runProcess: async (r) => ({
            exitCode: 0,
            stdout:
              r.command !== "/trusted/git"
                ? ""
                : r.args.includes("--show-toplevel")
                  ? `${f.root}\n`
                  : r.args.includes("HEAD")
                    ? `${f.review.project.baselineCommit}\n`
                    : "",
            stderr: "",
          }),
        },
        allowProviderUsage: true,
        maxOutputTokens: 4096,
        timeoutMs: 1000,
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error.message);
      expect(result.checkpoint.run.resourceLedger.reservations).toHaveLength(3);
      expect(result.checkpoint.run.resourceLedger.reservations[0]).toMatchObject({
        reservationId: "compilation",
        attemptId: null,
        calls: 1,
      });
      expect(result.checkpoint.run.resourceLedger.consumed.inputTokens).toEqual({
        provenance: "reported",
        value: 30,
      });
      expect(result.checkpoint.compilation?.compilationId).toBe(first.checkpoint.compilationId);
      expect(f.transport).toHaveBeenCalledTimes(3);
    } finally {
      await f.cleanup();
    }
  });
  it("never invokes any adapter port for dry-run, missing allowance, or pre-cancelled compilation", async () => {
    const f = await fixture();
    try {
      const acquire = vi.spyOn(f.adapter, "acquire");
      expect(await f.compile({ dryRun: true })).toEqual({ success: true, data: { dryRun: true } });
      expect(await f.compile({ allowProviderUsage: false })).toMatchObject({
        success: false,
        error: { code: "TASK_PROVIDER_ALLOWANCE_REQUIRED" },
      });
      expect(await f.compile({ signal: AbortSignal.abort() })).toMatchObject({
        success: false,
        error: { code: "TASK_EXECUTION_ABORTED" },
      });
      expect(await f.compile({ initialDurationMs: LIMITS.maxWallTimeMs })).toMatchObject({
        success: false,
        error: { code: "TASK_BUDGET_EXHAUSTED" },
      });
      expect(acquire).not.toHaveBeenCalled();
      expect(f.transport).not.toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });
  it("retains uncertain pending intent and never repeats it after transport failure", async () => {
    const f = await fixture();
    try {
      const dispatch = vi
        .spyOn(f.provider, "dispatch")
        .mockRejectedValue(new Error("fake credential message must not leak"));
      expect(await f.compile()).toMatchObject({
        success: false,
        error: { code: "TASK_PROVIDER_FAILED" },
      });
      expect(await f.compile()).toMatchObject({
        success: false,
        error: { code: "TASK_NEEDS_REVIEW" },
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
      const dir = path.join(f.stateRoot, taskByteHash(f.root).slice(7));
      const name = (await readdir(dir)).find(
        (n) => n.startsWith("compilation-") && n.endsWith(".json"),
      )!;
      const raw = await readFile(path.join(dir, name), "utf8");
      expect(JSON.parse(raw)).toMatchObject({ status: "pending", usage: null, plan: null });
      expect(raw).not.toContain("fake-compilation-key");
      expect(raw).not.toContain("export const");
    } finally {
      await f.cleanup();
    }
  });
  it.each(["refused", "incomplete", "invalid", "unknown"] as const)(
    "retains %s reply usage and blocks a second call",
    async (outcome) => {
      const f = await fixture();
      try {
        const original = f.provider.dispatch.bind(f.provider);
        vi.spyOn(f.provider, "dispatch").mockImplementation(async (...args) => {
          const o = await original(...args);
          return {
            ...o,
            ...(outcome === "unknown"
              ? { usage: { ...o.usage, inputTokens: { provenance: "unknown" as const } } }
              : outcome === "invalid"
                ? { document: { ...f.draft, commands: ["forbidden"] } }
                : { outcome, document: null }),
          };
        });
        expect((await f.compile()).success).toBe(false);
        expect(await f.compile()).toMatchObject({
          success: false,
          error: { code: "TASK_NEEDS_REVIEW" },
        });
        expect(f.transport).toHaveBeenCalledTimes(1);
      } finally {
        await f.cleanup();
      }
    },
  );
  it("blocks changed context, insufficient reservation and missing managed ledger without a call", async () => {
    const f = await fixture();
    try {
      expect(await f.compile({ resourceLimits: { ...LIMITS, maxInputTokens: 1 } })).toMatchObject({
        success: false,
        error: { code: "TASK_BUDGET_EXHAUSTED" },
      });
      await writeFile(path.join(f.root, "src/a.ts"), "export const a = 9;\n");
      expect(await f.compile()).toMatchObject({
        success: false,
        error: { code: "TASK_CONTEXT_STALE" },
      });
      expect(f.transport).not.toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });
  it("previews real CLI context with no bodies/host/processes, requires exact approval, and emits a compatible managed receipt", async () => {
    const f = await fixture();
    try {
      const outer = path.dirname(f.root);
      const preferences = {
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
      await writeFile(path.join(outer, "review.json"), JSON.stringify(f.review));
      await writeFile(path.join(outer, "preferences.json"), JSON.stringify(preferences));
      const args = [
        "task",
        "compile",
        "--managed",
        "--root",
        f.root,
        "--review",
        path.join(outer, "review.json"),
        "--preferences",
        path.join(outer, "preferences.json"),
        "--state-root",
        f.stateRoot,
        "--effort",
        "low",
        "--timeout-ms",
        "1000",
        "--json",
      ];
      const output: string[] = [],
        host = vi.fn(async () => ({
          success: true as const,
          data: { adapter: f.adapter, provider: f.provider },
        })),
        runProcess = vi.fn();
      const deps = {
        cwd: f.root,
        fs: createDefaultFs(),
        createTaskCompilationHost: host,
        runProcess,
        io: { writeOut: (s: string) => output.push(s), writeErr: (s: string) => output.push(s) },
      };
      expect(await runCli([...args, "--dry-run"], deps), output.join("\n")).toMatchObject({
        exitCode: 0,
      });
      const preview = JSON.parse(output.pop()!);
      expect(preview).toMatchObject({
        kind: "task_managed_compilation_review",
        dryRun: true,
        runId: null,
      });
      expect(JSON.stringify(preview)).not.toContain("export const");
      expect(host).not.toHaveBeenCalled();
      expect(runProcess).not.toHaveBeenCalled();
      expect(await runCli(args, deps)).toMatchObject({ exitCode: 4 });
      expect(
        await runCli(
          [...args, "--allow-provider-usage", "--approve-compilation", taskByteHash("wrong")],
          deps,
        ),
      ).toMatchObject({ exitCode: 5 });
      expect(host).not.toHaveBeenCalled();
      expect(
        await runCli(
          [...args, "--allow-provider-usage", "--approve-compilation", preview.summaryId],
          deps,
        ),
      ).toMatchObject({ exitCode: 0 });
      expect(JSON.parse(output.pop()!)).toMatchObject({
        kind: "task_compilation",
        managedCompilationId: preview.compilationId,
        plan: { kind: "task_plan" },
      });
      expect(runProcess).not.toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });
});
