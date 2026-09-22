import type {
  FrameworkConfig,
  IntegrationSelection,
  ProjectConfig,
  RepoSetupConfig,
  RuntimeConfig,
} from "./types.js";
import { SCHEMA_VERSION } from "./types.js";

export function serializeRepoSetupConfig(config: RepoSetupConfig): string {
  return `${JSON.stringify(toExportJson(config), null, 2)}\n`;
}

function toExportJson(config: RepoSetupConfig): Record<string, unknown> {
  return {
    schemaVersion: SCHEMA_VERSION,
    project: projectJson(config.project),
    runtime: runtimeJson(config.runtime),
    packageManager: config.packageManager,
    framework: selectionJson(config.framework),
    integrations: config.integrations.map(selectionJson),
  };
}

function projectJson(project: ProjectConfig): Record<string, unknown> {
  const json: Record<string, unknown> = { name: project.name };
  if (project.path !== undefined && project.path !== ".") {
    json.path = project.path;
  }
  return json;
}

function runtimeJson(runtime: RuntimeConfig): Record<string, unknown> {
  const json: Record<string, unknown> = { id: runtime.id };
  if (runtime.version !== undefined) {
    json.version = runtime.version;
  }
  return json;
}

function selectionJson(selection: FrameworkConfig | IntegrationSelection): Record<string, unknown> {
  const json: Record<string, unknown> = { id: selection.id };
  if (selection.options !== undefined) {
    json.options = selection.options;
  }
  return json;
}
