import { taskFailure, type TaskParseResult } from "./parse.js";
import { taskByteHash, selectTaskLines, TASK_CONTEXT_LIMITS } from "./context-text.js";
import { taskLineRangeSchema } from "./primitives.js";

/** Bounded Markdown ATX section selection only; it never invents requirements or decomposition. */
export function selectTaskPhase(
  text: string,
  selector: { heading?: string; lines?: string },
  reviewedRange: { start: number; end: number },
): TaskParseResult<{ lineRange: { start: number; end: number }; selectionHash: string }> {
  try {
    if (Buffer.byteLength(text) > TASK_CONTEXT_LIMITS.maxFileBytes)
      return taskFailure(
        "TASK_CONTEXT_LIMIT_EXCEEDED",
        "Phase source exceeds its bounded text limit.",
      );
    if (selector.heading !== undefined && selector.lines !== undefined)
      return taskFailure("TASK_SELECTION_INVALID", "Choose a heading or line range, not both.");
    let range = reviewedRange;
    if (selector.lines !== undefined) {
      const match = /^([1-9][0-9]*):([1-9][0-9]*)$/.exec(selector.lines);
      if (match === null)
        return taskFailure("TASK_SELECTION_INVALID", "Use an inclusive start:end line range.");
      range = taskLineRangeSchema.parse({ start: Number(match[1]), end: Number(match[2]) });
    }
    if (selector.heading !== undefined) {
      const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
      const headings: { title: string; level: number; line: number }[] = [];
      let fence: { char: string; width: number } | null = null;
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index]!.replace(/\r?\n$/, "").replace(/^\ufeff/, "");
        const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
        if (delimiter !== null) {
          if (fence === null) fence = { char: delimiter[1]![0]!, width: delimiter[1]!.length };
          else if (
            delimiter[1]![0] === fence.char &&
            delimiter[1]!.length >= fence.width &&
            delimiter[2]!.trim() === ""
          )
            fence = null;
          continue;
        }
        if (fence !== null) continue;
        const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
        if (heading !== null)
          headings.push({
            title: heading[2]!.replace(/[ \t]+#+[ \t]*$/, ""),
            level: heading[1]!.length,
            line: index + 1,
          });
      }
      const matches = headings.filter((heading) => heading.title === selector.heading);
      if (matches.length !== 1)
        return taskFailure(
          "TASK_SELECTION_INVALID",
          "Heading must match one exact ATX section; use line ranges for duplicate or unsupported headings.",
        );
      const selected = matches[0]!;
      range = {
        start: selected.line,
        end:
          (headings.find(
            (heading) => heading.line > selected.line && heading.level <= selected.level,
          )?.line ?? lines.length + 1) - 1,
      };
    }
    if (range.start !== reviewedRange.start || range.end !== reviewedRange.end)
      return taskFailure(
        "TASK_SELECTION_INVALID",
        "Selector differs from the independently reviewed phase range.",
      );
    return {
      success: true,
      data: { lineRange: range, selectionHash: taskByteHash(selectTaskLines(text, range)) },
    };
  } catch {
    return taskFailure(
      "TASK_SELECTION_INVALID",
      "Phase range is invalid or absent from the source.",
    );
  }
}
