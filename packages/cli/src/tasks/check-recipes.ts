import path from "node:path";
import {
  isSafeTaskPath,
  isWellFormedTaskString,
  taskContentHash,
  type ProcessRunRequest,
} from "@reposetup/core";
import { createTaskCheckEnvironment } from "./check-environment.js";

export const TASK_TOOL_VERSIONS = Object.freeze({
  "ts.typecheck": "5.9.3",
  "ts.lint": "10.11.0",
  "ts.unit": "5.0.1",
});
export type TaskToolCheckId = keyof typeof TASK_TOOL_VERSIONS;
export const TASK_CHECK_OUTPUT_BYTES = 131072;

/** Recipe construction is not qualification: caller must freeze/verify tool and config closure. */
export function createTaskCheckRecipe(input: {
  checkId: TaskToolCheckId;
  nodeExecutable: string;
  entryPoint: string;
  projectRoot: string;
  configPath: string;
  targets: readonly string[];
  homeDirectory: string;
  temporaryDirectory: string;
}): { request: Readonly<ProcessRunRequest>; reportPath: string | null; recipeRevision: string } {
  for (const absolute of [input.nodeExecutable, input.entryPoint, input.projectRoot]) {
    if (
      !path.isAbsolute(absolute) ||
      path.normalize(absolute) !== absolute ||
      [...absolute].some((c) => c.charCodeAt(0) < 32)
    )
      throw new Error("Check launch paths must be canonical absolute paths.");
  }
  if (
    !isSafeTaskPath(input.configPath) ||
    input.targets.some((p) => !isSafeTaskPath(p)) ||
    new Set(input.targets).size !== input.targets.length ||
    input.targets.length > 1024
  )
    throw new Error("Check configuration and targets must be finite exact paths.");
  if (!Object.hasOwn(TASK_TOOL_VERSIONS, input.checkId))
    throw new Error("Check adapter is unavailable.");
  for (const directory of [input.homeDirectory, input.temporaryDirectory]) {
    const relative = path.relative(input.projectRoot, directory);
    if (
      relative === "" ||
      (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
    )
      throw new Error("Check scratch directories must be outside the project.");
  }
  const config = path.join(input.projectRoot, input.configPath);
  let fixed: string[];
  if (input.checkId === "ts.typecheck") {
    if (input.targets.length !== 0) throw new Error("Typecheck targets come from frozen config.");
    fixed = ["--project", config, "--noEmit", "--incremental", "false", "--pretty", "false"];
  } else if (input.checkId === "ts.lint") {
    if (input.targets.length === 0) throw new Error("Lint requires reviewed explicit targets.");
    fixed = [
      "--no-config-lookup",
      "--config",
      config,
      "--max-warnings",
      "0",
      "--format",
      "json",
      ...input.targets.map((p) => path.join(input.projectRoot, p)),
    ];
  } else {
    if (input.targets.length !== 0)
      throw new Error("Unit test inventory comes from frozen config.");
    fixed = [
      "run",
      "--config",
      config,
      "--reporter=json",
      "--configLoader=runner",
      "--maxWorkers=1",
      "--no-file-parallelism",
    ];
  }
  const reportPath =
    input.checkId === "ts.unit" ? path.join(input.temporaryDirectory, "unit-report.json") : null;
  if (reportPath !== null)
    fixed.push(
      "--allowOnly=false",
      "--passWithNoTests=false",
      "--update=false",
      `--outputFile=${reportPath}`,
    );
  const env = createTaskCheckEnvironment({
    executableDirectory: path.dirname(input.nodeExecutable),
    homeDirectory: input.homeDirectory,
    temporaryDirectory: input.temporaryDirectory,
  });
  const recipeRevision = taskContentHash({
    adapter: "task-check-recipes-v1",
    checkId: input.checkId,
    toolVersion: TASK_TOOL_VERSIONS[input.checkId],
    nodeMajor: 24,
    args: fixed.map((arg) =>
      arg === config
        ? `@project/${input.configPath}`
        : arg.startsWith(`${input.projectRoot}${path.sep}`)
          ? `@project/${path.relative(input.projectRoot, arg).split(path.sep).join("/")}`
          : arg.startsWith("--outputFile=")
            ? "--outputFile=@temp/unit-report.json"
            : arg,
    ),
    environment: {
      ...env,
      PATH: "@node-directory",
      HOME: "@home",
      TMPDIR: "@temp",
      TMP: "@temp",
      TEMP: "@temp",
    },
    timeoutMs: 120000,
    outputBytes: TASK_CHECK_OUTPUT_BYTES,
  });
  return Object.freeze({
    reportPath,
    recipeRevision,
    request: Object.freeze({
      command: input.nodeExecutable,
      args: Object.freeze([input.entryPoint, ...fixed]),
      cwd: input.projectRoot,
      env,
      timeoutMs: 120000,
    }),
  });
}
/** Stable bounded logical identity for the reviewed exact file/full-name pair. */
export function taskTestIdentity(file: string, fullName: string): string {
  if (
    !isSafeTaskPath(file) ||
    !isWellFormedTaskString(fullName) ||
    fullName.trim().length === 0 ||
    Buffer.byteLength(fullName) > 4096
  )
    throw new Error("Test identity is invalid.");
  return `test.${taskContentHash({ file, fullName }).slice(7, 66)}`;
}
