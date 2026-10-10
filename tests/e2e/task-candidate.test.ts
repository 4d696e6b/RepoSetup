import { cp, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  TASK_BENCHMARK_FIXTURE_IDS,
  taskContentHash,
  type TaskBenchmarkFixture,
  type TaskParseResult,
  type ProcessRunner,
} from "../../packages/core/dist/index.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import {
  createCandidateEvaluationSession,
  type FinalCandidateEvidence,
} from "../tasks/candidate-evaluation.js";
import { fixtureRoot, inventory } from "../tasks/fixture-tools.js";

function checked<T>(result: TaskParseResult<T>): T {
  if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}
async function candidate(fixtureId: string, variant = "reference") {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-candidate-test-"))),
    project = path.join(root, "project");
  const source = path.join(fixtureRoot, fixtureId);
  await cp(path.join(source, "seed"), project, { recursive: true });
  if (variant !== "seed")
    await cp(
      path.join(source, variant === "reference" ? "reference" : `incorrect/${variant}`),
      project,
      { recursive: true },
    );
  const manifest: TaskBenchmarkFixture = JSON.parse(
    await readFile(path.join(source, "manifest.json"), "utf8"),
  );
  return {
    root,
    project,
    source,
    manifest,
    dispose: () => rm(root, { recursive: true, force: true }),
  };
}
describe("read-only actual-candidate public and terminal holdout evaluation", () => {
  for (const fixtureId of TASK_BENCHMARK_FIXTURE_IDS)
    it(`accepts behaviorally equivalent ${fixtureId} candidates without matching reference bytes`, async () => {
      const f = await candidate(fixtureId);
      try {
        for (const file of f.manifest.referenceFiles) {
          let source = await readFile(path.join(f.project, file.path), "utf8");
          if (fixtureId === "ui-view-model-v1") {
            expect(source).toContain("    .slice()\n");
            source = source.replace("    .slice()\n", "");
          }
          await writeFile(
            path.join(f.project, file.path),
            `// independently edited candidate\n${source}`,
          );
        }
        const before = await inventory(f.project),
          records: Readonly<FinalCandidateEvidence>[] = [];
        const runProcess = vi.fn(createDefaultProcessRunner());
        const session = checked(
          await createCandidateEvaluationSession({
            manifest: f.manifest,
            projectRoot: f.project,
            runProcess,
            recordFinalEvidence: async (record) => {
              records.push(record);
            },
          }),
        );
        const snapshot = checked(await session.snapshot());
        const publicResult = checked(await session.publicChecks(snapshot.revision));
        expect(publicResult).toMatchObject({
          typecheck: true,
          compatibility: { passed: true },
          publicAcceptance: { passed: true },
          checkedRevision: snapshot.revision,
        });
        expect(publicResult).not.toHaveProperty("holdout");
        expect(publicResult).not.toHaveProperty("typeContract");
        expect(runProcess.mock.calls.some(([r]) => r.args.at(-1) === "holdout")).toBe(false);
        expect(records).toEqual([]);
        const finalResult = checked(
          await session.finish({
            expectedRevision: snapshot.revision,
            terminalReason: "declared_complete",
          }),
        );
        expect(finalResult.passed).toBe(true);
        expect(Object.keys(finalResult).sort()).toEqual([
          "checkedRevision",
          "evidenceHash",
          "passed",
        ]);
        expect(records).toHaveLength(1);
        expect(finalResult.evidenceHash).toBe(taskContentHash(records[0]));
        expect(records[0]!.holdout?.results.map((r) => r.testId).sort()).toEqual(
          f.manifest.testInventory
            .filter((t) => t.kind === "runtime")
            .map((t) => t.testId)
            .sort(),
        );
        expect(records[0]!.typeContract.every((t) => t.executed && t.passed)).toBe(true);
        expect(Object.isFrozen(records[0]!.holdout!.results[0])).toBe(true);
        expect(await inventory(f.project)).toEqual(before);
        expect(checked(await session.snapshot())).toEqual(snapshot);
        const count = runProcess.mock.calls.length;
        expect(await session.publicChecks(snapshot.revision)).toMatchObject({
          success: false,
          error: { code: "TASK_BENCHMARK_INVALID" },
        });
        expect(
          await session.finish({
            expectedRevision: snapshot.revision,
            terminalReason: "limit_reached",
          }),
        ).toMatchObject({ success: false });
        expect(runProcess).toHaveBeenCalledTimes(count);
      } finally {
        await f.dispose();
      }
    });
  it("allows public failure and repair, rejects stale revisions, and keeps holdouts hidden", async () => {
    const f = await candidate("ui-view-model-v1", "wrong_loading");
    try {
      const runProcess = vi.fn(createDefaultProcessRunner()),
        recordFinalEvidence = vi.fn(async () => {});
      const session = checked(
        await createCandidateEvaluationSession({
          manifest: f.manifest,
          projectRoot: f.project,
          runProcess,
          recordFinalEvidence,
        }),
      );
      const old = checked(await session.snapshot());
      expect(checked(await session.publicChecks(old.revision)).publicAcceptance?.passed).toBe(
        false,
      );
      await cp(path.join(f.source, "reference"), f.project, { recursive: true });
      const count = runProcess.mock.calls.length;
      expect(await session.publicChecks(old.revision)).toMatchObject({
        success: false,
        error: { code: "TASK_PROJECT_DRIFT" },
      });
      expect(runProcess).toHaveBeenCalledTimes(count);
      expect(
        checked(await session.publicChecks(checked(await session.snapshot()).revision))
          .publicAcceptance?.passed,
      ).toBe(true);
      expect(recordFinalEvidence).not.toHaveBeenCalled();
      expect(runProcess.mock.calls.some(([r]) => r.args.at(-1) === "holdout")).toBe(false);
    } finally {
      await f.dispose();
    }
  });
  it("fails a public-passing wrong candidate at the terminal holdout without giving repair hints", async () => {
    const f = await candidate("ui-view-model-v1", "filtered_totals");
    try {
      const runProcess = vi.fn(createDefaultProcessRunner()),
        records: Readonly<FinalCandidateEvidence>[] = [];
      const session = checked(
        await createCandidateEvaluationSession({
          manifest: f.manifest,
          projectRoot: f.project,
          runProcess,
          recordFinalEvidence: async (record) => {
            records.push(record);
          },
        }),
      );
      const snapshot = checked(await session.snapshot());
      expect(checked(await session.publicChecks(snapshot.revision)).publicAcceptance?.passed).toBe(
        true,
      );
      const result = checked(
        await session.finish({
          expectedRevision: snapshot.revision,
          terminalReason: "limit_reached",
        }),
      );
      expect(result.passed).toBe(false);
      expect(result).not.toHaveProperty("holdout");
      expect(records[0]!.holdout?.passed).toBe(false);
      const count = runProcess.mock.calls.length;
      expect(await session.publicChecks(snapshot.revision)).toMatchObject({ success: false });
      expect(runProcess).toHaveBeenCalledTimes(count);
    } finally {
      await f.dispose();
    }
  });
  it.each(["oracle", "extra-path", "secret-path", "link"])(
    "blocks %s corruption before any process",
    async (kind) => {
      const f = await candidate("ui-view-model-v1");
      try {
        if (kind === "oracle")
          await writeFile(
            path.join(f.project, "test/public/acceptance.mjs"),
            "export const cases = [];\n",
          );
        if (kind === "extra-path")
          await writeFile(path.join(f.project, "outside.ts"), "unapproved\n");
        if (kind === "secret-path")
          await writeFile(path.join(f.project, ".env"), "PRIVATE_EVALUATOR_MARKER\n");
        if (kind === "link") {
          const target = path.join(f.root, "external.ts");
          await writeFile(target, "PRIVATE_EVALUATOR_MARKER\n");
          await rm(path.join(f.project, "src/view-model.ts"));
          await symlink(target, path.join(f.project, "src/view-model.ts"));
        }
        const runProcess = vi.fn(createDefaultProcessRunner());
        const session = checked(
          await createCandidateEvaluationSession({
            manifest: f.manifest,
            projectRoot: f.project,
            runProcess,
          }),
        );
        const result = await session.publicChecks(checked(await session.snapshot()).revision);
        expect(result).toMatchObject({
          success: false,
          error: {
            code: kind === "oracle" ? "TASK_CHECK_DEFINITION_CHANGED" : "TASK_SCOPE_VIOLATION",
          },
        });
        expect(JSON.stringify(result)).not.toContain("PRIVATE_EVALUATOR_MARKER");
        expect(runProcess).not.toHaveBeenCalled();
      } finally {
        await f.dispose();
      }
    },
  );
  it("detects verifier effects in emitted files and preserves the caller project", async () => {
    const f = await candidate("ui-view-model-v1");
    try {
      const before = await inventory(f.project),
        actual = createDefaultProcessRunner();
      const runProcess = vi.fn<ProcessRunner>(async (request) => {
        const result = await actual(request);
        if (request.args.at(-1) === "compat")
          await writeFile(path.join(request.args[1]!, "unexpected.txt"), "effect\n");
        return result;
      });
      const session = checked(
        await createCandidateEvaluationSession({
          manifest: f.manifest,
          projectRoot: f.project,
          runProcess,
        }),
      );
      expect(await session.publicChecks(checked(await session.snapshot()).revision)).toMatchObject({
        success: false,
        error: { code: "TASK_CHECK_BLOCKED" },
      });
      expect(await inventory(f.project)).toEqual(before);
      expect(runProcess.mock.calls.some(([r]) => r.args.at(-1) === "public")).toBe(false);
    } finally {
      await f.dispose();
    }
  });
  it("closes terminal evaluation even when infrastructure fails without leaking diagnostics", async () => {
    const f = await candidate("ui-view-model-v1");
    try {
      const actual = createDefaultProcessRunner();
      const runProcess = vi.fn<ProcessRunner>(async (request) => {
        if (request.args.at(-1) === "holdout")
          return {
            exitCode: 1,
            stdout: "PRIVATE_EVALUATOR_MARKER",
            stderr: "PRIVATE_EVALUATOR_MARKER",
          };
        return actual(request);
      });
      const recordFinalEvidence = vi.fn(async () => {});
      const session = checked(
        await createCandidateEvaluationSession({
          manifest: f.manifest,
          projectRoot: f.project,
          runProcess,
          recordFinalEvidence,
        }),
      );
      const revision = checked(await session.snapshot()).revision;
      const result = await session.finish({
        expectedRevision: revision,
        terminalReason: "limit_reached",
      });
      expect(result).toMatchObject({ success: false, error: { code: "TASK_CHECK_BLOCKED" } });
      expect(JSON.stringify(result)).not.toContain("PRIVATE_EVALUATOR_MARKER");
      const count = runProcess.mock.calls.length;
      expect(await session.publicChecks(revision)).toMatchObject({
        success: false,
        error: { code: "TASK_BENCHMARK_INVALID" },
      });
      expect(runProcess).toHaveBeenCalledTimes(count);
      expect(recordFinalEvidence).not.toHaveBeenCalled();
    } finally {
      await f.dispose();
    }
  });
  it("blocks concurrent evaluations and requires an explicit terminal reason", async () => {
    const f = await candidate("ui-view-model-v1");
    try {
      let enter!: () => void, release!: () => void;
      const entered = new Promise<void>((resolve) => {
          enter = resolve;
        }),
        released = new Promise<void>((resolve) => {
          release = resolve;
        });
      const actual = createDefaultProcessRunner();
      const runProcess = vi.fn<ProcessRunner>(async (request) => {
        enter();
        await released;
        return actual(request);
      });
      const session = checked(
        await createCandidateEvaluationSession({
          manifest: f.manifest,
          projectRoot: f.project,
          runProcess,
        }),
      );
      const snapshot = checked(await session.snapshot());
      const invalidRequest = {
        expectedRevision: snapshot.revision,
        terminalReason: "repair",
      } as const;
      // @ts-expect-error The runtime boundary must also reject invalid terminal data.
      const invalidResult = await session.finish(invalidRequest);
      expect(invalidResult).toMatchObject({
        success: false,
        error: { code: "TASK_BENCHMARK_INVALID" },
      });
      expect(runProcess).not.toHaveBeenCalled();
      const pending = session.publicChecks(snapshot.revision);
      try {
        await entered;
        expect(await session.publicChecks(snapshot.revision)).toMatchObject({
          success: false,
          error: { code: "TASK_EXECUTION_LOCKED" },
        });
        expect(
          await session.finish({
            expectedRevision: snapshot.revision,
            terminalReason: "declared_complete",
          }),
        ).toMatchObject({ success: false, error: { code: "TASK_EXECUTION_LOCKED" } });
      } finally {
        release();
        await pending;
      }
      expect(checked(await pending).publicAcceptance?.passed).toBe(true);
    } finally {
      await f.dispose();
    }
  });
});
