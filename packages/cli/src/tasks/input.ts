import path from "node:path";
import {
  TASK_DOCUMENT_LIMITS,
  parseTaskJson,
  parsePortablePlanInput,
  taskFailure,
  taskContainsPrivateMaterial,
  DEFAULT_HANDOFF_PREFERENCES,
  validateTaskPlan,
  taskContentHash,
  taskCompilationPolicySchema,
  selectTaskPhase,
  selectTaskLines,
  type TaskDocument,
  type TaskReview,
  type TaskPreferences,
  type TaskPlan,
  type TaskParseResult,
  type TaskRepositoryReader,
} from "@reposetup/core";
import type { ResolvedCliDeps } from "../types.js";

export async function readTaskInput(
  file: string,
  deps: ResolvedCliDeps,
): Promise<TaskParseResult<string>> {
  try {
    if (deps.fs.readBoundedFile === undefined)
      return taskFailure(
        "TASK_PREREQUISITE_MISSING",
        "Task artifacts require a bounded input reader.",
      );
    const text = await deps.fs.readBoundedFile(
      path.resolve(deps.cwd, file),
      TASK_DOCUMENT_LIMITS.bytes,
    );
    if (Buffer.byteLength(text) > TASK_DOCUMENT_LIMITS.bytes)
      return taskFailure("TASK_PLAN_INVALID", "Task artifact exceeds its byte limit.");
    return { success: true, data: text };
  } catch {
    return taskFailure("TASK_PLAN_INVALID", "Task artifact could not be read as bounded UTF-8.");
  }
}
export async function loadTaskDocument(
  file: string,
  deps: ResolvedCliDeps,
): Promise<TaskParseResult<TaskDocument>> {
  const text = await readTaskInput(file, deps);
  if (!text.success) return text;
  const parsed = parseTaskJson(text.data);
  if (parsed.success && taskContainsPrivateMaterial(parsed.data))
    return taskFailure("TASK_SCOPE_VIOLATION", "Task artifact failed privacy screening.");
  return parsed;
}
export async function loadTaskReview(input: {
  review: string;
  preferences?: string;
  root?: string;
  deps: ResolvedCliDeps;
}): Promise<
  TaskParseResult<{
    review: TaskReview;
    preferences: TaskPreferences;
    repository: TaskRepositoryReader;
  }>
> {
  const document = await loadTaskDocument(input.review, input.deps);
  if (!document.success) return document;
  if (document.data.kind !== "task_review")
    return taskFailure("TASK_SELECTION_INVALID", "Provide an independent task_review document.");
  let preferences = DEFAULT_HANDOFF_PREFERENCES;
  if (input.preferences !== undefined) {
    const loaded = await loadTaskDocument(input.preferences, input.deps);
    if (!loaded.success) return loaded;
    if (loaded.data.kind !== "task_preferences")
      return taskFailure("TASK_PREFERENCES_INVALID", "Expected task_preferences input.");
    preferences = loaded.data;
  }
  const review = document.data;
  const policy = taskCompilationPolicySchema.parse({
    ...review.policy,
    authority: {
      ...review.policy.authority,
      deny: [...review.policy.authority.deny, ...preferences.exclusions].filter(
        (selector, index, all) =>
          all.findIndex((item) => item.type === selector.type && item.path === selector.path) ===
          index,
      ),
    },
  });
  const result = await input.deps.createTaskRepository(
    path.resolve(input.deps.cwd, input.root ?? "."),
    { read: policy.authority.read, deny: policy.authority.deny },
  );
  if (!result.success) return result;
  if (result.data.rootIdentity !== review.project.rootIdentity)
    return taskFailure(
      "TASK_PROJECT_DRIFT",
      "Repository identity differs from the independently reviewed project.",
    );
  return {
    success: true,
    data: { review: { ...review, policy }, preferences, repository: result.data },
  };
}
export async function checkReviewedPhase(
  review: TaskReview,
  repository: TaskRepositoryReader,
  selector: { heading?: string; lines?: string } = {},
): Promise<TaskParseResult<true>> {
  const phase = await repository.read(review.phase.sourcePath);
  if (!phase.success) return phase;
  if (phase.data === null)
    return taskFailure("TASK_CONTEXT_UNRESOLVED", "Reviewed phase source is absent.");
  const selected = selectTaskPhase(phase.data.text, selector, review.phase.lineRange);
  if (!selected.success) return selected;
  if (
    phase.data.fileHash !== review.phase.sourceFileHash ||
    selected.data.selectionHash !== review.phase.selectionHash
  )
    return taskFailure(
      "TASK_PLAN_REVISION_STALE",
      "Markdown phase bytes differ from the reviewed selection.",
    );
  for (const requirement of review.phase.requirements)
    for (const ref of requirement.sourceRefs) {
      const source = await repository.read(ref.path);
      if (!source.success) return source;
      if (source.data === null || source.data.fileHash !== ref.fileHash)
        return taskFailure(
          "TASK_CONTEXT_STALE",
          "Requirement source differs from the reviewed bytes.",
        );
      try {
        selectTaskLines(source.data.text, ref.lineRange);
      } catch {
        return taskFailure("TASK_CONTEXT_UNRESOLVED", "Required source range is absent.");
      }
    }
  return { success: true, data: true };
}
export async function loadReviewedPlan(
  file: string,
  review: TaskReview,
  deps: ResolvedCliDeps,
): Promise<TaskParseResult<TaskPlan>> {
  const text = await readTaskInput(file, deps);
  if (!text.success) return text;
  const parsed = parsePortablePlanInput(text.data);
  if (!parsed.success) return parsed;
  if (taskContainsPrivateMaterial(parsed.data))
    return taskFailure("TASK_SCOPE_VIOLATION", "Task plan failed privacy screening.");
  if (
    taskContentHash(parsed.data.phase) !== taskContentHash(review.phase) ||
    taskContentHash(parsed.data.project) !== taskContentHash(review.project)
  )
    return taskFailure(
      "TASK_PLAN_REVISION_STALE",
      "Plan differs from independent phase/project authority.",
    );
  return validateTaskPlan(parsed.data, review.policy);
}
