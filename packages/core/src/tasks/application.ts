import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { parseTaskDocument, taskFailure, type TaskParseResult } from "./parse.js";
import { taskCanWrite } from "./scope.js";
import {
  decodeTaskText,
  hasTaskSecretMaterial,
  taskByteHash,
  TASK_CONTEXT_LIMITS,
} from "./context-text.js";
import { checkTaskContextFreshness } from "./context.js";
import type { Task } from "./plan-schema.js";
import type { TaskChangeSet } from "./change-schema.js";
import type { TaskMaterializedContext, TaskRepositoryReader } from "./context-types.js";
import type { TaskVerifierSnapshot } from "./verifier-files.js";

export const TASK_APPLICATION_LIMITS = Object.freeze({ maxChanges: 20, maxBytes: 262144 });
export type TaskPreparedTextChange = {
  path: string;
  beforeHash: string | null;
  afterHash: string;
  text: string;
  changeIndex: number;
};
/** Pure batch preflight. Text remains transient; durable records contain hashes only. */
export function prepareTaskTextChanges(input: {
  proposal: unknown;
  planId: string;
  attemptId: string;
  task: Task;
  packet: Pick<TaskMaterializedContext, "context" | "writeTargets">;
  preimages: { path: string; text: string | null }[];
}): TaskParseResult<TaskPreparedTextChange[]> {
  const parsed = parseTaskDocument(input.proposal);
  if (!parsed.success) return parsed;
  if (parsed.data.kind !== "change_set")
    return taskFailure("TASK_CHANGESET_INVALID", "A typed text ChangeSet is required.");
  const proposal: TaskChangeSet = parsed.data;
  if (
    proposal.planId !== input.planId ||
    proposal.taskId !== input.task.taskId ||
    proposal.attemptId !== input.attemptId ||
    proposal.inputRevision !== input.packet.context.inputRevision
  )
    return taskFailure("TASK_CONTEXT_STALE", "Proposal identities differ from the opened attempt.");
  const aliases = new Set<string>();
  const prepared: TaskPreparedTextChange[] = [];
  let bytes = 0;
  for (const [changeIndex, change] of proposal.changes.entries()) {
    const alias = change.path.toLowerCase();
    if (aliases.has(alias))
      return taskFailure("TASK_CHANGESET_INVALID", "A batch repeats a canonical target.");
    aliases.add(alias);
    if (
      !taskCanWrite(input.task, change.path) ||
      input.packet.context.sources.some(
        (s) =>
          s.path === change.path &&
          s.inclusionReasons.some((r) =>
            ["requirement", "applicable_rule", "predecessor_output"].includes(r),
          ),
      )
    )
      return taskFailure(
        "TASK_SCOPE_VIOLATION",
        "Proposal target is excluded, immutable or unowned.",
      );
    const targets = input.packet.writeTargets.filter((t) => t.path === change.path);
    const images = input.preimages.filter((p) => p.path === change.path);
    if (targets.length !== 1 || images.length !== 1)
      return taskFailure(
        "TASK_CHANGE_PRECONDITION_FAILED",
        "A reviewed writable preimage is missing.",
      );
    const before = images[0]!.text;
    const beforeHash = before === null ? null : taskByteHash(before);
    if (beforeHash !== targets[0]!.fileHash)
      return taskFailure(
        "TASK_CONTEXT_STALE",
        "A writable preimage changed after context preparation.",
      );
    let text: string;
    if (change.type === "create_text") {
      if (before !== null)
        return taskFailure(
          "TASK_CHANGE_PRECONDITION_FAILED",
          "Creation requires an absent target.",
        );
      text = change.content;
    } else {
      if (before === null || beforeHash !== change.expectedFileHash)
        return taskFailure(
          "TASK_CHANGE_PRECONDITION_FAILED",
          "Replacement hash does not match the current file.",
        );
      const start = before.indexOf(change.oldText);
      if (start < 0 || before.indexOf(change.oldText, start + 1) >= 0)
        return taskFailure(
          "TASK_CHANGE_PRECONDITION_FAILED",
          "Replacement requires exactly one exact match.",
        );
      text = before.slice(0, start) + change.newText + before.slice(start + change.oldText.length);
    }
    bytes += Buffer.byteLength(text);
    try {
      if (
        decodeTaskText(Buffer.from(text)) !== text ||
        hasTaskSecretMaterial(text) ||
        Buffer.byteLength(text) > TASK_CONTEXT_LIMITS.maxFileBytes ||
        bytes > TASK_APPLICATION_LIMITS.maxBytes
      )
        throw new Error("text policy");
    } catch {
      return taskFailure(
        "TASK_SCOPE_VIOLATION",
        "Proposed text fails privacy, encoding or byte policy.",
      );
    }
    prepared.push({
      path: change.path,
      beforeHash,
      afterHash: taskByteHash(text),
      text,
      changeIndex,
    });
  }
  return { success: true, data: freezeTaskValue(prepared) };
}

/** Retain original immutable inputs while substituting only executor-owned postimages. */
export async function checkTaskAppliedContextFreshness(
  packet: Pick<TaskMaterializedContext, "context" | "writeTargets">,
  postimages: { path: string; fileHash: string }[],
  repository: TaskRepositoryReader,
): Promise<TaskParseResult<true>> {
  if (
    new Set(postimages.map((p) => p.path)).size !== postimages.length ||
    postimages.some((p) => !packet.writeTargets.some((t) => t.path === p.path))
  )
    return taskFailure(
      "TASK_RUN_STATE_INVALID",
      "Owned postimages do not match reviewed write targets.",
    );
  const owned = new Map(postimages.map((p) => [p.path, p.fileHash]));
  return checkTaskContextFreshness(
    {
      context: {
        ...packet.context,
        sources: packet.context.sources.filter((s) => !owned.has(s.path)),
      },
      files: [],
      writeTargets: packet.writeTargets.map((t) => ({
        path: t.path,
        fileHash: owned.get(t.path) ?? t.fileHash,
      })),
    },
    repository,
  );
}

/** Whole-project audit permits only recorded files, new parent directories and their metadata effects. */
export function auditTaskApplication(
  before: TaskVerifierSnapshot,
  after: TaskVerifierSnapshot,
  files: readonly string[],
  directories: readonly string[],
): TaskParseResult<true> {
  if (before.rootIdentity !== after.rootIdentity)
    return taskFailure("TASK_PROJECT_DRIFT", "Application root changed.");
  const parents = new Set<string>();
  for (const file of [...files, ...directories]) {
    const parts = file.split("/");
    for (let i = 1; i < parts.length; i++) parents.add(parts.slice(0, i).join("/"));
  }
  const old = new Map(before.entries.map((e) => [e.path, e]));
  const current = new Map(after.entries.map((e) => [e.path, e]));
  for (const p of new Set([...old.keys(), ...current.keys()])) {
    const a = old.get(p),
      b = current.get(p);
    if (taskContentHash(a ?? null) === taskContentHash(b ?? null)) continue;
    if (
      files.includes(p) &&
      b?.type === "file" &&
      b.mode === "content" &&
      (!a || a.type === "file")
    )
      continue;
    if (directories.includes(p) && !a && b?.type === "directory") continue;
    if (parents.has(p) && a?.type === "directory" && b?.type === "directory" && a.mode === b.mode)
      continue;
    return taskFailure(
      "TASK_UNEXPECTED_CHANGES",
      "Project effects exceed the recorded application batch.",
    );
  }
  return { success: true, data: true };
}
