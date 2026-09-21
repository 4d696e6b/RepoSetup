export const PACKAGE_MANAGERS = ["npm", "pnpm", "bun", "uv", "pip"] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export const RUNTIME_IDS = ["node", "python"] as const;

export type RuntimeId = (typeof RUNTIME_IDS)[number];

export const SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

export interface ProjectConfig {
  name: string;
  path?: string;
}

export interface RuntimeConfig {
  id: RuntimeId;
  version?: string;
}

export interface FrameworkConfig {
  id: string;
  options?: Record<string, unknown>;
}

export interface IntegrationSelection {
  id: string;
  options?: Record<string, unknown>;
}

export interface RepoSetupConfig {
  schemaVersion: SchemaVersion;
  project: ProjectConfig;
  runtime: RuntimeConfig;
  packageManager: PackageManager;
  framework: FrameworkConfig;
  integrations: IntegrationSelection[];
}
