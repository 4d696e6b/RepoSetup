import { describe, expect, it } from "vitest";
import type { RepoSetupError } from "@reposetup/core";

import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";

function error(code: RepoSetupError["code"]): RepoSetupError {
  return { code, message: code };
}

describe("exit codes", () => {
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
