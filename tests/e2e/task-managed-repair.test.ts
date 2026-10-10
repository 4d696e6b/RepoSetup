import { expect, it } from "vitest";
import { summarizeTaskBenchmarkJournal, taskContentHash } from "../../packages/core/dist/index.js";
import { runManagedBenchmarkBlock } from "../tasks/managed-benchmark-failure.js";
import { createManagedBenchmarkVettedHost } from "../tasks/managed-benchmark-vetted-host.js";

it("retains actual context expansion and vetted failed-edit repair overhead before independent terminal acceptance", async () => {
  let host: Awaited<ReturnType<typeof createManagedBenchmarkVettedHost>> | undefined;
  const block = await runManagedBenchmarkBlock({
    createHost: async (parent) => {
      host = await createManagedBenchmarkVettedHost(parent, { contextAndRepair: true });
      return host;
    },
    acceptedTreatment: "fixed",
    maxOutputTokens: 4096,
    runnerFiles: ["managed-benchmark-vetted-host.ts", "qualified-fixture.ts"],
  });
  try {
    const fixed = block.audit.campaign.trials[1]!;
    const report = summarizeTaskBenchmarkJournal({
      campaign: block.campaign,
      events: block.audit.events,
    });
    if (!report.success) throw new Error(report.error.code);
    process.stdout.write(
      JSON.stringify({
        kind: "task_managed_benchmark_vetted_repair_block",
        schemaVersion: 1,
        qualification: false,
        scope:
          "One vetted fixed context/repair success; failed whole/routed simulations; actual G/H/Git/E/state/terminal oracles. No arbitrary candidate or provider qualification.",
        sourceSha: block.sourceSha,
        sourceDirty: block.sourceDirty,
        runnerRevision: block.campaign.runnerRevision,
        host: block.campaign.host,
        diagnosticVariant: host!.diagnosticVariant,
        closureRevision: host!.closureRevision,
        sharedHostSetupMs: host!.sharedHostSetupMs,
        observedTrials: 3,
        acceptedTrials: 1,
        missingTrials: 72,
        compilationDispatches: block.compilationDispatches,
        codingDispatches: block.codingDispatches,
        managedProcessCalls: block.processCalls,
        reviewerCalls: host!.reviews(),
        requestPurposes: fixed.requests.map((r) => r.purpose),
        cashLedger: report.data.inclusiveKnownCashLedger,
        hostTiming: block.execution.hostTiming,
        driverElapsedMs: block.driverElapsedMs,
        cleanupTiming: "not_included",
        terminalEvidenceHashes: block.evaluations.map(taskContentHash),
        retainedIndependentRecords: block.retainedEvidence.linkedRecords,
      }) + "\n",
    );
    expect(block.execution).toMatchObject({ complete: false, stopCode: "TASK_EXECUTION_ABORTED" });
    expect(block.audit.campaign.trials.map((t) => t.outcome)).toEqual([
      "failed",
      "accepted",
      "failed",
    ]);
    expect(block.compilationDispatches).toBe(1);
    expect(block.codingDispatches).toBe(6);
    expect(block.processCalls).toBe(27); // Nine fixed Git probes plus 18 qualified E tools.
    expect(host!.reviews()).toBe(5); // Failed unit checks skip acceptance review.
    expect(block.acceptedCheckpoints).toHaveLength(1);
    const checkpoint = block.acceptedCheckpoints[0]!;
    expect(checkpoint.run.status).toBe("succeeded");
    expect(checkpoint.run.attempts.map((a) => [a.taskId, a.attemptNumber, a.status])).toEqual([
      ["result", 1, "accepted"],
      ["page", 1, "failed"],
      ["page", 2, "accepted"],
    ]);
    const failed = checkpoint.run.attempts[1]!;
    expect(failed.failure).toMatchObject({ code: "TASK_CHECK_FAILED", class: "implementation" });
    expect(failed.application.status).toBe("applied");
    expect(failed.verification?.checks.find((c) => c.checkId === "ts.unit")).toMatchObject({
      status: "fail",
      failureCode: "TASK_CHECK_FAILED",
      executedTests: null,
      exitCode: 1,
      outputHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    const edits = checkpoint.journal.filter((e) => e.type === "file");
    expect(edits).toHaveLength(2);
    expect(edits.map((e) => e.path)).toEqual(["src/page.ts", "src/page.ts"]);
    expect(edits[0]!.afterHash).toBe(host!.faultyPageHash);
    expect(edits[1]!.beforeHash).toBe(edits[0]!.afterHash);
    expect(fixed.requests.map((r) => r.purpose)).toEqual([
      "context",
      "implementation",
      "implementation",
      "repair",
    ]);
    expect(
      fixed.requests.every(
        (r) => r.outcome === "completed" && r.durationMs !== null && r.contextBytes !== null,
      ),
    ).toBe(true);
    expect(checkpoint.run.resourceLedger.reservations).toHaveLength(5); // Shared G plus all four fixed requests.
    const inputs = block.inputs as {
      identity?: { planId: string; taskId: string; attemptId: string; inputRevision: string };
      context?: { context: { sources: { path: string }[] }; files: { path: string }[] };
      repair?: {
        action: string;
        previousAttemptId: string;
        retainedEffects: { path: string; afterHash: string }[];
      };
    }[];
    const resultInputs = inputs.filter(
      (input) =>
        input.identity?.taskId === "result" && input.identity.planId === checkpoint.run.planId,
    );
    expect(resultInputs).toHaveLength(2);
    expect(resultInputs[0]!.identity!.attemptId).toBe(resultInputs[1]!.identity!.attemptId);
    expect(resultInputs[0]!.identity!.inputRevision).not.toBe(
      resultInputs[1]!.identity!.inputRevision,
    );
    expect(resultInputs[0]!.context!.files.some((file) => file.path === "tsconfig.json")).toBe(
      false,
    );
    expect(resultInputs[1]!.context!.files.some((file) => file.path === "tsconfig.json")).toBe(
      true,
    );
    const repair = inputs.find((input) => input.repair);
    expect(repair?.repair).toMatchObject({
      action: "repair_implementation",
      previousAttemptId: failed.attemptId,
    });
    expect(repair?.repair!.retainedEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "src/page.ts",
          beforeHash: expect.any(String),
          afterHash: host!.faultyPageHash,
        }),
      ]),
    );
    expect(JSON.stringify(block.inputs)).not.toContain("oracle/holdout");
    expect(JSON.stringify(block.inputs)).not.toContain("types-contract");
    expect(block.retainedEvidence).toMatchObject({
      linkedRecords: 3,
      missing: [],
      unreferenced: [],
      qualification: false,
    });
    expect(block.evaluations.map((e) => [e.terminalReason, e.holdout?.passed])).toEqual([
      ["limit_reached", false],
      ["declared_complete", true],
      ["limit_reached", false],
    ]);
    expect(block.evaluations[1]!.typeContract.every((test) => test.executed && test.passed)).toBe(
      true,
    );
    expect(report.data).toMatchObject({ qualification: false, dispatchAccountingComplete: false });
    expect(report.data.terminalReport.missing).toHaveLength(72);
    expect(report.data.inclusiveKnownCashLedger).toMatchObject({
      retainedRequestIntents: 7,
      settledRequestIntents: 6,
      uncertainProviderCalls: 1,
      providerCalls: null,
      inputTokens: null,
      calculatedCostMicrousd: null,
    });
    expect(
      report.data.terminalReport.treatments.map((t) => t.resources.retainedRequestIntents),
    ).toEqual([1, 5, 2]);
    if (block.execution.hostTiming.provenance !== "measured") throw new Error("Unknown timing");
    expect(block.driverElapsedMs).toBeGreaterThanOrEqual(block.execution.hostTiming.elapsedMs);
  } finally {
    await block.dispose();
  }
  // Outer driver includes setup/retention around the bounded benchmark trial.
}, 1800000);
