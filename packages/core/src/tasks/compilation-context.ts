import { posix } from "node:path";
import { taskReviewSchema, type TaskReview } from "./review-schema.js";
import { taskContentHash, freezeTaskValue } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import { TASK_CONTEXT_LIMITS, taskByteHash, selectTaskLines } from "./context-text.js";
import { taskContainsPrivateMaterial } from "./portable-input.js";
import { taskCanRead } from "./scope.js";
import type { TaskRepositoryReader } from "./context-types.js";

/** Read-only decomposition context. Subtree inventories are metadata, never automatic body authority. */
export async function prepareTaskCompilationContext(input: {
  review: TaskReview;
  repository: TaskRepositoryReader;
}): Promise<
  TaskParseResult<{
    contextId: string;
    sources: { path: string; fileHash: string; selectionHash: string }[];
    inventory: { path: string; type: "file" | "directory"; byteLength: number }[];
    files: { path: string; text: string }[];
  }>
> {
  try {
    const parsed = taskReviewSchema.safeParse(input.review);
    if (!parsed.success)
      return taskFailure("TASK_SELECTION_INVALID", "Independent review is invalid.");
    const review = parsed.data;
    const inventory = await input.repository.inventory({
      read: review.policy.authority.read,
      deny: review.policy.authority.deny,
    });
    if (!inventory.success) return inventory;
    if (inventory.data.rootIdentity !== review.project.rootIdentity)
      return taskFailure("TASK_PROJECT_DRIFT", "Compilation repository identity changed.");
    if (inventory.data.entries.length > TASK_CONTEXT_LIMITS.maxInventoryEntries)
      return taskFailure("TASK_CONTEXT_LIMIT_EXCEEDED", "Compilation inventory exceeds its bound.");
    const scope = { scope: review.policy.authority };
    const refs = [
      {
        path: review.phase.sourcePath,
        fileHash: review.phase.sourceFileHash,
        lineRange: review.phase.lineRange,
      },
      ...review.phase.requirements.flatMap((r) => r.sourceRefs),
    ];
    const selected = new Map<
      string,
      { fileHash?: string | undefined; full: boolean; ranges: { start: number; end: number }[] }
    >();
    for (const ref of refs) {
      const old = selected.get(ref.path);
      if (old?.fileHash && old.fileHash !== ref.fileHash)
        return taskFailure("TASK_CONTEXT_STALE", "Reviewed source identities conflict.");
      selected.set(ref.path, {
        fileHash: ref.fileHash,
        full: old?.full === true || !ref.lineRange,
        ranges: [...(old?.ranges ?? []), ...(ref.lineRange ? [ref.lineRange] : [])],
      });
    }
    const paths = new Set(
      inventory.data.entries.filter((e) => e.type === "file").map((e) => e.path),
    );
    for (const selector of review.policy.authority.read)
      if (selector.type === "file" && paths.has(selector.path) && !selected.has(selector.path))
        selected.set(selector.path, { full: true, ranges: [] });
    for (const target of review.policy.authority.write)
      if (paths.has(target))
        selected.set(target, { fileHash: selected.get(target)?.fileHash, full: true, ranges: [] });
    for (const target of [...selected.keys(), ...review.policy.authority.write]) {
      let directory = posix.dirname(target);
      for (;;) {
        const rule = directory === "." ? "AGENTS.md" : `${directory}/AGENTS.md`;
        if (paths.has(rule))
          selected.set(rule, { fileHash: selected.get(rule)?.fileHash, full: true, ranges: [] });
        if (directory === ".") break;
        directory = posix.dirname(directory);
      }
    }
    if (selected.size > TASK_CONTEXT_LIMITS.maxSources)
      return taskFailure(
        "TASK_CONTEXT_LIMIT_EXCEEDED",
        "Compilation sources exceed the source-count bound.",
      );
    const files = [],
      sources = [];
    for (const [path, selection] of [...selected].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      if (!taskCanRead(scope, path))
        return taskFailure(
          "TASK_SCOPE_VIOLATION",
          "Required compilation source/rule is outside read authority.",
        );
      const read = await input.repository.read(path);
      if (!read.success) return read;
      if (
        !read.data ||
        taskByteHash(read.data.text) !== read.data.fileHash ||
        (selection.fileHash && selection.fileHash !== read.data.fileHash)
      )
        return taskFailure("TASK_CONTEXT_STALE", "Compilation source differs from reviewed bytes.");
      if (
        Buffer.byteLength(read.data.text) > TASK_CONTEXT_LIMITS.maxFileBytes ||
        taskContainsPrivateMaterial(read.data.text)
      )
        return taskFailure(
          "TASK_SCOPE_VIOLATION",
          "Compilation source failed privacy/size screening.",
        );
      if (
        path === review.phase.sourcePath &&
        taskByteHash(selectTaskLines(read.data.text, review.phase.lineRange)) !==
          review.phase.selectionHash
      )
        return taskFailure(
          "TASK_PLAN_REVISION_STALE",
          "Reviewed phase selection hash differs from source lines.",
        );
      // Merge overlapping ranges without duplicating lines; full applicable rules are always retained.
      const text = selection.full
        ? read.data.text
        : [
            ...new Set(
              selection.ranges.flatMap((range) => {
                selectTaskLines(read.data!.text, range);
                return Array.from(
                  { length: range.end - range.start + 1 },
                  (_, i) => range.start + i,
                );
              }),
            ),
          ]
            .sort((a, b) => a - b)
            .map((line) => selectTaskLines(read.data!.text, { start: line, end: line }))
            .join("");
      files.push({ path, text });
      sources.push({ path, fileHash: read.data.fileHash, selectionHash: taskByteHash(text) });
    }
    const visibleInventory = inventory.data.entries
      .filter((e) => taskCanRead(scope, e.path))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const metadata = { sources, inventory: visibleInventory };
    if (
      Buffer.byteLength(JSON.stringify({ ...metadata, files })) >
      TASK_CONTEXT_LIMITS.maxContextBytes
    )
      return taskFailure(
        "TASK_CONTEXT_LIMIT_EXCEEDED",
        "Compilation context exceeds its byte bound.",
      );
    return {
      success: true,
      data: freezeTaskValue({ contextId: taskContentHash(metadata), ...metadata, files }),
    };
  } catch {
    return taskFailure(
      "TASK_CONTEXT_UNRESOLVED",
      "Compilation context could not be safely prepared.",
    );
  }
}
