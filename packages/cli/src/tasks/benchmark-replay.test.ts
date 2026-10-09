import { afterEach, describe, expect, it, vi } from "vitest";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  executeTaskBenchmarkReplay,
  executeTaskCompilation,
  executeTaskRun,
  freezeTaskBenchmarkDecomposition,
  prepareTaskCompilationContext,
  sealTaskCompilationCheckpoint,
  taskByteHash,
  taskContentHash,
  taskFailure,
  validateTaskCompilationCheckpoint,
  validateTaskRunCheckpoint,
  type TaskCompilationCheckpoint,
  type TaskParseResult,
  type TaskProviderAdapter,
  type TaskReview,
} from "@reposetup/core";
import { CONFIGURATION, HASH, LIMITS, runFixture } from "./run-fixture.test-helper.js";

function data<T>(result: TaskParseResult<T>): T {
  if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}
const fixtures: Awaited<ReturnType<typeof runFixture>>[] = [];
async function fresh() {
  const f = await runFixture();
  fixtures.push(f);
  const snapshot = data(await f.adapter.snapshot());
  const review: TaskReview = {
    kind: "task_review",
    schemaVersion: 1,
    phase: f.plan.phase,
    policy: f.policy,
    project: { ...f.plan.project, baselineTreeHash: taskContentHash(snapshot.entries) },
  };
  return { ...f, review };
}
async function source() {
  const f = await fresh();
  const reservation = { calls: 1 as const, inputTokens: 256, outputTokens: 256, costMicrousd: 256 };
  const provider: TaskProviderAdapter = {
    configuration: CONFIGURATION,
    prepare: ({ purpose, timeoutMs }) => ({
      success: true,
      data: {
        purpose,
        configuration: CONFIGURATION,
        requestHash: HASH,
        payload: "synthetic",
        reservation,
        priceCatalogRevision: HASH,
        timeoutMs,
      },
    }),
    dispatch: vi.fn<TaskProviderAdapter["dispatch"]>(async () => ({
      outcome: "completed",
      httpStatus: 200,
      document: {
        kind: "task_plan_draft",
        schemaVersion: 1,
        phaseId: f.plan.phase.phaseId,
        selectionHash: f.plan.phase.selectionHash,
        tasks: f.plan.tasks,
        dependencies: f.plan.dependencies,
        unresolvedQuestions: [],
      },
      effectiveConfiguration: { provenance: "host_reported", configuration: CONFIGURATION },
      usage: {
        inputTokens: { provenance: "host_reported", value: 10 },
        outputTokens: { provenance: "host_reported", value: 20 },
        costMicrousd: { provenance: "host_reported", value: 30 },
        reasoningTokens: { provenance: "unknown" },
        cachedInputTokens: { provenance: "unknown" },
        totalTokens: { provenance: "host_reported", value: 30 },
        providerCallId: "synthetic-compilation",
        priceCatalogRevision: HASH,
        durationMs: 0,
        reserved: reservation,
      },
    })),
  };
  const context = data(
    await prepareTaskCompilationContext({ review: f.review, repository: f.adapter.repository }),
  );
  const compile = () =>
    executeTaskCompilation({
      review: f.review,
      adapter: f.adapter,
      provider,
      resourceLimits: LIMITS,
      maxOutputTokens: 256,
      timeoutMs: 1000,
      expectedContextId: context.contextId,
      allowProviderUsage: true,
    });
  const result = data(await compile());
  if (result.dryRun) throw new Error("unexpected dry run");
  const checkpoint = result.checkpoint;
  const decomposition = data(
    freezeTaskBenchmarkDecomposition({
      plan: checkpoint.plan,
      policy: f.policy,
      logicalVerificationRevision: HASH,
    }),
  );
  const replay = async (
    target: Awaited<ReturnType<typeof fresh>>,
    overrides: Partial<Parameters<typeof executeTaskBenchmarkReplay>[0]> = {},
  ) =>
    executeTaskBenchmarkReplay({
      sourceCheckpoint: checkpoint,
      decomposition,
      review: target.review,
      logicalVerificationRevision: HASH,
      treatment: "compiled_fixed",
      adapter: target.adapter,
      ...overrides,
    });
  return { ...f, checkpoint, decomposition, compile, provider, replay };
}
async function privateRecords(f: Awaited<ReturnType<typeof fresh>>) {
  const directory = path.join(f.stateRoot, taskByteHash(f.root).slice(7));
  const names = await readdir(directory);
  return Promise.all(
    names
      .filter((name) => name.startsWith("compilation-") && name.endsWith(".json"))
      .map(
        async (name) =>
          JSON.parse(
            await readFile(path.join(directory, name), "utf8"),
          ) as TaskCompilationCheckpoint,
      ),
  );
}
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((f) => f.cleanup()));
});
describe("executor-authenticated benchmark compilation charges across fresh roots", () => {
  it("charges the full original compilation to both treatments, persists provenance and blocks omission and exhausted coding allowance", async () => {
    const s = await source(),
      fixed = await fresh(),
      routed = await fresh();
    for (const [target, treatment] of [
      [fixed, "compiled_fixed"],
      [routed, "compiled_routed"],
    ] as const) {
      const before = data(await target.adapter.snapshot());
      const replay = data(await s.replay(target, { treatment }));
      if (replay.dryRun) throw new Error("dry run");
      const c = replay.checkpoint;
      expect(validateTaskCompilationCheckpoint(c).success).toBe(true);
      expect(c.reservation).toEqual(s.checkpoint.reservation);
      expect(c.usage).toMatchObject({ ...s.checkpoint.usage!, durationMs: expect.any(Number) });
      expect(c.usage!.durationMs).toBeGreaterThanOrEqual(s.checkpoint.usage!.durationMs);
      expect(c.benchmarkReplay).toMatchObject({
        treatment,
        sourceCheckpointHash: s.checkpoint.checkpointHash,
        sourceCompilationId: s.checkpoint.compilationId,
        sourceUsage: s.checkpoint.usage,
      });
      expect(c.plan!.planId).not.toBe(s.checkpoint.plan!.planId);
      expect(c.plan!.tasks).toEqual(s.checkpoint.plan!.tasks);
      expect(data(await target.adapter.snapshot())).toEqual(before);
      const execute = (operation: Parameters<typeof executeTaskRun>[0]["operation"]) =>
        executeTaskRun({
          plan: c.plan,
          compilationPolicy: target.policy,
          adapter: target.adapter,
          provider: s.provider,
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
          managedCompilationId: c.compilationId,
          expectedBaselineTreeHash: target.review.project.baselineTreeHash,
        }),
      );
      if (created.dryRun) throw new Error("dry run");
      expect(validateTaskRunCheckpoint(created.checkpoint).success).toBe(true);
      expect(created.checkpoint.compilation?.benchmarkReplay).toEqual(c.benchmarkReplay);
      expect(created.checkpoint.run.resourceLedger.reservations).toEqual([
        { reservationId: "compilation", attemptId: null, ...s.checkpoint.reservation },
      ]);
      expect(created.checkpoint.run.resourceLedger.consumed.inputTokens).toEqual(
        s.checkpoint.usage!.inputTokens,
      );
      const runId = created.checkpoint.run.runId;
      data(
        await execute({
          type: "begin",
          runId,
          taskId: "producer",
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        }),
      );
      expect(
        await execute({
          type: "request",
          runId,
          allowProviderUsage: true,
          maxOutputTokens: 256,
          timeoutMs: 1000,
        }),
      ).toMatchObject({
        success: false,
        error: { code: "TASK_BUDGET_EXHAUSTED" },
      });
      expect(await privateRecords(target)).toEqual([c]);
      expect(data(await s.replay(target, { treatment }))).toMatchObject({ checkpoint: c });
    }
    expect(s.provider.dispatch).toHaveBeenCalledTimes(1);
  });
  it("rejects JSON clones and cached source reads, but permits effect-free preview of a valid imported record", async () => {
    const s = await source(),
      t = await fresh();
    const acquire = vi.spyOn(t.adapter, "acquire");
    expect(await s.replay(t, { sourceCheckpoint: structuredClone(s.checkpoint) })).toMatchObject({
      success: false,
      error: { code: "TASK_BENCHMARK_INVALID" },
    });
    const cached = data(await s.compile());
    if (cached.dryRun) throw new Error("dry run");
    expect(await s.replay(t, { sourceCheckpoint: cached.checkpoint })).toMatchObject({
      success: false,
    });
    expect(
      data(await s.replay(t, { sourceCheckpoint: structuredClone(s.checkpoint), dryRun: true })),
    ).toMatchObject({ dryRun: true });
    expect(acquire).not.toHaveBeenCalled();
    expect(await readdir(t.stateRoot)).toEqual([]);
    expect(s.provider.dispatch).toHaveBeenCalledTimes(1);
  });
  it("limits a source to two distinct treatment roots and forbids replaying a replay", async () => {
    const s = await source(),
      t = await fresh(),
      extra = await fresh();
    const issued = data(await s.replay(t));
    if (issued.dryRun) throw new Error("dry run");
    expect(await s.replay(extra)).toMatchObject({ success: false });
    expect(await s.replay(t, { treatment: "compiled_routed" })).toMatchObject({ success: false });
    expect(await s.replay(extra, { sourceCheckpoint: issued.checkpoint })).toMatchObject({
      success: false,
    });
    expect(await readdir(extra.stateRoot)).toEqual([]);
  });
  it("rejects authority or logical verifier changes before effects", async () => {
    const s = await source(),
      t = await fresh();
    const changed = structuredClone(t.review);
    changed.policy.authority.write.push("src/extra.ts");
    expect(await s.replay(t, { review: changed })).toMatchObject({ success: false });
    expect(
      await s.replay(t, { logicalVerificationRevision: taskContentHash("different") }),
    ).toMatchObject({ success: false });
    expect(await readdir(t.stateRoot)).toEqual([]);
  });
  it("rejects a drifted fresh baseline without retaining a compilation charge", async () => {
    const s = await source(),
      t = await fresh();
    await writeFile(path.join(t.root, "src/a.ts"), "export const a = 99;\n");
    expect(await s.replay(t)).toMatchObject({
      success: false,
      error: { code: "TASK_PROJECT_DRIFT" },
    });
    expect(await privateRecords(t)).toEqual([]);
  });
  it.each(["pending", "absent"])(
    "retains an uncertain %s save without automatic replay or allowance reset",
    async (failure) => {
      const s = await source(),
        t = await fresh(),
        adapter = t.adapter;
      const wrapped = {
        ...adapter,
        acquire: async () => {
          const lease = data(await adapter.acquire());
          return {
            success: true as const,
            data: {
              ...lease,
              saveCompilation: async (c: TaskCompilationCheckpoint, expected: number | null) => {
                if (failure === "absent" || c.stateRevision === 2)
                  return taskFailure("TASK_STATE_WRITE_FAILED", "simulated interruption");
                return lease.saveCompilation!(c, expected);
              },
            },
          };
        },
      };
      expect(await s.replay(t, { adapter: wrapped })).toMatchObject({
        success: false,
        error: { code: "TASK_STATE_WRITE_FAILED" },
      });
      const records = await privateRecords(t);
      if (failure === "pending") {
        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          status: "pending",
          usage: null,
          benchmarkReplay: { sourceUsage: s.checkpoint.usage },
        });
      } else expect(records).toEqual([]);
      expect(await s.replay(t)).toMatchObject({
        success: false,
        error: { code: "TASK_NEEDS_REVIEW" },
      });
      expect(await privateRecords(t)).toEqual(records);
      expect(s.provider.dispatch).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects source-root reuse and pre-aborted effects", async () => {
    const s = await source(),
      t = await fresh();
    expect(await s.replay(s)).toMatchObject({ success: false });
    expect(await s.replay(t, { signal: AbortSignal.abort() })).toMatchObject({
      success: false,
      error: { code: "TASK_EXECUTION_ABORTED" },
    });
    expect(await readdir(t.stateRoot)).toEqual([]);
  });
  it("does not promote a retained replay ledger into a second decomposition call", async () => {
    const s = await source(),
      t = await fresh();
    data(await s.replay(t));
    const context = data(
      await prepareTaskCompilationContext({ review: t.review, repository: t.adapter.repository }),
    );
    expect(
      await executeTaskCompilation({
        review: t.review,
        adapter: t.adapter,
        provider: s.provider,
        resourceLimits: LIMITS,
        maxOutputTokens: 256,
        timeoutMs: 1000,
        expectedContextId: context.contextId,
        allowProviderUsage: true,
      }),
    ).toMatchObject({ success: false, error: { code: "TASK_NEEDS_REVIEW" } });
    expect(s.provider.dispatch).toHaveBeenCalledTimes(1);
  });
  it.each(["usage", "source-root", "source-plan", "state"])(
    "rejects rehashed %s provenance corruption",
    async (kind) => {
      const s = await source(),
        t = await fresh();
      const replay = data(await s.replay(t));
      if (replay.dryRun) throw new Error("dry run");
      const { checkpointHash: _old, ...payload } = structuredClone(replay.checkpoint);
      void _old;
      if (kind === "usage") payload.usage!.inputTokens = { provenance: "host_reported", value: 0 };
      if (kind === "source-root")
        payload.benchmarkReplay!.sourceRootInstance = payload.rootInstance;
      if (kind === "source-plan") payload.benchmarkReplay!.sourcePlanId = payload.plan!.planId;
      if (kind === "state") {
        payload.status = "failed";
        payload.plan = null;
      }
      expect(
        validateTaskCompilationCheckpoint(sealTaskCompilationCheckpoint(payload)),
      ).toMatchObject({ success: false });
    },
  );
});
