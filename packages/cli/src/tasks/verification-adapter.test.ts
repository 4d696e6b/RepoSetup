import { describe, expect, it, vi } from "vitest";
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
  lstat,
  rename,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compileTaskPlan,
  executeTaskVerification,
  executeTaskRun,
  executeTaskCompilation,
  executeManagedTaskPhase,
  prepareTaskCompilationContext,
  qualifiedTaskCheckHash,
  taskByteHash,
  taskContentHash,
  taskCheckFileDefinitionHash,
  taskVerificationCatalogHash,
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  type QualifiedTaskCheck,
  type TaskCheckFileDefinition,
  type TaskVerificationPolicy,
  type TaskCompilationPolicy,
  type TaskParseResult,
  type TaskReview,
} from "@reposetup/core";
import { createTaskCheckRecipe, taskTestIdentity, type TaskToolCheckId } from "./check-recipes.js";
import { captureVerifierRoot, readVerifierFile } from "./verifier-read.js";
import { readTaskClosureInventory } from "./verifier-closure.js";
import { createTaskRunAdapter } from "./application-adapter.js";
import { createQualifiedTaskVerificationAdapter } from "./verification-adapter.js";
import { verifyQualifiedTaskCheck } from "./check-qualification.js";
import { allocateTaskVerifierScratch } from "./verifier-scratch.js";
import { createDefaultProcessRunner } from "../execution-adapters.js";
import { createOpenAITaskProvider } from "./provider-adapter.js";

