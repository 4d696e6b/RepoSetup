import type { PlanContext } from "@reposetup/core";

import { hasSelectedIntegration } from "./operations.js";

export function pythonAppReadme(context: PlanContext, title: string, command: string): string {
  const prefix = context.config.packageManager === "uv" ? "uv run " : "";
  const lines = [
    `# ${title} app`,
    "",
    "From this directory, start the development server with:",
    "",
    `\`${prefix}${command}\``,
    "",
  ];
  if (context.config.packageManager === "pip")
    lines.push("Activate the Python environment used during installation first.", "");
  if (hasSelectedIntegration(context, "pytest"))
    lines.push(`Run the generated endpoint test with \`${prefix}pytest\`.`, "");
  return lines.join("\n");
}
