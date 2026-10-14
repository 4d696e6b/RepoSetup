import { describe as describeOnAllPlatforms, expect, it } from "vitest";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  createTaskCheckRecipe,
  taskTestIdentity,
  TASK_TOOL_VERSIONS,
  type TaskToolCheckId,
} from "./check-recipes.js";
import { parseTaskToolReport } from "./check-reports.js";
import { prepareTaskReportReader } from "./verifier-report.js";
import { createDefaultProcessRunner } from "../execution-adapters.js";

const require = createRequire(import.meta.url);
const packages = {
  "ts.typecheck": "typescript",
  "ts.lint": "eslint",
  "ts.unit": "vitest",
} as const;
const entryNames = {
  "ts.typecheck": "bin/tsc",
  "ts.lint": "bin/eslint.js",
  "ts.unit": "vitest.mjs",
} as const;
async function fixture() {
  const parent = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "reposetup-check-qualification-")),
  );
  const project = path.join(parent, "project");
  const scratch = path.join(parent, "scratch");
  await mkdir(project);
  await mkdir(scratch);
  await mkdir(path.join(project, "src"));
  await mkdir(path.join(project, "test"));
  await writeFile(path.join(project, "package.json"), '{"type":"module","private":true}');
  await writeFile(
    path.join(project, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { strict: true, target: "ES2022", module: "ESNext", skipLibCheck: true },
      include: ["src/**/*.ts"],
    }),
  );
  await writeFile(
    path.join(project, "eslint.config.mjs"),
    'export default [{ files:["src/**/*.ts"], rules:{ "no-debugger":"error" } }];',
  );
  await writeFile(
    path.join(project, "vitest.config.mjs"),
    `export default { cacheDir: ${JSON.stringify(path.join(scratch, "vite-cache"))}, test:{ include:["test/**/*.test.ts"], watch:false, passWithNoTests:false, allowOnly:false } };`,
  );
  await writeFile(
    path.join(project, "src/add.ts"),
    "export const add = (a = 0, b = 0) => a + b;\n",
  );
  await writeFile(
    path.join(project, "test/add.test.ts"),
    'import {it, expect} from "vitest"; import {add} from "../src/add"; it("adds independently", () => expect(add(2,3)).toBe(5));\n',
  );
  // Reuse the already installed toolchain without installing or downloading dependencies.
  await symlink(path.resolve("../../node_modules"), path.join(project, "node_modules"), "dir");
  async function run(checkId: TaskToolCheckId) {
    const packageFile = require.resolve(`${packages[checkId]}/package.json`);
    const metadata = JSON.parse(await readFile(packageFile, "utf8")) as { version: string };
    expect(metadata.version).toBe(TASK_TOOL_VERSIONS[checkId]);
    const privateScratch = await mkdtemp(path.join(scratch, "check-"));
    const recipe = createTaskCheckRecipe({
      checkId,
      nodeExecutable: process.execPath,
      entryPoint: path.join(path.dirname(packageFile), entryNames[checkId]),
      projectRoot: project,
      configPath:
        checkId === "ts.typecheck"
          ? "tsconfig.json"
          : checkId === "ts.lint"
            ? "eslint.config.mjs"
            : "vitest.config.mjs",
      targets: checkId === "ts.lint" ? ["src/add.ts"] : [],
      homeDirectory: privateScratch,
      temporaryDirectory: privateScratch,
    });
    const prepared =
      recipe.reportPath === null ? null : await prepareTaskReportReader(privateScratch);
    if (prepared !== null && !prepared.success) throw new Error(prepared.error.code);
    const result = await createDefaultProcessRunner()(recipe.request);
    const read = prepared !== null && prepared.success ? await prepared.data.read() : null;
    const reportText = read !== null && read.success ? read.data : undefined;
    return {
      recipe,
      result,
      parsed: parseTaskToolReport({
        checkId,
        result,
        projectRoot: project,
        ...(reportText === undefined ? {} : { reportText }),
        expectedLintTargets: ["src/add.ts"],
      }),
    };
  }
  return { project, scratch, run, dispose: () => rm(parent, { recursive: true, force: true }) };
}
// Real task filesystem fixtures target the initial Linux/macOS profile.
// Windows task execution remains unsupported; pure core/provider tests still run.
const describe = describeOnAllPlatforms.skipIf(process.platform === "win32");

