import { hasPackageDependency } from "../detection/package-json.js";
import { pythonDistributionName, textDeclaresPythonPackage } from "../detection/python-package.js";
import { existingEnvKeys } from "../executor/env-example.js";
import { parseJsonObject } from "../executor/json.js";
import type { DetectionFileSystem, PackageJsonSummary } from "../integrations/definition.js";
import type { InstallationOperation } from "../operations/types.js";

import {
  isPackageAddCommand,
  packageNameFromSpec,
  packageSpecsFromAddArgs,
} from "./package-spec.js";

export async function filterSatisfiedOperations(
  operations: readonly InstallationOperation[],
  files: DetectionFileSystem,
  packageJson: PackageJsonSummary | undefined,
): Promise<InstallationOperation[]> {
  const remaining: InstallationOperation[] = [];

  for (const operation of operations) {
    if (await isOperationSatisfied(operation, files, packageJson)) {
      continue;
    }

    remaining.push(operation);
  }

  return remaining;
}

export async function isOperationSatisfied(
  operation: InstallationOperation,
  files: DetectionFileSystem,
  packageJson: PackageJsonSummary | undefined,
): Promise<boolean> {
  switch (operation.type) {
    case "check_prerequisite":
      return false;
    case "show_message":
      return true;
    case "install_package":
      return packagesAlreadyPresent(operation.packages, packageJson);
    case "run_command":
      return isRunCommandSatisfied(operation.command, operation.args, files, packageJson);
    case "create_directory":
    case "create_file":
      return files.exists(operation.path);
    case "modify_json":
      return jsonMergeAlreadyPresent(operation.path, operation.merge, files);
    case "modify_text":
      return textAlreadyApplied(operation.path, operation.newText, files);
    case "add_env_example":
      return envKeysAlreadyPresent(operation.path, operation.entries, files);
    case "verify":
      return false;
    default: {
      const exhaustive: never = operation;
      return exhaustive;
    }
  }
}

function packagesAlreadyPresent(
  specs: readonly string[],
  packageJson: PackageJsonSummary | undefined,
): boolean {
  if (packageJson === undefined || specs.length === 0) {
    return false;
  }

  return specs.every((spec) => hasPackageDependency(packageJson, packageNameFromSpec(spec)));
}

async function pythonPackagesAlreadyPresent(
  specs: readonly string[],
  files: DetectionFileSystem,
): Promise<boolean> {
  if (specs.length === 0) {
    return false;
  }

  const pyproject = await files.readText("pyproject.toml");
  const requirements = await files.readText("requirements.txt");
  const text = `${pyproject ?? ""}\n${requirements ?? ""}`;
  return specs.every((spec) => textDeclaresPythonPackage(text, pythonDistributionName(spec)));
}

async function isRunCommandSatisfied(
  command: string,
  args: readonly string[],
  files: DetectionFileSystem,
  packageJson: PackageJsonSummary | undefined,
): Promise<boolean> {
  if (isPackageAddCommand(command, args)) {
    const specs =
      command === "python"
        ? args.slice(3).filter((arg) => !arg.startsWith("-"))
        : packageSpecsFromAddArgs(args);
    if (await pythonPackagesAlreadyPresent(specs, files)) {
      return true;
    }
    return packagesAlreadyPresent(specs, packageJson);
  }

  if (command === "uv" && args.includes("init")) {
    return files.exists("pyproject.toml");
  }

  if (args.includes("alembic") && args.includes("init")) {
    return files.exists("alembic.ini");
  }

  if (args.includes("init") && args.includes("prisma")) {
    return files.exists("prisma/schema.prisma");
  }

  if (args.includes("generate") && args.includes("prisma")) {
    return files.exists("generated/prisma");
  }

  if (args.includes("vitest") && args.includes("run")) {
    return (
      (await files.exists("vitest.config.mts")) ||
      (await files.exists("vitest.config.ts")) ||
      (await files.exists("vitest.config.js")) ||
      (await files.exists("vitest.config.mjs"))
    );
  }

  return false;
}

async function jsonMergeAlreadyPresent(
  relativePath: string,
  merge: Record<string, unknown>,
  files: DetectionFileSystem,
): Promise<boolean> {
  const text = await files.readText(relativePath);
  if (text === undefined) {
    return false;
  }

  const parsed = parseJsonObject(text, relativePath);
  if (!parsed.ok) {
    return false;
  }

  return jsonLeavesExist(parsed.value, merge);
}

function jsonLeavesExist(current: unknown, patch: unknown): boolean {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return current !== undefined;
  }

  if (typeof current !== "object" || current === null || Array.isArray(current)) {
    return false;
  }

  const currentRecord = current as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (!Object.hasOwn(currentRecord, key)) {
      return false;
    }
    if (!jsonLeavesExist(currentRecord[key], value)) {
      return false;
    }
  }

  return true;
}

async function textAlreadyApplied(
  relativePath: string,
  newText: string,
  files: DetectionFileSystem,
): Promise<boolean> {
  const text = await files.readText(relativePath);
  return text !== undefined && text.includes(newText);
}

async function envKeysAlreadyPresent(
  relativePath: string,
  entries: readonly { key: string }[],
  files: DetectionFileSystem,
): Promise<boolean> {
  const text = await files.readText(relativePath);
  if (text === undefined) {
    return false;
  }

  const keys = existingEnvKeys(text);
  return entries.every((entry) => keys.has(entry.key));
}
