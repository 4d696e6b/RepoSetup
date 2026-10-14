import path from "node:path";
import {
  taskContentHash,
  taskFailure,
  TASK_VERIFIER_FILE_LIMITS,
  type TaskBenchmarkFixture,
  type TaskParseResult,
  type TaskVerifierSnapshot,
} from "../../packages/core/dist/index.js";
import {
  captureVerifierRoot,
  readVerifierFile,
} from "../../packages/cli/src/tasks/verifier-read.js";

export type CandidateProjection = {
  files: { path: string; fileHash: string; bytes: Buffer }[];
  revision: string;
};
/** Test infrastructure: bounded read-only projection; never follows candidate links. */
export async function projectCandidate(
  projectRoot: string,
  manifest: TaskBenchmarkFixture,
  snapshot: TaskVerifierSnapshot,
): Promise<TaskParseResult<CandidateProjection>> {
  try {
    const root = await captureVerifierRoot(projectRoot);
    const allowed = new Set([...manifest.seedFiles.map((f) => f.path), ...manifest.write]);
    const directories = new Set<string>();
    for (const file of allowed) {
      let parent = path.posix.dirname(file);
      while (parent !== ".") {
        directories.add(parent);
        parent = path.posix.dirname(parent);
      }
    }
    const files: CandidateProjection["files"] = [];
    let totalBytes = 0;
    for (const entry of snapshot.entries) {
      if (
        [".git", "node_modules"].some(
          (prefix) => entry.path === prefix || entry.path.startsWith(`${prefix}/`),
        )
      ) {
        if (entry.mode !== "metadata") throw new Error("Excluded body");
        continue;
      }
      if (entry.type === "directory" && directories.has(entry.path)) continue;
      if (entry.type !== "file" || !allowed.has(entry.path))
        return taskFailure(
          "TASK_SCOPE_VIOLATION",
          "Candidate contains an unapproved path or link.",
        );
      const file = await readVerifierFile(
        root,
        entry.path,
        TASK_VERIFIER_FILE_LIMITS.maxProjectFileBytes,
        true,
      );
      const seed = manifest.seedFiles.find((f) => f.path === entry.path);
      if (!manifest.write.includes(entry.path) && file.fileHash !== seed?.fileHash)
        return taskFailure("TASK_CHECK_DEFINITION_CHANGED", "Frozen public inputs changed.");
      totalBytes += file.byteLength;
      if (totalBytes > 8388608) throw new Error("Projection bound");
      files.push({ path: entry.path, fileHash: file.fileHash, bytes: file.bytes });
    }
    if (manifest.seedFiles.some((f) => !files.some((p) => p.path === f.path)))
      return taskFailure("TASK_CHECK_DEFINITION_CHANGED", "Required fixture inputs are absent.");
    const revision = taskContentHash(
      files.map((f) => ({ path: f.path, fileHash: f.fileHash, bytes: f.bytes.length })),
    );
    return { success: true, data: { files, revision } };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Candidate projection is unsafe, changing or exceeds its bounds.",
    );
  }
}
