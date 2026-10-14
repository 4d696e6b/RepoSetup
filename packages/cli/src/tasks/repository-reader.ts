import { constants } from "node:fs";
import { lstat, open, opendir, realpath, type FileHandle } from "node:fs/promises";
import path from "node:path";
import {
  TASK_CONTEXT_LIMITS,
  taskByteHash,
  decodeTaskText,
  hasTaskSecretMaterial,
  isSafeTaskPath,
  isTaskPathExcluded,
  taskSelectorContains,
  taskFailure,
  taskScopeSchema,
  type TaskRepositoryReader,
  type TaskRepositoryInventory,
  type TaskSelector,
  type TaskParseResult,
} from "@reposetup/core";

type Authority = { read: TaskSelector[]; deny: TaskSelector[] };
function allowed(authority: Authority, target: string): boolean {
  return (
    !isTaskPathExcluded(target, "read") &&
    !authority.deny.some((selector) => taskSelectorContains(selector, target)) &&
    authority.read.some((selector) => taskSelectorContains(selector, target))
  );
}
function missing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
const within = (root: string, target: string) =>
  target === root || target.startsWith(`${root}${path.sep}`);

/** Read-only adapter; no project writes, Git subprocesses, config/module loading or provider access. */
export async function createTaskRepositoryReader(
  projectRoot: string,
  authorityInput: Authority,
): Promise<TaskParseResult<TaskRepositoryReader & { rootIdentity: string }>> {
  try {
    const validatedAuthority = taskScopeSchema
      .pick({ read: true, deny: true })
      .safeParse(authorityInput);
    if (!validatedAuthority.success)
      return taskFailure(
        "TASK_SCOPE_INVALID",
        "Reader authority must match the strict scope contract.",
      );
    const authority = validatedAuthority.data;
    if (!["darwin", "linux"].includes(process.platform) || typeof constants.O_NOFOLLOW !== "number")
      return taskFailure(
        "TASK_PROFILE_UNSUPPORTED",
        "Task context requires the reviewed POSIX read profile.",
      );
    const root = await realpath(projectRoot);
    const rootInfo = await lstat(root);
    if (
      !rootInfo.isDirectory() ||
      authority.read.some((selector) => !isSafeTaskPath(selector.path)) ||
      authority.deny.some((selector) => !isSafeTaskPath(selector.path))
    )
      return taskFailure("TASK_SCOPE_INVALID", "Repository root or reader authority is invalid.");
    const rootIdentity = taskByteHash(root);
    const verifyRoot = async () => {
      const info = await lstat(root);
      if (
        !info.isDirectory() ||
        info.isSymbolicLink() ||
        info.dev !== rootInfo.dev ||
        info.ino !== rootInfo.ino ||
        (await realpath(root)) !== root
      )
        throw new Error("root changed");
    };
    const resolve = async (relative: string): Promise<string | null> => {
      if (!isSafeTaskPath(relative)) throw new Error("path");
      await verifyRoot();
      let current = root;
      const segments = relative.split("/");
      if (segments.length > TASK_CONTEXT_LIMITS.maxInventoryDepth)
        throw new RangeError("path depth");
      for (let index = 0; index < segments.length; index++) {
        current = path.join(current, segments[index]!);
        let info;
        try {
          info = await lstat(current);
        } catch (error) {
          if (missing(error)) return null;
          throw error;
        }
        if (
          info.isSymbolicLink() ||
          (!info.isFile() && !info.isDirectory()) ||
          (index < segments.length - 1 && !info.isDirectory())
        )
          throw new Error("unsafe component");
        const resolved = await realpath(current);
        if (!within(root, resolved) || resolved !== current) throw new Error("alias or escape");
      }
      return current;
    };
    const read = async (
      relative: string,
    ): Promise<TaskParseResult<{ fileHash: string; text: string } | null>> => {
      if (!allowed(authority, relative))
        return taskFailure(
          "TASK_SCOPE_VIOLATION",
          "Source is outside reader authority or excluded.",
        );
      let handle: FileHandle | undefined;
      try {
        const target = await resolve(relative);
        if (target === null) return { success: true, data: null };
        const before = await lstat(target);
        if (!before.isFile() || before.nlink !== 1)
          return taskFailure(
            "TASK_SCOPE_VIOLATION",
            "Task sources must be unaliased regular files.",
          );
        if (before.size > TASK_CONTEXT_LIMITS.maxFileBytes)
          return taskFailure(
            "TASK_CONTEXT_LIMIT_EXCEEDED",
            "Task source exceeds its file byte bound.",
          );
        handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
        const opened = await handle.stat();
        if (
          !opened.isFile() ||
          opened.nlink !== 1 ||
          opened.dev !== before.dev ||
          opened.ino !== before.ino ||
          opened.size !== before.size
        )
          return taskFailure("TASK_CONTEXT_STALE", "Source identity changed before reading.");
        const buffer = Buffer.alloc(TASK_CONTEXT_LIMITS.maxFileBytes + 1);
        let length = 0;
        while (length < buffer.length) {
          const result = await handle.read(buffer, length, buffer.length - length, length);
          if (result.bytesRead === 0) break;
          length += result.bytesRead;
        }
        if (length > TASK_CONTEXT_LIMITS.maxFileBytes)
          return taskFailure(
            "TASK_CONTEXT_LIMIT_EXCEEDED",
            "Task source grew beyond its byte bound.",
          );
        const after = await handle.stat();
        const current = await resolve(relative);
        const final = current === null ? null : await lstat(current);
        if (
          after.size !== length ||
          after.mtimeMs !== opened.mtimeMs ||
          after.ctimeMs !== opened.ctimeMs ||
          final === null ||
          final.dev !== opened.dev ||
          final.ino !== opened.ino ||
          final.nlink !== 1 ||
          final.size !== after.size ||
          final.mtimeMs !== after.mtimeMs ||
          final.ctimeMs !== after.ctimeMs
        )
          return taskFailure("TASK_CONTEXT_STALE", "Source changed while it was being read.");
        const bytes = buffer.subarray(0, length);
        const text = decodeTaskText(bytes);
        if (hasTaskSecretMaterial(text))
          return taskFailure("TASK_SCOPE_VIOLATION", "Task source failed privacy screening.");
        return { success: true, data: { fileHash: taskByteHash(bytes), text } };
      } catch {
        return taskFailure(
          "TASK_SCOPE_VIOLATION",
          "Task source cannot be read as safe bounded UTF-8 text.",
        );
      } finally {
        await handle?.close();
      }
    };
    const inventory = async (
      scopeInput: Authority,
    ): Promise<TaskParseResult<TaskRepositoryInventory>> => {
      try {
        const validatedScope = taskScopeSchema
          .pick({ read: true, deny: true })
          .safeParse(scopeInput);
        if (!validatedScope.success)
          return taskFailure(
            "TASK_SCOPE_INVALID",
            "Inventory scope must match the strict contract.",
          );
        const scope = validatedScope.data;
        await verifyRoot();
        if (
          scope.read.some(
            (selector) =>
              !isSafeTaskPath(selector.path) ||
              !authority.read.some(
                (outer) =>
                  taskSelectorContains(outer, selector.path) &&
                  (selector.type === "file" || outer.type === "subtree"),
              ),
          )
        )
          return taskFailure("TASK_SCOPE_VIOLATION", "Inventory scope exceeds reader authority.");
        const entries = new Map<string, TaskRepositoryInventory["entries"][number]>();
        const aliases = new Map<string, string>();
        let visited = 0;
        const add = (relative: string, type: "file" | "directory", byteLength: number) => {
          const alias = relative.normalize("NFC").toLowerCase();
          if (aliases.has(alias) && aliases.get(alias) !== relative) throw new Error("case alias");
          aliases.set(alias, relative);
          entries.set(relative, { path: relative, type, byteLength });
          if (entries.size > TASK_CONTEXT_LIMITS.maxInventoryEntries)
            throw new RangeError("inventory");
        };
        const walk = async (relative: string, depth: number): Promise<void> => {
          if (
            ++visited > TASK_CONTEXT_LIMITS.maxInventoryEntries ||
            depth > TASK_CONTEXT_LIMITS.maxInventoryDepth
          )
            throw new RangeError("inventory");
          if (!allowed(authority, relative) || !allowed(scope, relative)) return;
          const target = await resolve(relative);
          if (target === null) return;
          const info = await lstat(target);
          if (info.isFile()) {
            if (info.nlink !== 1) throw new Error("hardlink");
            add(relative, "file", info.size);
            return;
          }
          add(relative, "directory", 0);
          const directory = await opendir(target);
          for await (const child of directory) {
            if (++visited > TASK_CONTEXT_LIMITS.maxInventoryEntries)
              throw new RangeError("inventory");
            const childPath = `${relative}/${child.name}`;
            if (!isSafeTaskPath(childPath)) throw new Error("ambiguous inventory path");
            if (
              isTaskPathExcluded(childPath, "read") ||
              scope.deny.some((selector) => taskSelectorContains(selector, childPath)) ||
              authority.deny.some((selector) => taskSelectorContains(selector, childPath))
            )
              continue;
            await walk(childPath, depth + 1);
          }
          if ((await resolve(relative)) !== target) throw new Error("directory changed");
        };
        for (const selector of scope.read) {
          if (selector.type === "file") {
            const target =
              allowed(scope, selector.path) && allowed(authority, selector.path)
                ? await resolve(selector.path)
                : null;
            if (target !== null) {
              const info = await lstat(target);
              if (!info.isFile() || info.nlink !== 1) throw new Error("file selector");
              add(selector.path, "file", info.size);
            }
          } else await walk(selector.path, 0);
          // Ancestor rules are metadata-only even outside read scope. Required bodies must still be authorized.
          let parent =
            selector.type === "subtree" ? selector.path : path.posix.dirname(selector.path);
          while (true) {
            const rule = parent === "." ? "AGENTS.md" : `${parent}/AGENTS.md`;
            const target = await resolve(rule);
            if (target !== null) {
              const info = await lstat(target);
              if (!info.isFile() || info.nlink !== 1) throw new Error("rule alias");
              add(rule, "file", info.size);
            }
            if (parent === ".") break;
            parent = path.posix.dirname(parent);
          }
        }
        await verifyRoot();
        return {
          success: true,
          data: {
            rootIdentity,
            entries: [...entries.values()].sort((a, b) =>
              a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
            ),
          },
        };
      } catch (error) {
        return taskFailure(
          error instanceof RangeError ? "TASK_CONTEXT_LIMIT_EXCEEDED" : "TASK_SCOPE_VIOLATION",
          "Task inventory is unsafe, unavailable or exceeds its bounds.",
        );
      }
    };
    return { success: true, data: { rootIdentity, inventory, read } };
  } catch {
    return taskFailure("TASK_CONTEXT_UNRESOLVED", "Canonical repository root is unavailable.");
  }
}
