import type { RepoSetupError } from "../errors/model.js";
import type { ResolutionWarning } from "./types.js";

export function sortResolutionErrors(errors: readonly RepoSetupError[]): RepoSetupError[] {
  return [...errors].sort((left, right) => compareIssues(left, right));
}

export function sortResolutionWarnings(
  warnings: readonly ResolutionWarning[],
): ResolutionWarning[] {
  return [...warnings].sort((left, right) => compareIssues(left, right));
}

function compareIssues(
  left: { code: string; message: string; details?: Record<string, unknown> },
  right: { code: string; message: string; details?: Record<string, unknown> },
): number {
  const codeOrder = left.code.localeCompare(right.code);
  if (codeOrder !== 0) {
    return codeOrder;
  }

  const subjectOrder = issueSubject(left).localeCompare(issueSubject(right));
  if (subjectOrder !== 0) {
    return subjectOrder;
  }

  return left.message.localeCompare(right.message);
}

function issueSubject(issue: { details?: Record<string, unknown> }): string {
  const details = issue.details;
  if (details === undefined) {
    return "";
  }

  if (typeof details.integrationId === "string") {
    return details.integrationId;
  }

  if (typeof details.id === "string") {
    return details.id;
  }

  return "";
}
