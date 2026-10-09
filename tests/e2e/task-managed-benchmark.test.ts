import { expect, it } from "vitest";
import { summarizeTaskBenchmarkJournal, taskContentHash } from "../../packages/core/dist/index.js";
import { runManagedBenchmarkFailureBlock } from "../tasks/managed-benchmark-failure.js";

it("retains one actual frozen failure block through G/H, private ledgers, terminal oracles and the campaign journal", async () => {
  const f = await runManagedBenchmarkFailureBlock();
  try {
    expect(f.execution.stopCode).toBe("TASK_EXECUTION_ABORTED");
    expect(f.execution.complete).toBe(false);
    expect(f.execution.unacknowledgedEvent).toBeNull();
    expect(f.execution.hostTiming).toMatchObject({
      provenance: "measured",
      trialMs: expect.any(Number),
    });
    if (f.execution.hostTiming.provenance !== "measured") throw new Error("Unknown timing");
    expect(f.driverElapsedMs).toBeGreaterThanOrEqual(f.execution.hostTiming.elapsedMs);
    expect(new Set(f.projectRoots).size).toBe(4);
    expect(f.compilationDispatches).toBe(1);
    expect(f.codingDispatches).toBe(3);
    expect(f.processCalls).toBe(9); // Three real fixed Git probes per managed phase, no E check launch.
    expect(f.audit.events).toEqual(f.execution.retainedEvents);
    expect(f.audit.events).toHaveLength(10);
    expect(f.audit.pending).toBeNull();
    const trials = f.audit.campaign.trials;
    expect(trials.map((t) => [t.treatment, t.outcome, t.failureCode])).toEqual([
      ["whole", "failed", "TASK_PROVIDER_FAILED"],
      ["fixed", "failed", "TASK_PROVIDER_REFUSED"],
      ["routed", "failed", "TASK_PROVIDER_REFUSED"],
    ]);
    expect(trials[1]!.compilation).toEqual(trials[2]!.compilation);
    expect(trials[1]!.compilation!.compilationId).toBe(f.sourceCheckpoint!.compilationId);
    expect(trials[1]!.compilation!.planId).toBe(f.sourceCheckpoint!.plan!.planId);
    expect(trials[1]!.compilation!.taskCount).toBe(2);
    expect(trials.map((t) => t.requests[0]!.requested.modelProfileId)).toEqual([
      "simulated-strong",
      "simulated-strong",
      "simulated-baseline",
    ]);
    expect(trials.map((t) => t.requests[0]!.requested.nativeEffortId)).toEqual([
      "low",
      "low",
      "none",
    ]);
    expect(
      trials.every(
        (t) =>
          t.protectedInputsUnchanged && t.forbiddenEffects === 0 && t.finalEvidenceHash !== null,
      ),
    ).toBe(true);
    expect(f.evaluations).toHaveLength(3);
    expect(trials.map((t) => t.finalEvidenceHash)).toEqual(f.evaluations.map(taskContentHash));
    expect(
      f.evaluations.every(
        (e) => e.terminalReason === "limit_reached" && e.holdout?.passed === false,
      ),
    ).toBe(true);
    expect(f.ledgerEvidence.map((e) => e.resourceLedger.reservations.length)).toEqual([1, 2, 2]);
    expect(
      f.ledgerEvidence.every(
        (e) => !e.qualificationEligible && !e.acceptanceAuthenticated && e.projectMatchesCheckpoint,
      ),
    ).toBe(true);
    expect(f.ledgerEvidence[1]!.compilationCharge!.benchmarkReplay!.decompositionId).toBe(
      f.ledgerEvidence[2]!.compilationCharge!.benchmarkReplay!.decompositionId,
    );
    expect(f.ledgerEvidence[1]!.planId).not.toBe(f.ledgerEvidence[2]!.planId);
    const report = summarizeTaskBenchmarkJournal({ campaign: f.campaign, events: f.audit.events });
    if (!report.success) throw new Error(report.error.code);
    expect(report.data.dispatchAccountingComplete).toBe(false);
    expect(report.data.qualification).toBe(false);
    expect(report.data.terminalReport.missing).toHaveLength(72);
    expect(report.data.terminalReport.comparisonQualified).toBe(false);
    expect(report.data.terminalReport.treatments.map((t) => t.observedTrials)).toEqual([1, 1, 1]);
    expect(report.data.inclusiveKnownCashLedger).toMatchObject({
      providerCalls: null,
      retainedRequestIntents: 4,
      settledRequestIntents: 3,
      uncertainProviderCalls: 1,
      inputTokens: null,
      calculatedCostMicrousd: null,
    });
    expect(
      report.data.terminalReport.treatments.map((t) => t.resources.retainedRequestIntents),
    ).toEqual([1, 2, 2]);
    expect(JSON.stringify(f.inputs)).not.toContain("oracle/holdout");
    expect(JSON.stringify(f.inputs)).not.toContain("types-contract");
    process.stdout.write(
      JSON.stringify({
        kind: "task_managed_benchmark_failure_block",
        schemaVersion: 1,
        qualification: false,
        scope:
          "One frozen failure block; simulated provider and E definitions; real Git/state/terminal oracles; no candidate code changes or acceptance.",
        sourceSha: f.sourceSha,
        sourceDirty: f.sourceDirty,
        runnerRevision: f.campaign.runnerRevision,
        host: f.campaign.host,
        fixtureRevision: f.campaign.fixtures[0]!.fixtureRevision,
        observedTrials: 3,
        missingTrials: 72,
        compilationDispatches: f.compilationDispatches,
        codingDispatches: f.codingDispatches,
        cashLedger: report.data.inclusiveKnownCashLedger,
        hostTiming: f.execution.hostTiming,
        driverElapsedMs: f.driverElapsedMs,
        cleanupTiming: "not_included",
        journalHash: taskContentHash(f.audit.events),
        terminalEvidenceHashes: trials.map((t) => t.finalEvidenceHash),
        independentEvidenceRetention: "test_memory_only",
      }) + "\n",
    );
  } finally {
    await f.dispose();
  }
}, 180000);
