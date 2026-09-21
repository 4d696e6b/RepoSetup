export const packageName = "@reposetup/core" as const;

export {
  INTEGRATION_CATEGORIES,
  type IntegrationCategory,
} from "./categories/integration-category.js";
export { parseRepoSetupConfig } from "./config/parse.js";
export type { ConfigParseFailure, ConfigParseResult, ConfigParseSuccess } from "./config/parse.js";
export { repoSetupConfigSchema } from "./config/schema.js";
export type {
  FrameworkConfig,
  IntegrationSelection,
  PackageManager,
  ProjectConfig,
  RepoSetupConfig,
  RuntimeConfig,
  RuntimeId,
} from "./config/types.js";
export { PACKAGE_MANAGERS, RUNTIME_IDS } from "./config/types.js";
export { ERROR_CODES, type ErrorCode } from "./errors/codes.js";
export { createRepoSetupError, isRepoSetupError } from "./errors/model.js";
export type { RepoSetupError } from "./errors/model.js";
export type {
  DetectionConfidence,
  DetectionContext,
  DetectionResult,
  IntegrationDefinition,
  IntegrationStatus,
  IntegrationVerificationMetadata,
  PlanContext,
  SupportContext,
  SupportResult,
  VerificationContext,
  VerificationResult,
} from "./integrations/definition.js";
export { installationOperationSchema } from "./operations/schema.js";
export type {
  AddEnvExampleOperation,
  CheckPrerequisiteOperation,
  CreateDirectoryOperation,
  CreateFileOperation,
  FileWriteBehavior,
  InstallPackageOperation,
  InstallationOperation,
  ModifyJsonOperation,
  ModifyTextOperation,
  RunCommandOperation,
  ShowMessageOperation,
  VerifyOperation,
} from "./operations/types.js";
export { FILE_WRITE_BEHAVIORS } from "./operations/types.js";
export { isSafeProjectName, isSafeProjectRelativePath } from "./paths/project-path.js";
export type { ProjectRelativePath } from "./paths/project-path.js";
export { integrationRelationshipSchema } from "./relationships/schema.js";
export type {
  IntegrationAlternative,
  IntegrationConflict,
  IntegrationIncludes,
  IntegrationRecommendation,
  IntegrationRef,
  IntegrationRelationship,
  IntegrationRequirement,
} from "./relationships/models.js";
export type { RegistryLookup } from "./resolution/registry-lookup.js";
export { resolveConfig } from "./resolution/resolve.js";
export { planInstallation, toInstallationPlan } from "./planning/plan.js";
export { validateInstallationPlan } from "./planning/validate-plan.js";
export type { PlanValidationResult } from "./planning/validate-plan.js";
export type {
  InstallationPlan,
  ResolutionError,
  ResolutionResult,
  ResolutionWarning,
  ResolvedIntegration,
} from "./resolution/types.js";
