import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type {
  InstallPackageOperation,
  InstallationOperation,
  ModifyJsonOperation,
} from "../operations/types.js";
import { getPackageManagerAdapter } from "../package-managers/lookup.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

import { packageNameFromSpec } from "./package-spec.js";

export type ConsolidateManifestResult =
  { ok: true; operations: InstallationOperation[] } | { ok: false; error: RepoSetupError };

/**
 * Within soft segments, replace two or more npm/pnpm install_package ops with
 * one package.json merge plus one project install. Keeps dependency groups and
 * allowBuild policy without separate add subprocesses.
 */
export function consolidateManifestInstalls(
  operations: readonly InstallationOperation[],
): ConsolidateManifestResult {
  const output: InstallationOperation[] = [];
  let index = 0;

  while (index < operations.length) {
    const current = operations[index];
    if (current === undefined) {
      break;
    }

    if (isBarrier(current)) {
      output.push(current);
      index += 1;
      continue;
    }

    const segment: InstallationOperation[] = [];
    while (index < operations.length) {
      const operation = operations[index];
      if (operation === undefined || isBarrier(operation)) {
        break;
      }
      segment.push(operation);
      index += 1;
    }

    const consolidated = consolidateSegment(segment);
    if (!consolidated.ok) {
      return consolidated;
    }
    output.push(...consolidated.operations);
  }

  return { ok: true, operations: output };
}

function isBarrier(operation: InstallationOperation): boolean {
  return operation.type === "run_command" || operation.type === "verify";
}

function consolidateSegment(segment: readonly InstallationOperation[]): ConsolidateManifestResult {
  const installs = segment.filter(
    (operation): operation is InstallPackageOperation => operation.type === "install_package",
  );

  if (installs.length < 2) {
    return { ok: true, operations: [...segment] };
  }

  const packageManager = installs[0]?.packageManager;
  const cwd = installs[0]?.cwd;
  if (packageManager === undefined || cwd === undefined) {
    return { ok: true, operations: [...segment] };
  }

  if (packageManager !== "npm" && packageManager !== "pnpm") {
    return { ok: true, operations: [...segment] };
  }

  if (
    installs.some((install) => install.packageManager !== packageManager || install.cwd !== cwd)
  ) {
    return { ok: true, operations: [...segment] };
  }

  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const allowBuild = new Set<string>();

  for (const install of installs) {
    const target = install.dev === true ? devDependencies : dependencies;
    for (const spec of install.packages) {
      const entry = packageJsonEntry(spec);
      if (entry === undefined) {
        return { ok: true, operations: [...segment] };
      }
      const existing = target[entry.name];
      if (existing !== undefined && existing !== entry.version) {
        return {
          ok: false,
          error: createRepoSetupError({
            code: "PLAN_INVALID",
            message: `Conflicting versions for "${entry.name}" while assembling package.json: "${existing}" and "${entry.version}".`,
            details: { packageName: entry.name, left: existing, right: entry.version },
            suggestion: "Use one version per package name within a create plan segment.",
          }),
        };
      }
      target[entry.name] = entry.version;
    }
    for (const name of install.allowBuild ?? []) {
      allowBuild.add(name);
    }
  }

  const merge: Record<string, unknown> = {};
  if (Object.keys(dependencies).length > 0) {
    merge.dependencies = dependencies;
  }
  if (Object.keys(devDependencies).length > 0) {
    merge.devDependencies = devDependencies;
  }

  const packageJsonPath = packageJsonPathFor(cwd);
  const manifest: ModifyJsonOperation = {
    type: "modify_json",
    path: packageJsonPath,
    merge,
    behavior: "merge",
    description: "Assemble package.json dependencies before a consolidated install",
  };

  const adapter = getPackageManagerAdapter(packageManager);
  if (adapter === undefined) {
    return { ok: true, operations: [...segment] };
  }

  const installed = adapter.install({
    cwd,
    description: "Install assembled package.json dependencies",
    preferOffline: true,
    ...(packageManager === "pnpm" && allowBuild.size > 0 ? { allowBuild: [...allowBuild] } : {}),
  });
  if (!installed.ok) {
    return { ok: false, error: installed.error };
  }

  const rebuilt: InstallationOperation[] = [];
  let insertedManifest = false;
  const pnpmBuildConfiguration =
    packageManager === "pnpm" && allowBuild.size > 0
      ? {
          type: "create_file" as const,
          path: pnpmWorkspacePathFor(cwd),
          content: `allowBuilds:\n${[...allowBuild]
            .sort()
            .map((name) => `  ${JSON.stringify(name)}: true`)
            .join("\n")}\n`,
          behavior: "create_if_missing" as const,
          description: "Allow approved pnpm dependency build scripts",
        }
      : undefined;
  for (const operation of segment) {
    if (operation.type === "install_package") {
      if (!insertedManifest) {
        rebuilt.push(manifest);
        if (pnpmBuildConfiguration !== undefined) {
          rebuilt.push(pnpmBuildConfiguration);
        }
        insertedManifest = true;
      }
      continue;
    }
    rebuilt.push(operation);
  }
  rebuilt.push(installed.operation);
  return { ok: true, operations: rebuilt };
}

function packageJsonEntry(spec: string): { name: string; version: string } | undefined {
  const name = packageNameFromSpec(spec);
  if (!spec.startsWith(name)) {
    return undefined;
  }
  if (spec.length === name.length) {
    return undefined;
  }
  if (spec[name.length] !== "@") {
    return undefined;
  }
  const version = spec.slice(name.length + 1);
  if (version.length === 0 || version.includes("@")) {
    return undefined;
  }
  return { name, version };
}

function pnpmWorkspacePathFor(cwd: ProjectRelativePath): ProjectRelativePath {
  if (cwd === "." || cwd === "") {
    return "pnpm-workspace.yaml";
  }
  return `${cwd}/pnpm-workspace.yaml`;
}

function packageJsonPathFor(cwd: ProjectRelativePath): ProjectRelativePath {
  if (cwd === "." || cwd === "") {
    return "package.json";
  }
  return `${cwd}/package.json`;
}

export function isProjectInstallCommand(operation: {
  type: string;
  command?: string;
  args?: string[];
}): boolean {
  if (
    operation.type !== "run_command" ||
    operation.command === undefined ||
    operation.args === undefined
  ) {
    return false;
  }
  if (operation.command === "pnpm" && operation.args[0] === "install") {
    return true;
  }
  if (operation.command === "npm" && operation.args[0] === "install") {
    return operation.args.slice(1).every((arg) => arg.startsWith("-"));
  }
  if (operation.command === "npm" && operation.args[0] === "ci") {
    return true;
  }
  return false;
}
