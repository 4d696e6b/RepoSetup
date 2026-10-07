import {
  createRepoSetupError,
  getPackageManagerAdapter,
  type InstallPackageOperation,
  type InstallationOperation,
  type PlanContext,
  type RunCommandOperation,
  UNSAFE_REMOVE_MESSAGE,
} from "@reposetup/core";

export function addPackages(
  context: PlanContext,
  packages: readonly string[],
  options: { description: string; dev?: boolean; exact?: boolean; allowBuild?: readonly string[] },
): InstallationOperation {
  const packageManager = context.config.packageManager;
  const adapter = getPackageManagerAdapter(packageManager);
  if (adapter === undefined) {
    throw new Error(
      `Package manager "${packageManager}" is not supported for package installation.`,
    );
  }

  const request = {
    packages: [...packages],
    cwd: context.projectRoot,
    description: options.description,
    ...(options.dev === true ? { dev: true as const } : {}),
    ...(options.exact === true ? { exact: true as const } : {}),
    ...(options.allowBuild === undefined ? {} : { allowBuild: [...options.allowBuild] }),
  };

  const result = adapter.add(request);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  const operation: InstallPackageOperation = {
    type: "install_package",
    packageManager,
    packages: [...packages],
    cwd: context.projectRoot,
    description: options.description,
    requiresNetwork: true,
  };
  if (options.dev === true) {
    operation.dev = true;
  }
  if (options.exact === true) {
    operation.exact = true;
  }
  if (options.allowBuild !== undefined) {
    operation.allowBuild = [...options.allowBuild];
  }
  return operation;
}

export function removePackages(
  context: PlanContext,
  packages: readonly string[],
  options: { description: string },
): InstallationOperation {
  const adapter = getPackageManagerAdapter(context.config.packageManager);
  if (adapter === undefined) {
    throw createRepoSetupError({
      code: "UNSUPPORTED_CONTEXT",
      message: UNSAFE_REMOVE_MESSAGE,
      details: { packageManager: context.config.packageManager },
      suggestion: "Use npm, pnpm, or uv. pip uninstall does not update requirements.txt.",
    });
  }

  const result = adapter.remove({
    packages: [...packages],
    cwd: context.projectRoot,
    description: options.description,
  });

  if (!result.ok) {
    throw result.error;
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

export function runPythonTool(
  context: PlanContext,
  bin: string,
  args: readonly string[],
  options: { description: string },
): RunCommandOperation {
  if (context.config.packageManager === "uv") {
    return {
      type: "run_command",
      command: "uv",
      args: ["run", bin, ...args],
      cwd: context.projectRoot,
      description: options.description,
    };
  }

  return {
    type: "run_command",
    command: bin,
    args: [...args],
    cwd: context.projectRoot,
    description: options.description,
  };
}

export function initPythonProject(context: PlanContext): InstallationOperation[] {
  if (context.config.packageManager === "uv") {
    return [
      {
        type: "run_command",
        command: "uv",
        args: ["init", ".", "--bare", "--name", context.config.project.name],
        cwd: context.projectRoot,
        description: "Create a minimal uv pyproject.toml",
      },
    ];
  }

  return [
    {
      type: "show_message",
      message:
        "Activate a Python virtual environment before using pip. RepoSetup will not create .venv or install Python.",
      description: "Explain that pip does not create a virtual environment",
    },
  ];
}

export function afterPythonPackageInstall(
  context: PlanContext,
  packageLabel: string,
): InstallationOperation[] {
  if (context.config.packageManager !== "pip") {
    return [];
  }

  return [
    {
      type: "show_message",
      message: `pip installed ${packageLabel} into the active environment only. Record it in requirements.txt yourself. RepoSetup will not rewrite pip requirement files.`,
      description: "Explain that pip does not update a lockfile",
    },
  ];
}

export function hasSelectedIntegration(context: PlanContext, id: string): boolean {
  return (
    context.config.framework.id === id ||
    context.config.integrations.some((integration) => integration.id === id)
  );
}
