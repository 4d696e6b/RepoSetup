import path from "node:path";
import {
  taskCheckFileDefinitionSchema,
  taskCheckFileDefinitionHash,
  TASK_VERIFIER_FILE_LIMITS,
  isPrivateVerifierPath,
  taskByteHash,
  taskFailure,
  type TaskParseResult,
  type TaskCheckFileDefinition,
} from "@reposetup/core";
import { captureVerifierRoot, readVerifierFile, verifyVerifierRoot } from "./verifier-read.js";

/** Verify a separately reviewed finite closure; never discovers/imports project scripts. */
export async function verifyTaskCheckFileDefinition(
  value: unknown,
  roots: Readonly<Record<string, string>>,
  recipeRevision: string,
): Promise<TaskParseResult<TaskCheckFileDefinition>> {
  try {
    const parsed = taskCheckFileDefinitionSchema.safeParse(value);
    if (!parsed.success)
      return taskFailure("TASK_CHECK_BLOCKED", "Check file definition is invalid.");
    const definition = parsed.data;
    const { definitionRevision, ...payload } = definition;
    if (
      taskCheckFileDefinitionHash(payload) !== definitionRevision ||
      definition.recipeRevision !== recipeRevision
    )
      return taskFailure(
        "TASK_CHECK_DEFINITION_CHANGED",
        "Check definition or fixed recipe changed.",
      );
    const rootIds = definition.roots.map((r) => r.rootId);
    if (
      new Set(rootIds).size !== rootIds.length ||
      Object.keys(roots).length !== rootIds.length ||
      Object.keys(roots).some((id) => !rootIds.includes(id)) ||
      new Set(definition.files.map((f) => `${f.rootId}/${f.path}`)).size !==
        definition.files.length ||
      definition.files.some((f) => !rootIds.includes(f.rootId) || isPrivateVerifierPath(f.path)) ||
      rootIds.some((id) => !definition.files.some((f) => f.rootId === id)) ||
      ["runtime", "tool_entry", "configuration"].some(
        (role) => !definition.files.some((f) => f.role === role),
      )
    )
      return taskFailure(
        "TASK_CHECK_BLOCKED",
        "Check closure roots, paths or required roles conflict.",
      );
    const captured = new Map<string, Awaited<ReturnType<typeof captureVerifierRoot>>>();
    for (const expected of definition.roots) {
      const current = await captureVerifierRoot(roots[expected.rootId]!);
      if (taskByteHash(current.path) !== expected.rootIdentity)
        return taskFailure("TASK_CHECK_DEFINITION_CHANGED", "Check closure root identity changed.");
      captured.set(expected.rootId, current);
    }
    let totalBytes = 0;
    for (const file of definition.files) {
      const remaining = TASK_VERIFIER_FILE_LIMITS.maxDefinitionTotalBytes - totalBytes;
      if (remaining <= 0) throw new Error("total bound");
      if (isPrivateVerifierPath(path.join(captured.get(file.rootId)!.path, file.path)))
        return taskFailure(
          "TASK_CHECK_BLOCKED",
          "Private paths cannot be part of a verifier closure.",
        );
      const actual = await readVerifierFile(
        captured.get(file.rootId)!,
        file.path,
        Math.min(TASK_VERIFIER_FILE_LIMITS.maxDefinitionFileBytes, remaining),
      );
      if (actual.fileHash !== file.fileHash)
        return taskFailure(
          "TASK_CHECK_DEFINITION_CHANGED",
          "Reviewed runtime, tool, config, rule or oracle bytes changed.",
        );
      totalBytes += actual.byteLength;
    }
    if (totalBytes !== definition.totalBytes)
      return taskFailure(
        "TASK_CHECK_DEFINITION_CHANGED",
        "Reviewed closure byte accounting changed.",
      );
    for (const root of captured.values()) await verifyVerifierRoot(root);
    for (const file of definition.files) Object.freeze(file);
    for (const root of definition.roots) Object.freeze(root);
    Object.freeze(definition.files);
    Object.freeze(definition.roots);
    return { success: true, data: Object.freeze(definition) };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Reviewed check closure is unavailable, unsafe, changing or exceeds its bounds.",
    );
  }
}
