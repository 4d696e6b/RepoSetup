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

export function renderErrorJson(error: RepoSetupError): string {
  return JSON.stringify({
    version: CLI_OUTPUT_VERSION,
    kind: "error",
    error,
  });
}
