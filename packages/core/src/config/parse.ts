import type { ZodError } from "zod";

import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { repoSetupConfigSchema } from "./schema.js";
import type {
  FrameworkConfig,
  IntegrationSelection,
  ProjectConfig,
  RepoSetupConfig,
  RuntimeConfig,
} from "./types.js";

export type ConfigParseSuccess = {
  success: true;
  config: RepoSetupConfig;
};

export type ConfigParseFailure = {
  success: false;
  error: RepoSetupError;
};

export type ConfigParseResult = ConfigParseSuccess | ConfigParseFailure;

type ParsedConfig = ReturnType<typeof repoSetupConfigSchema.parse>;

export function parseRepoSetupConfig(input: unknown): ConfigParseResult {
  const parsed = repoSetupConfigSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: toConfigError(parsed.error),
    };
  }

  return {
    success: true,
    config: normalizeConfig(parsed.data),
  };
}

function normalizeConfig(input: ParsedConfig): RepoSetupConfig {
  return {
    schemaVersion: 1,
    project: normalizeProject(input.project),
    runtime: normalizeRuntime(input.runtime),
    packageManager: input.packageManager,
    framework: normalizeFramework(input.framework),
    integrations: input.integrations.map(normalizeIntegration),
  };
}

function normalizeProject(project: ParsedConfig["project"]): ProjectConfig {
  const normalized: ProjectConfig = { name: project.name };
  if (project.path !== undefined) {
    normalized.path = project.path;
  }
  return normalized;
}

function normalizeRuntime(runtime: ParsedConfig["runtime"]): RuntimeConfig {
  const normalized: RuntimeConfig = { id: runtime.id };
  if (runtime.version !== undefined) {
    normalized.version = runtime.version;
  }
  return normalized;
}

function normalizeFramework(framework: ParsedConfig["framework"]): FrameworkConfig {
  const normalized: FrameworkConfig = { id: framework.id };
  if (framework.options !== undefined) {
    normalized.options = framework.options;
  }
  return normalized;
}

function normalizeIntegration(
  integration: ParsedConfig["integrations"][number],
): IntegrationSelection {
  const normalized: IntegrationSelection = { id: integration.id };
  if (integration.options !== undefined) {
    normalized.options = integration.options;
  }
  return normalized;
}

function toConfigError(error: ZodError): RepoSetupError {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  const nameInvalid = issues.some((issue) => issue.path === "project.name");

  if (nameInvalid) {
    return createRepoSetupError({
      code: "PROJECT_NAME_INVALID",
      message: "Project name is invalid.",
      details: { issues },
      suggestion: "Use a single directory name without path separators or '..'.",
    });
  }

  return createRepoSetupError({
    code: "CONFIG_INVALID",
    message: "RepoSetup configuration is invalid.",
    details: { issues },
    suggestion: "Provide a schemaVersion 1 config that matches the RepoSetupConfig schema.",
  });
}
