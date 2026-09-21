import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "./codes.js";
import { createRepoSetupError, isRepoSetupError } from "./model.js";

describe("RepoSetupError", () => {
  it("separates a machine-readable code from message, details, and suggestion", () => {
    const error = createRepoSetupError({
      code: "CONFIG_INVALID",
      message: "RepoSetup configuration is invalid.",
      details: { issues: [{ path: "runtime.id", message: "Invalid option" }] },
      suggestion: "Use a supported runtime id.",
    });

    expect(error.code).toBe("CONFIG_INVALID");
    expect(error.message).toBe("RepoSetup configuration is invalid.");
    expect(error.details).toEqual({
      issues: [{ path: "runtime.id", message: "Invalid option" }],
    });
    expect(error.suggestion).toBe("Use a supported runtime id.");
    expect(isRepoSetupError(error)).toBe(true);
  });

  it("omits optional fields when they are not provided", () => {
    const error = createRepoSetupError({
      code: "DEPENDENCY_CYCLE",
      message: "Integration graph contains a cycle.",
    });

    expect("details" in error).toBe(false);
    expect("suggestion" in error).toBe(false);
  });

  it("includes duplicate integration as a stable error code", () => {
    expect(ERROR_CODES).toContain("DUPLICATE_INTEGRATION");
  });

  it("includes plan invalid as a stable error code", () => {
    expect(ERROR_CODES).toContain("PLAN_INVALID");
  });

  it("includes project not found as a stable error code", () => {
    expect(ERROR_CODES).toContain("PROJECT_NOT_FOUND");
  });
});
