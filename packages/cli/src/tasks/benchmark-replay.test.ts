import { afterEach, describe as describeOnAllPlatforms, expect, it, vi } from "vitest";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  executeTaskBenchmarkReplay,
  executeTaskCompilation,
  executeTaskRun,
  inspectTaskBenchmarkRun,
  projectTaskBenchmarkRunRequests,
  projectTaskBenchmarkCompilation,
  summarizeTaskBenchmarkRequests,
  collectTaskBenchmarkRunEvidence,
  taskBenchmarkRunEvidenceSchema,
  validateTaskBenchmarkRunEvidence,
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
  const prepared = vi.spyOn(provider, "prepare");
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
  const started = performance.now();
  const result = data(await compile());
  const compilationElapsedMs = Math.ceil(performance.now() - started);
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
  return {
    ...f,
    checkpoint,
    decomposition,
    compile,
    compilationElapsedMs,
    provider,
    prepared,
    replay,
  };
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

async function openedTrial() {
  const s = await source(),
    t = await fresh();
  const replay = data(await s.replay(t));
  if (replay.dryRun) throw new Error("dry run");
  const c = replay.checkpoint;
  const execute = (operation: Parameters<typeof executeTaskRun>[0]["operation"]) =>
    executeTaskRun({
      plan: c.plan,
      compilationPolicy: t.policy,
      adapter: t.adapter,
      provider: s.provider,
      operation,
      verification: {
        policy: t.verificationPolicy,
        adapter: t.verifier,
        runProcess: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
      },
    });
  const created = data(
    await execute({
      type: "create",
      resourceLimits: LIMITS,
      managedCompilationId: c.compilationId,
      expectedBaselineTreeHash: t.review.project.baselineTreeHash,
    }),
  );
  if (created.dryRun) throw new Error("dry run");
  const runId = created.checkpoint.run.runId;
  const inspect = (overrides: Partial<Parameters<typeof inspectTaskBenchmarkRun>[0]> = {}) =>
    inspectTaskBenchmarkRun({
      plan: c.plan,
      policy: t.policy,
      runId,
      adapter: t.adapter,
      ...overrides,
    });
  const stateFile = path.join(t.stateRoot, taskByteHash(t.root).slice(7), `${runId}.json`);
  return { s, t, c, execute, runId, inspect, stateFile, created: created.checkpoint };
}
// Real task filesystem fixtures target the initial Linux/macOS profile.
// Windows task execution remains unsupported; pure core/provider tests still run.
const describe = describeOnAllPlatforms.skipIf(process.platform === "win32");

