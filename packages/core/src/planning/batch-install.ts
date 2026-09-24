import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { InstallPackageOperation, InstallationOperation } from "../operations/types.js";

import { packageNameFromSpec } from "./package-spec.js";

export type BatchInstallResult =
  { ok: true; operations: InstallationOperation[] } | { ok: false; error: RepoSetupError };

/**
 * Merge compatible install_package ops within barrier segments.
 * Barriers are run_command and verify — generators, migrations, codegen, and checks
 * that must see dependencies already installed stay in place.
 */
export function batchInstallPackages(
  operations: readonly InstallationOperation[],
): BatchInstallResult {
  const output: InstallationOperation[] = [];
  let index = 0;

  while (index < operations.length) {
    const current = operations[index];
    if (current === undefined) {
      break;
    }

    if (isInstallBarrier(current)) {
      output.push(current);
      index += 1;
      continue;
    }

    const segment: InstallationOperation[] = [];
    while (index < operations.length) {
      const operation = operations[index];
      if (operation === undefined || isInstallBarrier(operation)) {
        break;
      }
      segment.push(operation);
      index += 1;
    }

    const batched = batchSegment(segment);
    if (!batched.ok) {
      return batched;
    }
    output.push(...batched.operations);
  }

  return { ok: true, operations: output };
}

function isInstallBarrier(operation: InstallationOperation): boolean {
  return operation.type === "run_command" || operation.type === "verify";
}

function batchSegment(segment: readonly InstallationOperation[]): BatchInstallResult {
  type Group = {
    operation: InstallPackageOperation;
    specsByName: Map<string, string>;
    allowBuild: Set<string>;
    sourceCount: number;
    firstDescription: string;
  };

  const groups = new Map<string, Group>();
  const firstIndexByKey = new Map<string, number>();
  const keyByIndex = new Map<number, string>();

  for (const [index, operation] of segment.entries()) {
    if (operation.type !== "install_package") {
      continue;
    }

    const key = installPolicyKey(operation);
    let group = groups.get(key);
    if (group === undefined) {
      group = {
        operation: {
          type: "install_package",
          packageManager: operation.packageManager,
          packages: [],
          cwd: operation.cwd,
          description: operation.description,
          requiresNetwork: true,
          ...(operation.dev === true ? { dev: true } : {}),
          ...(operation.exact === true ? { exact: true } : {}),
        },
        specsByName: new Map(),
        allowBuild: new Set(),
        sourceCount: 0,
        firstDescription: operation.description,
      };
      groups.set(key, group);
      firstIndexByKey.set(key, index);
    }

    group.sourceCount += 1;

    for (const spec of operation.packages) {
      const name = packageNameFromSpec(spec);
      const existing = group.specsByName.get(name);
      if (existing !== undefined && existing !== spec) {
        return {
          ok: false,
          error: createRepoSetupError({
            code: "PLAN_INVALID",
            message: `Conflicting version specs for package "${name}": "${existing}" and "${spec}".`,
            details: {
              packageName: name,
              left: existing,
              right: spec,
              packageManager: operation.packageManager,
              cwd: operation.cwd,
            },
            suggestion:
              "Use one version for each package name within the same install policy, or separate installs with a generator/codegen barrier.",
          }),
        };
      }
      if (existing === undefined) {
        group.specsByName.set(name, spec);
        group.operation.packages.push(spec);
      }
    }

    for (const name of operation.allowBuild ?? []) {
      group.allowBuild.add(name);
    }

    keyByIndex.set(index, key);
  }

  for (const group of groups.values()) {
    if (group.allowBuild.size > 0) {
      group.operation.allowBuild = [...group.allowBuild];
    }
    group.operation.description =
      group.sourceCount === 1
        ? group.firstDescription
        : `Install ${group.operation.packages.join(", ")}`;
  }

  const emitted = new Set<string>();
  const output: InstallationOperation[] = [];

  for (const [index, operation] of segment.entries()) {
    if (operation.type !== "install_package") {
      output.push(operation);
      continue;
    }

    const key = keyByIndex.get(index);
    if (key === undefined || emitted.has(key)) {
      continue;
    }
    if (firstIndexByKey.get(key) !== index) {
      continue;
    }

    const group = groups.get(key);
    if (group === undefined) {
      continue;
    }
    emitted.add(key);
    output.push(group.operation);
  }

  return { ok: true, operations: output };
}

function installPolicyKey(operation: InstallPackageOperation): string {
  return [
    operation.packageManager,
    operation.cwd,
    operation.dev === true ? "dev" : "prod",
    operation.exact === true ? "exact" : "range",
  ].join("\0");
}
