import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { isSafeProjectRelativePath, type ProjectRelativePath } from "../paths/project-path.js";

export function validateCwd(cwd: string): RepoSetupError | undefined {
  if (!isSafeProjectRelativePath(cwd)) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Package manager cwd "${cwd}" is not a safe project-relative path.`,
      details: { cwd },
      suggestion: "Use a path inside the project root without '..' or absolute segments.",
    });
  }

  return undefined;
}

export function validatePackageSpecs(packages: readonly string[]): RepoSetupError | undefined {
  if (packages.length === 0) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: "At least one package spec is required.",
      suggestion: "Pass package names as separate argument-array entries.",
    });
  }

  for (const spec of packages) {
    if (!isSafePackageSpec(spec)) {
      return createRepoSetupError({
        code: "PLAN_INVALID",
        message: `Package spec "${spec}" is not a safe command argument.`,
        details: { spec },
        suggestion: "Pass a non-empty spec that does not start with '-' or contain NUL/newlines.",
      });
    }
  }

  return undefined;
}

export function validateRequirementsFile(
  requirementsFile: string | undefined,
): { ok: true; path: ProjectRelativePath } | { ok: false; error: RepoSetupError } {
  if (requirementsFile === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "PLAN_INVALID",
        message: "pip install from a lockfile/manifest requires a requirements file path.",
        suggestion: "Pass a project-relative requirements file such as requirements.txt.",
      }),
    };
  }

  if (!isSafeProjectRelativePath(requirementsFile)) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "PLAN_INVALID",
        message: `Requirements file "${requirementsFile}" is not a safe project-relative path.`,
        details: { requirementsFile },
        suggestion: "Use a path inside the project root without '..' or absolute segments.",
      }),
    };
  }

  return { ok: true, path: requirementsFile };
}

export function isSafePackageSpec(spec: string): boolean {
  if (spec.length === 0 || spec.trim() !== spec) {
    return false;
  }

  if (spec.startsWith("-") || spec.includes("\0") || spec.includes("\n") || spec.includes("\r")) {
    return false;
  }

  return true;
}
