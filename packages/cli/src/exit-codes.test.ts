import { describe, expect, it } from "vitest";
import { TASK_ERROR_EXIT_CODES, type RepoSetupError } from "@reposetup/core";

import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";

function error(code: RepoSetupError["code"]): RepoSetupError {
  return { code, message: code };
}

describe("exit codes", () => {
  it("maps every task error to its specified legacy exit meaning", () => {
    for (const [code, expected] of Object.entries(TASK_ERROR_EXIT_CODES)) {
      expect(exitCodeForError(error(code as RepoSetupError["code"]))).toBe(expected);
    }
  });

  it("preserves the legacy aggregate floor for general failures", () => {
    expect(exitCodeForError(error("TASK_PROVIDER_FAILED"))).toBe(EXIT_CODES.GENERAL_FAILURE);
    expect(exitCodeForErrors([error("TASK_PROVIDER_FAILED")])).toBe(EXIT_CODES.INVALID_INPUT);
    expect(exitCodeForErrors([])).toBe(EXIT_CODES.GENERAL_FAILURE);
  });

  it("maps config and unknown-integration failures to invalid input", () => {
    expect(exitCodeForError(error("CONFIG_INVALID"))).toBe(EXIT_CODES.INVALID_INPUT);
    expect(exitCodeForError(error("PROJECT_NAME_INVALID"))).toBe(EXIT_CODES.INVALID_INPUT);
    expect(exitCodeForError(error("UNKNOWN_INTEGRATION"))).toBe(EXIT_CODES.INVALID_INPUT);
  });

  it("maps resolver and planner failures to resolution failure", () => {
    expect(exitCodeForError(error("MISSING_REQUIREMENT"))).toBe(EXIT_CODES.RESOLUTION_FAILURE);
    expect(exitCodeForError(error("PLAN_INVALID"))).toBe(EXIT_CODES.RESOLUTION_FAILURE);
  });

  it("uses the highest mapped code when multiple errors are present", () => {
    expect(exitCodeForErrors([error("CONFIG_INVALID"), error("PREREQUISITE_MISSING")])).toBe(
      EXIT_CODES.PREREQUISITE_MISSING,
    );
  });
});
