import { toPackageManagerCommand, type InstallationOperation } from "@reposetup/core";

/** Expand planned install_package and run_command ops to argv for assertions. */
export function plannedCommandArgv(operations: readonly InstallationOperation[]): string[][] {
  const commands: string[][] = [];

  for (const operation of operations) {
    if (operation.type === "run_command") {
      commands.push([operation.command, ...operation.args]);
      continue;
    }

    if (operation.type === "install_package") {
      const result = toPackageManagerCommand(operation);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      commands.push([result.operation.command, ...result.operation.args]);
    }
  }

  return commands;
}
