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
  if (hasSelectedIntegration(context, "sqlalchemy"))
    lines.push(
      "SQLAlchemy and the Psycopg PostgreSQL driver are installed. Set `DATABASE_URL` in your environment using a `postgresql+psycopg://` URL; `.env.example` contains a placeholder, not active credentials.",
      "Import `create_database_engine` from `database.py` to construct an engine. A PostgreSQL server must be available before opening a connection; RepoSetup does not install or start that server.",
      "If Alembic is selected, set `sqlalchemy.url` in `alembic.ini` to the same driver URL before running migrations.",
      "",
    );
  if (hasSelectedIntegration(context, "pytest"))
    lines.push(`Run the generated endpoint test with \`${prefix}pytest\`.`, "");
  return lines.join("\n");
}