const require = createRequire(import.meta.url);
const HASH = `sha256:${"a".repeat(64)}`;
const RUN = "123e4567-e89b-42d3-a456-426614174000";
function data<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
async function fixture(lintEffect = false, additionBug = false) {
  const parent = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "reposetup-qualified-verifier-")),
  );
  try {
    const projectRoot = path.join(parent, "project");
    const scratchParent = path.join(parent, "scratch");
    await mkdir(projectRoot);
    await mkdir(scratchParent);
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
    const sourceTools = await realpath(path.resolve("../../node_modules"));
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
    expect(
      JSON.parse(
        await readFile(path.join(isolatedTools, "typescript-eslint/package.json"), "utf8"),
      ),
    ).toMatchObject({ version: "8.70.0" });
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
    const review = vi.fn(
      async (
        request: Parameters<
          NonNullable<import("@reposetup/core").TaskVerificationAdapter["review"]>
        >[0],
      ) => ({ request, approved: true, evidenceArtifactIds: ["reviewed-evidence"] }),
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
describe("concrete trusted verification qualification", () => {
  it("completes no-key SDK compilation and a real bug fix with frozen tests and durable final phase acceptance", async () => {
    const f = await fixture(false, true);
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network forbidden"));
    try {
      const oraclePath = path.join(f.projectRoot, "test/add.test.ts");
      const oracle = await readFile(oraclePath, "utf8");
      const brokenSource = await readFile(path.join(f.projectRoot, "src/add.ts"), "utf8");
      const runner = vi.fn(f.input.runProcess);
      const failing = data(await executeTaskVerification({ ...f.input, runProcess: runner }));
      expect(failing).toMatchObject({ verification: { outcome: "fail" } });
      if (failing.dryRun) throw new Error("unexpected preview");
      expect(failing.verification.checks.find((c) => c.checkId === "ts.unit")).toMatchObject({
        status: "fail",
        exitCode: 1,
        failureCode: "TASK_CHECK_FAILED",
      });
      for (const checkId of ["ts.typecheck", "ts.lint"])
        expect(failing.verification.checks.find((c) => c.checkId === checkId)?.status).toBe("pass");
      expect(f.review).not.toHaveBeenCalled();

      const stateRoot = path.join(f.parent, "state");
      await mkdir(stateRoot, { mode: 0o700 });
      const adapter = data(
        await createTaskRunAdapter({
          projectRoot: f.projectRoot,
          stateRoot,
          authority: f.input.compilationPolicy.authority,
        }),
      );
      const baseline = data(await adapter.snapshot());
      const review: TaskReview = {
        kind: "task_review",
        schemaVersion: 1,
        phase: f.input.plan.phase,
        project: { ...f.input.plan.project, baselineTreeHash: taskContentHash(baseline.entries) },
        policy: f.input.compilationPolicy,
      };
      const transport = vi.fn<typeof fetch>(async (url, options): Promise<Response> => {
        expect(String(url)).toBe("https://api.openai.com/v1/responses");
        const request = JSON.parse(options!.body as string);
        const input = JSON.parse(request.input);
        const decomposition = request.text.format.name.includes("decomposition");
        if (!decomposition) {
          expect(input.context.files).toContainEqual({ path: "src/add.ts", text: brokenSource });
          expect(input.context.writeTargets).toContainEqual({
            path: "src/add.ts",
            fileHash: taskByteHash(brokenSource),
          });
        }
        const document = decomposition
          ? {
              kind: "task_plan_draft",
              schemaVersion: 1,
              phaseId: review.phase.phaseId,
              selectionHash: review.phase.selectionHash,
              tasks: f.input.plan.tasks,
              dependencies: [],
              unresolvedQuestions: [],
            }
          : {
              kind: "task_provider_reply",
              schemaVersion: 1,
              ...input.identity,
              reply: {
                type: "change_set",
                changeSet: {
                  kind: "change_set",
                  schemaVersion: 1,
                  ...input.identity,
                  changes: [
                    {
                      type: "replace_text",
                      path: "src/add.ts",
                      expectedFileHash: taskByteHash(brokenSource),
                      oldText: "a - b",
                      newText: "a + b",
                    },
                  ],
                },
              },
            };
        return new Response(
          JSON.stringify({
            model: "gpt-6.1-sol",
            reasoning: { effort: "low" },
            service_tier: "default",
            status: "completed",
            error: null,
            usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
            output: [
              {
                type: "message",
                status: "completed",
                content: [{ type: "output_text", text: JSON.stringify(document) }],
              },
            ],
          }),
          {
            headers: {
              "content-type": "application/json",
              "x-request-id": `fake_${transport.mock.calls.length}`,
            },
          },
        );
      });
      const provider = data(
        createOpenAITaskProvider({
          model: "gpt-6.1-sol",
          effort: "low",
          environment: { OPENAI_API_KEY: "fake-offline-test-sentinel" },
          transport,
        }),
      );
      const resourceLimits = {
        maxImplementationAttemptsPerTask: 3,
        maxProviderCalls: 2,
        maxInputTokens: 100000,
        maxOutputTokens: 8192,
        maxWallTimeMs: 900000,
        maxCostMicrousd: 1000000,
      };
      const context = data(
        await prepareTaskCompilationContext({ review, repository: adapter.repository }),
      );
      const compiled = data(
        await executeTaskCompilation({
          review,
          adapter,
          provider,
          resourceLimits,
          maxOutputTokens: 4096,
          timeoutMs: 1000,
          expectedContextId: context.contextId,
          allowProviderUsage: true,
        }),
      );
      if (compiled.dryRun) throw new Error("unexpected preview");
      expect(compiled.checkpoint.status).toBe("completed");
      // The independent reviewer inspects current source and the frozen oracle,
      // never the fake provider's claim of success. The executor gates this port
      // behind successful real tool checks at the exact requested revision.
      f.review.mockImplementation(async (request) => {
        expect(await readFile(path.join(f.projectRoot, "src/add.ts"), "utf8")).toBe(
          brokenSource.replace("a - b", "a + b"),
        );
        expect(await readFile(oraclePath, "utf8")).toBe(oracle);
        expect(request.checkedRevision).toBe(data(await f.input.adapter.snapshot()).revision);
        expect(request.criterionIds).toEqual([
          request.checkId === "task.acceptance" ? "task-criterion" : "phase-criterion",
        ]);
        return { request, approved: true, evidenceArtifactIds: ["reviewed-evidence"] };
      });
      // Git identity probes are simulated here; all verification processes below
      // execute real installed tools. Live Git/CLI qualification is separate.
      const git = vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" }));
      const result = await executeManagedTaskPhase({
        plan: compiled.checkpoint.plan,
        compilationPolicy: f.input.compilationPolicy,
        managedCompilationId: compiled.checkpoint.compilationId,
        resourceLimits,
        projectRoot: f.projectRoot,
        gitExecutable: "/offline-test/git",
        adapter,
        provider,
        verification: {
          policy: f.input.policy,
          adapter: f.input.adapter,
          runProcess: async (r) => {
            if (r.command !== "/offline-test/git") return runner(r);
            const probe = await git();
            return {
              ...probe,
              stdout: r.args.includes("--show-toplevel")
                ? `${f.projectRoot}\n`
                : r.args.includes("HEAD")
                  ? `${review.project.baselineCommit}\n`
                  : "",
            };
          },
        },
        allowProviderUsage: true,
        maxOutputTokens: 4096,
        timeoutMs: 1000,
      });
      if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
      const checkpoint = result.checkpoint;
      expect(checkpoint.run.status).toBe("succeeded");
      expect(checkpoint.run.tasks).toMatchObject([{ taskId: "add", status: "accepted" }]);
      expect(checkpoint.run.finalVerification).toMatchObject({
        outcome: "pass",
        target: { type: "phase" },
      });
      expect(
        checkpoint.run.finalVerification!.checks.find((c) => c.checkId === "ts.unit")
          ?.executedTests,
      ).toBe(3);
      expect(checkpoint.run.resourceLedger.reservations).toHaveLength(2);
      expect(checkpoint.compilation?.compilationId).toBe(compiled.checkpoint.compilationId);
      expect(checkpoint.run.resourceLedger.consumed.totalTokens).toEqual({
        provenance: "reported",
        value: 60,
      });
      expect(transport).toHaveBeenCalledTimes(2);
      expect(git).toHaveBeenCalledTimes(3);
      expect(network).not.toHaveBeenCalled();
      expect(runner).toHaveBeenCalledTimes(12); // broken baseline, task, fresh task, final phase
      expect(f.review.mock.calls.map(([r]) => r.checkId)).toEqual([
        "task.acceptance",
        "task.acceptance",
        "phase.acceptance",
      ]);
      const durable = JSON.parse(
        await readFile(
          path.join(
            stateRoot,
            taskByteHash(f.projectRoot).slice(7),
            `${checkpoint.run.runId}.json`,
          ),
          "utf8",
        ),
      );
      expect(durable).toEqual(checkpoint);
      expect(JSON.stringify(durable)).not.toContain("fake-offline-test-sentinel");
      expect(await readdir(f.scratchParent)).toEqual([]);
    } finally {
      network.mockRestore();
      await f.dispose();
    }
  }, 600000);
  it("executes real pinned tools under full immutable inventories and live task/phase review, with no project effects", async () => {
    const f = await fixture();
    try {
      const processRunner = vi.fn(f.input.runProcess);
      const dry = data(
        await executeTaskVerification({ ...f.input, runProcess: processRunner, dryRun: true }),
      );
      expect(dry.dryRun).toBe(true);
      expect(processRunner).not.toHaveBeenCalled();
      expect(await readdir(f.scratchParent)).toEqual([]);
      const checked = data(
        await executeTaskVerification({ ...f.input, runProcess: processRunner }),
      );
      expect(checked).toMatchObject({
        dryRun: false,
        verification: { outcome: "pass", unexpectedChanges: [] },
      });
      if (checked.dryRun) throw new Error("unexpected preview");
      expect(checked.verification.checks.find((c) => c.checkId === "ts.unit")?.executedTests).toBe(
        1,
      );
      expect(f.review).toHaveBeenCalledTimes(1);
      expect(await readdir(f.scratchParent)).toEqual([]);
      const phase = data(
        await executeTaskVerification({
          ...f.input,
          target: { type: "phase", phaseId: "phase-one" },
          acceptedTasks: [checked.verification],
        }),
      );
      expect(phase).toMatchObject({ verification: { outcome: "pass", target: { type: "phase" } } });
      expect(f.review).toHaveBeenLastCalledWith(
        expect.objectContaining({ checkId: "phase.acceptance" }),
      );
      expect(await readdir(f.scratchParent)).toEqual([]);
      expect(
        processRunner.mock.calls.every(
          ([r]) => r.env?.NODE_OPTIONS === undefined && r.env?.HOME?.startsWith(f.scratchParent),
        ),
      ).toBe(true);
    } finally {
      await f.dispose();
    }
  }, 180000);
  it.each(["portable", "managed SDK"])(
    "binds %s executor-owned replacement and durable acceptance to real qualified checks",
    async (mode) => {
      const f = await fixture();
      try {
        const stateRoot = path.join(f.parent, "state");
        await mkdir(stateRoot, { mode: 0o700 });
        const adapter = data(
          await createTaskRunAdapter({
            projectRoot: f.projectRoot,
            stateRoot,
            authority: f.input.compilationPolicy.authority,
          }),
        );
        const transport = vi.fn<typeof fetch>(async (_url, options) => {
          const input = JSON.parse(JSON.parse(options!.body as string).input);
          const before = await readFile(path.join(f.projectRoot, "src/add.ts"), "utf8");
          const document = {
            kind: "task_provider_reply",
            schemaVersion: 1,
            ...input.identity,
            reply: {
              type: "change_set",
              changeSet: {
                kind: "change_set",
                schemaVersion: 1,
                ...input.identity,
                changes: [
                  {
                    type: "replace_text",
                    path: "src/add.ts",
                    expectedFileHash: taskByteHash(before),
                    oldText: "a + b",
                    newText: "(a + b)",
                  },
                ],
              },
            },
          };
          return new Response(
            JSON.stringify({
              model: "gpt-6.1-sol",
              reasoning: { effort: "low" },
              service_tier: "default",
              status: "completed",
              error: null,
              usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
              output: [
                {
                  type: "message",
                  status: "completed",
                  content: [{ type: "output_text", text: JSON.stringify(document) }],
                },
              ],
            }),
            { headers: { "content-type": "application/json" } },
          );
        });
        const provider =
          mode === "managed SDK"
            ? data(
                createOpenAITaskProvider({
                  model: "gpt-6.1-sol",
                  effort: "low",
                  environment: { OPENAI_API_KEY: "fake-real-tools-key" },
                  transport,
                }),
              )
            : undefined;
        const execute = async (operation: Parameters<typeof executeTaskRun>[0]["operation"]) => {
          const result = data(
            await executeTaskRun({
              plan: f.input.plan,
              compilationPolicy: f.input.compilationPolicy,
              adapter,
              operation,
              ...(provider ? { provider } : {}),
              verification: {
                policy: f.input.policy,
                adapter: f.input.adapter,
                runProcess: f.input.runProcess,
              },
            }),
          );
          if (result.dryRun) throw new Error("unexpected dry run");
          return result.checkpoint;
        };
        const created = await execute({
          type: "create",
          resourceLimits: {
            maxImplementationAttemptsPerTask: 3,
            maxProviderCalls: 24,
            maxInputTokens: 240000,
            maxOutputTokens: 48000,
            maxWallTimeMs: 1800000,
            maxCostMicrousd: 10000000,
          },
        });
        const runId = created.run.runId;
        const begun = await execute({
          type: "begin",
          runId,
          taskId: "add",
          routingId: HASH,
          requestedConfiguration: provider?.configuration ?? {
            adapterId: "openai-responses-v1",
            providerId: "openai-responses-v1",
            modelProfileId: "qualified-strong",
            nativeEffortId: "low",
          },
        });
        const attempt = begun.run.attempts[0]!;
        const before = await readFile(path.join(f.projectRoot, "src/add.ts"), "utf8");
        const proposal = {
          kind: "change_set",
          schemaVersion: 1,
          planId: f.input.plan.planId,
          taskId: "add",
          attemptId: attempt.attemptId,
          inputRevision: attempt.inputRevision,
          changes: [
            {
              type: "replace_text",
              path: "src/add.ts",
              expectedFileHash: taskByteHash(before),
              oldText: "a + b",
              newText: "(a + b)",
            },
          ],
        };
        const applied = await execute(
          provider
            ? {
                type: "request",
                runId,
                allowProviderUsage: true,
                maxOutputTokens: 4096,
                timeoutMs: 1000,
              }
            : {
                type: "apply",
                runId,
                proposal: { ...proposal, changeSetId: taskContentHash(proposal) },
              },
        );
        expect(transport).toHaveBeenCalledTimes(provider ? 1 : 0);
        expect(applied.run.attempts[0]!.application.status).toBe("applied");
        const accepted = await execute({ type: "verify", runId, taskId: "add" });
        expect(accepted.run.tasks[0]!.status).toBe("accepted");
        expect(accepted.run.attempts[0]!.verification!.checkedRevision).toBe(
          applied.run.attempts[0]!.application.resultingProjectRevision,
        );
        expect(accepted.run.attempts[0]!.verification!.inputRevision).toBe(attempt.inputRevision);
        expect(accepted.bindings[0]!.postimages[0]!.fileHash).toBe(
          taskByteHash(await readFile(path.join(f.projectRoot, "src/add.ts"))),
        );
        expect(
          accepted.run.attempts[0]!.verification!.checks.find((c) => c.checkId === "ts.unit")!
            .executedTests,
        ).toBe(1);
        expect(await readdir(f.scratchParent)).toEqual([]);
      } finally {
        await f.dispose();
      }
    },
    180000,
  );
  it("retains and reports an actual exit-zero verifier write, without calling review", async () => {
    const f = await fixture(true);
    try {
      const output = data(await executeTaskVerification(f.input));
      expect(output).toMatchObject({
        verification: {
          outcome: "fail",
          unexpectedChanges: expect.arrayContaining(["src/unexpected.ts"]),
        },
      });
      expect(await readFile(path.join(f.projectRoot, "src/unexpected.ts"), "utf8")).toBe(
        "retained",
      );
      expect(f.review).not.toHaveBeenCalled();
      expect(await readdir(f.scratchParent)).toEqual([]);
    } finally {
      await f.dispose();
    }
  }, 120000);
  it("rejects launch/config/catalog tampering before executing and requires exact pinned runtime", async () => {
    const f = await fixture();
    try {
      const q = f.checks[0]!;
      expect((await verifyQualifiedTaskCheck({ ...q, entryPoint: process.execPath })).success).toBe(
        false,
      );
      const { definitionRevision: ignored, ...payload } = q;
      expect(ignored).toMatch(/^sha256:/);
      const alternatePath = path.join(path.dirname(path.dirname(q.entryPoint)), "lib/_tsc.js");
      const entryBinding = q.fileDefinition.files.find((f) => f.role === "tool_entry")!;
      const oldEntry = await readVerifierFile(
        await captureVerifierRoot(q.roots[entryBinding.rootId]!),
        entryBinding.path,
        268435456,
      );
      const alternate = await readVerifierFile(
        await captureVerifierRoot(q.roots[entryBinding.rootId]!),
        path.relative(q.roots[entryBinding.rootId]!, alternatePath),
        268435456,
      );
      const { definitionRevision: oldDefinition, ...filePayload } = q.fileDefinition;
      expect(oldDefinition).toMatch(/^sha256:/);
      const alternativeFiles = {
        ...filePayload,
        totalBytes: filePayload.totalBytes - oldEntry.byteLength + alternate.byteLength,
        files: filePayload.files.map((f) =>
          f.role === "tool_entry"
            ? {
                ...f,
                path: path.relative(q.roots[f.rootId]!, alternatePath),
                fileHash: alternate.fileHash,
              }
            : f,
        ),
      };
      const wrongEntry = {
        ...payload,
        entryPoint: alternatePath,
        fileDefinition: {
          ...alternativeFiles,
          definitionRevision: taskCheckFileDefinitionHash(alternativeFiles),
        },
      };
      expect(
        (
          await verifyQualifiedTaskCheck({
            ...wrongEntry,
            definitionRevision: qualifiedTaskCheckHash(wrongEntry),
          })
        ).success,
      ).toBe(false);
      const wrongRuntime = { ...payload, nodeVersion: "v24.0.0" };
      expect(
        (
          await verifyQualifiedTaskCheck({
            ...wrongRuntime,
            definitionRevision: qualifiedTaskCheckHash(wrongRuntime),
          })
        ).success,
      ).toBe(false);
      const originalTest = await readFile(path.join(f.projectRoot, "test/add.test.ts"));
      await writeFile(
        path.join(f.projectRoot, "test/add.test.ts"),
        'import {it, expect} from "vitest"; it("adds independently", () => expect(true).toBe(true));',
      );
      expect(
        (
          await verifyQualifiedTaskCheck(
            f.checks.find((c) => c.fileDefinition.checkId === "ts.unit")!,
          )
        ).success,
      ).toBe(false);
      await writeFile(path.join(f.projectRoot, "test/add.test.ts"), originalTest);
      await writeFile(
        path.join(f.projectRoot, "tsconfig.json"),
        '{"compilerOptions":{"composite":true}}',
      );
      const processRunner = vi.fn(f.input.runProcess);
      expect(
        (await executeTaskVerification({ ...f.input, runProcess: processRunner })).success,
      ).toBe(false);
      expect(processRunner).not.toHaveBeenCalled();
      expect(await readdir(f.scratchParent)).toEqual([]);
    } finally {
      await f.dispose();
    }
  }, 60000);
});
describe("complete closure and private scratch guards", () => {
  it("detects unlisted additions, transitive edits and escaping dependency links", async () => {
    const parent = await realpath(await mkdtemp(path.join(os.tmpdir(), "reposetup-closure-")));
    const root = path.join(parent, "root");
    await mkdir(root);
    try {
      await writeFile(path.join(root, "dependency.js"), "original");
      const before = data(await readTaskClosureInventory({ deps: root }));
      await writeFile(path.join(root, "unlisted.js"), "new");
      expect(data(await readTaskClosureInventory({ deps: root })).revision).not.toBe(
        before.revision,
      );
      await rm(path.join(root, "unlisted.js"));
      await writeFile(path.join(root, "dependency.js"), "tampered");
      expect(data(await readTaskClosureInventory({ deps: root })).revision).not.toBe(
        before.revision,
      );
      await symlink(parent, path.join(root, "escape"));
      expect((await readTaskClosureInventory({ deps: root })).success).toBe(false);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
  it("allocates fresh private directories and refuses unexpected effects, symlinks and root replacements", async () => {
    const parent = await realpath(await mkdtemp(path.join(os.tmpdir(), "reposetup-scratch-")));
    try {
      const clean = data(await allocateTaskVerifierScratch(parent, []));
      expect((await lstat(clean.directory)).mode & 0o077).toBe(0);
      expect(data(await clean.dispose())).toBe(true);
      expect((await clean.dispose()).success).toBe(false);
      for (const effect of ["unexpected", "symlink", "replace"]) {
        const scratch = data(await allocateTaskVerifierScratch(parent, []));
        if (effect === "unexpected")
          await writeFile(path.join(scratch.directory, "unexpected"), "retained");
        if (effect === "symlink")
          await symlink(parent, path.join(scratch.temporaryDirectory, "vite-cache"));
        if (effect === "replace") {
          await rename(scratch.directory, `${scratch.directory}-old`);
          await mkdir(scratch.directory);
        }
        expect((await scratch.dispose()).success).toBe(false);
        expect((await lstat(scratch.directory)).isDirectory()).toBe(true);
      }
      expect((await allocateTaskVerifierScratch(parent, [parent])).success).toBe(false);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
