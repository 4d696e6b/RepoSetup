import type { CreateFileOperation, PlanContext, RunCommandOperation } from "@reposetup/core";

export function createNodePackageJson(context: PlanContext): CreateFileOperation {
  const pkg = {
    name: context.config.project.name,
    version: "1.0.0",
    private: true,
    type: "module",
  };

  return {
    type: "create_file",
    path: "package.json",
    content: `${JSON.stringify(pkg, null, 2)}\n`,
    behavior: "fail_if_exists",
    description:
      "Create package.json (package manager init is interactive, so RepoSetup writes it)",
  };
}

export function pnpmOrNpmCreate(
  context: PlanContext,
  spec: { pnpmName: string; npmName: string },
  extraArgs: readonly string[],
  options: { description: string; longRunning?: boolean },
): RunCommandOperation {
  const directory = context.projectRoot;
  const operation: RunCommandOperation =
    context.config.packageManager === "pnpm"
      ? {
          type: "run_command",
          command: "pnpm",
          args: ["create", spec.pnpmName, directory, ...extraArgs],
          cwd: ".",
          description: options.description,
          requiresNetwork: true,
        }
      : {
          type: "run_command",
          command: "npm",
          args: ["create", spec.npmName, directory, "--", ...extraArgs],
          cwd: ".",
          description: options.description,
          requiresNetwork: true,
        };

  if (options.longRunning === true) {
    operation.longRunning = true;
  }

  return operation;
}

export function pnpmCreateOrNpmInit(
  context: PlanContext,
  spec: { pnpmName: string; npmInit: string },
  extraArgs: readonly string[],
  options: { description: string; longRunning?: boolean },
): RunCommandOperation {
  const directory = context.projectRoot;
  const operation: RunCommandOperation =
    context.config.packageManager === "pnpm"
      ? {
          type: "run_command",
          command: "pnpm",
          args: ["create", spec.pnpmName, directory, ...extraArgs],
          cwd: ".",
          description: options.description,
          requiresNetwork: true,
        }
      : {
          type: "run_command",
          command: "npm",
          args: ["init", spec.npmInit, directory, "--", ...extraArgs],
          cwd: ".",
          description: options.description,
          requiresNetwork: true,
        };

  if (options.longRunning === true) {
    operation.longRunning = true;
  }

  return operation;
}

export function dlx(
  context: PlanContext,
  pkg: string,
  args: readonly string[],
  options: { description: string },
): RunCommandOperation {
  return context.config.packageManager === "pnpm"
    ? {
        type: "run_command",
        command: "pnpm",
        args: ["dlx", pkg, ...args],
        cwd: context.projectRoot,
        description: options.description,
        requiresNetwork: true,
        longRunning: true,
      }
    : {
        type: "run_command",
        command: "npx",
        args: [pkg, ...args],
        cwd: context.projectRoot,
        description: options.description,
        requiresNetwork: true,
        longRunning: true,
      };
}

export function usesTypescript(context: PlanContext): boolean {
  const fromOptions = (context.options as { typescript?: boolean } | undefined)?.typescript;
  if (fromOptions !== undefined) {
    return fromOptions;
  }

  return context.config.framework.options?.typescript !== false;
}