describe("actual failed and uncertain benchmark run evidence", () => {
  it.each(["invalid", "uncertain"])(
    "retains %s coding intent, exact pre-dispatch byte metadata and honest usage provenance",
    async (kind) => {
      const f = await openedTrial();
      data(
        await f.execute({
          type: "begin",
          runId: f.runId,
          taskId: "producer",
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        }),
      );
      let preDispatch: unknown;
      if (kind === "uncertain")
        vi.mocked(f.s.provider.dispatch).mockImplementationOnce(async () => {
          preDispatch = JSON.parse(await readFile(f.stateFile, "utf8")).providerCalls[0];
          throw new Error("synthetic transport failure");
        });
      const result = await f.execute({
        type: "request",
        runId: f.runId,
        allowProviderUsage: true,
        maxOutputTokens: 256,
        timeoutMs: 1000,
      });
      expect(result.success).toBe(false);
      const before = await readFile(f.stateFile, "utf8"),
        baseline = data(await f.t.adapter.snapshot());
      const record = data(await f.inspect());
      expect(taskBenchmarkRunEvidenceSchema.safeParse(record).success).toBe(true);
      expect(record).toMatchObject({
        kind: "task_benchmark_run_evidence",
        schemaVersion: 1,
        qualificationEligible: false,
        acceptanceAuthenticated: false,
        projectMatchesCheckpoint: true,
        finalVerificationId: null,
      });
      expect(record.codingRequests).toHaveLength(1);
      const call = record.codingRequests[0]!;
      const requests = data(projectTaskBenchmarkRunRequests(record));
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        purpose: "implementation",
        sourceCheckpointHash: record.checkpointHash,
        reservation: call.reservation,
        ledgerUsage: call.usage,
        inputTokens: { provenance: "unknown" },
        calculatedCostMicrousd: null,
        chargedCostMicrousd: { provenance: "unknown" },
        estimatedInputTokens: null,
      });
      expect(requests[0]!.contextBytes).toBe(call.requestFootprint!.inputDocumentBytes);
      const projectedCompilation = data(
        projectTaskBenchmarkCompilation({
          checkpoint: f.s.checkpoint,
          elapsedMs: f.s.compilationElapsedMs,
        }),
      );
      expect(projectedCompilation.requests[0]!.requestHash).toBe(f.s.checkpoint.requestHash);
      expect(
        projectTaskBenchmarkCompilation({ checkpoint: f.c, elapsedMs: f.s.compilationElapsedMs }),
      ).toMatchObject({ success: false });
      const totals = summarizeTaskBenchmarkRequests([
        ...projectedCompilation.requests,
        ...requests,
      ]);
      const document = f.s.prepared.mock.calls.at(-1)![0].document;
      expect(call.requestFootprint).toEqual({
        kind: "task_request_footprint",
        schemaVersion: 1,
        inputDocumentHash: taskContentHash(document),
        inputDocumentBytes: Buffer.byteLength(JSON.stringify(document)),
        preparedPayloadBytes: Buffer.byteLength("synthetic"),
        priceCatalogRevision: HASH,
      });
      expect(record.compilationReceipt?.requestFootprint).toEqual(f.s.checkpoint.requestFootprint);
      expect(record.compilationCharge?.benchmarkReplay?.sourceUsage).toEqual(f.s.checkpoint.usage);
      expect(record.resourceLedger.reservations).toHaveLength(2);
      if (kind === "uncertain") {
        expect(preDispatch).toMatchObject({
          status: "pending",
          usage: null,
          requestFootprint: call.requestFootprint,
        });
        expect(call).toMatchObject({ status: "pending", usage: null });
        expect(totals).toMatchObject({
          providerCalls: null,
          retainedRequestIntents: 2,
          settledRequestIntents: 1,
          uncertainProviderCalls: 1,
          requestDurationMs: null,
        });
        expect(record.resourceLedger.consumed.inputTokens).toEqual({ provenance: "unknown" });
      } else {
        expect(call).toMatchObject({
          status: "completed",
          usage: { inputTokens: { provenance: "host_reported", value: 10 } },
        });
        expect(totals).toMatchObject({
          providerCalls: 2,
          retainedRequestIntents: 2,
          uncertainProviderCalls: 0,
          inputTokens: null,
        });
        expect(record.resourceLedger.consumed.inputTokens).toMatchObject({ value: 20 });
        expect(record.attempts[0]!.failureCode).toBe("TASK_PROVIDER_OUTPUT_INVALID");
        const legacy = JSON.parse(before);
        delete legacy.providerCalls[0].requestFootprint;
        delete legacy.providerCalls[0].purpose;
        const { checkpointHash: _old, ...payload } = legacy;
        void _old;
        const legacyEvidence = data(
          collectTaskBenchmarkRunEvidence({
            plan: f.c.plan,
            policy: f.t.policy,
            checkpoint: { ...payload, checkpointHash: taskContentHash(payload) },
          }),
        );
        expect(legacyEvidence.codingRequests[0]!.requestFootprint).toBeUndefined();
        expect(data(projectTaskBenchmarkRunRequests(legacyEvidence))[0]).toMatchObject({
          purpose: "unknown",
          contextBytes: null,
        });
      }
      expect(record.attempts[0]!.evidenceHash).toBe(
        taskContentHash(JSON.parse(before).run.attempts[0]),
      );
      expect(JSON.stringify(record)).not.toContain("export const a");
      expect(JSON.stringify(record)).not.toContain("Requirements.");
      expect(await readFile(f.stateFile, "utf8")).toBe(before);
      expect(data(await f.t.adapter.snapshot())).toEqual(baseline);
      expect(f.s.provider.dispatch).toHaveBeenCalledTimes(2);
    },
  );
  it("reports project drift without reconciliation or checkpoint rewrites", async () => {
    const f = await openedTrial();
    const before = await readFile(f.stateFile, "utf8");
    await writeFile(path.join(f.t.root, "src/a.ts"), "export const a = 99;\n");
    const record = data(await f.inspect());
    expect(record.projectMatchesCheckpoint).toBe(false);
    expect(record.currentProjectRevision).not.toBe(f.created.run.project.latestProjectRevision);
    expect(record.codingRequests).toEqual([]);
    expect(await readFile(f.stateFile, "utf8")).toBe(before);
  });
  it("keeps absent legacy request footprints and missing private compilation ports explicitly unavailable", async () => {
    const f = await openedTrial();
    const stripped = { ...f.created };
    const partial = data(
      collectTaskBenchmarkRunEvidence({ plan: f.c.plan, policy: f.t.policy, checkpoint: stripped }),
    );
    expect(partial.compilationCharge).not.toBeNull();
    expect(partial.compilationReceipt).toBeNull();
    expect(partial.currentProjectRevision).toBeNull();
    expect(partial.projectMatchesCheckpoint).toBeNull();
    const adapter = {
      ...f.t.adapter,
      acquire: async () => {
        const lease = data(await f.t.adapter.acquire());
        const { loadCompilation: _optional, ...ports } = lease;
        void _optional;
        return { success: true as const, data: ports };
      },
    };
    expect(data(await f.inspect({ adapter })).compilationReceipt).toBeNull();
  });
  it("rejects incorrect roots, policies, compilation receipts and corrupt or absent private state", async () => {
    const f = await openedTrial();
    expect(
      collectTaskBenchmarkRunEvidence({
        plan: f.c.plan,
        policy: f.t.policy,
        checkpoint: f.created,
        compilationCheckpoint: f.s.checkpoint,
      }),
    ).toMatchObject({ success: false });
    expect(
      await f.inspect({
        policy: { ...f.t.policy, checkCatalogRevision: taskContentHash("different") },
      }),
    ).toMatchObject({ success: false });
    expect(await f.inspect({ adapter: { ...f.t.adapter, rootInstance: HASH } })).toMatchObject({
      success: false,
    });
    expect(await f.inspect({ runId: "123e4567-e89b-42d3-a456-426614174000" })).toMatchObject({
      success: false,
    });
    await writeFile(f.stateFile, '{"kind":"corrupt"}');
    expect(await f.inspect()).toMatchObject({ success: false });
  });
  it("takes no lease for invalid identities or pre-aborted inspection", async () => {
    const f = await openedTrial(),
      acquire = vi.spyOn(f.t.adapter, "acquire");
    expect(await f.inspect({ runId: "invalid" })).toMatchObject({ success: false });
    expect(await f.inspect({ signal: AbortSignal.abort() })).toMatchObject({ success: false });
    expect(acquire).not.toHaveBeenCalled();
  });
  it("rejects corrupt evidence hashes, secret material and acceptance promotion", async () => {
    const f = await openedTrial(),
      record = data(await f.inspect());
    expect(validateTaskBenchmarkRunEvidence(record).success).toBe(true);
    expect(validateTaskBenchmarkRunEvidence({ ...record, recordHash: HASH })).toMatchObject({
      success: false,
    });
    expect(
      validateTaskBenchmarkRunEvidence({ ...record, qualificationEligible: true }),
    ).toMatchObject({ success: false });
    expect(
      validateTaskBenchmarkRunEvidence({ ...record, acceptanceAuthenticated: true }),
    ).toMatchObject({ success: false });
    expect(validateTaskBenchmarkRunEvidence({ ...record, secret: "PRIVATE_MARKER" })).toMatchObject(
      { success: false },
    );
  });
  it("exports accepted private run evidence without importing acceptance authority", async () => {
    const f = await openedTrial();
    vi.mocked(f.s.provider.dispatch).mockImplementation(async () => {
      const document = f.s.prepared.mock.calls.at(-1)![0].document as {
        identity: { taskId: string };
      };
      const identity = document.identity;
      const wire = {
        kind: "task_provider_reply",
        schemaVersion: 1,
        ...identity,
        reply: {
          type: "change_set",
          changeSet: {
            kind: "change_set",
            schemaVersion: 1,
            ...identity,
            changes:
              identity.taskId === "producer"
                ? f.t.producerChanges
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
      return {
        outcome: "completed",
        document: {
          ...wire,
          reply: {
            ...wire.reply,
            changeSet: {
              ...wire.reply.changeSet,
              changeSetId: taskContentHash(wire.reply.changeSet),
            },
          },
        },
        httpStatus: 200,
        effectiveConfiguration: { provenance: "host_reported", configuration: CONFIGURATION },
        usage: f.s.checkpoint.usage!,
      };
    });
    for (const taskId of ["producer", "consumer"]) {
      data(
        await f.execute({
          type: "begin",
          runId: f.runId,
          taskId,
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        }),
      );
      data(
        await f.execute({
          type: "request",
          runId: f.runId,
          allowProviderUsage: true,
          maxOutputTokens: 256,
          timeoutMs: 1000,
        }),
      );
      data(await f.execute({ type: "verify", runId: f.runId, taskId }));
    }
    const final = data(await f.execute({ type: "finalize", runId: f.runId }));
    if (final.dryRun) throw new Error("dry run");
    const record = data(await f.inspect());
    expect(record.status).toBe("succeeded");
    expect(record.finalVerificationId).toBe(final.checkpoint.run.finalVerification!.verificationId);
    expect(record.attempts.map((a) => a.status)).toEqual(["accepted", "accepted"]);
    expect(record.qualificationEligible).toBe(false);
    expect(record.acceptanceAuthenticated).toBe(false);
    expect(record.compilationCharge?.usage).toEqual(f.c.usage);
  });
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
