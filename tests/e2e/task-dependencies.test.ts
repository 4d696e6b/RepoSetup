import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { prepareTaskContext, taskByteHash } from "../../packages/core/dist/index.js";
import { createCandidateEvaluationSession } from "../tasks/candidate-evaluation.js";
import { checked, createCrossModuleRun } from "../tasks/cross-module-run.js";
import { inventory } from "../tasks/fixture-tools.js";

describe("frozen cross-module dependency lifecycle with simulated verification", () => {
  it("previews blocked consumer and phase operations with zero adapter calls or state/project writes", async () => {
    const f = await createCrossModuleRun();
    try {
      const project = await inventory(f.project),
        state = await inventory(f.stateRoot);
      const acquire = vi.spyOn(f.adapter, "acquire"),
        snapshot = vi.spyOn(f.adapter, "snapshot"),
        read = vi.spyOn(f.adapter.repository, "read"),
        scan = vi.spyOn(f.adapter.repository, "inventory");
      for (const operation of [
        f.beginOperation("presenter"),
        { type: "finalize" as const, runId: f.runId },
      ]) {
        expect(checked(await f.execute(operation, undefined, true)).dryRun).toBe(true);
      }
      expect(acquire).not.toHaveBeenCalled();
      expect(snapshot).not.toHaveBeenCalled();
      expect(read).not.toHaveBeenCalled();
      expect(scan).not.toHaveBeenCalled();
      expect(f.calls).toEqual([]);
      expect(f.reviews).toEqual([]);
      expect(await inventory(f.project)).toEqual(project);
      expect(await inventory(f.stateRoot)).toEqual(state);
    } finally {
      await f.dispose();
    }
  });
  it("accepts predecessors serially, binds exact output revisions and checks the resulting behavior independently", async () => {
    const f = await createCrossModuleRun();
    try {
      expect(f.plan.orderedTaskIds).toEqual(["domain", "totals", "presenter"]);
      const seed = await inventory(f.project);
      for (const taskId of ["totals", "presenter"]) {
        expect(await f.execute(f.beginOperation(taskId))).toMatchObject({
          success: false,
          error: { code: "TASK_NEEDS_REVIEW" },
        });
      }
      expect(f.calls).toEqual([]);
      expect(await inventory(f.project)).toEqual(seed);
      const domain = await f.complete("domain");
      const domainArtifact = domain.run.acceptedArtifacts[0]!;
      expect(domainArtifact).toMatchObject({
        producerTaskId: "domain",
        artifactId: "domain-output",
        paths: [
          {
            path: "src/domain.ts",
            fileHash: taskByteHash(await readFile(path.join(f.project, "src/domain.ts"))),
          },
        ],
      });
      const totals = await f.complete("totals");
      expect(
        totals.bindings.find((b) => b.context.taskId === "totals")!.context.predecessorArtifacts,
      ).toEqual([domainArtifact]);
      const presenter = await f.complete("presenter");
      const binding = presenter.bindings.find((b) => b.context.taskId === "presenter")!;
      expect(binding.context.predecessorArtifacts.map((a) => a.producerTaskId)).toEqual([
        "domain",
        "totals",
      ]);
      const totalHash = taskByteHash(await readFile(path.join(f.project, "src/totals.ts")));
      expect(binding.context.sources.find((s) => s.path === "src/totals.ts")).toMatchObject({
        fileHash: totalHash,
        inclusionReasons: expect.arrayContaining(["predecessor_output"]),
      });
      expect(binding.context.sources.every((s) => !s.path.includes("holdout"))).toBe(true);
      expect(presenter.journal.filter((e) => e.type === "file").map((e) => e.path)).toEqual([
        "src/totals.ts",
      ]);
      expect(presenter.run.resourceLedger.consumed.reserved.calls).toBe(0);
      expect(presenter.run.attempts.every((a) => a.usage.providerCallId === null)).toBe(true);
      const done = await f.checkpoint({ type: "finalize", runId: f.runId });
      expect(done.run.status).toBe("succeeded");
      expect(done.run.finalVerification?.outcome).toBe("pass");
      expect(f.reviews.at(-1)).toBe("phase:phase.acceptance");
      expect(f.calls).toHaveLength(21); // Three initial tasks, three refreshed tasks, final phase.
      const actual = checked(
        await createCandidateEvaluationSession({ manifest: f.manifest, projectRoot: f.project }),
      );
      const final = checked(
        await actual.finish({
          expectedRevision: checked(await actual.snapshot()).revision,
          terminalReason: "declared_complete",
        }),
      );
      expect(final.passed).toBe(true);
      expect(await readdir(f.project)).not.toContain("node_modules");
      const stateText = await readFile(
        path.join(f.stateRoot, taskByteHash(f.project).slice(7), `${f.runId}.json`),
        "utf8",
      );
      expect(stateText).not.toContain("export function");
      expect(stateText).not.toContain("oldText");
      const after = await inventory(f.project);
      expect(after.filter((file) => file.path !== "src/totals.ts")).toEqual(
        seed.filter((file) => file.path !== "src/totals.ts"),
      );
    } finally {
      await f.dispose();
    }
  });
  it.each(["domain", "totals"])(
    "invalidates accepted %s outputs and all accepted transitive consumers without rollback",
    async (taskId) => {
      const f = await createCrossModuleRun();
      try {
        await f.complete("domain");
        await f.complete("totals");
        const accepted = await f.complete("presenter");
        const sourcePath = path.join(f.project, `src/${taskId}.ts`);
        const changed = `// external edit after acceptance\n${await readFile(sourcePath, "utf8")}`;
        await writeFile(sourcePath, changed);
        const before = await inventory(f.project),
          calls = f.calls.length,
          reviews = f.reviews.length;
        const invalid = await f.checkpoint({ type: "reconcile", runId: f.runId });
        const affected =
          taskId === "domain" ? ["domain", "totals", "presenter"] : ["totals", "presenter"];
        expect(invalid.run.status).toBe("needs_review");
        for (const id of affected)
          expect(invalid.run.tasks.find((t) => t.taskId === id)).toMatchObject({
            status: "invalidated",
            acceptedVerificationId: null,
            reasonCode: "TASK_VERIFICATION_STALE",
          });
        expect(invalid.run.acceptedArtifacts.map((a) => a.producerTaskId)).toEqual(
          taskId === "domain" ? [] : ["domain"],
        );
        expect(invalid.run.finalVerification).toBeNull();
        expect(invalid.run.attempts).toEqual(accepted.run.attempts);
        expect(invalid.journal).toEqual(accepted.journal);
        expect(await f.execute({ type: "finalize", runId: f.runId })).toMatchObject({
          success: false,
        });
        expect(await f.execute(f.beginOperation("presenter"))).toMatchObject({ success: false });
        expect(f.calls).toHaveLength(calls);
        expect(f.reviews).toHaveLength(reviews);
        expect(await readFile(sourcePath, "utf8")).toBe(changed);
        expect(await inventory(f.project)).toEqual(before);
        const persisted = JSON.parse(
          await readFile(
            path.join(f.stateRoot, taskByteHash(f.project).slice(7), `${f.runId}.json`),
            "utf8",
          ),
        );
        expect(persisted.run.tasks).toEqual(invalid.run.tasks);
        expect(persisted.run.acceptedArtifacts).toEqual(invalid.run.acceptedArtifacts);
      } finally {
        await f.dispose();
      }
    },
  );
  it("rejects stale or substituted predecessor metadata and blocks a queued transitive consumer", async () => {
    const f = await createCrossModuleRun();
    try {
      const domain = await f.complete("domain"),
        artifact = domain.run.acceptedArtifacts[0]!;
      const prepare = (acceptedArtifacts: typeof domain.run.acceptedArtifacts) =>
        prepareTaskContext({
          plan: f.plan,
          policy: f.policy,
          taskId: "totals",
          repository: f.adapter.repository,
          acceptedArtifacts,
        });
      expect(checked(await prepare([artifact])).context.predecessorArtifacts).toEqual([artifact]);
      expect(
        await prepare([
          {
            ...artifact,
            paths: [{ path: "src/totals.ts", fileHash: artifact.paths[0]!.fileHash }],
          },
        ]),
      ).toMatchObject({ success: false, error: { code: "TASK_CONTEXT_UNRESOLVED" } });
      const external = `// changed dependency\n${await readFile(path.join(f.project, "src/domain.ts"), "utf8")}`;
      await writeFile(path.join(f.project, "src/domain.ts"), external);
      expect(await prepare([artifact])).toMatchObject({
        success: false,
        error: { code: "TASK_CONTEXT_STALE" },
      });
      const count = f.calls.length;
      const invalid = await f.checkpoint({ type: "reconcile", runId: f.runId });
      expect(invalid.run.tasks.find((t) => t.taskId === "domain")!.status).toBe("invalidated");
      for (const id of ["totals", "presenter"])
        expect(invalid.run.tasks.find((t) => t.taskId === id)!.status).toBe("blocked");
      expect(invalid.run.acceptedArtifacts).toEqual([]);
      expect(await f.execute(f.beginOperation("totals"))).toMatchObject({
        success: false,
        error: { code: "TASK_UNEXPECTED_CHANGES" },
      });
      expect(f.calls).toHaveLength(count);
    } finally {
      await f.dispose();
    }
  });
  it("requires fresh predecessor receipts in a fresh executor module despite intact durable pass records", async () => {
    const f = await createCrossModuleRun();
    try {
      const domain = await f.complete("domain"),
        before = await inventory(f.project),
        count = f.calls.length;
      vi.resetModules();
      const restarted = await import("../../packages/core/dist/index.js");
      expect(await f.execute(f.beginOperation("totals"), restarted.executeTaskRun)).toMatchObject({
        success: false,
        error: { code: "TASK_NEEDS_REVIEW" },
      });
      expect(f.calls).toHaveLength(count);
      expect(await inventory(f.project)).toEqual(before);
      const refreshed = checked(
        await f.execute(
          { type: "verify", runId: f.runId, taskId: "domain" },
          restarted.executeTaskRun,
        ),
      );
      if (refreshed.dryRun) throw new Error("preview");
      expect(refreshed.checkpoint.run.tasks.find((t) => t.taskId === "domain")!.status).toBe(
        "accepted",
      );
      expect(refreshed.checkpoint.run.acceptedArtifacts[0]!.acceptanceRevision).toBe(
        domain.run.acceptedArtifacts[0]!.acceptanceRevision,
      );
      expect(f.calls).toHaveLength(count + 3);
      const opened = checked(await f.execute(f.beginOperation("totals"), restarted.executeTaskRun));
      expect(opened.dryRun).toBe(false);
    } finally {
      await f.dispose();
    }
  });
});
