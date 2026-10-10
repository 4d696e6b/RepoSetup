import { createRequire } from "node:module";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  compileTaskPlan,
  qualifiedTaskCheckHash,
  taskByteHash,
  taskCheckFileDefinitionHash,
  taskContentHash,
  taskVerificationCatalogHash,
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  type QualifiedTaskCheck,
  type TaskBenchmarkFixture,
  type TaskCheckFileDefinition,
  type TaskCompilationPolicy,
  type TaskParseResult,
  type TaskVerificationPolicy,
} from "../../packages/core/dist/index.js";
import {
  createTaskCheckRecipe,
  taskTestIdentity,
  TASK_TOOL_ENTRY_PATHS,
  type TaskToolCheckId,
} from "../../packages/cli/src/tasks/check-recipes.js";
import { readTaskClosureInventory } from "../../packages/cli/src/tasks/verifier-closure.js";
import {
  captureVerifierRoot,
  readVerifierFile,
} from "../../packages/cli/src/tasks/verifier-read.js";
import { createQualifiedTaskVerificationAdapter } from "../../packages/cli/src/tasks/verification-adapter.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import { fixtureManifest, fixtureRoot, workspaceRoot } from "./fixture-tools.js";

const require = createRequire(import.meta.url);
export function checked<T>(result: TaskParseResult<T>): T {
  if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

/** Test-only isolated hydration of installed bytes; no installation or lifecycle execution. */
export async function createQualifiedFixtureHost() {
  const parent = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-verifier-")));
  try {
    const runner = createDefaultProcessRunner();
    const git = async (args: string[]) => {
      const result = await runner({
        command: "git",
        args,
        cwd: workspaceRoot,
        env: { PATH: process.env.PATH ?? "", LANG: "C", LC_ALL: "C" },
        timeoutMs: 30000,
      });
      if (result.exitCode !== 0 || result.timedOut || result.aborted || result.outputTruncated)
        throw new Error("Qualification source identity unavailable");
      return result.stdout.trim();
    };
    const sourceSha = await git(["rev-parse", "HEAD"]);
    const sourceDirty = (await git(["status", "--porcelain"])).length > 0;
    const sourceTools = await realpath(path.join(workspaceRoot, "node_modules"));
    const tools = path.join(parent, "tools");
    await cp(sourceTools, tools, { recursive: true, verbatimSymlinks: true });
    for (const name of [
      "rsetup",
      "@reposetup/core",
      "@reposetup/website",
      "@reposetup/integrations",
      "@reposetup/registry",
    ])
      await rm(path.join(tools, ".pnpm/node_modules", name), { force: true });
    // CLI transport bytes are outside the verifier closure and contain private-path names.
    for (const entry of await readdir(path.join(tools, ".pnpm")))
      if (entry.startsWith("openai@"))
        await rm(path.join(tools, ".pnpm", entry), { recursive: true });
    await rm(path.join(tools, ".pnpm/node_modules/openai"), { force: true });
    const closure = checked(await readTaskClosureInventory({ tools }));
    return {
      parent,
      tools,
      sourceTools,
      closure,
      sourceSha,
      sourceDirty,
      dispose: () => rm(parent, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(parent, { recursive: true, force: true });
    throw error;
  }
}
export type QualifiedFixtureHost = Awaited<ReturnType<typeof createQualifiedFixtureHost>>;

/** Frozen-reference verifier qualification, not a model trial or arbitrary candidate reviewer. */
export async function createQualifiedReferenceFixture(
  host: QualifiedFixtureHost,
  manifest: TaskBenchmarkFixture,
) {
  if (taskContentHash(await fixtureManifest(manifest.fixtureId)) !== taskContentHash(manifest))
    throw new Error("Frozen fixture changed");
  const parent = await mkdtemp(path.join(host.parent, `${manifest.fixtureId}-`));
  try {
    const project = path.join(parent, "project"),
      scratchParent = path.join(parent, "scratch");
    await cp(path.join(fixtureRoot, manifest.fixtureId, "seed"), project, { recursive: true });
    await cp(path.join(fixtureRoot, manifest.fixtureId, "reference"), project, { recursive: true });
    await mkdir(scratchParent, { mode: 0o700 });
    await symlink(host.tools, path.join(project, "node_modules"), "dir");
    const roots = {
      runtime: await realpath(path.dirname(process.execPath)),
      tools: host.tools,
      project,
    };
    const checks: QualifiedTaskCheck[] = [];
    const packages = { "ts.typecheck": "typescript", "ts.lint": "eslint", "ts.unit": "vitest" };
    const configs = {
      "ts.typecheck": "tsconfig.json",
      "ts.lint": "eslint.config.mjs",
      "ts.unit": "vitest.config.mjs",
    };
    for (const checkId of Object.keys(packages) as TaskToolCheckId[]) {
      const packagePath = path.join(
        host.tools,
        path.relative(
          host.sourceTools,
          await realpath(require.resolve(`${packages[checkId]}/package.json`)),
        ),
      );
      const entryPoint = path.join(path.dirname(packagePath), TASK_TOOL_ENTRY_PATHS[checkId]);
      const targets =
        checkId === "ts.lint"
          ? manifest.seedFiles
              .filter((f) => f.path.startsWith("src/") && f.path.endsWith(".ts"))
              .map((f) => f.path)
          : [];
      const configPath = configs[checkId];
      const recipe = createTaskCheckRecipe({
        checkId,
        nodeExecutable: process.execPath,
        entryPoint,
        projectRoot: project,
        configPath,
        targets,
        homeDirectory: scratchParent,
        temporaryDirectory: scratchParent,
      });
      const bindings: Omit<TaskCheckFileDefinition["files"][number], "fileHash">[] = [
        {
          rootId: "runtime",
          path: path.relative(roots.runtime, process.execPath),
          role: "runtime",
        },
        { rootId: "tools", path: path.relative(host.tools, entryPoint), role: "tool_entry" },
        { rootId: "tools", path: path.relative(host.tools, packagePath), role: "dependency" },
        { rootId: "project", path: configPath, role: "configuration" },
      ];
      if (checkId === "ts.unit")
        for (const f of manifest.seedFiles.filter((f) => f.path.startsWith("test/public/")))
          bindings.push({ rootId: "project", path: f.path, role: "oracle" });
      const files: TaskCheckFileDefinition["files"] = [];
      let totalBytes = 0;
      for (const binding of bindings) {
        const file = await readVerifierFile(
          await captureVerifierRoot(roots[binding.rootId as keyof typeof roots]),
          binding.path,
          268435456,
        );
        totalBytes += file.byteLength;
        files.push({ ...binding, fileHash: file.fileHash });
      }
      const payload = {
        schemaVersion: 1 as const,
        checkId,
        recipeRevision: recipe.recipeRevision,
        closureReviewId: "frozen-fixture-posix-verifier-v1",
        files,
        roots: Object.entries(roots).map(([rootId, root]) => ({
          rootId,
          rootIdentity: taskByteHash(root),
        })),
        totalBytes,
      };
      const authority = {
        schemaVersion: 1 as const,
        fileDefinition: { ...payload, definitionRevision: taskCheckFileDefinitionHash(payload) },
        roots,
        immutableRootIds: ["tools"],
        closureInventoryRevision: host.closure.revision,
        nodeExecutable: process.execPath,
        nodeVersion: process.version,
        entryPoint,
        projectRoot: project,
        configPath,
        targets,
        toolPackage: { rootId: "tools", path: path.relative(host.tools, packagePath) },
        testBindings:
          checkId === "ts.unit"
            ? manifest.publicTestIds.map((fullName) => ({
                testId: taskTestIdentity("test/public/managed.test.mjs", fullName),
                filePath: "test/public/managed.test.mjs",
                fullName,
              }))
            : [],
      };
      checks.push({ ...authority, definitionRevision: qualifiedTaskCheckHash(authority) });
    }
    const taskCriterionIds = manifest.requirements.map((r) => `${r.requirementId}-task`),
      phaseCriterionIds = manifest.requirements.map((r) => `${r.requirementId}-phase`);
    const definitions: TaskVerificationPolicy["definitions"] = TASK_CHECK_IDS.map((checkId) => ({
      checkId,
      definitionRevision:
        checks.find((c) => c.fileDefinition.checkId === checkId)?.definitionRevision ??
        taskContentHash({
          fixtureRevision: manifest.fixtureRevision,
          checkId,
          referenceFiles: manifest.referenceFiles,
        }),
      authority: checkId.endsWith("acceptance") ? "reviewer" : "executor",
      criterionIds:
        checkId === "task.acceptance"
          ? taskCriterionIds
          : checkId === "phase.acceptance"
            ? phaseCriterionIds
            : [],
      requiredTestIds:
        checkId === "ts.unit"
          ? checks
              .find((c) => c.fileDefinition.checkId === checkId)!
              .testBindings.map((b) => b.testId)
          : [],
      evidenceArtifactIds: ["frozen-reference-evidence"],
    }));
    const policy: TaskVerificationPolicy = {
      schemaVersion: 1,
      definitions,
      catalogRevision: taskVerificationCatalogHash(definitions),
    };
    const authority = {
      read: [...new Set([...manifest.seedFiles.map((f) => f.path), ...manifest.write])].map(
        (path) => ({ type: "file" as const, path }),
      ),
      write: manifest.write,
      deny: [],
    };
    const compilationPolicy: TaskCompilationPolicy = {
      supportProfileId: "managed-ts-node-v1",
      supportProfileRevision: 1,
      checkCatalogRevision: policy.catalogRevision,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority,
      caseSensitivePaths: true,
    };
    const phaseText = await readFile(path.join(project, "docs/phase.md"), "utf8"),
      phaseHash = taskByteHash(phaseText);
    const requirementIds = manifest.requirements.map((r) => r.requirementId);
    const plan = checked(
      compileTaskPlan({
        phase: {
          phaseId: manifest.phaseId,
          sourcePath: "docs/phase.md",
          sourceFileHash: phaseHash,
          lineRange: { start: 1, end: phaseText.match(/[^\n]*\n|[^\n]+$/g)!.length },
          selectionHash: phaseHash,
          requirements: manifest.requirements.map((r) => ({
            ...r,
            sourceRefs: [{ path: "docs/phase.md", fileHash: phaseHash }],
            phaseCriterionIds: [`${r.requirementId}-phase`],
          })),
          phaseCriteria: manifest.requirements.map((r) => ({
            criterionId: `${r.requirementId}-phase`,
            statement: r.text,
            evidenceKind: "reviewer_evidence" as const,
            checkId: "phase.acceptance",
          })),
        },
        project: {
          rootIdentity: taskByteHash(project),
          baselineCommit: "b".repeat(40),
          baselineTreeHash: manifest.seedRevision,
        },
        policy: compilationPolicy,
        draft: {
          kind: "task_plan_draft",
          schemaVersion: 1,
          phaseId: manifest.phaseId,
          selectionHash: phaseHash,
          tasks: [
            {
              taskId: "reference",
              objective: "Qualify the frozen reference against reviewed requirements.",
              requirementIds,
              kind: "implementation",
              constraints: [],
              scope: authority,
              criteria: manifest.requirements.map((r) => ({
                criterionId: `${r.requirementId}-task`,
                statement: r.text,
                requirementIds: [r.requirementId],
                evidenceKind: "reviewer_evidence" as const,
                checkIds: ["task.acceptance"],
              })),
              requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
              outputs: [
                {
                  artifactId: "reference-output",
                  kind: "file_snapshot",
                  paths: manifest.referenceFiles.map((f) => f.path),
                  criterionIds: taskCriterionIds,
                },
              ],
              capabilityRequirements: {
                features: ["local_logic"],
                minimumCapabilityClass: "baseline",
                evidenceRefs: requirementIds.map((requirementId) => ({
                  type: "requirement" as const,
                  requirementId,
                })),
              },
            },
          ],
          dependencies: [],
          unresolvedQuestions: [],
        },
      }),
    );
    let reviews = 0;
    const adapter = checked(
      await createQualifiedTaskVerificationAdapter({
        projectRoot: project,
        scratchParent,
        policy,
        checks,
        async review(request) {
          reviews++;
          // Independently reviewed reference identity only. General trial review stays unqualified.
          let approved = true;
          for (const file of manifest.referenceFiles)
            approved &&=
              taskByteHash(await readFile(path.join(project, file.path))) === file.fileHash;
          return {
            request,
            approved,
            evidenceArtifactIds: approved ? ["frozen-reference-evidence"] : [],
          };
        },
      }),
    );
    const before = checked(await adapter.snapshot());
    return {
      project,
      scratchParent,
      checks,
      adapter,
      before,
      plan,
      policy,
      compilationPolicy,
      reviews: () => reviews,
      dispose: () => rm(parent, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(parent, { recursive: true, force: true });
    throw error;
  }
}
