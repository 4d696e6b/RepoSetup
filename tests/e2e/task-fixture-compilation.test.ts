import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  compileTaskPlan,
  executeTaskBenchmarkReplay,
  executeTaskCompilation,
  freezeTaskBenchmarkDecomposition,
  prepareTaskCompilationContext,
  prepareTaskContext,
  routeTask,
  taskContentHash,
  TASK_BENCHMARK_FIXTURE_IDS,
} from "../../packages/core/dist/index.js";
import { checked } from "../tasks/qualified-fixture.js";
import {
  createManagedBenchmarkFailureHost,
  strong,
  HASH,
} from "../tasks/managed-benchmark-host.js";

it.each(TASK_BENCHMARK_FIXTURE_IDS)(
  "compiles/replays the actual frozen %s seed and routes only its ready frontier without credentials",
  async (fixtureId) => {
    const parent = await realpath(
      await mkdtemp(path.join(tmpdir(), "reposetup-i-compiled-fixture-")),
    );
    try {
      const host = createManagedBenchmarkFailureHost(parent, fixtureId);
      for (const name of ["source", "fixed", "routed"] as const)
        host.roots[name] = await host.fresh(name);
      const source = host.roots.source!;
      const context = checked(
        await prepareTaskCompilationContext({
          review: source.review,
          repository: source.adapter.repository,
        }),
      );
      const compiled = checked(
        await executeTaskCompilation({
          review: source.review,
          adapter: source.adapter,
          provider: host.provider(strong, "compile"),
          resourceLimits: host.f.resourceLimits,
          maxOutputTokens: 4096,
          timeoutMs: 1000,
          expectedContextId: context.contextId,
          allowProviderUsage: true,
        }),
      );
      if (compiled.dryRun) throw new Error("Unexpected preview");
      const original = compiled.checkpoint;
      expect(original.status).toBe("completed");
      expect(original.plan!.coverage.map((c) => c.requirementId).sort()).toEqual(
        host.f.requirements.map((r) => r.requirementId).sort(),
      );
      expect(
        original
          .plan!.tasks.flatMap((t) => t.outputs.flatMap((o) => o.paths))
          .every((p) => host.f.seedFiles.some((f) => f.path === p)),
      ).toBe(true);
      const decomposition = checked(
        freezeTaskBenchmarkDecomposition({
          plan: original.plan,
          policy: host.policy,
          logicalVerificationRevision: HASH,
        }),
      );
      const replayPlans = [];
      for (const name of ["fixed", "routed"] as const) {
        const root = host.roots[name]!;
        const replay = checked(
          await executeTaskBenchmarkReplay({
            sourceCheckpoint: original,
            decomposition,
            review: root.review,
            logicalVerificationRevision: HASH,
            treatment: name === "fixed" ? "compiled_fixed" : "compiled_routed",
            adapter: root.adapter,
          }),
        );
        if (replay.dryRun) throw new Error("Unexpected replay preview");
        expect(replay.checkpoint.benchmarkReplay?.sourceCompilationId).toBe(original.compilationId);
        expect(replay.checkpoint.requestHash).toBe(original.requestHash);
        expect(replay.checkpoint.benchmarkReplay?.sourceUsage).toEqual(original.usage);
        const { durationMs, ...usage } = replay.checkpoint.usage!;
        const { durationMs: originalDuration, ...sourceUsage } = original.usage!;
        expect(usage).toEqual(sourceUsage);
        expect(durationMs).toBeGreaterThanOrEqual(originalDuration);
        replayPlans.push(replay.checkpoint.plan!);
        expect(checked(await root.adapter.snapshot()).revision).toBe(root.snapshot.revision);
      }
      expect(replayPlans[0]!.planId).not.toBe(replayPlans[1]!.planId);
      expect(taskContentHash(replayPlans[0]!.tasks)).toBe(taskContentHash(replayPlans[1]!.tasks));
      expect(replayPlans[0]!.dependencies).toEqual(replayPlans[1]!.dependencies);
      const plan = replayPlans[1]!,
        root = host.roots.routed!;
      const task = plan.tasks.find((t) => t.taskId === plan.orderedTaskIds[0])!;
      expect(plan.dependencies.some((d) => d.consumerTaskId === task.taskId)).toBe(false);
      const packet = checked(
        await prepareTaskContext({
          plan,
          policy: host.policy,
          taskId: task.taskId,
          repository: root.adapter.repository,
        }),
      );
      const limits = host.f.resourceLimits;
      const input = {
        ...host.routing,
        task,
        planId: plan.planId,
        context: packet.context,
        allowProviderUsage: true,
        now: new Date().toISOString(),
        maxOutputTokens: 256,
        remaining: {
          calls: limits.maxProviderCalls - 1,
          inputTokens: limits.maxInputTokens - original.reservation.inputTokens,
          outputTokens: limits.maxOutputTokens - original.reservation.outputTokens,
          costMicrousd: limits.maxCostMicrousd - original.reservation.costMicrousd,
          wallTimeMs: limits.maxWallTimeMs - original.usage!.durationMs,
        },
      };
      const routing = checked(routeTask(input));
      const strongFloor = ["cross-module-order-v1", "security-path-policy-v1"].includes(fixtureId);
      expect(routing.selected.modelProfileId).toBe(
        strongFloor ? "simulated-strong" : "simulated-baseline",
      );
      expect(routing.selected.nativeEffortId).toBe(strongFloor ? "low" : "none");
      expect(routing.selected.effectiveConfiguration.provenance).toBe("unknown");
      expect(routeTask({ ...input, qualificationScope: "live" })).toMatchObject({ success: false });
      if (fixtureId === "cross-module-order-v1") {
        expect(plan.orderedTaskIds).toEqual(["domain", "totals", "presenter"]);
        expect(plan.dependencies).toEqual(
          expect.arrayContaining([
            {
              predecessorTaskId: "domain",
              consumerTaskId: "totals",
              requiredArtifactIds: ["domain-output"],
            },
            {
              predecessorTaskId: "domain",
              consumerTaskId: "presenter",
              requiredArtifactIds: ["domain-output"],
            },
            {
              predecessorTaskId: "totals",
              consumerTaskId: "presenter",
              requiredArtifactIds: ["totals-output"],
            },
          ]),
        );
      }
      const whole = checked(
        compileTaskPlan({ ...source.review, draft: host.taskDraft(source.review, true) }),
      );
      expect(whole.tasks).toHaveLength(1);
      expect([...whole.tasks[0]!.requirementIds].sort()).toEqual(
        host.f.requirements.map((r) => r.requirementId).sort(),
      );
      expect(host.counts()).toEqual({ compilationDispatches: 1, codingDispatches: 0 });
      expect(new Set(host.projectRoots).size).toBe(3);
      expect(JSON.stringify(host.inputs)).not.toContain("oracle/holdout");
      expect(JSON.stringify(host.inputs)).not.toContain("types-contract");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
  120000,
);