describe("pinned trusted check recipe smoke qualification", () => {
  it("executes all three installed entry points with fixed argv, separate temp output and real nonzero test identities", async () => {
    const f = await fixture();
    try {
      for (const checkId of Object.keys(TASK_TOOL_VERSIONS) as TaskToolCheckId[]) {
        const output = await f.run(checkId);
        expect(
          output.result.exitCode,
          `${checkId}: ${output.result.stdout} ${output.result.stderr}`,
        ).toBe(0);
        expect(output.parsed.success).toBe(true);
        if (!output.parsed.success) throw new Error(output.parsed.error.message);
        expect(output.parsed.data.valid).toBe(true);
        if (checkId === "ts.unit") {
          expect(output.parsed.data.inventory?.passed).toHaveLength(1);
          expect(output.recipe.reportPath?.startsWith(f.scratch)).toBe(true);
          expect(output.recipe.request.args).toContain("--allowOnly=false");
          expect(output.recipe.request.args).toContain("--passWithNoTests=false");
        }
      }
      expect((await readdir(f.project)).sort()).toEqual([
        "eslint.config.mjs",
        "node_modules",
        "package.json",
        "src",
        "test",
        "tsconfig.json",
        "vitest.config.mjs",
      ]);
      expect(await readdir(path.join(f.project, "src"))).toEqual(["add.ts"]);
      expect(await readFile(path.join(f.project, "src/add.ts"), "utf8")).toBe(
        "export const add = (a = 0, b = 0) => a + b;\n",
      );
    } finally {
      await f.dispose();
    }
  }, 30000);
  it("rejects actual TypeScript errors, lint errors, failing tests and focused tests", async () => {
    const f = await fixture();
    try {
      await writeFile(
        path.join(f.project, "src/add.ts"),
        'export const add = (a = 0, b = 0): number => "bad"; debugger;\n',
      );
      for (const checkId of ["ts.typecheck", "ts.lint"] as const) {
        const output = await f.run(checkId);
        expect(output.result.exitCode).not.toBe(0);
        expect(output.parsed.success && output.parsed.data.valid).toBe(false);
      }
      await writeFile(
        path.join(f.project, "test/add.test.ts"),
        'import {it, expect} from "vitest"; it("fails", () => expect(1).toBe(2));',
      );
      const failed = await f.run("ts.unit");
      expect(failed.result.exitCode).not.toBe(0);
      expect(failed.parsed.success && failed.parsed.data.valid).toBe(false);
      await writeFile(
        path.join(f.project, "test/add.test.ts"),
        'import {it, expect} from "vitest"; it.only("focused", () => expect(1).toBe(1));',
      );
      const focused = await f.run("ts.unit");
      expect(focused.result.exitCode).not.toBe(0);
      expect(focused.parsed.success && focused.parsed.data.valid).toBe(false);
    } finally {
      await f.dispose();
    }
  }, 30000);
  it("bounds stable test identities and rejects path/option injection", () => {
    expect(taskTestIdentity("test/a.test.ts", "suite behavior")).toMatch(/^test\.[a-f0-9]{59}$/);
    expect(taskTestIdentity("test/a.test.ts", "suite behavior")).not.toBe(
      taskTestIdentity("test/b.test.ts", "suite behavior"),
    );
    expect(() => taskTestIdentity("../outside", "test")).toThrow();
    const base = {
      checkId: "ts.lint" as const,
      nodeExecutable: process.execPath,
      entryPoint: process.execPath,
      projectRoot: os.tmpdir(),
      configPath: "eslint.config.mjs",
      targets: ["../file"],
      homeDirectory: os.tmpdir(),
      temporaryDirectory: os.tmpdir(),
    };
    expect(() => createTaskCheckRecipe(base)).toThrow();
    expect(() => createTaskCheckRecipe({ ...base, targets: [] })).toThrow();
    expect(() =>
      createTaskCheckRecipe({ ...base, targets: ["src/a.ts"], configPath: "--fix\n" }),
    ).toThrow();
  });
});
