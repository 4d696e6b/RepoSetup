import { expect, it } from "vitest";
import {
  summarizeTaskBenchmarkJournal,
  taskContentHash,
  TASK_BENCHMARK_FIXTURE_IDS,
} from "../../packages/core/dist/index.js";
import { runManagedBenchmarkFailureCampaign } from "../tasks/managed-benchmark-failure.js";

it("retains all 75 actual seed failure slots without claiming model or acceptance qualification", async () => {
  const diagnostic = await runManagedBenchmarkFailureCampaign();
  try {
    expect(diagnostic.execution).toMatchObject({
      complete: true,
      stopCode: null,
      unacknowledgedEvent: null,
    });
    expect(diagnostic.audit.events).toEqual(diagnostic.execution.retainedEvents);
    expect(diagnostic.audit.events).toHaveLength(250);
    expect(diagnostic.audit.pending).toBeNull();
    expect(new Set(diagnostic.projectRoots).size).toBe(100);
    expect(diagnostic.compilationDispatches).toBe(25);
    expect(diagnostic.codingDispatches).toBe(75);
    expect(diagnostic.processCalls).toBe(225); // Fixed Git probes, not E tool launches.
    expect(diagnostic.acceptedCheckpoints).toEqual([]);
    expect(diagnostic.evaluations).toHaveLength(75);
    expect(diagnostic.retainedEvidence).toMatchObject({
      linkedRecords: 75,
      missing: [],
      unreferenced: [],
      acceptanceAuthenticated: false,
      qualification: false,
    });
    const trials = diagnostic.audit.campaign.trials;
    const compilationIds = new Set<string>();
    for (const fixtureId of TASK_BENCHMARK_FIXTURE_IDS) {
      for (let block = 0; block < 5; block++) {
        const slots = trials.filter((t) => t.fixtureId === fixtureId && t.block === block);
        expect(slots.map((t) => t.treatment)).toEqual(
          block % 3 === 0
            ? ["whole", "fixed", "routed"]
            : block % 3 === 1
              ? ["fixed", "routed", "whole"]
              : ["routed", "whole", "fixed"],
        );
        const fixed = slots.find((t) => t.treatment === "fixed")!;
        const routed = slots.find((t) => t.treatment === "routed")!;
        expect(fixed.compilation).toEqual(routed.compilation);
        compilationIds.add(fixed.compilation!.compilationId);
        expect(fixed.compilation!.taskCount).toBe(
          fixtureId === "ui-view-model-v1" ? 1 : fixtureId === "cross-module-order-v1" ? 3 : 2,
        );
        for (const trial of slots) {
          expect(trial).toMatchObject({
            outcome: "failed",
            failureCode:
              trial.treatment === "whole" ? "TASK_PROVIDER_FAILED" : "TASK_PROVIDER_REFUSED",
            protectedInputsUnchanged: true,
            forbiddenEffects: 0,
          });
          expect(trial.requests).toHaveLength(1);
          const requiresStrong =
            trial.treatment !== "routed" ||
            fixtureId === "cross-module-order-v1" ||
            fixtureId === "security-path-policy-v1";
          expect(trial.requests[0]!.requested).toMatchObject({
            modelProfileId: requiresStrong ? "simulated-strong" : "simulated-baseline",
            nativeEffortId: requiresStrong ? "low" : "none",
          });
          const artifact = diagnostic.retainedEvidence.artifacts.find(
            (a) =>
              a.fixtureId === fixtureId && a.block === block && a.treatment === trial.treatment,
          )!;
          expect(artifact.finalEvidenceHash).toBe(trial.finalEvidenceHash);
          expect(taskContentHash(artifact.record)).toBe(trial.finalEvidenceHash);
          expect(artifact.record.terminalReason).toBe("limit_reached");
          expect(artifact.record.holdout?.passed ?? false).toBe(false);
        }
      }
    }
    expect(compilationIds.size).toBe(25);
    expect(diagnostic.ledgerEvidence).toHaveLength(75);
    expect(
      diagnostic.ledgerEvidence.every(
        (e) => !e.qualificationEligible && !e.acceptanceAuthenticated && e.projectMatchesCheckpoint,
      ),
    ).toBe(true);
    const report = summarizeTaskBenchmarkJournal({
      campaign: diagnostic.campaign,
      events: diagnostic.audit.events,
    });
    if (!report.success) throw new Error(report.error.code);
    expect(report.data).toMatchObject({ qualification: false, dispatchAccountingComplete: false });
    expect(report.data.terminalReport).toMatchObject({
      complete: true,
      missing: [],
      comparisonQualified: false,
    });
    expect(
      report.data.terminalReport.treatments.map((t) => [
        t.observedTrials,
        t.accepted,
        t.failed,
        t.qualified,
        t.calculatedCostPerAcceptedMicrousd,
      ]),
    ).toEqual([
      [25, 0, 25, false, null],
      [25, 0, 25, false, null],
      [25, 0, 25, false, null],
    ]);
    expect(report.data.inclusiveKnownCashLedger).toMatchObject({
      retainedRequestIntents: 100,
      settledRequestIntents: 75,
      uncertainProviderCalls: 25,
      providerCalls: null,
      inputTokens: null,
      calculatedCostMicrousd: null,
    });
    expect(
      report.data.terminalReport.treatments.map((t) => t.resources.retainedRequestIntents),
    ).toEqual([25, 50, 50]);
    expect(JSON.stringify(diagnostic.inputs)).not.toContain("oracle/holdout");
    expect(JSON.stringify(diagnostic.inputs)).not.toContain("types-contract");
    if (diagnostic.execution.hostTiming.provenance !== "measured")
      throw new Error("Unknown timing");
    expect(diagnostic.driverElapsedMs).toBeGreaterThanOrEqual(
      diagnostic.execution.hostTiming.elapsedMs,
    );
    process.stdout.write(
      JSON.stringify({
        kind: "task_managed_benchmark_failure_campaign",
        schemaVersion: 1,
        qualification: false,
        scope:
          "All frozen seed failure slots; simulated provider/unreached E definitions; real G/H/Git/state/independent terminal oracles; no candidate changes or acceptance.",
        sourceSha: diagnostic.sourceSha,
        sourceDirty: diagnostic.sourceDirty,
        runnerRevision: diagnostic.campaign.runnerRevision,
        host: diagnostic.campaign.host,
        modelCatalogRevision: diagnostic.campaign.modelCatalogRevision,
        fixtureRevisions: diagnostic.campaign.fixtures.map((f) => ({
          fixtureId: f.fixtureId,
          fixtureRevision: f.fixtureRevision,
        })),
        observedTrials: 75,
        missingTrials: 0,
        acceptedTrials: 0,
        compilationDispatches: diagnostic.compilationDispatches,
        codingDispatches: diagnostic.codingDispatches,
        cashLedger: report.data.inclusiveKnownCashLedger,
        hostTiming: diagnostic.execution.hostTiming,
        driverElapsedMs: diagnostic.driverElapsedMs,
        cleanupTiming: "not_included",
        journalHash: taskContentHash(diagnostic.audit.events),
        independentEvidenceRetention:
          "75_private_immutable_slot_records_fsynced_then_read_back_before_cleanup",
      }) + "\n",
    );
  } finally {
    await diagnostic.dispose();
  }
}, 900000);
