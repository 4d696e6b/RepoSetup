import { expect, it } from "vitest";
import { summarizeTaskBenchmarkJournal, taskContentHash } from "../../packages/core/dist/index.js";
import { runManagedBenchmarkBlock } from "../tasks/managed-benchmark-failure.js";
import { createManagedBenchmarkVettedHost } from "../tasks/managed-benchmark-vetted-host.js";

it("joins a vetted two-task G/E success, failed whole/routed paths and independent retained terminal records", async () => {
  let host: Awaited<ReturnType<typeof createManagedBenchmarkVettedHost>> | undefined;
  const block = await runManagedBenchmarkBlock({
    createHost: async (parent) => {
      host = await createManagedBenchmarkVettedHost(parent);
      return host;
    },
    acceptedTreatment: "fixed",
    maxOutputTokens: 4096,
    runnerFiles: ["managed-benchmark-vetted-host.ts", "qualified-fixture.ts"],
  });
  try {
    expect(block.execution.complete).toBe(false);
    expect(block.execution.stopCode).toBe("TASK_EXECUTION_ABORTED");
    expect(block.audit.campaign.trials.map((t) => t.outcome)).toEqual([
      "failed",
      "accepted",
      "failed",
    ]);
    expect(block.compilationDispatches).toBe(1);
    expect(block.codingDispatches).toBe(4);
    expect(block.processCalls).toBe(24); // Nine Git probes plus 15 actual E tools.
    expect(host!.reviews()).toBe(5); // Two task reviews, two refreshed reviews, final phase.
    expect(block.acceptedCheckpoints).toHaveLength(1);
    const c = block.acceptedCheckpoints[0]!;
    expect(c.run.status).toBe("succeeded");
    expect(c.run.tasks.map((t) => [t.taskId, t.status])).toEqual([
      ["page", "accepted"],
      ["result", "accepted"],
    ]);
    expect(c.run.attempts.map((a) => a.proposalOutcome)).toEqual(["no_change", "change_set"]);
    expect(
      c.run.attempts.every(
        (a) => a.verification?.checkedRevision === c.run.finalVerification!.checkedRevision,
      ),
    ).toBe(true);
    expect(
      c.run.acceptedArtifacts
        .find((a) => a.artifactId === "result-output")
        ?.paths.map((p) => p.path),
    ).toEqual(["src/result.ts"]);
    expect(c.journal.filter((e) => e.type === "file").map((e) => e.path)).toEqual(["src/page.ts"]);
    expect(block.retainedEvidence).toMatchObject({
      linkedRecords: 3,
      missing: [],
      unreferenced: [],
      qualification: false,
      acceptanceAuthenticated: false,
    });
    expect(block.evaluations.map((e) => [e.terminalReason, e.holdout?.passed])).toEqual([
      ["limit_reached", false],
      ["declared_complete", true],
      ["limit_reached", false],
    ]);
    expect(block.evaluations[1]!.typeContract.every((t) => t.passed && t.executed)).toBe(true);
    const fixed = block.audit.campaign.trials[1]!;
    expect(fixed.checks.filter((c) => c.provenance === "reviewer")).toEqual(
      expect.arrayContaining([
        {
          checkId: "task.acceptance",
          passed: true,
          executedTests: null,
          provenance: "reviewer",
          reviewedCriteria: 4,
        },
        {
          checkId: "phase.acceptance",
          passed: true,
          executedTests: null,
          provenance: "reviewer",
          reviewedCriteria: 4,
        },
      ]),
    );
    expect(fixed.requests.map((r) => r.requested.nativeEffortId)).toEqual(["low", "low"]);
    const providerInputs = block.inputs as { identity?: { taskId: string }; context?: unknown }[];
    const page = providerInputs.find((i) => i.identity?.taskId === "page");
    expect(JSON.stringify(page?.context)).toContain("result-output");
    expect(JSON.stringify(block.inputs)).not.toContain("oracle/holdout");
    expect(JSON.stringify(block.inputs)).not.toContain("types-contract");
    const report = summarizeTaskBenchmarkJournal({
      campaign: block.campaign,
      events: block.audit.events,
    });
    if (!report.success) throw new Error(report.error.code);
    expect(report.data.terminalReport.missing).toHaveLength(72);
    expect(report.data.qualification).toBe(false);
    expect(report.data.inclusiveKnownCashLedger).toMatchObject({
      retainedRequestIntents: 5,
      uncertainProviderCalls: 1,
      providerCalls: null,
      inputTokens: null,
    });
    process.stdout.write(
      JSON.stringify({
        kind: "task_managed_benchmark_vetted_fixed_block",
        schemaVersion: 1,
        qualification: false,
        scope:
          "One vetted fixed two-task success; failed whole/routed simulations; real G/H/Git/E/state/terminal oracles. No arbitrary candidate or provider qualification.",
        sourceSha: block.sourceSha,
        sourceDirty: block.sourceDirty,
        runnerRevision: block.campaign.runnerRevision,
        host: block.campaign.host,
        fixtureRevision: block.campaign.fixtures[0]!.fixtureRevision,
        closureRevision: host!.closureRevision,
        sharedHostSetupMs: host!.sharedHostSetupMs,
        observedTrials: 3,
        acceptedTrials: 1,
        missingTrials: 72,
        compilationDispatches: block.compilationDispatches,
        codingDispatches: block.codingDispatches,
        managedProcessCalls: block.processCalls,
        reviewerCalls: host!.reviews(),
        reviewerScope: "Current task/phase and frozen reference file identity",
        cashLedger: report.data.inclusiveKnownCashLedger,
        hostTiming: block.execution.hostTiming,
        driverElapsedMs: block.driverElapsedMs,
        cleanupTiming: "not_included",
        terminalEvidenceHashes: block.evaluations.map(taskContentHash),
        retainedIndependentRecords: block.retainedEvidence.linkedRecords,
      }) + "\n",
    );
  } finally {
    await block.dispose();
  }
}, 1200000);
