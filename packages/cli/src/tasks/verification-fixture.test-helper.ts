import { createRequire } from "node:module";
import {
  cp,
  mkdtemp,
  mkdir,
  writeFile,
  realpath,
  readdir,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compileTaskPlan,
  qualifiedTaskCheckHash,
  taskByteHash,
  taskCheckFileDefinitionHash,
  taskVerificationCatalogHash,
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  type QualifiedTaskCheck,
  type TaskCheckFileDefinition,
  type TaskVerificationPolicy,
  type TaskCompilationPolicy,
  type TaskParseResult,
  type TaskVerificationAdapter,
} from "@reposetup/core";
import { createTaskCheckRecipe, taskTestIdentity, type TaskToolCheckId } from "./check-recipes.js";
import { captureVerifierRoot, readVerifierFile } from "./verifier-read.js";
import { readTaskClosureInventory } from "./verifier-closure.js";
import { createQualifiedTaskVerificationAdapter } from "./verification-adapter.js";
import { createDefaultProcessRunner } from "../execution-adapters.js";
const require = createRequire(import.meta.url);
const HASH = `sha256:${"a".repeat(64)}`;
const RUN = "123e4567-e89b-42d3-a456-426614174000";
function data<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
/** Developer qualification fixture. Hydrates installed bytes only; never dispatches a model.
 * Acceptance is provided by the caller, never granted by fixture construction. */
export async function createVerificationFixture<
  R extends NonNullable<TaskVerificationAdapter["review"]>,
