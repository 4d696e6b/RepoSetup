import { taskContentHash } from "./canonical.js";
import { fixture } from "./benchmark.test-helper.js";
import type {
  TaskBenchmarkFinalEvidence,
  TaskBenchmarkFinalRecord,
} from "./benchmark-final-evidence.js";
import type { TaskBenchmarkFixture } from "./benchmark-fixture.js";
import { taskBenchmarkTrialSchema } from "./benchmark-report.js";

export function finalRecord(f: TaskBenchmarkFixture): TaskBenchmarkFinalRecord {
  const row = (testId: string) => ({ testId, passed: true });
  return {
    fixtureRevision: f.fixtureRevision,
    checkedRevision: taskContentHash("candidate"),
    projectionRevision: taskContentHash("projection"),
    typecheck: true,
    compatibility: { passed: true, results: f.publicTestIds.slice(0, 1).map(row) },
    publicAcceptance: { passed: true, results: f.publicTestIds.slice(1).map(row) },
    durationMs: 1,
    terminalReason: "declared_complete",
    holdout: {
      passed: true,
      results: f.testInventory.filter((t) => t.kind === "runtime").map((t) => row(t.testId)),
    },
    typeContract: f.testInventory
      .filter((t) => t.kind === "type")
      .map((t) => ({ ...row(t.testId), executed: true })),
  };
}
/** Synthetic contract/storage fixtures only, never proof of actual evaluator work. */
export function evidenceFixture() {
  const f = fixture(),
    artifacts: TaskBenchmarkFinalEvidence[] = [];
  const run = f.ports.runTrial;
  f.ports.runTrial = async (slot) => {
    const trial = taskBenchmarkTrialSchema.parse(await run(slot)),
      record = finalRecord(slot.fixture);
    const artifact: TaskBenchmarkFinalEvidence = {
      kind: "task_benchmark_final_evidence",
      schemaVersion: 1,
      campaignId: taskContentHash(f.campaign),
      fixtureId: slot.fixture.fixtureId,
      block: slot.block,
      treatment: slot.treatment,
      record,
      finalEvidenceHash: taskContentHash(record),
    };
    artifacts.push(artifact);
    return { ...trial, finalEvidenceHash: artifact.finalEvidenceHash };
  };
  return { ...f, artifacts };
}
