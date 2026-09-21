import {
  getPackageManagerAdapter,
  type InstallationOperation,
  type PlanContext,
  type RunCommandOperation,
} from "@reposetup/core";

export function addPackages(
  context: PlanContext,
  packages: readonly string[],
  options: { description: string; dev?: boolean; exact?: boolean },
): InstallationOperation {
  const adapter = getPackageManagerAdapter(context.config.packageManager);
  if (adapter === undefined) {
    throw new Error(
      `Package manager "${context.config.packageManager}" is not supported for package installation.`,
    );
  }

  const result = adapter.add({
    packages: [...packages],
    cwd: context.projectRoot,
    description: options.description,
    ...(options.dev === true ? { dev: true } : {}),
    ...(options.exact === true ? { exact: true } : {}),
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.operation;
}

export function execLocalBin(
  context: PlanContext,
  bin: string,
  args: readonly string[],
  options: { description: string; requiresNetwork?: boolean },
): InstallationOperation {
  const packageManager = context.config.packageManager;
  if (packageManager !== "npm" && packageManager !== "pnpm") {
    throw new Error(
      `Package manager "${packageManager}" is not supported for local binary execution yet.`,
    );
  }

  const operation: RunCommandOperation =
    packageManager === "pnpm"
      ? {
          type: "run_command",
          command: "pnpm",
          args: ["exec", bin, ...args],
          cwd: context.projectRoot,
          description: options.description,
        }
      : {
          type: "run_command",
          command: "npx",
          args: [bin, ...args],
          cwd: context.projectRoot,
          description: options.description,
        };

  if (options.requiresNetwork === true) {
    operation.requiresNetwork = true;
  }

  return operation;
}

export function hasSelectedIntegration(context: PlanContext, id: string): boolean {
  return (
    context.config.framework.id === id ||
    context.config.integrations.some((integration) => integration.id === id)
  );
}
