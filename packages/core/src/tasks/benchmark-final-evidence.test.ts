import { beforeAll, describe, expect, it } from "vitest";
import { executeTaskBenchmark } from "../executor/task-benchmark.js";
import { evidenceFixture } from "./benchmark-final-evidence.test-helper.js";
import { taskContentHash } from "./canonical.js";
import {
  inspectTaskBenchmarkFinalEvidence,
  validateTaskBenchmarkFinalEvidence,
} from "./benchmark-final-evidence.js";

describe("independently retained terminal records", () => {
  const f = evidenceFixture();
  beforeAll(async () => {
    const executed = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
    if (!executed.success || !executed.data.complete) throw new Error("Synthetic fixture failed");
  });
  it("joins every slot without treating imported hashes as acceptance", () => {
    expect(
      inspectTaskBenchmarkFinalEvidence({
        campaign: f.campaign,
        events: f.events,
        artifacts: f.artifacts,
      }),
    ).toMatchObject({
      success: true,
      data: {
        linkedRecords: 75,
        missing: [],
        unreferenced: [],
        qualification: false,
        acceptanceAuthenticated: false,
      },
    });
  });
  it("keeps missing records and an interrupted terminal event visible", () => {
    expect(
      inspectTaskBenchmarkFinalEvidence({
        campaign: f.campaign,
        events: f.events,
        artifacts: f.artifacts.slice(1),
      }),
    ).toMatchObject({
      success: true,
      data: { linkedRecords: 74, missing: ["types-result-v1/0/whole"] },
    });
    expect(
      inspectTaskBenchmarkFinalEvidence({
        campaign: f.campaign,
        events: f.events.slice(0, 3),
        artifacts: [f.artifacts[0]],
      }),
    ).toMatchObject({ success: true, data: { linkedRecords: 0, unreferenced: [f.artifacts[0]] } });
  });
  it.each([
    "hash",
    "campaign",
    "fixture",
    "duplicate-public",
    "private-inventory",
    "unknown-field",
    "unexecuted-type",
    "false-pass",
  ])("rejects %s without repairing it", (kind) => {
    const a = structuredClone(f.artifacts[0]!);
    if (kind === "hash") a.finalEvidenceHash = taskContentHash("wrong");
    if (kind === "campaign") a.campaignId = taskContentHash("other");
    if (kind === "fixture") a.record.fixtureRevision = taskContentHash("other");
    if (kind === "duplicate-public")
      a.record.publicAcceptance!.results[0] = a.record.compatibility!.results[0]!;
    if (kind === "private-inventory") a.record.holdout!.results.pop();
    if (kind === "unknown-field") Object.assign(a.record, { processOutput: "private output" });
    if (kind === "unexecuted-type") a.record.typeContract[0]!.executed = false;
    if (kind === "false-pass") a.record.holdout!.results[0]!.passed = false;
    if (kind !== "hash") a.finalEvidenceHash = taskContentHash(a.record);
    expect(validateTaskBenchmarkFinalEvidence({ campaign: f.campaign, artifact: a })).toMatchObject(
      { success: false, error: { code: "TASK_BENCHMARK_INVALID" } },
    );
  });
  it("rejects duplicate slots, unrelated future records and journal substitution", () => {
    for (const artifacts of [[...f.artifacts, f.artifacts[0]], [f.artifacts[1]]])
      expect(
        inspectTaskBenchmarkFinalEvidence({
          campaign: f.campaign,
          events: f.events.slice(0, 3),
          artifacts,
        }),
      ).toMatchObject({ success: false });
    const a = structuredClone(f.artifacts[0]!);
    a.record.checkedRevision = taskContentHash("another-candidate");
    a.finalEvidenceHash = taskContentHash(a.record);
    expect(
      inspectTaskBenchmarkFinalEvidence({
        campaign: f.campaign,
        events: f.events,
        artifacts: [a, ...f.artifacts.slice(1)],
      }),
    ).toMatchObject({ success: false });
  });
  it("retains a failed compiler observation without inventing unexecuted checks", () => {
    const a = structuredClone(f.artifacts[0]!);
    a.record.typecheck = false;
    a.record.compatibility = a.record.publicAcceptance = a.record.holdout = null;
    a.record.typeContract.forEach((t) => {
      t.passed = false;
      t.executed = false;
    });
    a.record.terminalReason = "limit_reached";
    a.finalEvidenceHash = taskContentHash(a.record);
    expect(validateTaskBenchmarkFinalEvidence({ campaign: f.campaign, artifact: a })).toMatchObject(
      { success: true },
    );
  });
});
