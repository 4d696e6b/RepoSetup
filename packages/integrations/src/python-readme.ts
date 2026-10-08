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
  if (context.config.packageManager === "uv")
    lines.push(
      "Dependencies are installed in this project's environment. Use `uv run` to run its tools; a plain command may use a different environment.",
      "Run `rsetup doctor` here to check installed dependency metadata without synchronizing packages.",
      "",
    );
  if (context.config.packageManager === "pip")
    lines.push(
      "Activate the Python environment used during installation first.",
      "Selected dependencies are recorded in `requirements.txt`. To reinstall them in that environment, run `python -m pip install -r requirements.txt`.",
      "Run `rsetup doctor` here with that environment activated to check installed dependency metadata.",
      "",
    );
  if (hasSelectedIntegration(context, "pytest"))
    lines.push(`Run the generated endpoint test with \`${prefix}pytest\`.`, "");
  return lines.join("\n");
}
