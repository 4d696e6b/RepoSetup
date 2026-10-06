import path from "node:path";
import {
  decodeTaskJson,
  taskByteHash,
  taskFailure,
  isSafeTaskPath,
  type TaskParseResult,
  type TaskCheckObservation,
  type ProcessRunResult,
} from "@reposetup/core";
import {
  TASK_CHECK_OUTPUT_BYTES,
  taskTestIdentity,
  type TaskToolCheckId,
} from "./check-recipes.js";

type Inventory = NonNullable<TaskCheckObservation["testInventory"]>;
export type TaskToolReport = { outputHash: string; inventory: Inventory | null; valid: boolean };
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const counter = (value: unknown): value is number =>
  Number.isSafeInteger(value) && typeof value === "number" && value >= 0;

/** Raw output is never included in returned evidence or diagnostics. */
export function parseTaskToolReport(input: {
  checkId: TaskToolCheckId;
  result: ProcessRunResult;
  projectRoot: string;
  reportText?: string;
  expectedLintTargets?: readonly string[];
}): TaskParseResult<TaskToolReport> {
  const { result } = input;
  if (result.notFound === true)
    return taskFailure("TASK_PREREQUISITE_MISSING", "Trusted tool is unavailable.");
  if (result.timedOut === true || result.aborted === true)
    return taskFailure("TASK_OUTPUT_INCOMPLETE", "Trusted check did not finish.");
  if (
    result.outputTruncated === true ||
    Buffer.byteLength(result.stdout) +
      Buffer.byteLength(result.stderr) +
      Buffer.byteLength(input.reportText ?? "") >
      TASK_CHECK_OUTPUT_BYTES
  )
    return taskFailure(
      "TASK_OUTPUT_INCOMPLETE",
      "Trusted check output exceeded its evidence limit.",
    );
  const outputHash = taskByteHash(
    Buffer.from(
      JSON.stringify({
        stdout: result.stdout,
        stderr: result.stderr,
        report: input.reportText ?? null,
      }),
    ),
  );
  if (input.checkId === "ts.typecheck")
    return {
      success: true,
      data: {
        outputHash,
        inventory: null,
        valid: result.exitCode === 0 && result.stdout.trim() === "" && result.stderr.trim() === "",
      },
    };
  const decoded = decodeTaskJson(
    input.checkId === "ts.unit" ? (input.reportText ?? "") : result.stdout,
  );
  if (!decoded.success)
    return taskFailure(
      "TASK_OUTPUT_INCOMPLETE",
      "Trusted tool did not produce a complete JSON report.",
    );
  if (input.checkId === "ts.lint") {
    if (!Array.isArray(decoded.data) || decoded.data.length === 0 || decoded.data.length > 1024)
      return taskFailure("TASK_OUTPUT_INCOMPLETE", "Lint report is incomplete.");
    let valid = result.exitCode === 0 && result.stderr.trim() === "";
    const files = new Set<string>();
    for (const file of decoded.data) {
      if (
        !record(file) ||
        typeof file.filePath !== "string" ||
        !counter(file.errorCount) ||
        !counter(file.warningCount) ||
        !counter(file.fatalErrorCount) ||
        !Array.isArray(file.messages) ||
        files.has(file.filePath) ||
        !inProject(input.projectRoot, file.filePath)
      )
        return taskFailure("TASK_OUTPUT_INCOMPLETE", "Lint report has invalid file evidence.");
      files.add(file.filePath);
      valid &&=
        file.errorCount === 0 &&
        file.warningCount === 0 &&
        file.fatalErrorCount === 0 &&
        file.messages.length === 0;
    }
    if (
      input.expectedLintTargets === undefined ||
      input.expectedLintTargets.length === 0 ||
      input.expectedLintTargets.some((p) => !isSafeTaskPath(p)) ||
      new Set(input.expectedLintTargets).size !== input.expectedLintTargets.length
    )
      return taskFailure(
        "TASK_CHECK_BLOCKED",
        "Lint requires an independently reviewed target manifest.",
      );
    if (
      files.size !== input.expectedLintTargets.length ||
      input.expectedLintTargets.some((p) => !files.has(path.join(input.projectRoot, p)))
    )
      return taskFailure(
        "TASK_OUTPUT_INCOMPLETE",
        "Lint report does not cover the reviewed targets.",
      );
    return { success: true, data: { outputHash, inventory: null, valid } };
  }
  if (input.checkId !== "ts.unit" || !record(decoded.data))
    return taskFailure("TASK_CHECK_BLOCKED", "Tool report adapter is unavailable.");
  const report = decoded.data;
  const counts = [
    "numTotalTests",
    "numPassedTests",
    "numFailedTests",
    "numPendingTests",
    "numTodoTests",
  ] as const;
  if (
    !counts.every((key) => counter(report[key])) ||
    typeof report.success !== "boolean" ||
    !Array.isArray(report.testResults) ||
    report.testResults.length > 1024
  )
    return taskFailure("TASK_OUTPUT_INCOMPLETE", "Unit report is incomplete.");
  const inventory: Inventory = {
    discovered: [],
    passed: [],
    failed: [],
    skipped: [],
    todo: [],
    focused: false,
    complete: true,
  };
  const files = new Set<string>();
  for (const file of report.testResults) {
    if (
      !record(file) ||
      typeof file.name !== "string" ||
      !inProject(input.projectRoot, file.name) ||
      files.has(file.name) ||
      !["passed", "failed"].includes(String(file.status)) ||
      !Array.isArray(file.assertionResults) ||
      file.assertionResults.length > 4096
    )
      return taskFailure("TASK_OUTPUT_INCOMPLETE", "Unit file report is invalid.");
    files.add(file.name);
    for (const test of file.assertionResults) {
      if (
        !record(test) ||
        typeof test.fullName !== "string" ||
        !["passed", "failed", "pending", "skipped", "todo"].includes(String(test.status))
      )
        return taskFailure("TASK_OUTPUT_INCOMPLETE", "Unit test report is invalid.");
      let id: string;
      try {
        id = taskTestIdentity(
          path.relative(input.projectRoot, file.name).split(path.sep).join("/"),
          test.fullName,
        );
      } catch {
        return taskFailure("TASK_OUTPUT_INCOMPLETE", "Unit test identity is invalid.");
      }
      inventory.discovered.push(id);
      const state =
        test.status === "pending" || test.status === "skipped"
          ? "skipped"
          : (test.status as "passed" | "failed" | "todo");
      inventory[state].push(id);
      if (inventory.discovered.length > 4096)
        return taskFailure("TASK_OUTPUT_INCOMPLETE", "Unit inventory exceeds its limit.");
    }
  }
  if (
    new Set(inventory.discovered).size !== inventory.discovered.length ||
    report.numTotalTests !== inventory.discovered.length ||
    report.numPassedTests !== inventory.passed.length ||
    report.numFailedTests !== inventory.failed.length ||
    report.numPendingTests !== inventory.skipped.length ||
    report.numTodoTests !== inventory.todo.length
  )
    return taskFailure("TASK_OUTPUT_INCOMPLETE", "Unit report counts or identities conflict.");
  // This inventory is usable only after the executor proves the fixed allowOnly=false recipe and frozen configuration. JSON itself authenticates neither.
  const valid =
    inventory.passed.length > 0 &&
    report.testResults.every((file) => record(file) && file.status === "passed") &&
    result.exitCode === 0 &&
    report.success === true &&
    inventory.failed.length === 0 &&
    inventory.skipped.length === 0 &&
    inventory.todo.length === 0;
  return { success: true, data: { outputHash, inventory, valid } };
}
function inProject(root: string, file: string): boolean {
  return (
    path.isAbsolute(root) &&
    path.isAbsolute(file) &&
    isSafeTaskPath(path.relative(root, file).split(path.sep).join("/"))
  );
}
