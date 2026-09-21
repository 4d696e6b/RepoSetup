import type { InstallationOperation, ResolutionResult, ResolutionWarning } from "@reposetup/core";

import { formatErrors } from "./format-error.js";

export interface RenderPlanOptions {
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
}

export function renderPlan(result: ResolutionResult, options: RenderPlanOptions): string {
  if (!result.valid) {
    return renderInvalid(result);
  }

  if (options.quiet) {
    const verb = options.dryRun ? "Dry-run succeeded" : "Plan ready";
    return `${verb} for ${result.config.project.name} with ${result.operations.length} operations.`;
  }

  const lines = [
    `${options.dryRun ? "Dry-run" : "Plan"} for ${result.config.project.name}`,
    `  runtime          ${result.config.runtime.id}`,
    `  package manager  ${result.config.packageManager}`,
    `  framework        ${result.config.framework.id}`,
    "",
    "Resolved integrations:",
    ...result.orderedIntegrations.map((item) => `  ${item.id.padEnd(20, " ")} ${item.category}`),
  ];

  if (result.warnings.length > 0) {
    lines.push("", "Warnings:", ...result.warnings.map(formatWarning));
  }

  lines.push("", `Operations (${result.operations.length}):`);

  if (result.operations.length === 0) {
    lines.push("  (none)");
  } else {
    result.operations.forEach((operation, index) => {
      lines.push(`  ${index + 1}. ${formatOperation(operation, options.verbose)}`);
      for (const detail of operationDetails(operation, options.verbose)) {
        lines.push(`      ${detail}`);
      }
    });
  }

  if (options.dryRun) {
    lines.push("", "No files or commands were executed.");
  }

  return lines.join("\n");
}

function renderInvalid(result: ResolutionResult): string {
  const lines = [`Could not plan installation for ${result.config.project.name}.`, ""];

  if (result.warnings.length > 0) {
    lines.push("Warnings:", ...result.warnings.map(formatWarning), "");
  }

  lines.push("Errors:", formatErrors(result.errors));
  return lines.join("\n");
}

function formatWarning(warning: ResolutionWarning): string {
  return `  [${warning.code}] ${warning.message}`;
}

function formatOperation(operation: InstallationOperation, verbose: boolean): string {
  if (verbose) {
    return `[${operation.type}] ${operation.description}`;
  }

  return `${operation.type}  ${operation.description}`;
}

function operationDetails(operation: InstallationOperation, verbose: boolean): string[] {
  switch (operation.type) {
    case "check_prerequisite":
      return verbose ? [`id  ${operation.id}`] : [];
    case "install_package": {
      const details = [`packages  ${operation.packages.join(", ")}`, `cwd  ${operation.cwd}`];
      if (operation.dev === true) {
        details.push("dev  true");
      }
      if (verbose && operation.requiresNetwork === true) {
        details.push("requiresNetwork  true");
      }
      return details;
    }
    case "run_command": {
      const command = [operation.command, ...operation.args].join(" ");
      const details = [`command  ${command}`, `cwd  ${operation.cwd}`];
      if (verbose && operation.requiresNetwork === true) {
        details.push("requiresNetwork  true");
      }
      return details;
    }
    case "create_directory":
      return [`path  ${operation.path}`, `behavior  ${operation.behavior}`];
    case "create_file":
      return [`path  ${operation.path}`, `behavior  ${operation.behavior}`];
    case "modify_json":
      return [`path  ${operation.path}`];
    case "modify_text":
      return [`path  ${operation.path}`];
    case "add_env_example":
      return [
        `path  ${operation.path}`,
        `keys  ${operation.entries.map((entry) => entry.key).join(", ")}`,
      ];
    case "show_message":
      return verbose ? [`message  ${operation.message}`] : [];
    case "verify": {
      if (operation.command === undefined) {
        return [`cwd  ${operation.cwd}`];
      }
      const command = [operation.command, ...(operation.args ?? [])].join(" ");
      return [`command  ${command}`, `cwd  ${operation.cwd}`];
    }
    default: {
      const exhaustive: never = operation;
      return exhaustive;
    }
  }
}
