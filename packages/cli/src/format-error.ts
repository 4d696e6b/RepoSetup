import type { RepoSetupError } from "@reposetup/core";

interface ConfigIssue {
  path: string;
  message: string;
}

export function formatError(error: RepoSetupError): string {
  const lines = [`Error [${error.code}]: ${error.message}`];

  for (const issue of configIssues(error)) {
    const label = issue.path.length > 0 ? issue.path : "(root)";
    lines.push(`  ${label}: ${issue.message}`);
  }

  if (error.suggestion !== undefined) {
    lines.push(`  Suggestion: ${error.suggestion}`);
  }

  return lines.join("\n");
}

export function formatErrors(errors: readonly RepoSetupError[]): string {
  return errors.map(formatError).join("\n");
}

function configIssues(error: RepoSetupError): ConfigIssue[] {
  const issues = error.details?.issues;
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.flatMap((issue) => {
    if (typeof issue !== "object" || issue === null) {
      return [];
    }

    const candidate = issue as Partial<ConfigIssue>;
    if (typeof candidate.path !== "string" || typeof candidate.message !== "string") {
      return [];
    }

    return [{ path: candidate.path, message: candidate.message }];
  });
}
