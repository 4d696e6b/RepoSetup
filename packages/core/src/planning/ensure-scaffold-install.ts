import type { PackageManager } from "../config/types.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { InstallationOperation } from "../operations/types.js";
import { getPackageManagerAdapter } from "../package-managers/lookup.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

export type EnsureScaffoldInstallResult =
  { ok: true; operations: InstallationOperation[] } | { ok: false; error: RepoSetupError };

/**
 * Generators that use `--skip-install` write a package.json without installing.
 * If a later install_package in the same soft segment will run, that command
 * installs scaffold deps too. Otherwise insert a project install so solo
 * scaffolds still get node_modules.
 */
export function ensureScaffoldDependencyInstall(
  operations: readonly InstallationOperation[],
  packageManager: PackageManager,
  projectRoot: ProjectRelativePath,
): EnsureScaffoldInstallResult {
  const output: InstallationOperation[] = [];

  for (const [index, operation] of operations.entries()) {
    output.push(operation);

    if (operation.type !== "run_command" || !operation.args.includes("--skip-install")) {
      continue;
    }

    if (segmentHasInstallPackage(operations, index + 1)) {
      continue;
    }

    const adapter = getPackageManagerAdapter(packageManager);
    if (adapter === undefined) {
      return {
        ok: false,
        error: createRepoSetupError({
          code: "UNSUPPORTED_CONTEXT",
          message: `Package manager "${packageManager}" cannot install scaffold dependencies.`,
          details: { packageManager },
          suggestion: "Use npm or pnpm for Next.js scaffolds that skip the generator install.",
        }),
      };
    }

    const installed = adapter.install({
      cwd: projectRoot,
      description: "Install scaffold dependencies skipped by the generator",
    });
    if (!installed.ok) {
      return { ok: false, error: installed.error };
    }

    output.push(installed.operation);
  }

  return { ok: true, operations: output };
}

function segmentHasInstallPackage(
  operations: readonly InstallationOperation[],
  start: number,
): boolean {
  for (let index = start; index < operations.length; index += 1) {
    const operation = operations[index];
    if (operation === undefined) {
      return false;
    }
    if (operation.type === "run_command" || operation.type === "verify") {
      return false;
    }
    if (operation.type === "install_package") {
      return true;
    }
  }
  return false;
}
