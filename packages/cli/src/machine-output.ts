import type { ChangePreview, RepoSetupError, ResolutionResult } from "@reposetup/core";

export const CLI_OUTPUT_VERSION = 1 as const;

export function renderPlanJson(
  result: ResolutionResult,
  dryRun: boolean,
  preview?: ChangePreview,
): string {
  return JSON.stringify({
    version: CLI_OUTPUT_VERSION,
    kind: "plan",
    dryRun,
    plan: result,
    ...(preview === undefined ? {} : { preview }),
  });
}

export function renderErrorJson(
  error: RepoSetupError,
  partial?: { completed: number; total: number },
  preview?: ChangePreview,
): string {
  return JSON.stringify({
    version: CLI_OUTPUT_VERSION,
    kind: "error",
    error,
    ...(preview === undefined ? {} : { preview }),
    ...(partial === undefined ? {} : { partial }),
  });
}

export function renderPartialRunReport(completed: number, total: number): string {
  return [
    `Execution stopped after ${completed} of ${total} operations completed.`,
    "Some changes may already be present.",
    "Safe next step: run reposetup doctor from the project directory and review the failed operation. Repair missing dependencies and finish any remaining setup steps. Create does not resume an interrupted installation; rerunning it over existing files will fail safely.",
  ].join("\n");
}
