import { constants } from "node:fs";
import { access, lstat, mkdir, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import {
  isSafeTaskPath,
  isTaskPathExcluded,
  taskFailure,
  taskByteHash,
  taskContentHash,
  type TaskRunAdapter,
  type TaskParseResult,
  type TaskPreparedTextChange,
  type TaskSelector,
} from "@reposetup/core";
import { createTaskRepositoryReader } from "./repository-reader.js";
import { createTaskVerifierSnapshotReader } from "./verifier-snapshot.js";
import { captureVerifierRoot, verifyVerifierRoot } from "./verifier-read.js";
import {
  createTaskStateAcquire,
  installTaskStage,
  syncTaskDirectory,
} from "./run-state-adapter.js";

const missing = (e: unknown) => e instanceof Error && "code" in e && e.code === "ENOENT";
/** Read-only factory. All project/state mutations remain executor-invoked ports. */
export async function createTaskRunAdapter(input: {
  projectRoot: string;
  stateRoot: string;
  authority: { read: TaskSelector[]; deny: TaskSelector[]; write: string[] };
}): Promise<TaskParseResult<TaskRunAdapter>> {
  const { projectRoot, stateRoot, authority } = input;
  try {
    const root = await captureVerifierRoot(projectRoot);
    const repository = await createTaskRepositoryReader(projectRoot, {
      read: authority.read,
      deny: authority.deny,
    });
    if (!repository.success) return repository;
    const snapshots = await createTaskVerifierSnapshotReader(projectRoot);
    if (!snapshots.success) return snapshots;
    const state = await createTaskStateAcquire(stateRoot, projectRoot);
    if (!state.success) return state;
    const writable = (relative: string) =>
      isSafeTaskPath(relative) &&
      !isTaskPathExcluded(relative, "write") &&
      authority.write.includes(relative);
    const resolve = async (
      relative: string,
      allowMissing: boolean,
    ): Promise<{ target: string; missingParents: string[] }> => {
      if (!isSafeTaskPath(relative) || relative.split("/").length > 32) throw new Error("path");
      await verifyVerifierRoot(root);
      const parts = relative.split("/");
      let current = projectRoot;
      const absent: string[] = [];
      for (const [i, part] of parts.entries()) {
        if (!absent.length) {
          const parent = await lstat(current);
          if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== process.getuid?.())
            throw new Error("parent");
          await access(current, constants.W_OK | constants.X_OK);
          const siblings = await readdir(current);
          if (
            siblings.some(
              (n) => n.normalize("NFC").toLowerCase() === part.toLowerCase() && n !== part,
            )
          )
            throw new Error("case alias");
        }
        current = path.join(current, part);
        if (absent.length) {
          if (i < parts.length - 1) absent.push(parts.slice(0, i + 1).join("/"));
          continue;
        }
        try {
          const info = await lstat(current);
          if (
            info.isSymbolicLink() ||
            (await realpath(current)) !== current ||
            (i < parts.length - 1 && !info.isDirectory())
          )
            throw new Error("path component");
        } catch (e) {
          if (!missing(e) || !allowMissing) throw e;
          if (i < parts.length - 1) absent.push(parts.slice(0, i + 1).join("/"));
        }
      }
      await verifyVerifierRoot(root);
      return { target: current, missingParents: absent };
    };
    const targetCheck = async (change: TaskPreparedTextChange): Promise<number> => {
      if (!writable(change.path)) throw new Error("write scope");
      const resolved = await resolve(change.path, true);
      const read = await repository.data.read(change.path);
      if (!read.success || (read.data?.fileHash ?? null) !== change.beforeHash)
        throw new Error("preimage drift");
      if (resolved.missingParents.length) return 0o644;
      try {
        const info = await lstat(resolved.target);
        if (
          !info.isFile() ||
          info.nlink !== 1 ||
          info.uid !== process.getuid?.() ||
          (info.mode & 0o7000) !== 0
        )
          throw new Error("target type");
        await access(resolved.target, constants.W_OK);
        return info.mode & 0o777;
      } catch (e) {
        if (missing(e) && change.beforeHash === null) return 0o644;
        throw e;
      }
    };
    return {
      success: true,
      data: {
        rootInstance: taskContentHash({ path: root.path, dev: root.dev, ino: root.ino }),
        repository: repository.data,
        snapshot: snapshots.data.snapshot,
        acquire: state.data,
        preflight: async (changes) => {
          try {
            const dirs = new Set<string>();
            for (const c of changes) {
              await targetCheck(c);
              const r = await resolve(c.path, true);
              for (const dir of r.missingParents) dirs.add(dir);
            }
            return {
              success: true,
              data: [...dirs].sort(
                (a, b) => a.split("/").length - b.split("/").length || (a < b ? -1 : a > b ? 1 : 0),
              ),
            };
          } catch {
            return taskFailure(
              "TASK_CHANGE_PRECONDITION_FAILED",
              "Batch paths, permissions or preimages are unsafe; no project effect was applied.",
            );
          }
        },
        createDirectory: async (relative) => {
          try {
            if (
              !authority.write.some((p) => p.startsWith(`${relative}/`)) ||
              isTaskPathExcluded(relative, "write")
            )
              throw new Error("directory scope");
            const parent = path.posix.dirname(relative);
            if (parent !== ".") await resolve(parent, false);
            const r = await resolve(relative, true);
            await mkdir(r.target, { mode: 0o755 });
            await syncTaskDirectory(path.dirname(r.target));
            await verifyVerifierRoot(root);
            return { success: true, data: true };
          } catch {
            return taskFailure(
              "TASK_CHANGE_APPLY_FAILED",
              "Recorded parent creation failed; existing paths are never adopted as owned effects.",
            );
          }
        },
        inspectDirectory: async (relative) => {
          try {
            const r = await resolve(relative, true);
            try {
              const info = await lstat(r.target);
              if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("directory type");
              return { success: true, data: "present" };
            } catch (e) {
              if (missing(e)) return { success: true, data: "absent" };
              throw e;
            }
          } catch {
            return taskFailure(
              "TASK_NEEDS_REVIEW",
              "Recorded directory effect cannot be safely reconciled.",
            );
          }
        },
        install: async (lease, id, change) => {
          try {
            const r = await resolve(change.path, true);
            if (r.missingParents.length) throw new Error("missing parent");
            // A missing final creation target is allowed; all of its parent directories must now exist.
            await installTaskStage({
              lease,
              id,
              target: r.target,
              beforeHash: change.beforeHash,
              afterHash: change.afterHash,
              checkTarget: () => targetCheck(change),
            });
            const read = await repository.data.read(change.path);
            if (
              !read.success ||
              !read.data ||
              read.data.fileHash !== change.afterHash ||
              taskByteHash(read.data.text) !== change.afterHash
            )
              throw new Error("postimage");
            return { success: true, data: true };
          } catch {
            return taskFailure(
              "TASK_CHANGE_APPLY_FAILED",
              "Individual guarded text install failed; retain observed files and reconcile its pending intent.",
            );
          }
        },
      },
    };
  } catch {
    return taskFailure(
      "TASK_SCOPE_INVALID",
      "Task application needs canonical supported roots and explicit reviewed authority.",
    );
  }
}
