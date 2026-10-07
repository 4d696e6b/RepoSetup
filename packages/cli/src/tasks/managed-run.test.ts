import { describe, it, expect, vi } from "vitest";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  executeManagedTaskPhase,
  taskContentHash,
  type TaskProviderAdapter,
  type TaskParseResult,
} from "@reposetup/core";
import { createOpenAITaskProvider } from "./provider-adapter.js";
import { runCli } from "../run-cli.js";
import { createDefaultFs } from "../io.js";
import { runFixture, LIMITS, HASH } from "./run-fixture.test-helper.js";

function data<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
function provider(
  f: Awaited<ReturnType<typeof runFixture>>,
  outcome: "completed" | "refused" | "incomplete" = "completed",
  unknown = false,
) {
  const transport = vi.fn<typeof fetch>(async (_url, options): Promise<Response> => {
    const request = JSON.parse(options!.body as string);
    const input = JSON.parse(request.input);
    const cs = {
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
    };
    const wire = {
      kind: "task_provider_reply",
      schemaVersion: 1,
      ...input.identity,
      reply: { type: "change_set", changeSet: cs },
    };
    return new Response(
      JSON.stringify({
        model: "gpt-6.1-sol",
        reasoning: { effort: "low" },
        service_tier: "default",
        status: outcome === "incomplete" ? "incomplete" : "completed",
        error: null,
        usage: unknown
          ? null
          : {
              input_tokens: 10,
              output_tokens: 20,
              total_tokens: 30,
              input_tokens_details: { cached_tokens: 2 },
              output_tokens_details: { reasoning_tokens: 5 },
            },
        output: [
          {
            type: "message",
            status: "completed",
            content:
              outcome === "refused"
                ? [{ type: "refusal", refusal: "No." }]
                : [{ type: "output_text", text: JSON.stringify(wire) }],
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
  return {
    transport,
    adapter: data(
      createOpenAITaskProvider({
        model: "gpt-6.1-sol",
        effort: "low",
        environment: { OPENAI_API_KEY: "fake-only-test-key" },
        transport,
      }),
    ),
  };
}
async function begin(
  f: Awaited<ReturnType<typeof runFixture>>,
  adapter: TaskProviderAdapter,
  limits = LIMITS,
) {
  const c = await f.requireRun({ type: "create", resourceLimits: limits });
  await f.requireRun({
    type: "begin",
    runId: c.run.runId,
    taskId: "producer",
    requestedConfiguration: adapter.configuration,
    routingId: HASH,
  });
  return c.run.runId;
}
const request = (runId: string) => ({
  type: "request" as const,
  runId,
  allowProviderUsage: true as const,
  maxOutputTokens: 4096,
  timeoutMs: 1000,
});
describe("durable managed SDK dispatch", () => {
  it("rejects a changed baseline under the creation lease without writing a checkpoint", async () => {
    const f = await runFixture();
    try {
      const baseline = data(await f.adapter.snapshot());
      await writeFile(path.join(f.root, "src/extra.ts"), "export const changed = true;\n");
      const result = await f.execute({
        type: "create",
        resourceLimits: LIMITS,
        expectedBaselineTreeHash: taskContentHash(baseline.entries),
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe("TASK_PROJECT_DRIFT");
    } finally {
      await f.cleanup();
    }
  });
  it("expands bounded context under the same attempt, records both calls and rebinds the final proposal", async () => {
    const f = await runFixture();
    try {
      await writeFile(path.join(f.root, "src/extra.ts"), "export const extra = true;\n");
      const extra = data(await f.adapter.repository.read("src/extra.ts"))!;
      const p = provider(f);
      const original = p.transport.getMockImplementation()!;
      p.transport.mockImplementation(async (url, options): Promise<Response> => {
        if (p.transport.mock.calls.length > 1) return original(url, options);
        const input = JSON.parse(JSON.parse(options!.body as string).input);
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
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      kind: "task_provider_reply",
                      schemaVersion: 1,
                      ...input.identity,
                      reply: {
                        type: "context_request",
                        references: [
                          {
                            source: {
                              path: "src/extra.ts",
                              fileHash: extra.fileHash,
                              lineRange: null,
                            },
                            reason: "Read the nearby interface.",
                          },
                        ],
                      },
                    }),
                  },
                ],
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        );
      });
      const runId = await begin(f, p.adapter);
      const c = await f.requireRun(request(runId), { provider: p.adapter });
      expect(c.run.attempts).toHaveLength(1);
      expect(c.providerCalls).toHaveLength(2);
      expect(c.providerCalls![0]!.inputRevision).not.toBe(c.providerCalls![1]!.inputRevision);
      expect(c.run.attempts[0]!.inputRevision).toBe(c.providerCalls![1]!.inputRevision);
      expect(c.run.attempts[0]!.usage.totalTokens).toMatchObject({ value: 60 });
      expect(c.bindings[0]!.context.sources.some((s) => s.path === "src/extra.ts")).toBe(true);
      expect(p.transport).toHaveBeenCalledTimes(2);
    } finally {
      await f.cleanup();
    }
  });
  it("leaves a pending call and its reservation durable when the provider throws, without replay on recovery", async () => {
    const f = await runFixture();
    try {
      const p = provider(f);
      const runId = await begin(f, p.adapter);
      const dispatch = vi
        .spyOn(p.adapter, "dispatch")
        .mockRejectedValue(new Error("private transport detail"));
      expect(await f.execute(request(runId), { provider: p.adapter })).toMatchObject({
        error: { code: "TASK_PROVIDER_FAILED" },
      });
      const c = await f.requireRun({ type: "reconcile", runId, reviewed: true });
      expect(c.run.status).toBe("needs_review");
      expect(c.providerCalls![0]).toMatchObject({ status: "pending", usage: null });
      expect(c.run.resourceLedger.reservations).toHaveLength(1);
      expect((await f.execute(request(runId), { provider: p.adapter })).success).toBe(false);
      expect(dispatch).toHaveBeenCalledOnce();
    } finally {
      await f.cleanup();
    }
  });
  it("records intent before the real SDK call, applies scoped text and retains exact usage metadata", async () => {
    const f = await runFixture();
    try {
      const p = provider(f);
      const runId = await begin(f, p.adapter);
      // The provider runs while the executor holds its project lease.
      const original = p.adapter.dispatch;
      p.adapter.dispatch = async (prepared, signal) => {
        expect(await f.adapter.acquire()).toMatchObject({
          error: { code: "TASK_EXECUTION_LOCKED" },
        });
        const projectDir = (await readdir(f.stateRoot))[0]!;
        const checkpointName = (await readdir(path.join(f.stateRoot, projectDir))).find((n) =>
          n.endsWith(".json"),
        )!;
        const saved = JSON.parse(
          await readFile(path.join(f.stateRoot, projectDir, checkpointName), "utf8"),
        );
        expect(saved.providerCalls[0]).toMatchObject({ status: "pending", usage: null });
        expect(saved.run.resourceLedger.reservations).toHaveLength(1);
        expect(saved.run.resourceLedger.consumed).toMatchObject({
          inputTokens: { provenance: "unknown" },
          reserved: { calls: 1 },
        });
        expect(saved.run.attempts[0].usage.reserved.calls).toBe(1);
        return original(prepared, signal);
      };
      const c = await f.requireRun(request(runId), { provider: p.adapter });
      expect(c.run.executionMode).toBe("managed");
      expect(c.run.attempts[0]).toMatchObject({
        status: "verifying",
        usage: {
          inputTokens: { value: 10 },
          outputTokens: { value: 20 },
          reasoningTokens: { value: 5 },
          totalTokens: { value: 30 },
        },
      });
      expect(c.providerCalls).toHaveLength(1);
      expect(c.providerCalls![0]!.status).toBe("completed");
      expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toBe("export const a = 2;\r\n");
      expect(JSON.stringify(c)).not.toContain("fake-only-test-key");
      expect(JSON.stringify(c)).not.toContain("export const b");
      expect(p.transport).toHaveBeenCalledOnce();
    } finally {
      await f.cleanup();
    }
  });
  it.each(["refused", "incomplete"] as const)(
    "retains %s usage and makes no project effect or automatic retry",
    async (outcome) => {
      const f = await runFixture();
      try {
        const p = provider(f, outcome);
        const runId = await begin(f, p.adapter);
        expect(await f.execute(request(runId), { provider: p.adapter })).toMatchObject({
          error: {
            code: outcome === "refused" ? "TASK_PROVIDER_REFUSED" : "TASK_OUTPUT_INCOMPLETE",
          },
        });
        const reconciled = await f.requireRun({ type: "reconcile", runId });
        expect(reconciled.providerCalls![0]!.usage!.outputTokens).toMatchObject({ value: 20 });
        expect(reconciled.journal).toEqual([]);
        expect(p.transport).toHaveBeenCalledOnce();
        expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("1");
      } finally {
        await f.cleanup();
      }
    },
  );
  it("retains unknown usage reservations across restart/reconciliation and cannot resume spending", async () => {
    const f = await runFixture();
    try {
      const p = provider(f, "completed", true);
      const runId = await begin(f, p.adapter);
      expect(await f.execute(request(runId), { provider: p.adapter })).toMatchObject({
        error: { code: "TASK_NEEDS_REVIEW" },
      });
      const c = await f.requireRun({ type: "reconcile", runId, reviewed: true });
      expect(c.run.status).toBe("needs_review");
      expect(c.run.resourceLedger.reservations).toHaveLength(1);
      expect(c.providerCalls![0]!.usage!.inputTokens.provenance).toBe("unknown");
      expect((await f.execute(request(runId), { provider: p.adapter })).success).toBe(false);
      expect(p.transport).toHaveBeenCalledOnce();
    } finally {
      await f.cleanup();
    }
  });
  it("blocks over-budget preparation, stale project state and dry-run without dispatch", async () => {
    const f = await runFixture();
    try {
      const p = provider(f);
      const runId = await begin(f, p.adapter, { ...LIMITS, maxInputTokens: 1 });
      expect(await f.execute(request(runId), { provider: p.adapter, dryRun: true })).toMatchObject({
        success: true,
        data: { dryRun: true },
      });
      expect(await f.execute(request(runId), { provider: p.adapter })).toMatchObject({
        error: { code: "TASK_BUDGET_EXHAUSTED" },
      });
      expect(p.transport).not.toHaveBeenCalled();
      await writeFile(path.join(f.root, "src/a.ts"), "external drift");
      expect((await f.execute(request(runId), { provider: p.adapter })).success).toBe(false);
      expect(p.transport).not.toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });
  it("completes a two-task phase with the same fixed configuration and fresh independent task/phase acceptance", async () => {
    const f = await runFixture();
    try {
      const p = provider(f);
      const { planId: _old, ...payload } = f.plan;
      void _old;
      const project = {
        ...payload.project,
        baselineTreeHash: taskContentHash(data(await f.adapter.snapshot()).entries),
      };
      const updated = { ...payload, project };
      const plan = { ...updated, planId: taskContentHash(updated) };
      const runner = vi.fn(async (r: { args: readonly string[] }) => ({
        exitCode: 0,
        stderr: "",
        stdout: r.args.includes("--show-toplevel")
          ? `${f.root}\n`
          : r.args.includes("HEAD")
            ? `${project.baselineCommit}\n`
            : "",
      }));
      const result = await executeManagedTaskPhase({
        plan,
        compilationPolicy: f.policy,
        resourceLimits: LIMITS,
        projectRoot: f.root,
        gitExecutable: "/trusted/git",
        adapter: f.adapter,
        provider: p.adapter,
        verification: { policy: f.verificationPolicy, adapter: f.verifier, runProcess: runner },
        allowProviderUsage: true,
        maxOutputTokens: 4096,
        timeoutMs: 1000,
      });
      expect(result).toMatchObject({
        success: true,
        checkpoint: {
          run: {
            status: "succeeded",
            executionMode: "managed",
            attempts: [{ status: "accepted" }, { status: "accepted" }],
          },
        },
      });
      expect(p.transport).toHaveBeenCalledTimes(2);
      expect(f.reviews).toContain("phase.acceptance");
      expect(
        runner.mock.calls.every(([r]) => !r.args.some((arg) => arg.includes("fake-only-test-key"))),
      ).toBe(true);
    } finally {
      await f.cleanup();
    }
  });
});

describe("managed run CLI review boundary", () => {
  it("requires an exact summary and a separate usage allowance; dry-run never constructs adapters or invokes processes/prompts", async () => {
    const f = await runFixture();
    try {
      const outer = path.dirname(f.root);
      const review = {
        kind: "task_review",
        schemaVersion: 1,
        phase: f.plan.phase,
        project: f.plan.project,
        policy: f.policy,
      };
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
      // Fake trusted host facts are used only to test parsing/consent. Production
      // qualification never trusts this synthetic file definition/hash.
      const checks = ["ts.typecheck", "ts.lint", "ts.unit"].map((checkId) => ({
        schemaVersion: 1,
        definitionRevision: HASH,
        fileDefinition: {
          schemaVersion: 1,
          checkId,
          definitionRevision: HASH,
          recipeRevision: HASH,
          closureReviewId: "test-fixture",
          files: [{ rootId: "runtime", path: "node", fileHash: HASH, role: "runtime" }],
          roots: [{ rootId: "runtime", rootIdentity: HASH }],
          totalBytes: 1,
        },
        roots: { runtime: "/trusted" },
        immutableRootIds: ["runtime"],
        closureInventoryRevision: HASH,
        nodeExecutable: "/trusted/node",
        nodeVersion: "v24.21.0",
        entryPoint: "/trusted/tool",
        projectRoot: f.root,
        configPath: "tsconfig.json",
        targets: [],
        testBindings: [],
        toolPackage: { rootId: "runtime", path: "package.json" },
      }));
      const authority = {
        kind: "task_execution_authority",
        schemaVersion: 1,
        checks,
        policy: f.verificationPolicy,
      };
      for (const [name, doc] of Object.entries({ review, plan: f.plan, preferences, authority }))
        await writeFile(path.join(outer, `${name}.json`), JSON.stringify(doc));
      const args = [
        "task",
        "run",
        "--root",
        f.root,
        "--review",
        path.join(outer, "review.json"),
        "--plan",
        path.join(outer, "plan.json"),
        "--preferences",
        path.join(outer, "preferences.json"),
        "--authority",
        path.join(outer, "authority.json"),
        "--state-root",
        f.stateRoot,
        "--scratch-root",
        outer,
        "--effort",
        "low",
        "--json",
      ];
      const out: string[] = [];
      const host = vi.fn(),
        processRunner = vi.fn(),
        prompt = vi.fn();
      const deps = {
        cwd: f.root,
        fs: createDefaultFs(),
        io: { writeOut: (s: string) => out.push(s), writeErr: (s: string) => out.push(s) },
        createTaskManagedHost: host,
        runProcess: processRunner,
        confirmCreate: prompt,
      };
      expect(await runCli([...args, "--dry-run"], deps)).toMatchObject({ exitCode: 0 });
      const preview = JSON.parse(out.pop()!);
      expect(preview).toMatchObject({
        kind: "task_managed_run_review",
        dryRun: true,
        runId: null,
        attemptId: null,
        provider: { model: "gpt-6.1-sol", nativeEffortId: "low", liveQualification: "unconfirmed" },
      });
      expect(JSON.stringify(preview)).not.toContain("export const a");
      expect(host).not.toHaveBeenCalled();
      expect(processRunner).not.toHaveBeenCalled();
      expect(prompt).not.toHaveBeenCalled();
      expect(await runCli([...args, "--approve-run", preview.summaryId], deps)).toMatchObject({
        exitCode: 4,
      });
      expect(JSON.parse(out.pop()!).error.code).toBe("TASK_PROVIDER_ALLOWANCE_REQUIRED");
      expect(
        await runCli([...args, "--allow-provider-usage", "--approve-run", HASH], deps),
      ).toMatchObject({ exitCode: 5 });
      expect(JSON.parse(out.pop()!).error.code).toBe("TASK_NEEDS_REVIEW");
      expect(host).not.toHaveBeenCalled();
      expect(processRunner).not.toHaveBeenCalled();
      expect(prompt).not.toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });
});