>(review: R, lintEffect = false, additionBug = false, workspaceRoot = path.resolve("../..")) {
  const parent = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "reposetup-qualified-verifier-")),
  );
  try {
    const projectRoot = path.join(parent, "project");
    const scratchParent = path.join(parent, "scratch");
    await mkdir(projectRoot, { mode: 0o700 });
    await mkdir(scratchParent, { mode: 0o700 });
    for (const dir of ["src", "test", "docs"]) await mkdir(path.join(projectRoot, dir));
    await writeFile(
      path.join(projectRoot, "package.json"),
      '{"type":"module","private":true,"packageManager":"pnpm@12.5.1"}',
    );
    await writeFile(path.join(projectRoot, "docs/phase.md"), "Implement addition.\n");
    await writeFile(
      path.join(projectRoot, "src/add.ts"),
      `export const add = (a = 0, b = 0): number => a ${additionBug ? "-" : "+"} b;\n`,
    );
    const testNames = additionBug
      ? ["adds positive inputs", "adds negative inputs", "adds zero inputs"]
      : ["adds independently"];
    await writeFile(
      path.join(projectRoot, "test/add.test.ts"),
      additionBug
        ? 'import {it, expect} from "vitest"; import {add} from "../src/add";\n' +
            'it("adds positive inputs", () => expect(add(2,3)).toBe(5));\n' +
            'it("adds negative inputs", () => expect(add(-2,-3)).toBe(-5));\n' +
            'it("adds zero inputs", () => expect(add(0,0)).toBe(0));\n'
        : 'import {it, expect} from "vitest"; import {add} from "../src/add"; it("adds independently", () => expect(add(2,3)).toBe(5));\n',
    );
    await writeFile(
      path.join(projectRoot, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, target: "ES2022", module: "ESNext", skipLibCheck: true },
        include: ["src/**/*.ts"],
      }),
    );
    await writeFile(
      path.join(projectRoot, "eslint.config.mjs"),
      (lintEffect
        ? 'import {writeFileSync} from "node:fs"; writeFileSync("src/unexpected.ts", "retained");'
        : "") +
        'import tseslint from "typescript-eslint"; export default [{files:["src/**/*.ts"], languageOptions:{parser:tseslint.parser}, plugins:{"@typescript-eslint":tseslint.plugin}, rules:{"no-debugger":"error","@typescript-eslint/no-explicit-any":"error"}}];',
    );
    await writeFile(
      path.join(projectRoot, "vitest.config.mjs"),
      'export default {cacheDir:process.env.TMPDIR+"/vite-cache", test:{include:["test/**/*.test.ts"],watch:false,cache:false,fsModuleCache:false,allowOnly:false,passWithNoTests:false}};',
    );
    // Create an isolated single-package qualification fixture from already installed bytes.
    // Workspace links are deliberately absent; the product reader rejects escaping links.
    const sourceTools = await realpath(path.join(workspaceRoot, "node_modules"));
    const isolatedTools = path.join(parent, "tools");
    await cp(sourceTools, isolatedTools, { recursive: true, verbatimSymlinks: true });
    for (const workspace of [
      "rsetup",
      "@reposetup/core",
      "@reposetup/website",
      "@reposetup/integrations",
      "@reposetup/registry",
    ])
      await rm(path.join(isolatedTools, ".pnpm/node_modules", workspace));
    // The CLI-only SDK is outside the verifier dependency closure. Its generated
    // credentials.* API files intentionally fail the unchanged privacy guard.
    // Build this verifier-only fixture without that unrelated package/link.
    for (const entry of await readdir(path.join(isolatedTools, ".pnpm")))
      if (entry.startsWith("openai@"))
        await rm(path.join(isolatedTools, ".pnpm", entry), { recursive: true });
    await rm(path.join(isolatedTools, ".pnpm/node_modules/openai"), { force: true });
    const roots = {
      runtime: await realpath(path.dirname(process.execPath)),
      tools: isolatedTools,
      project: projectRoot,
    };
    await symlink(roots.tools, path.join(projectRoot, "node_modules"), "dir");
    const inventory = data(await readTaskClosureInventory({ tools: roots.tools }));
    if (
      JSON.parse(await readFile(path.join(isolatedTools, "typescript-eslint/package.json"), "utf8"))
        .version !== "8.70.0"
    )
      throw new Error("Reviewed TypeScript ESLint version is unavailable.");
    const checks: QualifiedTaskCheck[] = [];
    const names = {
      "ts.typecheck": ["typescript", "bin/tsc", "tsconfig.json"],
      "ts.lint": ["eslint", "bin/eslint.js", "eslint.config.mjs"],
      "ts.unit": ["vitest", "vitest.mjs", "vitest.config.mjs"],
    } as const;
    for (const checkId of Object.keys(names) as TaskToolCheckId[]) {
      const [name, entry, configPath] = names[checkId];
      const packagePath = path.join(
        roots.tools,
        path.relative(sourceTools, await realpath(require.resolve(`${name}/package.json`))),
      );
      const entryPoint = path.join(path.dirname(packagePath), entry);
      const targets = checkId === "ts.lint" ? ["src/add.ts"] : [];
      const recipe = createTaskCheckRecipe({
        checkId,
        nodeExecutable: process.execPath,
        entryPoint,
        projectRoot,
        configPath,
        targets,
        homeDirectory: scratchParent,
        temporaryDirectory: scratchParent,
      });
      const bindings: Omit<TaskCheckFileDefinition["files"][number], "fileHash">[] = [
        {
          rootId: "runtime",
          path: path.relative(roots.runtime, process.execPath),
          role: "runtime" as const,
        },
        {
          rootId: "tools",
          path: path.relative(roots.tools, entryPoint),
          role: "tool_entry" as const,
        },
        {
          rootId: "tools",
          path: path.relative(roots.tools, packagePath),
          role: "dependency" as const,
        },
        { rootId: "project", path: configPath, role: "configuration" as const },
      ];
      if (checkId === "ts.unit")
        bindings.push({ rootId: "project", path: "test/add.test.ts", role: "oracle" });
      let totalBytes = 0;
      const files: TaskCheckFileDefinition["files"] = [];
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
        closureReviewId: "fixture-reviewed-ts-parser-tool-closure",
        files,
        roots: Object.entries(roots).map(([rootId, value]) => ({
          rootId,
          rootIdentity: taskByteHash(value),
        })),
        totalBytes,
      };
      const fileDefinition = {
        ...payload,
        definitionRevision: taskCheckFileDefinitionHash(payload),
      };
      const authority = {
        schemaVersion: 1 as const,
        fileDefinition,
        roots,
        immutableRootIds: ["tools"],
        closureInventoryRevision: inventory.revision,
        nodeExecutable: process.execPath,
        nodeVersion: process.version,
        entryPoint,
        projectRoot,
        configPath,
        targets,
        testBindings:
          checkId === "ts.unit"
            ? testNames.map((fullName) => ({
                testId: taskTestIdentity("test/add.test.ts", fullName),
                filePath: "test/add.test.ts",
                fullName,
              }))
            : [],
        toolPackage: { rootId: "tools", path: path.relative(roots.tools, packagePath) },
      };
      checks.push({ ...authority, definitionRevision: qualifiedTaskCheckHash(authority) });
    }
    const definitions: TaskVerificationPolicy["definitions"] = [...TASK_CHECK_IDS].map(
      (checkId) => ({
        checkId,
        definitionRevision:
          checks.find((q) => q.fileDefinition.checkId === checkId)?.definitionRevision ?? HASH,
        authority: checkId.endsWith("acceptance") ? "reviewer" : "executor",
        criterionIds:
          additionBug && checkId === "task.acceptance"
            ? ["task-criterion"]
            : additionBug && checkId === "phase.acceptance"
              ? ["phase-criterion"]
              : ["task-criterion", "phase-criterion"],
        requiredTestIds:
          checkId === "ts.unit"
            ? testNames.map((name) => taskTestIdentity("test/add.test.ts", name))
            : [],
        evidenceArtifactIds: ["reviewed-evidence"],
      }),
    );
    const policy: TaskVerificationPolicy = {
      schemaVersion: 1,
      definitions,
      catalogRevision: taskVerificationCatalogHash(definitions),
    };
    const compilationPolicy: TaskCompilationPolicy = {
      supportProfileId: "managed-ts-node-v1",
      supportProfileRevision: 1,
      checkCatalogRevision: policy.catalogRevision,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority: {
        read: [
          { type: "subtree", path: "src" },
          { type: "subtree", path: "docs" },
        ],
        write: ["src/add.ts"],
        deny: [],
      },
      caseSensitivePaths: true,
    };
    const phaseHash = taskByteHash(await readFile(path.join(projectRoot, "docs/phase.md")));
    const phase = {
      phaseId: "phase-one",
      sourcePath: "docs/phase.md",
      sourceFileHash: phaseHash,
      lineRange: { start: 1, end: 1 },
      selectionHash: phaseHash,
      requirements: [
        {
          requirementId: "req-one",
          text: "Addition returns the sum.",
          sourceRefs: [{ path: "docs/phase.md", fileHash: phaseHash }],
          phaseCriterionIds: ["phase-criterion"],
        },
      ],
      phaseCriteria: [
        {
          criterionId: "phase-criterion",
          statement: "Addition meets the complete phase requirement.",
          evidenceKind: "reviewer_evidence",
          checkId: "phase.acceptance",
        },
      ],
    };
    const plan = data(
      compileTaskPlan({
        phase,
        policy: compilationPolicy,
        project: {
          rootIdentity: taskByteHash(projectRoot),
          baselineCommit: "b".repeat(40),
          baselineTreeHash: HASH,
        },
        draft: {
          kind: "task_plan_draft",
          schemaVersion: 1,
          phaseId: "phase-one",
          selectionHash: phaseHash,
          tasks: [
            {
              taskId: "add",
              objective: "Implement addition.",
              requirementIds: ["req-one"],
              kind: "implementation",
              constraints: [],
              scope: {
                read: [
                  { type: "subtree", path: "src" },
                  { type: "subtree", path: "docs" },
                ],
                write: ["src/add.ts"],
                deny: [],
              },
              criteria: [
                {
                  criterionId: "task-criterion",
                  statement: "The exported add function returns the sum.",
                  requirementIds: ["req-one"],
                  evidenceKind: "reviewer_evidence",
                  checkIds: ["task.acceptance"],
                },
              ],
              requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
              outputs: [
                {
                  artifactId: "add-output",
                  kind: "file_snapshot",
                  paths: ["src/add.ts"],
                  criterionIds: ["task-criterion"],
                },
              ],
              capabilityRequirements: {
                features: ["local_logic"],
                minimumCapabilityClass: "baseline",
                evidenceRefs: [{ type: "requirement", requirementId: "req-one" }],
              },
            },
          ],
          dependencies: [],
          unresolvedQuestions: [],
        },
      }),
    );
    const adapter = data(
      await createQualifiedTaskVerificationAdapter({
        projectRoot,
        scratchParent,
        policy,
        checks,
        review,
      }),
    );
    const before = data(await adapter.snapshot());
    const input = {
      plan,
      compilationPolicy,
      policy,
      runId: RUN,
      target: { type: "task" as const, taskId: "add" },
      inputRevision: phaseHash,
      expectedRevision: before.revision,
      adapter,
      runProcess: createDefaultProcessRunner(),
    };
    return {
      parent,
      projectRoot,
      scratchParent,
      checks,
      input,
      review,
      dispose: () => rm(parent, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(parent, { recursive: true, force: true });
    throw error;
  }
}
