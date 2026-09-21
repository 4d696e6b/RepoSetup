import path from "node:path";

import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { isSafeProjectRelativePath } from "../paths/project-path.js";

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
