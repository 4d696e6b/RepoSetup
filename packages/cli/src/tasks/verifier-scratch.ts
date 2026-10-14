import { lstat, mkdir, mkdtemp, opendir, rm } from "node:fs/promises";
import path from "node:path";
import { TASK_VERIFIER_SCRATCH_POLICY, taskFailure, type TaskParseResult } from "@reposetup/core";
import { captureVerifierRoot, verifyVerifierRoot, resolveVerifierFile } from "./verifier-read.js";

/** Called only by the executor through prepare/dispose ports; never cleans project paths. */
export async function allocateTaskVerifierScratch(
  parent: string,
  forbiddenRoots: readonly string[],
): Promise<
  TaskParseResult<{
    directory: string;
    homeDirectory: string;
    temporaryDirectory: string;
    dispose(): Promise<TaskParseResult<true>>;
  }>
> {
  try {
    const root = await captureVerifierRoot(parent);
    if (forbiddenRoots.some((r) => parent === r || parent.startsWith(`${r}${path.sep}`)))
      throw new Error("scratch location");
    const directory = await mkdtemp(path.join(parent, "reposetup-verify-"));
    const captured = await captureVerifierRoot(directory);
    await verifyVerifierRoot(root);
    const info = await lstat(directory);
    if (info.uid !== process.getuid?.() || (info.mode & 0o077) !== 0)
      throw new Error("scratch privacy");
    const homeDirectory = path.join(directory, "home");
    const temporaryDirectory = path.join(directory, "tmp");
    await mkdir(homeDirectory, { mode: TASK_VERIFIER_SCRATCH_POLICY.mode });
    await mkdir(temporaryDirectory, { mode: TASK_VERIFIER_SCRATCH_POLICY.mode });
    await verifyVerifierRoot(captured);
    let consumed = false;
    return {
      success: true,
      data: {
        directory,
        homeDirectory,
        temporaryDirectory,
        async dispose() {
          if (consumed)
            return taskFailure("TASK_CHECK_BLOCKED", "Verifier scratch has already been released.");
          consumed = true;
          try {
            await verifyVerifierRoot(root);
            await verifyVerifierRoot(captured);
            const current = await lstat(directory);
            if (current.uid !== info.uid || (current.mode & 0o077) !== 0)
              throw new Error("privacy drift");
            let count = 0;
            let bytes = 0;
            const walk = async (relative: string, depth: number): Promise<void> => {
              if (
                ++count > TASK_VERIFIER_SCRATCH_POLICY.maxEntries ||
                depth > TASK_VERIFIER_SCRATCH_POLICY.maxDepth
              )
                throw new Error("scratch bound");
              const target = path.join(directory, relative);
              const stat = await lstat(target);
              if (
                stat.isSymbolicLink() ||
                stat.uid !== info.uid ||
                (!stat.isDirectory() && !stat.isFile())
              )
                throw new Error("scratch alias/type");
              const homePaths =
                process.platform === "darwin"
                  ? TASK_VERIFIER_SCRATCH_POLICY.homePaths.darwin
                  : TASK_VERIFIER_SCRATCH_POLICY.homePaths.linux;
              if (
                relative &&
                relative !== TASK_VERIFIER_SCRATCH_POLICY.temporaryPrefix &&
                !relative.startsWith(`${TASK_VERIFIER_SCRATCH_POLICY.temporaryPrefix}/`) &&
                !homePaths.includes(relative)
              )
                throw new Error("unexpected scratch effect");
              if (stat.isFile()) {
                bytes += stat.size;
                if (stat.nlink !== 1 || bytes > TASK_VERIFIER_SCRATCH_POLICY.maxBytes)
                  throw new Error("scratch bound/alias");
              }
              if (stat.isDirectory()) {
                if (relative) await resolveVerifierFile(captured, relative);
                const entries = await opendir(target);
                for await (const entry of entries)
                  await walk(relative ? `${relative}/${entry.name}` : entry.name, depth + 1);
                if (relative) await resolveVerifierFile(captured, relative);
              }
            };
            await walk("", 0);
            await verifyVerifierRoot(captured);
            await rm(directory, { recursive: true, force: false });
            return { success: true, data: true };
          } catch {
            // Unsafe or unexpected scratch is retained for inspection; never remove a replacement root.
            return taskFailure(
              "TASK_CHECK_BLOCKED",
              "Verifier scratch effects are unsafe or exceed their allowance; retained for manual inspection.",
            );
          }
        },
      },
    };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Private external verifier scratch could not be allocated safely.",
    );
  }
}
