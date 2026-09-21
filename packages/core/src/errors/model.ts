import type { ErrorCode } from "./codes.js";

export interface RepoSetupError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  suggestion?: string;
}

export function createRepoSetupError(input: {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  suggestion?: string;
}): RepoSetupError {
  const error: RepoSetupError = {
    code: input.code,
    message: input.message,
  };

  if (input.details !== undefined) {
    error.details = input.details;
  }

  if (input.suggestion !== undefined) {
    error.suggestion = input.suggestion;
  }

  return error;
}

export function isRepoSetupError(value: unknown): value is RepoSetupError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<RepoSetupError>;
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}
