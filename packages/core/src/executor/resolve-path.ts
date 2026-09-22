import path from "node:path";

import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { isSafeProjectRelativePath } from "../paths/project-path.js";
import type { ExecutorFileSystem } from "./types.js";

export function resolveInsideRoot(
  rootDir: string,
  relativePath: string,
): { ok: true; absolutePath: string } | { ok: false; error: RepoSetupError } {
  if (!isSafeProjectRelativePath(relativePath)) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "PLAN_INVALID",
        message: `Path "${relativePath}" is not a safe project-relative path.`,
        details: { path: relativePath },
        suggestion: "Use a path inside the project root without '..' or absolute segments.",
      }),
    };
  }

  const root = path.resolve(rootDir);
  const absolutePath = path.resolve(root, relativePath);
  const relative = path.relative(root, absolutePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "PLAN_INVALID",
        message: `Path "${relativePath}" would leave the project root.`,
        details: { path: relativePath, rootDir: root },
        suggestion: "Use a path inside the project root without '..' or absolute segments.",
      }),
    };
  }

  return { ok: true, absolutePath };
}

export async function assertRealPathInsideRoot(
  rootDir: string,
  absolutePath: string,
  fs: ExecutorFileSystem,
): Promise<{ ok: true } | { ok: false; error: RepoSetupError }> {
  try {
    const root = await fs.realpath(rootDir);
    const existingAncestor = await nearestExistingAncestor(absolutePath, fs);
    const resolvedAncestor = await fs.realpath(existingAncestor);
    const relative = path.relative(root, resolvedAncestor);

    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
      return { ok: true };
    }

    return escapedPathError(absolutePath, rootDir);
  } catch (error) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "FILE_MUTATION_FAILED",
        message: `Could not resolve the real path for "${absolutePath}".`,
        details: {
          path: absolutePath,
          reason: error instanceof Error ? error.message : "realpath failed",
        },
        suggestion: "Fix the project path and re-run the plan.",
      }),
    };
  }
}

export async function nearestExistingAncestor(
  pathToCheck: string,
  fs: ExecutorFileSystem,
): Promise<string> {
  let current = path.resolve(pathToCheck);
  while (!(await fs.exists(current))) {
    const parent = path.dirname(current);
    if (parent === current) {
      return current;
    }
    current = parent;
  }
  return current;
}

function escapedPathError(
  absolutePath: string,
  rootDir: string,
): {
  ok: false;
  error: RepoSetupError;
} {
  return {
    ok: false,
    error: createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Path "${absolutePath}" resolves outside the project root.`,
      details: { path: absolutePath, rootDir },
      suggestion: "Remove the escaping symlink or use a path inside the project root.",
    }),
  };
}
