import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, link, lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { hostname } from "node:os";
import {
  decodeTaskJson,
  taskByteHash,
  taskContainsPrivateMaterial,
  taskFailure,
  taskRunIdSchema,
  validateTaskRunCheckpoint,
  type TaskRunCheckpoint,
  type TaskRunLease,
  type TaskParseResult,
} from "@reposetup/core";
import { captureVerifierRoot, verifyVerifierRoot, type VerifierRoot } from "./verifier-read.js";

const uuid = (v: string) => taskRunIdSchema.safeParse(v).success;
const missing = (e: unknown) => e instanceof Error && "code" in e && e.code === "ENOENT";
const uid = () => process.getuid?.();
export const TASK_STATE_MAX_BYTES = 1048576;
export async function syncTaskDirectory(directory: string): Promise<void> {
  const handle = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function privateDirectory(directory: string): Promise<VerifierRoot> {
  const root = await captureVerifierRoot(directory);
  const info = await lstat(directory);
  if ((info.mode & 0o777) !== 0o700 || info.uid !== uid()) throw new Error("private directory");
  return root;
}
async function ensurePrivateDirectory(parent: VerifierRoot, name: string): Promise<VerifierRoot> {
  await verifyVerifierRoot(parent);
  const target = path.join(parent.path, name);
  try {
    await mkdir(target, { mode: 0o700 });
    await syncTaskDirectory(parent.path);
  } catch (e) {
    if (!(e instanceof Error && "code" in e && e.code === "EEXIST")) throw e;
  }
  return privateDirectory(target);
}
async function readPrivate(directory: VerifierRoot, name: string): Promise<Buffer | null> {
  await verifyVerifierRoot(directory);
  const target = path.join(directory.path, name);
  let handle;
  try {
    const before = await lstat(target);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.uid !== uid() ||
      (before.mode & 0o777) !== 0o600 ||
      before.size > TASK_STATE_MAX_BYTES
    )
      throw new Error("private file");
    handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = await handle.stat();
    if (
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      opened.size !== before.size ||
      opened.nlink !== 1
    )
      throw new Error("state drift");
    const buffer = Buffer.alloc(TASK_STATE_MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const r = await handle.read(buffer, length, buffer.length - length, length);
      if (!r.bytesRead) break;
      length += r.bytesRead;
    }
    const after = await handle.stat(),
      final = await lstat(target);
    if (
      length > TASK_STATE_MAX_BYTES ||
      after.size !== length ||
      after.ctimeMs !== opened.ctimeMs ||
      after.mtimeMs !== opened.mtimeMs ||
      final.dev !== opened.dev ||
      final.ino !== opened.ino ||
      final.nlink !== 1 ||
      final.ctimeMs !== after.ctimeMs ||
      final.mtimeMs !== after.mtimeMs
    )
      throw new Error("state drift");
    await verifyVerifierRoot(directory);
    return buffer.subarray(0, length);
  } catch (e) {
    if (missing(e)) return null;
    throw e;
  } finally {
    await handle?.close();
  }
}
async function writePrivate(directory: VerifierRoot, name: string, bytes: Buffer): Promise<void> {
  await verifyVerifierRoot(directory);
  if (bytes.length > TASK_STATE_MAX_BYTES) throw new Error("state bound");
  const handle = await open(
    path.join(directory.path, name),
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await verifyVerifierRoot(directory);
  await syncTaskDirectory(directory.path);
}
export type TaskProjectLockInfo = { token: string; pid: number; host: string };
function parseLock(bytes: Buffer | null): TaskProjectLockInfo | null {
  if (!bytes) return null;
  const parsed = decodeTaskJson(bytes);
  if (!parsed.success || !parsed.data || typeof parsed.data !== "object")
    throw new Error("lock corrupt");
  const v = parsed.data as Record<string, unknown>;
  if (
    Object.keys(v).sort().join(",") !== "host,pid,token" ||
    typeof v.token !== "string" ||
    !uuid(v.token) ||
    typeof v.pid !== "number" ||
    !Number.isSafeInteger(v.pid) ||
    v.pid < 1 ||
    typeof v.host !== "string" ||
    v.host !== hostname()
  )
    throw new Error("lock identity");
  return { token: v.token, pid: v.pid, host: v.host };
}
/** Read-only stale-lock inspection. Reclaim always needs its exact reviewed token and a confirmed dead local PID. */
export async function inspectTaskProjectLock(
  stateRoot: string,
  projectRoot: string,
): Promise<TaskParseResult<TaskProjectLockInfo | null>> {
  try {
    const base = await privateDirectory(stateRoot);
    await captureVerifierRoot(projectRoot);
    const project = path.join(base.path, taskByteHash(projectRoot).slice(7));
    try {
      return {
        success: true,
        data: parseLock(await readPrivate(await privateDirectory(project), "project.lock")),
      };
    } catch (e) {
      if (missing(e)) return { success: true, data: null };
      throw e;
    }
  } catch {
    return taskFailure("TASK_EXECUTION_LOCKED", "Project lock cannot be safely inspected.");
  }
}
const leaseAuthorities = new WeakMap<
  TaskRunLease,
  { directory: VerifierRoot; guard(): Promise<void> }
>();
export async function taskStageAuthority(
  lease: TaskRunLease,
  stagingId: string,
): Promise<{ file: string; directory: VerifierRoot }> {
  if (!uuid(stagingId)) throw new Error("stage identity");
  const authority = leaseAuthorities.get(lease);
  if (!authority) throw new Error("lease authority");
  await authority.guard();
  return {
    file: path.join(authority.directory.path, `${stagingId}.stage`),
    directory: authority.directory,
  };
}

/** Factory is read-only. Acquisition and all writes are invoked exclusively by the core executor. */
export async function createTaskStateAcquire(
  stateRoot: string,
  projectRoot: string,
): Promise<TaskParseResult<(recoverLockToken?: string) => Promise<TaskParseResult<TaskRunLease>>>> {
  try {
    const base = await privateDirectory(stateRoot),
      project = await captureVerifierRoot(projectRoot);
    if (
      base.dev !== project.dev ||
      stateRoot === projectRoot ||
      stateRoot.startsWith(`${projectRoot}/`) ||
      projectRoot.startsWith(`${stateRoot}/`)
    )
      throw new Error("state location");
    return {
      success: true,
      data: async (recoverToken) => {
        try {
          await verifyVerifierRoot(base);
          await privateDirectory(base.path);
          await verifyVerifierRoot(project);
          const directory = await ensurePrivateDirectory(base, taskByteHash(projectRoot).slice(7));
          const existing = parseLock(await readPrivate(directory, "project.lock"));
          if (existing) {
            if (recoverToken !== existing.token)
              return taskFailure(
                "TASK_EXECUTION_LOCKED",
                "Project is locked; inspect and review a stale local lock before reclaiming.",
              );
            let dead = false;
            try {
              process.kill(existing.pid, 0);
            } catch (e) {
              dead = e instanceof Error && "code" in e && e.code === "ESRCH";
            }
            if (!dead)
              return taskFailure(
                "TASK_EXECUTION_LOCKED",
                "Existing lease owner is active or its death cannot be established.",
              );
            const current = parseLock(await readPrivate(directory, "project.lock"));
            if (current?.token !== recoverToken) throw new Error("lock race");
            await unlink(path.join(directory.path, "project.lock"));
            await syncTaskDirectory(directory.path);
          } else if (recoverToken !== undefined) throw new Error("unmatched recovery");
          const lock = { token: randomUUID(), pid: process.pid, host: hostname() };
          await writePrivate(directory, "project.lock", Buffer.from(JSON.stringify(lock)));
          let active = true;
          const guard = async () => {
            if (!active) throw new Error("closed lease");
            await verifyVerifierRoot(base);
            await privateDirectory(base.path);
            await verifyVerifierRoot(project);
            await verifyVerifierRoot(directory);
            await privateDirectory(directory.path);
            if (parseLock(await readPrivate(directory, "project.lock"))?.token !== lock.token)
              throw new Error("lease changed");
          };
          const load = async (
            runId: string,
          ): Promise<TaskParseResult<TaskRunCheckpoint | null>> => {
            try {
              await guard();
              if (!uuid(runId)) throw new Error("run id");
              const bytes = await readPrivate(directory, `${runId}.json`);
              if (!bytes) return { success: true, data: null };
              const json = decodeTaskJson(bytes);
              if (!json.success)
                return taskFailure(
                  "TASK_RUN_STATE_INVALID",
                  "Durable state is corrupt or outside its bounds.",
                );
              const c = validateTaskRunCheckpoint(json.data);
              if (
                !c.success ||
                c.data.run.runId !== runId ||
                c.data.run.project.rootIdentity !== taskByteHash(projectRoot) ||
                taskContainsPrivateMaterial(c.data)
              )
                return taskFailure(
                  "TASK_RUN_STATE_INVALID",
                  "Durable state identities or privacy policy are invalid.",
                );
              return c;
            } catch {
              return taskFailure("TASK_RUN_STATE_INVALID", "Durable state cannot be safely read.");
            }
          };
          const lease: TaskRunLease = {
            load,
            save: async (value, expected) => {
              try {
                await guard();
                const valid = validateTaskRunCheckpoint(value);
                if (!valid.success || taskContainsPrivateMaterial(value))
                  throw new Error("state policy");
                const current = await load(value.run.runId);
                if (!current.success) return current;
                if (
                  (current.data?.run.stateRevision ?? null) !== expected ||
                  value.run.stateRevision !== (expected === null ? 1 : expected + 1)
                )
                  return taskFailure(
                    "TASK_STATE_CONFLICT",
                    "Compare-and-swap state revision changed.",
                  );
                const temp = `checkpoint-${randomUUID()}.tmp`;
                await writePrivate(directory, temp, Buffer.from(JSON.stringify(value)));
                await guard();
                const recheck = await load(value.run.runId);
                if (!recheck.success) return recheck;
                if ((recheck.data?.run.stateRevision ?? null) !== expected)
                  return taskFailure(
                    "TASK_STATE_CONFLICT",
                    "State changed before snapshot replacement.",
                  );
                await rename(
                  path.join(directory.path, temp),
                  path.join(directory.path, `${value.run.runId}.json`),
                );
                await syncTaskDirectory(directory.path);
                return { success: true, data: true };
              } catch {
                return taskFailure(
                  "TASK_STATE_WRITE_FAILED",
                  "Durable snapshot failed; retain project effects and reconcile before continuing.",
                );
              }
            },
            stage: async (id, text) => {
              try {
                await guard();
                if (!uuid(id)) throw new Error("stage");
                await writePrivate(directory, `${id}.stage`, Buffer.from(text));
                return { success: true, data: true };
              } catch {
                return taskFailure("TASK_STATE_WRITE_FAILED", "Private text staging failed.");
              }
            },
            inspectStage: async (id, hash) => {
              try {
                await guard();
                if (!uuid(id)) throw new Error("stage");
                const b = await readPrivate(directory, `${id}.stage`);
                if (b && taskByteHash(b) !== hash) throw new Error("stage drift");
                return { success: true, data: b ? "present" : "absent" };
              } catch {
                return taskFailure(
                  "TASK_NEEDS_REVIEW",
                  "Staged effect has uncertain identity or content.",
                );
              }
            },
            release: async () => {
              try {
                await guard();
                await unlink(path.join(directory.path, "project.lock"));
                await syncTaskDirectory(directory.path);
                active = false;
                return { success: true, data: true };
              } catch {
                active = false;
                return taskFailure(
                  "TASK_EXECUTION_LOCKED",
                  "Lease release failed; lock remains review-owned.",
                );
              }
            },
          };
          leaseAuthorities.set(lease, { directory, guard });
          return { success: true, data: lease };
        } catch {
          return taskFailure(
            "TASK_EXECUTION_LOCKED",
            "Private project lease could not be established.",
          );
        }
      },
    };
  } catch {
    return taskFailure(
      "TASK_PROFILE_UNSUPPORTED",
      "Task state requires an existing canonical owner-private directory outside the project on the same POSIX filesystem.",
    );
  }
}

/** Stage validation/install support; only the executor calls the enclosing install port. */
export async function installTaskStage(input: {
  lease: TaskRunLease;
  id: string;
  target: string;
  beforeHash: string | null;
  afterHash: string;
  checkTarget(): Promise<number>;
}): Promise<void> {
  const stage = await taskStageAuthority(input.lease, input.id);
  const before = await lstat(stage.file);
  if (
    !before.isFile() ||
    before.uid !== uid() ||
    before.nlink !== 1 ||
    (before.mode & 0o777) !== 0o600 ||
    before.size > 65536
  )
    throw new Error("stage type");
  // Retained body is transient, bounded and already screened before staging.
  const handle = await open(
    stage.file,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const info = await handle.stat();
    if (info.dev !== before.dev || info.ino !== before.ino) throw new Error("stage identity");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.length > 65536 ||
      taskByteHash(bytes) !== input.afterHash ||
      after.ctimeMs !== info.ctimeMs ||
      after.size !== info.size
    )
      throw new Error("stage content");
  } finally {
    await handle.close();
  }
  const mode = await input.checkTarget();
  await chmod(stage.file, mode);
  const handle2 = await open(stage.file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    await handle2.sync();
  } finally {
    await handle2.close();
  }
  await taskStageAuthority(input.lease, input.id);
  await input.checkTarget();
  if (input.beforeHash === null) {
    await link(stage.file, input.target);
    // If interrupted in this window, the known hardlink is retained and requires review.
    const target = await lstat(input.target);
    if (target.ino !== before.ino || target.dev !== before.dev)
      throw new Error("installed identity");
    await syncTaskDirectory(path.dirname(input.target));
    await unlink(stage.file);
  } else await rename(stage.file, input.target);
  await syncTaskDirectory(path.dirname(input.target));
  await syncTaskDirectory(stage.directory.path);
}
