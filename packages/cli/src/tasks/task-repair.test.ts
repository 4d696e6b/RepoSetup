import { describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { taskByteHash, sealTaskRunCheckpoint, validateTaskRunCheckpoint } from "@reposetup/core";
import { runFixture, LIMITS } from "./run-fixture.test-helper.js";

describe("durable focused repair with actual scoped filesystem writes", () => {
  it("retains failed edits, sends only bound failure metadata and unlocks consumers after fresh acceptance", async () => {
    const f = await runFixture();
    try {
      const runId = (await f.create()).run.runId;
      let c = await f.begin(runId);
      await f.requireRun({ type: "apply", runId, proposal: f.proposal(c, f.producerChanges) });
      f.exitCode = 1;
      c = await f.requireRun({ type: "verify", runId, taskId: "producer" });
      expect(c.run.attempts[0]!.failure).toMatchObject({
        class: "implementation",
        code: "TASK_CHECK_FAILED",
      });
      expect(c.run.tasks.find((t) => t.taskId === "consumer")!.status).toBe("blocked");
      expect(c.run.acceptedArtifacts).toEqual([]);
      c = await f.begin(runId);
      expect(c.bindings[1]!.repair).toMatchObject({
        action: "repair_implementation",
        previousAttemptId: `${runId}/producer/1`,
        retainedEffects: expect.arrayContaining([
          expect.objectContaining({
            path: "src/a.ts",
            afterHash: taskByteHash("export const a = 2;\r\n"),
          }),
        ]),
      });
      expect(c.bindings[1]!.writeTargets.find((p) => p.path === "src/a.ts")!.fileHash).toBe(
        taskByteHash("export const a = 2;\r\n"),
      );
      await f.requireRun({
        type: "apply",
        runId,
        proposal: f.proposal(c, [
          {
            type: "replace_text",
            path: "src/a.ts",
            expectedFileHash: taskByteHash("export const a = 2;\r\n"),
            oldText: "2",
            newText: "3",
          },
        ]),
      });
      f.exitCode = 0;
      c = await f.requireRun({ type: "verify", runId, taskId: "producer" });
      expect(c.run.attempts).toHaveLength(2);
      expect(c.journal).toHaveLength(4); // original parent + two files, then one guarded repair
      expect(await readFile(path.join(f.root, "src/new/b.ts"), "utf8")).toBe(
        "export const b = 2;\n",
      );
      c = await f.begin(runId, "consumer");
      await f.requireRun({
        type: "apply",
        runId,
        proposal: f.proposal(c, [
          {
            type: "create_text",
            path: "src/c.ts",
            expectedState: "absent",
            content: "export const c = 3;\n",
          },
        ]),
      });
      await f.requireRun({ type: "verify", runId, taskId: "consumer" });
      c = await f.requireRun({ type: "finalize", runId });
      expect(c.run.status).toBe("succeeded");
      expect(c.run.attempts.filter((a) => a.taskId === "producer")).toHaveLength(2);
      expect(c.run.attempts.filter((a) => a.taskId === "consumer")).toHaveLength(1);
      expect(validateTaskRunCheckpoint(c).success).toBe(true);
    } finally {
      await f.cleanup();
    }
  });
  it("requires fresh verification rather than accepting rehashed imported failure claims", async () => {
    const f = await runFixture();
    try {
      const runId = (await f.create()).run.runId;
      let c = await f.begin(runId);
      await f.requireRun({ type: "apply", runId, proposal: f.proposal(c, f.producerChanges) });
      f.exitCode = 1;
      c = await f.requireRun({ type: "verify", runId, taskId: "producer" });
      const forged = structuredClone(c);
      forged.run.attempts[0]!.failure!.suggestedAction = "Forged repair evidence.";
      const { checkpointHash: _hash, ...payload } = forged;
      void _hash;
      await writeFile(
        path.join(f.stateRoot, taskByteHash(f.root).slice(7), `${runId}.json`),
        JSON.stringify(sealTaskRunCheckpoint(payload)),
      );
      const blocked = await f.execute({
        type: "begin",
        runId,
        taskId: "producer",
        requestedConfiguration: c.run.attempts[0]!.requestedConfiguration,
        routingId: c.run.attempts[0]!.routingId,
      });
      expect(blocked).toMatchObject({ success: false, error: { code: "TASK_NEEDS_REVIEW" } });
      await f.requireRun({ type: "verify", runId, taskId: "producer" });
      expect((await f.begin(runId)).run.attempts).toHaveLength(2);
    } finally {
      await f.cleanup();
    }
  });
  it("makes the finite third failure terminal and retains every effect", async () => {
    const f = await runFixture();
    try {
      const runId = (
        await f.requireRun({
          type: "create",
          resourceLimits: { ...LIMITS, maxImplementationAttemptsPerTask: 3 },
        })
      ).run.runId;
      for (let i = 0; i < 3; i++) {
        const c = await f.begin(runId);
        if (i === 0)
          await f.requireRun({ type: "apply", runId, proposal: f.proposal(c, f.producerChanges) });
        else await f.requireRun({ type: "no_change", runId });
        f.exitCode = 1;
        const failed = await f.requireRun({ type: "verify", runId, taskId: "producer" });
        expect(failed.run.status).toBe(i === 2 ? "failed" : "blocked");
      }
      expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("2;");
      expect(
        await f.execute({
          type: "begin",
          runId,
          taskId: "producer",
          requestedConfiguration: {
            adapterId: "openai-responses-v1",
            providerId: "openai-responses-v1",
            modelProfileId: "qualified-strong",
            nativeEffortId: "low",
          },
          routingId: `sha256:${"a".repeat(64)}`,
        }),
      ).toMatchObject({ success: false, error: { code: "TASK_ATTEMPT_LIMIT_EXCEEDED" } });
    } finally {
      await f.cleanup();
    }
  });
});
