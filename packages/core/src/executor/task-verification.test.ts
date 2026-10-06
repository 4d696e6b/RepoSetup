import { describe, expect, it, vi } from "vitest";
import { compileTaskPlan } from "../tasks/compile.js";
import { makeCompilation, HASH, RUN } from "../tasks/fixtures.test-helper.js";
import {
  taskVerificationCatalogHash,
  type TaskVerificationPolicy,
} from "../tasks/verification-policy.js";
import { taskVerifierSnapshotHash, type TaskVerifierSnapshot } from "../tasks/verifier-files.js";
import { taskFailure } from "../tasks/parse.js";
import {
  executeTaskVerification,
  type TaskVerificationAdapter,
  type TaskToolEvidence,
} from "./task-verification.js";
import type { ProcessRunResult } from "./types.js";

function fixture() {
  const compilation = makeCompilation();
  const definitions: TaskVerificationPolicy["definitions"] = [
    "ts.typecheck",
    "ts.lint",
    "ts.unit",
    "task.acceptance",
    "phase.acceptance",
  ].map((checkId) => ({
    checkId: checkId as TaskVerificationPolicy["definitions"][number]["checkId"],
    definitionRevision: HASH,
    authority: checkId.endsWith("acceptance") ? "reviewer" : "executor",
    criterionIds: ["producer-criterion", "consumer-criterion", "req-one-phase", "req-two-phase"],
    requiredTestIds: checkId === "ts.unit" ? ["independent-test"] : [],
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
  const payload = {
    schemaVersion: 1 as const,
    rootIdentity: HASH,
    rootFingerprint: HASH,
    entries: [],
  };
  const state = {
    snapshot: { ...payload, revision: taskVerifierSnapshotHash(payload) } as TaskVerifierSnapshot,
    effects: [] as string[],
    definitionValid: true,
    approved: true,
    result: { exitCode: 0, stdout: "", stderr: "" } as ProcessRunResult,
    reportStatus: "valid" as TaskToolEvidence["reportStatus"],
    tests: ["independent-test"],
  };
  const adapter: TaskVerificationAdapter = {
    snapshot: vi.fn(async () => {
      state.effects.push("snapshot");
      return { success: true as const, data: state.snapshot };
    }),
    verifyDefinitions: vi.fn(async () => {
      state.effects.push("definitions");
      return state.definitionValid
        ? { success: true as const, data: true as const }
        : taskFailure("TASK_CHECK_DEFINITION_CHANGED", "changed");
    }),
    prepare: vi.fn(async (checkId) => {
      state.effects.push(`prepare:${checkId}`);
      return {
        success: true as const,
        data: {
          request: {
            command: "/qualified/node",
            args: [checkId],
            cwd: "/project",
            env: { CI: "1" },
            timeoutMs: 100,
          },
          readEvidence: async () => ({
            success: true as const,
            data: {
              reportStatus: state.reportStatus,
              outputHash: HASH,
              testInventory:
                checkId === "ts.unit"
                  ? {
                      discovered: state.tests,
                      passed: state.tests,
                      failed: [],
                      skipped: [],
                      todo: [],
                      focused: false,
                      complete: true,
                    }
                  : null,
            },
          }),
          dispose: vi.fn(async () => {
            state.effects.push(`dispose:${checkId}`);
            return { success: true as const, data: true as const };
          }),
        },
      };
    }),
    review: vi.fn(async (request) => {
      state.effects.push("review");
      return { request, approved: state.approved, evidenceArtifactIds: ["independent-evidence"] };
    }),
  };
  const input = {
    plan: compiled.data,
    compilationPolicy: compilation.policy,
    policy,
    runId: RUN,
    target: { type: "task" as const, taskId: "producer" },
    inputRevision: HASH,
    expectedRevision: state.snapshot.revision,
    adapter,
    runProcess: vi.fn(async () => {
      state.effects.push("process");
      return state.result;
    }),
  };
  return { input, state, adapter };
}
async function verification(f: ReturnType<typeof fixture>) {
  const result = await executeTaskVerification(f.input);
  if (!result.success || result.data.dryRun) throw new Error("no verification");
  return result.data.verification;
}
describe("task verification executor", () => {
  it("runs fixed checks serially and disposes scratch before independent review", async () => {
    const f = fixture();
    expect((await verification(f)).outcome).toBe("pass");
    expect(f.state.effects.filter((e) => !["snapshot", "definitions"].includes(e))).toEqual([
      "prepare:ts.typecheck",
      "process",
      "dispose:ts.typecheck",
      "prepare:ts.lint",
      "process",
      "dispose:ts.lint",
      "prepare:ts.unit",
      "process",
      "dispose:ts.unit",
      "review",
    ]);
  });
  it("dry-run performs no port calls and rejects invalid plans before effects", async () => {
    const f = fixture();
    expect(await executeTaskVerification({ ...f.input, dryRun: true })).toMatchObject({
      success: true as const,
      data: { dryRun: true },
    });
    expect(f.state.effects).toEqual([]);
    expect(
      (await executeTaskVerification({ ...f.input, plan: { ...f.input.plan, command: "evil" } }))
        .success,
    ).toBe(false);
    expect(f.state.effects).toEqual([]);
  });
  it("rejects stale project identity and check catalog before scratch or launch", async () => {
    const f = fixture();
    expect((await executeTaskVerification({ ...f.input, expectedRevision: HASH })).success).toBe(
      false,
    );
    expect(f.adapter.prepare).not.toHaveBeenCalled();
    f.state.definitionValid = false;
    expect((await executeTaskVerification(f.input)).success).toBe(false);
    expect(f.input.runProcess).not.toHaveBeenCalled();
  });
  it.each(["timeout", "abort", "truncated", "missing", "failed", "invalid", "incomplete"])(
    "retains %s failures without independent acceptance",
    async (failure) => {
      const f = fixture();
      if (failure === "timeout") f.state.result.timedOut = true;
      if (failure === "abort") f.state.result.aborted = true;
      if (failure === "truncated") f.state.result.outputTruncated = true;
      if (failure === "missing") f.state.result.notFound = true;
      if (failure === "failed") f.state.result.exitCode = 1;
      if (failure === "invalid" || failure === "incomplete") f.state.reportStatus = failure;
      expect((await verification(f)).outcome).not.toBe("pass");
      expect(f.state.effects).toContain("dispose:ts.typecheck");
      expect(f.input.runProcess).toHaveBeenCalledTimes(1);
      expect(f.adapter.review).not.toHaveBeenCalled();
    },
  );
  it("does not request acceptance for a report missing independently required tests", async () => {
    const f = fixture();
    f.state.tests = ["other-test"];
    expect((await verification(f)).outcome).toBe("fail");
    expect(f.adapter.review).not.toHaveBeenCalled();
  });
  it("audits after a process throws and retains unexpected changes without rollback", async () => {
    const f = fixture();
    f.input.runProcess.mockImplementation(async () => {
      const payload = {
        ...f.state.snapshot,
        entries: [
          {
            path: "src/unexpected.ts",
            type: "file" as const,
            mode: "content" as const,
            fingerprint: HASH,
          },
        ],
      };
      f.state.snapshot = { ...payload, revision: taskVerifierSnapshotHash(payload) };
      throw new Error("secret must not escape");
    });
    const output = await verification(f);
    expect(output.outcome).toBe("fail");
    expect(output.unexpectedChanges).toEqual(["src/unexpected.ts"]);
    expect(f.state.effects).toContain("dispose:ts.typecheck");
    expect(JSON.stringify(output)).not.toContain("secret");
  });
  it("invalidates verification if immutable definitions drift during execution", async () => {
    const f = fixture();
    f.input.runProcess.mockImplementation(async () => {
      f.state.definitionValid = false;
      return f.state.result;
    });
    expect((await verification(f)).outcome).toBe("fail");
    expect(f.adapter.review).not.toHaveBeenCalled();
  });
  it("requires review when no independent decision is available and fails explicit rejection", async () => {
    const f = fixture();
    f.adapter.review = async () => null;
    expect((await verification(f)).outcome).toBe("needs_review");
    const rejected = fixture();
    rejected.state.approved = false;
    expect((await verification(rejected)).outcome).toBe("fail");
  });
  it("rejects a copied or rebound review request", async () => {
    const f = fixture();
    f.adapter.review = async (request) => ({
      request: { ...request },
      approved: true,
      evidenceArtifactIds: ["independent-evidence"],
    });
    expect((await verification(f)).outcome).toBe("blocked");
  });
  it("requires genuine current task receipts for final-phase checks, then uses a separate review", async () => {
    const f = fixture();
    const producer = await verification(f);
    f.input.target.taskId = "consumer";
    const consumer = await verification(f);
    const phase = {
      ...f.input,
      target: { type: "phase" as const, phaseId: "phase-one" },
      acceptedTasks: [producer, consumer],
    };
    const forged = await executeTaskVerification({
      ...phase,
      acceptedTasks: structuredClone(phase.acceptedTasks),
    });
    expect(forged.success).toBe(false);
    const checked = await executeTaskVerification(phase);
    expect(checked).toMatchObject({
      success: true as const,
      data: { verification: { outcome: "pass", target: { type: "phase" } } },
    });
    expect(f.adapter.review).toHaveBeenLastCalledWith(
      expect.objectContaining({ checkId: "phase.acceptance" }),
    );
  });
  it("pre-cancellation skips scratch and process calls", async () => {
    const f = fixture();
    const signal = AbortSignal.abort();
    expect(await executeTaskVerification({ ...f.input, signal })).toMatchObject({
      success: true as const,
      data: { verification: { outcome: "blocked" } },
    });
    expect(f.adapter.prepare).not.toHaveBeenCalled();
  });
  it("blocks overlapping verification and releases its in-memory guard after failure", async () => {
    const f = fixture();
    let release: (() => void) | undefined;
    const paused = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.adapter.verifyDefinitions = async () => {
      await paused;
      return taskFailure("TASK_CHECK_BLOCKED", "unavailable");
    };
    const first = executeTaskVerification(f.input);
    expect(await executeTaskVerification(f.input)).toMatchObject({
      success: false,
      error: { code: "TASK_EXECUTION_LOCKED" },
    });
    release!();
    expect((await first).success).toBe(false);
    expect(await executeTaskVerification(f.input)).toMatchObject({
      success: false,
      error: { code: "TASK_CHECK_BLOCKED" },
    });
    expect(
      await executeTaskVerification({
        ...f.input,
        target: { type: "task", taskId: "producer", command: "bad" },
      } as never),
    ).toMatchObject({ success: false, error: { code: "TASK_REFERENCE_INVALID" } });
  });
  it("blocks incomplete cleanup", async () => {
    const f = fixture();
    const prepare = f.adapter.prepare;
    f.adapter.prepare = async (id) => {
      const p = await prepare(id);
      if (p.success)
        p.data.dispose = async () => taskFailure("TASK_CHECK_BLOCKED", "cleanup unavailable");
      return p;
    };
    expect((await verification(f)).outcome).toBe("blocked");
    expect(f.adapter.review).not.toHaveBeenCalled();
  });
});
