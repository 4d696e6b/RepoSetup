import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  executeTaskRun,
  taskByteHash,
  taskContentHash,
  type TaskRunOperation,
} from "../../packages/core/dist/index.js";
import { createTaskRunAdapter } from "../../packages/cli/src/tasks/application-adapter.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import {
  checked,
  createQualifiedFixtureHost,
  createQualifiedReferenceFixture,
  type QualifiedFixtureHost,
} from "../tasks/qualified-fixture.js";
import { fixtureManifest, fixtureRoot, inventory } from "../tasks/fixture-tools.js";
import {
  createCandidateEvaluationSession,
  type FinalCandidateEvidence,
} from "../tasks/candidate-evaluation.js";
let host: QualifiedFixtureHost;
beforeAll(async () => {
  host = await createQualifiedFixtureHost();
});
afterAll(async () => {
  if (host) await host.dispose();
});
describe("vetted frozen fixture through scoped executor and actual managed checks", () => {
  it("applies a seed-to-reference change, accepts fresh task/phase receipts and independently checks behavior", async () => {
    const manifest = await fixtureManifest("cross-module-order-v1");
    const f = await createQualifiedReferenceFixture(host, manifest);
    try {
      // Test-only hydration back to seed. Candidate modifications below use only executor operations.
      for (const file of manifest.referenceFiles)
        await writeFile(
          path.join(f.project, file.path),
          await readFile(path.join(fixtureRoot, manifest.fixtureId, "seed", file.path)),
        );
      const seed = checked(await f.adapter.snapshot()).entries;
      const stateRoot = path.join(path.dirname(f.project), "state");
      await mkdir(stateRoot, { mode: 0o700 });
      const adapter = checked(
        await createTaskRunAdapter({
          projectRoot: f.project,
          stateRoot,
          authority: f.compilationPolicy.authority,
        }),
      );
      const runProcess = vi.fn(createDefaultProcessRunner());
      const execute = (operation: TaskRunOperation, dryRun = false) =>
        executeTaskRun({
          plan: f.plan,
          compilationPolicy: f.compilationPolicy,
          adapter,
          operation,
          dryRun,
          verification: { policy: f.policy, adapter: f.adapter, runProcess },
        });
      const checkpoint = async (operation: TaskRunOperation) => {
        const result = checked(await execute(operation));
        if (result.dryRun) throw new Error("Unexpected preview");
        return result.checkpoint;
      };
      const created = await checkpoint({ type: "create", resourceLimits: manifest.resourceLimits });
      const runId = created.run.runId;
      const begin: TaskRunOperation = {
        type: "begin",
        runId,
        taskId: "reference",
        requestedConfiguration: {
          adapterId: "openai-responses-v1",
          providerId: "openai-responses-v1",
          modelProfileId: "offline-frozen-reference",
          nativeEffortId: "low",
        },
        routingId: manifest.fixtureRevision,
      };
      const beforePreview = await inventory(stateRoot);
      expect(checked(await execute(begin, true)).dryRun).toBe(true);
      expect(await inventory(stateRoot)).toEqual(beforePreview);
      expect(checked(await f.adapter.snapshot()).entries).toEqual(seed);
      expect(runProcess).not.toHaveBeenCalled();
      const begun = await checkpoint(begin);
      const attempt = begun.run.attempts.at(-1)!;
      const changes = [];
      for (const file of manifest.referenceFiles) {
        const oldText = await readFile(path.join(f.project, file.path), "utf8");
        const newText = await readFile(
          path.join(fixtureRoot, manifest.fixtureId, "reference", file.path),
          "utf8",
        );
        if (oldText !== newText)
          changes.push({
            type: "replace_text" as const,
            path: file.path,
            expectedFileHash: taskByteHash(oldText),
            oldText,
            newText,
          });
      }
      expect(changes.map((c) => c.path)).toEqual(["src/totals.ts"]);
      const payload = {
        kind: "change_set" as const,
        schemaVersion: 1 as const,
        planId: f.plan.planId,
        taskId: "reference",
        attemptId: attempt.attemptId,
        inputRevision: attempt.inputRevision,
        changes,
      };
      const applied = await checkpoint({
        type: "apply",
        runId,
        proposal: { ...payload, changeSetId: taskContentHash(payload) },
      });
      expect(applied.run.attempts.at(-1)?.application.status).toBe("applied");
      const accepted = await checkpoint({ type: "verify", runId, taskId: "reference" });
      expect(accepted.run.tasks[0]?.status).toBe("accepted");
      expect(accepted.run.attempts.at(-1)?.verification?.outcome).toBe("pass");
      const done = await checkpoint({ type: "finalize", runId });
      expect(done.run.status).toBe("succeeded");
      expect(done.run.finalVerification?.outcome).toBe("pass");
      expect(done.run.resourceLedger.consumed.reserved.calls).toBe(0);
      expect(done.run.attempts.every((a) => a.usage.providerCallId === null)).toBe(true);
      expect(runProcess).toHaveBeenCalledTimes(9); // Task, refreshed task, final phase: three curated tools each.
      expect(f.reviews()).toBe(3);
      expect(done.run.acceptedArtifacts[0]?.paths).toEqual(
        expect.arrayContaining(
          manifest.referenceFiles.map((file) => ({ path: file.path, fileHash: file.fileHash })),
        ),
      );
      const after = checked(await f.adapter.snapshot()).entries;
      // Atomic replacement changes the owned file and its existing parent directory metadata.
      expect(after.find((file) => file.path === "src")).toMatchObject({
        path: "src",
        type: "directory",
        mode: "metadata",
      });
      expect(after.filter((file) => !["src/totals.ts", "src"].includes(file.path))).toEqual(
        seed.filter((file) => !["src/totals.ts", "src"].includes(file.path)),
      );
      expect(await readdir(f.scratchParent)).toEqual([]);
      const privateEvidence: FinalCandidateEvidence[] = [];
      const evaluator = checked(
        await createCandidateEvaluationSession({
          manifest,
          projectRoot: f.project,
          recordFinalEvidence: async (record) => {
            privateEvidence.push(record);
          },
        }),
      );
      const final = checked(
        await evaluator.finish({
          expectedRevision: checked(await evaluator.snapshot()).revision,
          terminalReason: "declared_complete",
        }),
      );
      expect(final.passed).toBe(true);
      expect(privateEvidence).toHaveLength(1);
      expect(privateEvidence[0]?.holdout?.passed).toBe(true);
      process.stdout.write(
        JSON.stringify({
          kind: "task_managed_frozen_candidate",
          schemaVersion: 1,
          qualification: false,
          fixtureId: manifest.fixtureId,
          fixtureRevision: manifest.fixtureRevision,
          sourceSha: host.sourceSha,
          sourceDirty: host.sourceDirty,
          closureRevision: host.closure.revision,
          node: process.version,
          platform: process.platform,
          architecture: process.arch,
          planId: f.plan.planId,
          taskVerificationIds: done.run.attempts.map((a) => a.verification?.verificationId),
          finalVerificationId: done.run.finalVerification?.verificationId,
          finalBehaviorEvidenceHash: final.evidenceHash,
          appliedPaths: changes.map((c) => c.path),
          curatedProcessCalls: runProcess.mock.calls.length,
          reviewerScope: "frozen-reference-file-identity",
          providerCalls: 0,
        }) + "\n",
      );
    } finally {
      await f.dispose();
    }
  }, 900000);
});
