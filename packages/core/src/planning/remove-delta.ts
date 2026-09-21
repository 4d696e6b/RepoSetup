import { hasPackageDependency } from "../detection/package-json.js";
import { pythonDistributionName, textDeclaresPythonPackage } from "../detection/python-package.js";
import type { DetectionFileSystem, PackageJsonSummary } from "../integrations/definition.js";
import type { InstallationOperation, RunCommandOperation } from "../operations/types.js";

import {
  isPackageRemoveCommand,
  packageNameFromSpec,
  packageSpecsFromRemoveArgs,
} from "./package-spec.js";

export async function filterRemoveOperations(
  operations: readonly InstallationOperation[],
  files: DetectionFileSystem,
  packageJson: PackageJsonSummary | undefined,
): Promise<InstallationOperation[]> {
  const remaining: InstallationOperation[] = [];

  for (const operation of operations) {
    if (operation.type === "show_message") {
      remaining.push(operation);
      continue;
    }

    if (
      operation.type !== "run_command" ||
      !isPackageRemoveCommand(operation.command, operation.args)
    ) {
      continue;
    }

    const present = await presentRemoveSpecs(operation, files, packageJson);
    if (present.length === 0) {
      continue;
    }

    remaining.push(withRemoveSpecs(operation, present));
  }

  if (!remaining.some((operation) => operation.type === "run_command")) {
    return [];
  }

  return remaining;
}

async function presentRemoveSpecs(
  operation: RunCommandOperation,
  files: DetectionFileSystem,
  packageJson: PackageJsonSummary | undefined,
): Promise<string[]> {
  const specs = packageSpecsFromRemoveArgs(operation.args);
  const present: string[] = [];

  for (const spec of specs) {
    if (await packageDeclared(spec, files, packageJson)) {
      present.push(spec);
    }
  }

  return present;
}

async function packageDeclared(
  spec: string,
  files: DetectionFileSystem,
  packageJson: PackageJsonSummary | undefined,
): Promise<boolean> {
  const pyproject = await files.readText("pyproject.toml");
  const requirements = await files.readText("requirements.txt");
  const text = `${pyproject ?? ""}\n${requirements ?? ""}`;
  if (textDeclaresPythonPackage(text, pythonDistributionName(spec))) {
    return true;
  }

  return packageJson !== undefined && hasPackageDependency(packageJson, packageNameFromSpec(spec));
}

function withRemoveSpecs(
  operation: RunCommandOperation,
  specs: readonly string[],
): RunCommandOperation {
  const verb = operation.command === "npm" ? "uninstall" : "remove";
  if (packageSpecsFromRemoveArgs(operation.args).length === specs.length) {
    return operation;
  }

  return {
    ...operation,
    args: [verb, ...specs],
  };
}
