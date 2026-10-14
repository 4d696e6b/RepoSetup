import { lstat, opendir, readlink, realpath } from "node:fs/promises";
import path from "node:path";
import {
  TASK_VERIFIER_FILE_LIMITS,
  isPrivateVerifierPath,
  isSafeTaskPath,
  taskContentHash,
  taskFailure,
  type TaskParseResult,
} from "@reposetup/core";
import {
  captureVerifierRoot,
  verifyVerifierRoot,
  readVerifierFile,
  metadataFingerprint,
  resolveVerifierFile,
} from "./verifier-read.js";

/** Full content inventory of explicitly reviewed immutable dependency roots. Never follows an unbound link. */
export async function readTaskClosureInventory(
  roots: Readonly<Record<string, string>>,
): Promise<TaskParseResult<{ revision: string; totalBytes: number; entries: number }>> {
  try {
    const rootIds = Object.keys(roots).sort();
    if (
      rootIds.length === 0 ||
      rootIds.length > 128 ||
      new Set(Object.values(roots)).size !== rootIds.length
    )
      throw new Error("roots");
    const captured = new Map<string, Awaited<ReturnType<typeof captureVerifierRoot>>>();
    for (const rootId of rootIds) captured.set(rootId, await captureVerifierRoot(roots[rootId]!));
    const records: unknown[] = [];
    let totalBytes = 0;
    for (const rootId of rootIds) {
      const root = captured.get(rootId)!;
      const aliases = new Set<string>();
      const walk = async (relative: string, depth: number): Promise<void> => {
        if (
          depth > TASK_VERIFIER_FILE_LIMITS.maxDepth ||
          records.length >= TASK_VERIFIER_FILE_LIMITS.maxEntries ||
          (relative !== "" &&
            (!isSafeTaskPath(relative) || isPrivateVerifierPath(path.join(root.path, relative))))
        )
          throw new Error("bound or privacy");
        const alias = relative.normalize("NFC").toLowerCase();
        if (aliases.has(alias)) throw new Error("alias");
        aliases.add(alias);
        if (relative) {
          const parent = path.posix.dirname(relative);
          if (parent !== ".") await resolveVerifierFile(root, parent);
        }
        await verifyVerifierRoot(root);
        const target = path.join(root.path, relative);
        const info = await lstat(target);
        const metadata = metadataFingerprint(info);
        if (info.isSymbolicLink()) {
          const link = await readlink(target);
          const canonical = await realpath(target);
          if (
            !Object.values(roots).some(
              (r) => canonical === r || canonical.startsWith(`${r}${path.sep}`),
            )
          )
            throw new Error("external dependency");
          if (
            metadataFingerprint(await lstat(target)) !== metadata ||
            (await realpath(target)) !== canonical
          )
            throw new Error("link drift");
          records.push({ rootId, relative, metadata, link, canonical });
        } else if (info.isFile()) {
          const remaining = TASK_VERIFIER_FILE_LIMITS.maxDefinitionTotalBytes - totalBytes;
          const read = await readVerifierFile(
            root,
            relative,
            Math.min(remaining, TASK_VERIFIER_FILE_LIMITS.maxDefinitionFileBytes),
          );
          totalBytes += read.byteLength;
          records.push({ rootId, relative, metadata: read.fingerprint, fileHash: read.fileHash });
        } else if (info.isDirectory()) {
          if (relative) await resolveVerifierFile(root, relative);
          records.push({ rootId, relative, metadata });
          const directory = await opendir(target);
          for await (const child of directory)
            await walk(relative ? `${relative}/${child.name}` : child.name, depth + 1);
          if (relative) await resolveVerifierFile(root, relative);
          if (metadataFingerprint(await lstat(target)) !== metadata)
            throw new Error("directory drift");
        } else throw new Error("special");
      };
      await walk("", 0);
      await verifyVerifierRoot(root);
    }
    records.sort((a, b) =>
      JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0,
    );
    return {
      success: true,
      data: Object.freeze({
        revision: taskContentHash(records),
        totalBytes,
        entries: records.length,
      }),
    };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Immutable verifier inventory is unsafe, unbound, private, changing or exceeds its limits.",
    );
  }
}
