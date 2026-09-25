import type { RepoSetupConfig } from "@reposetup/core";

export function postCreateCommands(config: RepoSetupConfig): readonly string[] {
  const packageRun = config.packageManager === "npm" ? "npm run" : config.packageManager;
  const integrationIds = new Set(config.integrations.map((integration) => integration.id));

  switch (config.framework.id) {
    case "nextjs":
    case "react-vite":
      return [
        `${packageRun} dev`,
        `${packageRun} build`,
        ...(integrationIds.has("vitest") ? [`${config.packageManager} exec vitest run`] : []),
      ];
    case "fastapi":
      return config.packageManager === "uv"
        ? ["uv run fastapi dev", ...(integrationIds.has("pytest") ? ["uv run pytest"] : [])]
        : ["fastapi dev", ...(integrationIds.has("pytest") ? ["pytest"] : [])];
    case "flask":
      return config.packageManager === "uv"
        ? ["uv run flask run", ...(integrationIds.has("pytest") ? ["uv run pytest"] : [])]
        : ["flask run", ...(integrationIds.has("pytest") ? ["pytest"] : [])];
    case "express":
      return config.framework.options?.typescript === true
        ? [
            `${packageRun} dev`,
            `${packageRun} build`,
            `${packageRun} start`,
            ...(integrationIds.has("vitest") ? [`${config.packageManager} exec vitest run`] : []),
          ]
        : ["node app.js"];
    default:
      return [];
  }
}
