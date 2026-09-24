import { describe, expect, it } from "vitest";

import {
  commandFailureSuggestion,
  isTransientDownloadFailure,
  summarizeFailedProcessOutput,
} from "./output-snippet.js";

describe("summarizeFailedProcessOutput", () => {
  it("prefers stderr and redacts secret assignments", () => {
    expect(summarizeFailedProcessOutput("DATABASE_URL=super-secret", "npm error code EACCES")).toBe(
      "npm error code EACCES\nDATABASE_URL=<redacted>",
    );
  });

  it("returns undefined when both streams are empty", () => {
    expect(summarizeFailedProcessOutput("  ", "")).toBeUndefined();
  });
});

describe("isTransientDownloadFailure", () => {
  it("recognizes transient network failures without classifying package errors as retryable", () => {
    expect(isTransientDownloadFailure("npm ERR! code ETIMEDOUT")).toBe(true);
    expect(isTransientDownloadFailure("npm ERR! ERESOLVE unable to resolve dependency tree")).toBe(
      false,
    );
  });
});

describe("commandFailureSuggestion", () => {
  it("points at npm cache ownership when npm reports root-owned files", () => {
    expect(
      commandFailureSuggestion("Your cache folder contains root-owned files, due to a bug"),
    ).toContain("will not run sudo");
  });
});
