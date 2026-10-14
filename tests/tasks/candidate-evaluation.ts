import { cp, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  decodeTaskJson,
  taskBenchmarkOracleResultSchema,
  taskContentHash,
  taskFailure,
  validateTaskBenchmarkFixture,
  type ProcessRunner,
  type TaskBenchmarkFixture,
  type TaskParseResult,
} from "../../packages/core/dist/index.js";
import { freezeTaskValue } from "../../packages/core/src/tasks/canonical.js";
import { createTaskVerifierSnapshotReader } from "../../packages/cli/src/tasks/verifier-snapshot.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import { fixtureManifest, fixtureRoot, typescriptRoot, workspaceRoot } from "./fixture-tools.js";
import { projectCandidate } from "./candidate-projection.js";

type Cases = { passed: boolean; results: { testId: string; passed: boolean }[] };
export type PublicCandidateEvidence = {
  fixtureRevision: string;
  checkedRevision: string;
  projectionRevision: string;
  typecheck: boolean;
  compatibility: Cases | null;
  publicAcceptance: Cases | null;
  durationMs: number;
};
export type FinalCandidateEvidence = PublicCandidateEvidence & {
  terminalReason: "declared_complete" | "limit_reached";
  holdout: Cases | null;
  typeContract: { testId: string; passed: boolean; executed: boolean }[];
};
type PublicResult = PublicCandidateEvidence & { evidenceHash: string };
type FinalResult = { checkedRevision: string; evidenceHash: string; passed: boolean };
/** Developer-only local evaluator. The host recorder is not a model/repair feedback port. */
export async function createCandidateEvaluationSession(input: {
  manifest: TaskBenchmarkFixture;
  projectRoot: string;
  runProcess?: ProcessRunner;
  recordFinalEvidence?: (record: Readonly<FinalCandidateEvidence>) => Promise<void>;
}) {
  const manifest = validateTaskBenchmarkFixture(input.manifest);
  if (!manifest.success) return manifest;
  try {
    if (
      taskContentHash(await fixtureManifest(manifest.data.fixtureId)) !==
      taskContentHash(manifest.data)
    )
      return taskFailure("TASK_CHECK_DEFINITION_CHANGED", "Fixture/source/tool freeze changed.");
  } catch {
    return taskFailure("TASK_CHECK_BLOCKED", "Frozen evaluator inputs are unavailable.");
  }
  const reader = await createTaskVerifierSnapshotReader(input.projectRoot);
  if (!reader.success) return reader;
  const f = manifest.data,
    runProcess = input.runProcess ?? createDefaultProcessRunner();
  let closed = false,
    busy = false;
  const evaluate = async (
    expectedRevision: string,
    terminalReason?: FinalCandidateEvidence["terminalReason"],
  ) => {
    if (busy)
      return taskFailure("TASK_EXECUTION_LOCKED", "Candidate evaluation is already active.");
    if (closed) return taskFailure("TASK_BENCHMARK_INVALID", "Candidate evaluation is terminal.");
    busy = true;
    if (terminalReason !== undefined) closed = true;
    let root: string | undefined;
    const started = performance.now();
    try {
      if (taskContentHash(await fixtureManifest(f.fixtureId)) !== taskContentHash(f))
        return taskFailure("TASK_CHECK_DEFINITION_CHANGED", "Fixture/source/tool freeze changed.");
      const before = await reader.data.snapshot();
      if (!before.success) return before;
      if (before.data.revision !== expectedRevision)
        return taskFailure("TASK_PROJECT_DRIFT", "Candidate revision changed before evaluation.");
      const projected = await projectCandidate(input.projectRoot, f, before.data);
      if (!projected.success) return projected;
      const afterRead = await reader.data.snapshot();
      if (!afterRead.success) return afterRead;
      if (afterRead.data.revision !== before.data.revision)
        return taskFailure("TASK_PROJECT_DRIFT", "Candidate changed during projection.");
      root = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-candidate-")));
      const project = path.join(root, "project"),
        emitted = path.join(root, "emitted");
      for (const file of projected.data.files) {
        await mkdir(path.dirname(path.join(project, file.path)), { recursive: true });
        await writeFile(path.join(project, file.path), file.bytes);
      }
      const baseline = await directoryRevision(project);
      const env = {
        PATH: path.dirname(process.execPath),
        LANG: "C",
        LC_ALL: "C",
        TZ: "UTC",
        CI: "1",
      };
      const compile = async () => {
        const result = await runProcess({
          command: process.execPath,
          args: [
            path.join(typescriptRoot, "bin/tsc"),
            "--project",
            path.join(project, "tsconfig.json"),
            "--outDir",
            emitted,
            "--rootDir",
            project,
          ],
          cwd: project,
          env,
          timeoutMs: 120000,
        });
        if (
          result.notFound ||
          result.timedOut ||
          result.outputTruncated ||
          result.aborted ||
          result.exitCode === null
        )
          throw new Error("Compiler unavailable");
        return result.exitCode === 0;
      };
      const typecheck = await compile();
      if ((await directoryRevision(project)) !== baseline)
        throw new Error("Compiler changed projected inputs");
      const cases = async (suite: "compat" | "public" | "holdout"): Promise<Cases> => {
        const protectedEmitted = await directoryRevision(emitted);
        const observed = await runProcess({
          command: process.execPath,
          args: [path.join(workspaceRoot, "tests/tasks/run-oracle.mjs"), emitted, suite],
          cwd: root!,
          env,
          timeoutMs: 10000,
        });
        if (
          observed.notFound ||
          observed.timedOut ||
          observed.aborted ||
          observed.outputTruncated ||
          observed.exitCode === null
        )
          throw new Error("Oracle unavailable");
        const decoded = decodeTaskJson(observed.stdout);
        const parsed = decoded.success
          ? taskBenchmarkOracleResultSchema.safeParse(decoded.data)
          : null;
        if (
          !parsed?.success ||
          new Set(parsed.data.results.map((r) => r.testId)).size !== parsed.data.results.length
        )
          throw new Error("Oracle inventory invalid");
        if ((await directoryRevision(emitted)) !== protectedEmitted)
          throw new Error("Oracle changed emitted inputs");
        return {
          passed: observed.exitCode === 0 && parsed.data.results.every((r) => r.passed),
          results: parsed.data.results,
        };
      };
      let compatibility: Cases | null = null,
        publicAcceptance: Cases | null = null,
        holdout: Cases | null = null;
      if (typecheck) {
        await mkdir(path.join(emitted, "test/public"), { recursive: true });
        await cp(path.join(project, "test/public"), path.join(emitted, "test/public"), {
          recursive: true,
        });
        await writeFile(path.join(emitted, "package.json"), '{"type":"module"}');
        compatibility = await cases("compat");
        publicAcceptance = await cases("public");
        exact(
          [...compatibility.results, ...publicAcceptance.results].map((r) => r.testId),
          f.publicTestIds,
        );
      }
      if ((await directoryRevision(project)) !== baseline)
        throw new Error("Oracle changed projected inputs");
      const typeContract: FinalCandidateEvidence["typeContract"] = f.testInventory
        .filter((t) => t.kind === "type")
        .map((t) => ({ testId: t.testId, passed: false, executed: false }));
      if (terminalReason !== undefined && typecheck) {
        await cp(
          path.join(fixtureRoot, f.fixtureId, "oracle/holdout.mjs"),
          path.join(emitted, "test/public/holdout.mjs"),
        );
        holdout = await cases("holdout");
        exact(
          holdout.results.map((r) => r.testId),
          f.testInventory.filter((t) => t.kind === "runtime").map((t) => t.testId),
        );
        if ((await directoryRevision(project)) !== baseline)
          throw new Error("Holdout changed projected inputs");
        if (typeContract.length) {
          await cp(
            path.join(fixtureRoot, f.fixtureId, "oracle/type-oracle.ts"),
            path.join(project, "test/type-oracle.ts"),
          );
          const privateBaseline = await directoryRevision(project);
          const passed = await compile();
          for (const test of typeContract) {
            test.passed = passed;
            test.executed = true;
          }
          if ((await directoryRevision(project)) !== privateBaseline)
            throw new Error("Type oracle changed projected inputs");
        }
      }
      const after = await reader.data.snapshot();
      if (!after.success) return after;
      if (after.data.revision !== before.data.revision)
        return taskFailure("TASK_PROJECT_DRIFT", "Candidate changed during evaluation.");
      if (taskContentHash(await fixtureManifest(f.fixtureId)) !== taskContentHash(f))
        return taskFailure(
          "TASK_CHECK_DEFINITION_CHANGED",
          "Fixture/source/tool freeze changed during evaluation.",
        );
      const common: PublicCandidateEvidence = {
        fixtureRevision: f.fixtureRevision,
        checkedRevision: expectedRevision,
        projectionRevision: projected.data.revision,
        typecheck,
        compatibility,
        publicAcceptance,
        durationMs: Math.ceil(performance.now() - started),
      };
      if (terminalReason === undefined)
        return {
          success: true as const,
          data: freezeTaskValue({ ...common, evidenceHash: taskContentHash(common) }),
        };
      const record = freezeTaskValue<FinalCandidateEvidence>({
        ...common,
        terminalReason,
        holdout,
        typeContract,
      });
      await input.recordFinalEvidence?.(record);
      return {
        success: true as const,
        data: freezeTaskValue({
          checkedRevision: expectedRevision,
          evidenceHash: taskContentHash(record),
          passed:
            typecheck &&
            compatibility?.passed === true &&
            publicAcceptance?.passed === true &&
            holdout?.passed === true &&
            typeContract.every((t) => t.passed && t.executed),
        }),
      };
    } catch {
      return taskFailure("TASK_CHECK_BLOCKED", "Candidate evaluation is incomplete or unsafe.");
    } finally {
      try {
        if (root !== undefined) await rm(root, { recursive: true, force: true });
      } finally {
        busy = false;
      }
    }
  };
  const safeEvaluate = async (
    revision: string,
    reason?: FinalCandidateEvidence["terminalReason"],
  ) => {
    try {
      return await evaluate(revision, reason);
    } catch {
      return taskFailure("TASK_CHECK_BLOCKED", "Candidate evaluator cleanup is incomplete.");
    }
  };
  return {
    success: true as const,
    data: {
      snapshot: reader.data.snapshot,
      publicChecks: async (expectedRevision: string): Promise<TaskParseResult<PublicResult>> => {
        const result = await safeEvaluate(expectedRevision);
        if (!result.success) return result;
        return "typecheck" in result.data
          ? { success: true, data: result.data }
          : taskFailure("TASK_CHECK_BLOCKED", "Public evaluation is incomplete.");
      },
      finish: async (request: {
        expectedRevision: string;
        terminalReason: FinalCandidateEvidence["terminalReason"];
      }): Promise<TaskParseResult<FinalResult>> => {
        if (!["declared_complete", "limit_reached"].includes(request.terminalReason))
          return taskFailure("TASK_BENCHMARK_INVALID", "Final evaluation needs a terminal reason.");
        const result = await safeEvaluate(request.expectedRevision, request.terminalReason);
        if (!result.success) return result;
        return "passed" in result.data
          ? { success: true, data: result.data }
          : taskFailure("TASK_CHECK_BLOCKED", "Final evaluation is incomplete.");
      },
    },
  };
}
function exact(actual: readonly string[], expected: readonly string[]) {
  if (
    actual.length !== expected.length ||
    taskContentHash([...actual].sort()) !== taskContentHash([...expected].sort())
  )
    throw new Error("Frozen inventory changed");
}
async function directoryRevision(root: string): Promise<string> {
  const reader = await createTaskVerifierSnapshotReader(root);
  if (!reader.success) throw new Error("Projected inventory unavailable");
  const snapshot = await reader.data.snapshot();
  if (!snapshot.success) throw new Error("Projected inventory unsafe");
  return snapshot.data.revision;
}
