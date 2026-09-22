import type { ZodType } from "zod";

import type { IntegrationCategory } from "../categories/integration-category.js";
import type { RepoSetupConfig } from "../config/types.js";
import type { InstallationOperation } from "../operations/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";
import type {
  IntegrationAlternative,
  IntegrationConflict,
  IntegrationIncludes,
  IntegrationRecommendation,
  IntegrationRequirement,
} from "../relationships/models.js";

export const INTEGRATION_STATUSES = ["stable", "candidate", "experimental", "deprecated"] as const;

export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export type DetectionConfidence = "certain" | "likely" | "possible";

export type DetectionEvidenceKind =
  "file" | "directory" | "dependency" | "lockfile" | "config" | "manifest";

export interface DetectionEvidence {
  kind: DetectionEvidenceKind;
  detail: string;
  path?: string;
}

export interface PackageJsonSummary {
  name?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  packageManager?: string;
}

export interface DetectionFileSystem {
  exists(relativePath: ProjectRelativePath): Promise<boolean>;
  readText(relativePath: ProjectRelativePath): Promise<string | undefined>;
}

export interface SupportContext {
  runtimeId: RepoSetupConfig["runtime"]["id"];
  packageManager: RepoSetupConfig["packageManager"];
  frameworkId: string;
  integrationIds: string[];
}

export interface SupportResult {
  supported: boolean;
  reason?: string;
}

export interface DetectionContext {
  projectRoot: string;
  files: DetectionFileSystem;
  packageJson?: PackageJsonSummary;
}

export interface DetectionResult {
  detected: boolean;
  confidence: DetectionConfidence;
  evidence: DetectionEvidence[];
}

export interface PlanContext<TOptions = unknown> {
  config: RepoSetupConfig;
  options: TOptions;
  projectRoot: ProjectRelativePath;
}

export type VerificationContext = DetectionContext;

export interface VerificationResult {
  ok: boolean;
  message?: string;
  suggestion?: string;
}

export interface IntegrationVerificationMetadata {
  verifiedAt: string;
  packageRange?: string;
  runtimeRange?: string;
}

export interface IntegrationDefinition<TOptions = unknown> {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  status: IntegrationStatus;
  documentationUrl: string;
  keywords?: string[];
  optionSchema?: ZodType<TOptions>;
  requirements?: IntegrationRequirement[];
  recommendations?: IntegrationRecommendation[];
  conflicts?: IntegrationConflict[];
  includes?: IntegrationIncludes[];
  alternatives?: IntegrationAlternative[];
  verification?: IntegrationVerificationMetadata;
  addable?: boolean;
  removable?: boolean;
  supports(context: SupportContext): SupportResult;
  detect?(context: DetectionContext): Promise<DetectionResult>;
  plan(context: PlanContext<TOptions>): InstallationOperation[];
  remove?(context: PlanContext<TOptions>): InstallationOperation[];
  verify?(context: VerificationContext): Promise<VerificationResult>;
}
