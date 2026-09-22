export const packageName = "@reposetup/core" as const;

export {
  INTEGRATION_CATEGORIES,
  type IntegrationCategory,
} from "./categories/integration-category.js";
export { parseRepoSetupConfig } from "./config/parse.js";
export type { ConfigParseFailure, ConfigParseResult, ConfigParseSuccess } from "./config/parse.js";
export { repoSetupConfigSchema } from "./config/schema.js";
export { serializeRepoSetupConfig } from "./config/serialize.js";
export { PACKAGE_MANAGERS, RUNTIME_IDS, SCHEMA_VERSION } from "./config/types.js";
export type {
  FrameworkConfig,
  IntegrationSelection,
  PackageManager,
  ProjectConfig,
  RepoSetupConfig,
  RuntimeConfig,
  RuntimeId,
  SchemaVersion,
} from "./config/types.js";
export { ERROR_CODES, type ErrorCode } from "./errors/codes.js";
export { createRepoSetupError, isRepoSetupError } from "./errors/model.js";
export type { RepoSetupError } from "./errors/model.js";
export { UNSAFE_REMOVE_MESSAGE } from "./errors/unsafe-remove.js";
export { INTEGRATION_STATUSES } from "./integrations/definition.js";
export type {
  DetectionConfidence,
  DetectionContext,
  DetectionEvidence,
  DetectionEvidenceKind,
  DetectionFileSystem,
  DetectionResult,
  IntegrationDefinition,
  IntegrationStatus,
  IntegrationVerificationMetadata,
  PackageJsonSummary,
  PlanContext,
  SupportContext,
  SupportResult,
  VerificationContext,
  VerificationResult,
} from "./integrations/definition.js";
export { detectProject } from "./detection/detect-project.js";
export type { DetectProjectResult } from "./detection/detect-project.js";
export { errorsFromDoctor, failedDoctorChecks, runDoctor } from "./doctor/run-doctor.js";
export type { DoctorCheck, DoctorResult, RunDoctorResult } from "./doctor/run-doctor.js";
export { existingEnvKeys } from "./executor/env-example.js";
export { redactProcessOutput, summarizeFailedProcessOutput } from "./executor/output-snippet.js";
export { pathPrerequisite } from "./prerequisites/path.js";
export type { PathPrerequisite, PathPrerequisiteId } from "./prerequisites/path.js";
export { createDetectionContext } from "./detection/context.js";
export { detectEcosystem } from "./detection/ecosystem.js";
export { createMemoryDetectionFs, createNodeDetectionFs } from "./detection/filesystem.js";
export { detectNpmPackage } from "./detection/npm-package.js";
export { pythonDistributionName, textDeclaresPythonPackage } from "./detection/python-package.js";
export { hasPackageDependency, readPackageJson } from "./detection/package-json.js";
export { findProjectRoot, PROJECT_ROOT_MARKERS } from "./detection/project-root.js";
export { detectedResult, evidence, notDetected } from "./detection/result.js";
export type { DetectedItem, DetectedLanguage, DetectedStack } from "./detection/types.js";
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
export { planInstallation, planInstallationSubset, toInstallationPlan } from "./planning/plan.js";
export { planAdd } from "./planning/plan-add.js";
export type { PlanAddResult } from "./planning/plan-add.js";
export { planRemove } from "./planning/plan-remove.js";
export type { PlanRemoveResult } from "./planning/plan-remove.js";
export { exportProject } from "./planning/export-project.js";
export type { ExportProjectResult } from "./planning/export-project.js";
export { exportConfigFromDetectedStack } from "./planning/config-from-detected.js";
export { validateInstallationPlan } from "./planning/validate-plan.js";
export type { PlanValidationResult } from "./planning/validate-plan.js";
export { executeInstallation } from "./executor/execute.js";
export type {
  ExecuteOptions,
  ExecuteResult,
  ExecutorFileSystem,
  ExecutorLogger,
  ProcessRunRequest,
  ProcessOutputEvent,
  ProcessRunResult,
  ProcessRunner,
} from "./executor/types.js";
export { getPackageManagerAdapter, toPackageManagerCommand } from "./package-managers/lookup.js";

export type {
  AddPackagesRequest,
  InstallProjectRequest,
  PackageManagerAdapter,
  PackageManagerCommandResult,
  RemovePackagesRequest,
} from "./package-managers/types.js";
export type {
  InstallationPlan,
  ResolutionError,
  ResolutionResult,
  ResolutionWarning,
  ResolvedIntegration,
} from "./resolution/types.js";
