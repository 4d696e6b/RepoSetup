import type { RepoSetupError, ResolutionResult } from "@reposetup/core";

export const CLI_OUTPUT_VERSION = 1 as const;

export function renderPlanJson(result: ResolutionResult, dryRun: boolean): string {
  return JSON.stringify({
    version: CLI_OUTPUT_VERSION,
    kind: "plan",
    dryRun,
    plan: result,
  });
}

export function renderErrorJson(
  error: RepoSetupError,
  partial?: { completed: number; total: number },
): string {
  return JSON.stringify({
    version: CLI_OUTPUT_VERSION,
    kind: "error",
    error,
    ...(partial === undefined ? {} : { partial }),
  });
}

export function renderPartialRunReport(completed: number, total: number): string {
  return [
    `Execution stopped after ${completed} of ${total} operations completed.`,
    "Some changes may already be present.",
    "Safe next step: run reposetup doctor, review the project, then rerun the command to create a fresh checked plan.",
  ].join("\n");
}
