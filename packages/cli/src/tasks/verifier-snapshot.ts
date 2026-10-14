import { lstat, opendir } from "node:fs/promises";
import path from "node:path";
import {
  TASK_VERIFIER_FILE_LIMITS,
  taskByteHash,
  taskContentHash,
  taskFailure,
  isSafeTaskPath,
  isTaskPathExcluded,
  taskSelectorContains,
  decodeTaskText,
  hasTaskSecretMaterial,
  taskVerifierSnapshotHash,
  taskScopeSchema,
  type TaskSelector,
  type TaskVerifierSnapshot,
  type TaskParseResult,
} from "@reposetup/core";
import {
  captureVerifierRoot,
  verifyVerifierRoot,
  readVerifierFile,
  metadataFingerprint,
  resolveVerifierFile,
  type VerifierRoot,
} from "./verifier-read.js";

/** Whole-project inventory: excluded bodies are not read and symlinks are never followed. */
export async function createTaskVerifierSnapshotReader(
  projectRoot: string,
  metadataOnly: readonly TaskSelector[] = [],
): Promise<TaskParseResult<{ snapshot(): Promise<TaskParseResult<TaskVerifierSnapshot>> }>> {
  try {
    const scope = taskScopeSchema.shape.deny.safeParse(metadataOnly);
    if (!scope.success)
      return taskFailure("TASK_SCOPE_INVALID", "Verifier metadata exclusions are invalid.");
    const exclusions = scope.data;
    const root = await captureVerifierRoot(projectRoot);
    return { success: true, data: { snapshot: () => snapshot(root, exclusions) } };
  } catch {
    return taskFailure(
      "TASK_PROFILE_UNSUPPORTED",
      "Verifier root requires a canonical supported POSIX directory.",
    );
  }
}
async function snapshot(
  root: VerifierRoot,
  exclusions: TaskSelector[],
): Promise<TaskParseResult<TaskVerifierSnapshot>> {
  try {
    const entries: TaskVerifierSnapshot["entries"] = [];
    const aliases = new Set<string>();
    await verifyVerifierRoot(root);
    const walk = async (relative: string, depth: number): Promise<void> => {
      if (
        depth > TASK_VERIFIER_FILE_LIMITS.maxDepth ||
        entries.length >= TASK_VERIFIER_FILE_LIMITS.maxEntries
      )
        throw new Error("inventory bound");
      if (relative !== "" && !isSafeTaskPath(relative)) throw new Error("path");
      const alias = relative.normalize("NFC").toLowerCase();
      if (aliases.has(alias)) throw new Error("alias");
      aliases.add(alias);
      const target = relative === "" ? root.path : path.join(root.path, relative);
      const parent = relative === "" ? "" : path.posix.dirname(relative);
      if (parent !== "" && parent !== ".") await resolveVerifierFile(root, parent);
      await verifyVerifierRoot(root);
      const before = await lstat(target);
      const fingerprint = metadataFingerprint(before);
      if (relative !== "") {
        const type = before.isSymbolicLink()
          ? "symlink"
          : before.isDirectory()
            ? "directory"
            : before.isFile()
              ? "file"
              : "special";
        const excluded =
          isTaskPathExcluded(relative, "read") ||
          exclusions.some((s) => taskSelectorContains(s, relative));
        if (type === "special") throw new Error("special");
        if (type === "file" && !excluded) {
          const file = await readVerifierFile(
            root,
            relative,
            TASK_VERIFIER_FILE_LIMITS.maxProjectFileBytes,
            true,
          );
          const text = decodeTaskText(file.bytes);
          if (hasTaskSecretMaterial(text)) throw new Error("privacy");
          entries.push({
            path: relative,
            type,
            mode: "content",
            fingerprint: taskContentHash({ fileHash: file.fileHash, metadata: file.fingerprint }),
          });
        } else entries.push({ path: relative, type, mode: "metadata", fingerprint });
        if (type !== "directory") return;
      }
      if (relative !== "") await resolveVerifierFile(root, relative);
      const directory = await opendir(target);
      for await (const child of directory)
        await walk(relative === "" ? child.name : `${relative}/${child.name}`, depth + 1);
      if (relative !== "") await resolveVerifierFile(root, relative);
      if (metadataFingerprint(await lstat(target)) !== fingerprint)
        throw new Error("directory drift");
    };
    await walk("", 0);
    await verifyVerifierRoot(root);
    entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const payload = {
      schemaVersion: 1 as const,
      rootIdentity: taskByteHash(root.path),
      rootFingerprint: metadataFingerprint(await lstat(root.path)),
      entries,
    };
    const result = { ...payload, revision: taskVerifierSnapshotHash(payload) };
    for (const e of entries) Object.freeze(e);
    Object.freeze(entries);
    return { success: true, data: Object.freeze(result) };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Verifier inventory is unsafe, changing, private or exceeds its bounds.",
    );
  }
}
