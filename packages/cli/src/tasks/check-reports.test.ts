import { describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import { parseTaskToolReport } from "./check-reports.js";
import { TASK_CHECK_OUTPUT_BYTES } from "./check-recipes.js";
import type { ProcessRunResult } from "@reposetup/core";

const projectRoot = path.join(os.tmpdir(), "reviewed-project");
const processResult = (): ProcessRunResult => ({ exitCode: 0, stdout: "", stderr: "" });
function report() {
  return {
    numTotalTests: 1,
    numPassedTests: 1,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    success: true,
    testResults: [
      {
        name: path.join(projectRoot, "test/a.test.ts"),
        status: "passed",
        assertionResults: [{ fullName: "suite behavior", status: "passed" }],
      },
    ],
  };
}
function parse(body: ReturnType<typeof report>, result = processResult()) {
  return parseTaskToolReport({
    checkId: "ts.unit",
    result,
    projectRoot,
    reportText: JSON.stringify(body),
  });
}
describe("bounded trusted tool reports", () => {
  it("returns only digests and logical test identities, without raw test names or logs", () => {
    const output = parse(report());
    expect(output.success && output.data.valid).toBe(true);
    expect(JSON.stringify(output)).not.toContain("suite behavior");
    expect(JSON.stringify(output)).not.toContain(projectRoot);
  });
  it.each(["aborted", "timedOut", "notFound", "outputTruncated"] as const)(
    "rejects %s execution",
    (flag) => {
      expect(parse(report(), { ...processResult(), [flag]: true }).success).toBe(false);
    },
  );
  it("rejects combined overflow and duplicate JSON keys without exposing content", () => {
    const result = {
      ...processResult(),
      stderr: "private-marker" + "x".repeat(TASK_CHECK_OUTPUT_BYTES),
    };
    const output = parse(report(), result);
    expect(output.success).toBe(false);
    expect(JSON.stringify(output)).not.toContain("private-marker");
    expect(
      parseTaskToolReport({
        checkId: "ts.unit",
        result: processResult(),
        projectRoot,
        reportText: '{"success":true,"success":false}',
      }).success,
    ).toBe(false);
  });
  it("rejects missing, inconsistent, duplicate and out-of-root test evidence", () => {
    const missing = report();
    delete (missing as Partial<typeof missing>).numTotalTests;
    expect(parse(missing).success).toBe(false);
    const count = report();
    count.numPassedTests = 2;
    expect(parse(count).success).toBe(false);
    const duplicate = report();
    duplicate.testResults[0]!.assertionResults.push({
      ...duplicate.testResults[0]!.assertionResults[0]!,
    });
    duplicate.numTotalTests = 2;
    duplicate.numPassedTests = 2;
    expect(parse(duplicate).success).toBe(false);
    const outside = report();
    outside.testResults[0]!.name = path.join(os.tmpdir(), "outside.test.ts");
    expect(parse(outside).success).toBe(false);
  });
  it("never calls zero, skipped, todo or failed suites valid", () => {
    const zero = report();
    zero.testResults = [];
    zero.numTotalTests = 0;
    zero.numPassedTests = 0;
    const zeroOutput = parse(zero);
    expect(zeroOutput.success && zeroOutput.data.valid).toBe(false);
    for (const state of ["pending", "todo", "failed"]) {
      const body = report();
      body.testResults[0]!.assertionResults[0]!.status = state;
      body.numPassedTests = 0;
      if (state === "pending") body.numPendingTests = 1;
      if (state === "todo") body.numTodoTests = 1;
      if (state === "failed") body.numFailedTests = 1;
      const output = parse(body);
      expect(output.success && output.data.valid).toBe(false);
    }
    const failedFile = report();
    failedFile.testResults[0]!.status = "failed";
    const output = parse(failedFile);
    expect(output.success && output.data.valid).toBe(false);
  });
  it("requires a complete independently reviewed lint target manifest", () => {
    const result = {
      ...processResult(),
      stdout: JSON.stringify([
        {
          filePath: path.join(projectRoot, "src/a.ts"),
          messages: [],
          errorCount: 0,
          warningCount: 0,
          fatalErrorCount: 0,
        },
      ]),
    };
    const input = { checkId: "ts.lint" as const, result, projectRoot };
    expect(parseTaskToolReport(input).success).toBe(false);
    expect(parseTaskToolReport({ ...input, expectedLintTargets: ["src/b.ts"] }).success).toBe(
      false,
    );
    expect(parseTaskToolReport({ ...input, expectedLintTargets: ["src/a.ts"] })).toMatchObject({
      success: true,
      data: { valid: true },
    });
  });
  it("does not treat noisy or nonzero typecheck results as clean success", () => {
    expect(
      parseTaskToolReport({
        checkId: "ts.typecheck",
        result: { ...processResult(), stdout: "not a clean check" },
        projectRoot,
      }),
    ).toMatchObject({ success: true, data: { valid: false } });
    expect(
      parseTaskToolReport({
        checkId: "ts.typecheck",
        result: { ...processResult(), exitCode: 1 },
        projectRoot,
      }),
    ).toMatchObject({ success: true, data: { valid: false } });
  });
});
