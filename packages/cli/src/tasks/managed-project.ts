import { lstat } from "node:fs/promises";
import path from "node:path";
import * as z from "zod";
import { decodeTaskJson, taskFailure, type TaskParseResult } from "@reposetup/core";
import { captureVerifierRoot, readVerifierFile } from "./verifier-read.js";

/** Profile metadata is read-only; no package scripts or dependency installs are run. */
export async function validateManagedTaskProject(
  root: string,
  writePaths: readonly string[],
): Promise<TaskParseResult<true>> {
  try {
    const captured = await captureVerifierRoot(root);
    const pkg = await readVerifierFile(captured, "package.json", 65536, true);
    const json = decodeTaskJson(pkg.bytes);
    if (!json.success) return json;
    const metadata = z
      .object({ workspaces: z.never().optional(), packageManager: z.string().optional() })
      .passthrough()
      .safeParse(json.data);
    if (!metadata.success) throw new Error("single package");
    const exists = async (name: string) => {
      try {
        await lstat(path.join(root, name));
        return true;
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
          return false;
        throw error;
      }
    };
    const locks = [];
    for (const file of ["package-lock.json", "pnpm-lock.yaml"])
      if (await exists(file)) locks.push(file);
    if (locks.length !== 1) throw new Error("one lockfile");
    for (const file of [
      "pnpm-workspace.yaml",
      "yarn.lock",
      "bun.lock",
      "bun.lockb",
      "npm-shrinkwrap.json",
    ])
      if (await exists(file)) throw new Error("unsupported metadata");
    if (
      metadata.data.packageManager &&
      !new RegExp(`^${locks[0] === "pnpm-lock.yaml" ? "pnpm" : "npm"}@[0-9]`).test(
        metadata.data.packageManager,
      )
    )
      throw new Error("package manager");
    if (
      !(await lstat(path.join(root, "node_modules"))).isDirectory() &&
      !(await lstat(path.join(root, "node_modules"))).isSymbolicLink()
    )
      throw new Error("preinstalled dependencies");
    if (writePaths.some((p) => !/\.(?:ts|js|mjs|cjs|md|txt)$/.test(p)))
      throw new Error("unsupported coding output");
    return { success: true, data: true };
  } catch {
    return taskFailure(
      "TASK_PROFILE_UNSUPPORTED",
      "Managed coding requires a single TypeScript/Node package, one npm/pnpm lockfile, preinstalled dependencies and reviewed .ts/.js/.mjs/.cjs/.md/.txt outputs; use portable handoff for other profiles.",
    );
  }
}
