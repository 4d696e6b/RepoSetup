import type { IntegrationCategory } from "../categories/integration-category.js";
import type { RepoSetupConfig } from "../config/types.js";
import type { RepoSetupError } from "../errors/model.js";
import type { InstallationOperation } from "../operations/types.js";

export interface ResolvedIntegration {
  id: string;
  category: IntegrationCategory;
  options?: Record<string, unknown>;
}

export interface ResolutionWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ResolutionError = RepoSetupError;

export interface ResolutionResult {
  valid: boolean;
  config: RepoSetupConfig;
  orderedIntegrations: ResolvedIntegration[];
  warnings: ResolutionWarning[];
  errors: ResolutionError[];
  operations: InstallationOperation[];
}

export interface InstallationPlan {
  config: RepoSetupConfig;
  operations: InstallationOperation[];
}
