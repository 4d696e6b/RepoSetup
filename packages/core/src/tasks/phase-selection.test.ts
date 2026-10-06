import { describe, expect, it } from "vitest";
import { selectTaskPhase } from "./phase-selection.js";
import { taskByteHash } from "./context-text.js";
const markdown = "# Plan\r\n\r\n## First\r\nDo work.\r\n### Detail\r\nMore.\r\n## Second\r\nLater.";
describe("reviewed Markdown phase selection", () => {
  it("selects one exact ATX section and preserves CRLF bytes", () => {
    const result = selectTaskPhase(markdown, { heading: "First" }, { start: 3, end: 6 });
    expect(result).toEqual({
      success: true,
      data: {
        lineRange: { start: 3, end: 6 },
        selectionHash: taskByteHash("## First\r\nDo work.\r\n### Detail\r\nMore.\r\n"),
      },
    });
  });
  it("supports explicit ranges and the independently reviewed default", () => {
    expect(selectTaskPhase(markdown, { lines: "3:6" }, { start: 3, end: 6 }).success).toBe(true);
    expect(selectTaskPhase(markdown, {}, { start: 7, end: 8 }).success).toBe(true);
  });
  it.each(["0:2", "2:1", "1.5:3", "1:999", "1:2:3", "1:9007199254740992"])(
    "rejects invalid or changed range %s",
    (lines) => {
      expect(selectTaskPhase(markdown, { lines }, { start: 3, end: 6 }).success).toBe(false);
    },
  );
  it("rejects duplicate headings, absent headings, widened ranges and mixed selectors", () => {
    expect(
      selectTaskPhase("## Same\nA\n## Same\nB", { heading: "Same" }, { start: 1, end: 2 }).success,
    ).toBe(false);
    expect(selectTaskPhase(markdown, { heading: "Absent" }, { start: 3, end: 6 }).success).toBe(
      false,
    );
    expect(selectTaskPhase(markdown, { heading: "Plan" }, { start: 3, end: 6 }).success).toBe(
      false,
    );
    expect(
      selectTaskPhase(markdown, { heading: "First", lines: "3:6" }, { start: 3, end: 6 }).success,
    ).toBe(false);
  });
  it("ignores fenced headings and supports BOM and closing ATX markers", () => {
    const text = "\ufeff# Phase ###\n```md\n# Fake\n```\nWork\n# Next\n";
    const result = selectTaskPhase(text, { heading: "Phase" }, { start: 1, end: 5 });
    expect(result.success).toBe(true);
    expect(selectTaskPhase(text, { heading: "Fake" }, { start: 3, end: 3 }).success).toBe(false);
  });
});
