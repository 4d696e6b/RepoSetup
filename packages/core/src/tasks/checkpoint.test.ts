import { describe, expect, it } from "vitest";
import {
  sealTaskRunCheckpoint,
  validateTaskRunCheckpoint,
  type TaskRunCheckpoint,
} from "./checkpoint.js";
import { taskVerifierSnapshotHash } from "./verifier-files.js";
import { HASH, RUN, LIMITS, USAGE } from "./fixtures.test-helper.js";
function checkpoint(): TaskRunCheckpoint {
  return sealTaskRunCheckpoint({
    kind: "task_run_checkpoint",
    schemaVersion: 1,
    policyRevision: HASH,
    rootInstance: HASH,
    baselineSnapshot: {
      schemaVersion: 1,
      rootIdentity: HASH,
      rootFingerprint: HASH,
      entries: [],
      revision: taskVerifierSnapshotHash({
        schemaVersion: 1,
        rootIdentity: HASH,
        rootFingerprint: HASH,
        entries: [],
      }),
    },
    phaseVerificationPending: false,
    run: {
      kind: "phase_run",
      schemaVersion: 1,
      runId: RUN,
      stateRevision: 1,
      planId: HASH,
      project: {
        rootIdentity: HASH,
        baselineCommit: "b".repeat(40),
        baselineTreeHash: HASH,
        latestProjectRevision: HASH,
        lastReconciledRevision: HASH,
      },
      executionMode: "handoff",
      supportQualification: {
        status: "unconfirmed",
        reasons: ["Advisory host"],
        profileRevision: 1,
      },
      status: "prepared",
      tasks: [
        {
          taskId: "producer",
          status: "queued",
          attemptIds: [],
          reasonCode: null,
          acceptedVerificationId: null,
        },
      ],
      attempts: [],
      resourceLimits: LIMITS,
      resourceLedger: { reservations: [], consumed: USAGE },
      acceptedArtifacts: [],
      activeAttemptId: null,
      finalVerification: null,
      events: [],
    },
    bindings: [],
    journal: [],
  });
}
describe("durable task checkpoint", () => {
  it("is strict, hash bound and immutable", () => {
    const c = checkpoint();
    expect(validateTaskRunCheckpoint(c).success).toBe(true);
    expect(Object.isFrozen(c.run)).toBe(true);
    for (const bad of [
      { ...c, schemaVersion: 2 },
      { ...c, command: "bad" },
      { ...c, checkpointHash: HASH },
    ])
      expect(validateTaskRunCheckpoint(bad).success).toBe(false);
  });
  it("rejects rehashed duplicate tasks, dangling active attempts and invalid event revision order", () => {
    const { checkpointHash: _hash, ...c } = checkpoint();
    void _hash;
    for (const run of [
      { ...c.run, tasks: [...c.run.tasks, ...c.run.tasks] },
      { ...c.run, activeAttemptId: `${RUN}/producer/1` },
      {
        ...c.run,
        events: [
          {
            sequence: 1,
            previousStateRevision: 1,
            eventId: "bad",
            durationMs: 0,
            type: "transition" as const,
            metadata: {},
          },
        ],
      },
    ])
      expect(validateTaskRunCheckpoint(sealTaskRunCheckpoint({ ...c, run })).success).toBe(false);
  });
});
