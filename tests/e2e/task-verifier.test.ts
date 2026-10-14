import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  executeTaskVerification,
  TASK_BENCHMARK_FIXTURE_IDS,
  taskByteHash,
  taskContentHash,
  type TaskBenchmarkFixture,
} from "../../packages/core/dist/index.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import { fixtureRoot, workspaceRoot } from "../tasks/fixture-tools.js";
import {
  checked,
  createQualifiedFixtureHost,
  createQualifiedReferenceFixture,
  type QualifiedFixtureHost,
} from "../tasks/qualified-fixture.js";

let host: QualifiedFixtureHost;
beforeAll(async () => {
  host = await createQualifiedFixtureHost();
});
afterAll(async () => {
  if (host) await host.dispose();
});
const manifestFor = async (fixtureId: string): Promise<TaskBenchmarkFixture> =>
  JSON.parse(await readFile(path.join(fixtureRoot, fixtureId, "manifest.json"), "utf8"));
describe("frozen-reference executor qualification with complete immutable inventories", () => {
  for (const fixtureId of TASK_BENCHMARK_FIXTURE_IDS)
    it(`verifies ${fixtureId} task and final phase without project effects`, async () => {
      const manifest = await manifestFor(fixtureId);
      const f = await createQualifiedReferenceFixture(host, manifest);
      try {
        const runProcess = vi.fn(createDefaultProcessRunner());
        const input = {
          plan: f.plan,
          compilationPolicy: f.compilationPolicy,
          policy: f.policy,
          runId: "123e4567-e89b-42d3-a456-426614174000",
          target: { type: "task" as const, taskId: "reference" },
          inputRevision: manifest.fixtureRevision,
          expectedRevision: f.before.revision,
          adapter: f.adapter,
          runProcess,
        };
        expect(checked(await executeTaskVerification({ ...input, dryRun: true })).dryRun).toBe(
          true,
        );
        expect(runProcess).not.toHaveBeenCalled();
        expect(await readdir(f.scratchParent)).toEqual([]);
        const task = checked(await executeTaskVerification(input));
        if (task.dryRun) throw new Error("Unexpected preview");
        expect(task.verification).toMatchObject({ outcome: "pass", unexpectedChanges: [] });
        expect(task.verification.checks.find((c) => c.checkId === "ts.unit")?.executedTests).toBe(
          manifest.publicTestIds.length,
        );
        const phase = checked(
          await executeTaskVerification({
            ...input,
            target: { type: "phase", phaseId: manifest.phaseId },
            acceptedTasks: [task.verification],
          }),
        );
        if (phase.dryRun) throw new Error("Unexpected preview");
        expect(phase.verification).toMatchObject({ outcome: "pass", unexpectedChanges: [] });
        expect(phase.verification.criterionCoverage.every((c) => c.satisfied)).toBe(true);
        expect(f.reviews()).toBe(2);
        expect(runProcess).toHaveBeenCalledTimes(6);
        expect(checked(await f.adapter.snapshot())).toEqual(f.before);
        expect(await readdir(f.scratchParent)).toEqual([]);
        expect(
          f.before.entries.some(
            (e) => e.path.includes("holdout") || e.path.includes("type-oracle"),
          ),
        ).toBe(false);
        process.stdout.write(
          JSON.stringify({
            kind: "task_frozen_reference_verifier",
            schemaVersion: 1,
            trialQualification: false,
            fixtureId,
            fixtureRevision: manifest.fixtureRevision,
            sourceSha: host.sourceSha,
            sourceDirty: host.sourceDirty,
            dependencyArtifactId: manifest.dependencyArtifactId,
            lockfileHash: manifest.lockfileHash,
            runnerRevision: taskContentHash(
              await Promise.all(
                ["tests/tasks/qualified-fixture.ts", "tests/e2e/task-verifier.test.ts"].map(
                  async (file) => ({
                    path: file,
                    fileHash: taskByteHash(await readFile(path.join(workspaceRoot, file))),
                  }),
                ),
              ),
            ),
            closureRevision: host.closure.revision,
            closureBytes: host.closure.totalBytes,
            closureEntries: host.closure.entries,
            node: process.version,
            platform: process.platform,
            architecture: process.arch,
            taskVerificationId: task.verification.verificationId,
            phaseVerificationId: phase.verification.verificationId,
            reviewedPublicTests: manifest.publicTestIds.length,
            processCalls: runProcess.mock.calls.length,
            protectedInputsUnchanged: true,
            reviewerScope: "frozen-reference-file-identity",
          }) + "\n",
        );
      } finally {
        await f.dispose();
      }
    }, 600000);
  it("blocks a changed imported public oracle before launching any process", async () => {
    const f = await createQualifiedReferenceFixture(host, await manifestFor("types-result-v1"));
    try {
      await writeFile(path.join(f.project, "test/public/compat.mjs"), "export const cases = [];\n");
      const runProcess = vi.fn(createDefaultProcessRunner());
      expect(
        await executeTaskVerification({
          plan: f.plan,
          compilationPolicy: f.compilationPolicy,
          policy: f.policy,
          runId: "123e4567-e89b-42d3-a456-426614174000",
          target: { type: "task", taskId: "reference" },
          inputRevision: f.plan.phase.selectionHash,
          expectedRevision: f.before.revision,
          adapter: f.adapter,
          runProcess,
        }),
      ).toMatchObject({ success: false, error: { code: "TASK_CHECK_DEFINITION_CHANGED" } });
      expect(runProcess).not.toHaveBeenCalled();
      expect(f.reviews()).toBe(0);
      expect(await readdir(f.scratchParent)).toEqual([]);
    } finally {
      await f.dispose();
    }
  }, 600000);
  it("blocks transitive dependency drift before launching any process", async () => {
    const f = await createQualifiedReferenceFixture(host, await manifestFor("types-result-v1"));
    try {
      await writeFile(path.join(host.tools, "unexpected-dependency.txt"), "changed\n");
      const runProcess = vi.fn(createDefaultProcessRunner());
      expect(
        await executeTaskVerification({
          plan: f.plan,
          compilationPolicy: f.compilationPolicy,
          policy: f.policy,
          runId: "123e4567-e89b-42d3-a456-426614174000",
          target: { type: "task", taskId: "reference" },
          inputRevision: f.plan.phase.selectionHash,
          expectedRevision: f.before.revision,
          adapter: f.adapter,
          runProcess,
        }),
      ).toMatchObject({ success: false, error: { code: "TASK_CHECK_DEFINITION_CHANGED" } });
      expect(runProcess).not.toHaveBeenCalled();
      expect(f.reviews()).toBe(0);
      expect(await readdir(f.scratchParent)).toEqual([]);
    } finally {
      await f.dispose();
    }
  }, 600000);
});
