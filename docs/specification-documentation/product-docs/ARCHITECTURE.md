# RepoSetup Architecture

## 1. Recommended technology stack

- TypeScript
- Node.js
- pnpm workspaces
- Commander.js for CLI command parsing
- `@inquirer/prompts` for interactive flows
- Zod for config/input validation
- Execa or Node child_process spawn with argument arrays for process execution
- Vitest for testing
- tsup or equivalent for packaging CLI libraries
- GitHub Actions for CI/release

Ink is optional later. Do not make Ink required for the core CLI.

## 2. Monorepo

```text
reposetup/
├── AGENTS.md
├── .cursor/
│   └── rules/
├── docs/
│   ├── README.md
│   └── specification-documentation/
│       ├── product-docs/
│       ├── implementing-docs/
│       ├── security-docs/
│       └── release-docs/
├── packages/
│   ├── core/
│   ├── registry/
│   ├── integrations/
│   ├── cli/
│   └── config/
├── examples/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

Optional separation after codebase grows:

```text
packages/
├── core/
├── registry/
├── integrations/
├── cli/
├── config/
├── detector/
└── executor/
```

Do not prematurely split packages unless boundaries are already clear.

## 3. Core pipeline

```text
Raw user/config input
        ↓
Schema validation
        ↓
Normalize configuration
        ↓
Registry lookup
        ↓
Requirement resolution
        ↓
Conflict detection
        ↓
Recommendation collection
        ↓
Dependency graph
        ↓
Topological ordering
        ↓
Integration plan generation
        ↓
Plan validation
        ↓
InstallationPlan
        ↓
Dry-run renderer OR Executor
        ↓
Verification
```

## 4. Domain types

### RepoSetupConfig

Represents user intent, not shell commands.

```ts
type PackageManager = "npm" | "pnpm" | "bun" | "uv" | "pip";

interface RepoSetupConfig {
  schemaVersion: 1;

  project: {
    name: string;
    path?: string;
  };

  runtime: {
    id: "node" | "python";
    version?: string;
  };

  packageManager: PackageManager;

  framework: {
    id: string;
    options?: Record<string, unknown>;
  };

  integrations: Array<{
    id: string;
    options?: Record<string, unknown>;
  }>;
}
```

`schemaVersion` is a required literal `1`. See `docs/specification-documentation/product-docs/CONFIG_MIGRATION.md` for the v1 compatibility policy. Unknown versions and unknown top-level keys are rejected.

### ResolutionResult

```ts
interface ResolutionResult {
  valid: boolean;
  config: RepoSetupConfig;
  orderedIntegrations: ResolvedIntegration[];
  warnings: ResolutionWarning[];
  errors: ResolutionError[];
  operations: InstallationOperation[];
}
```

## 5. Installation operation model

Use a discriminated union.

Recommended v1 operations:

```ts
type InstallationOperation =
  | CheckPrerequisiteOperation
  | InstallPackageOperation
  | RunCommandOperation
  | CreateDirectoryOperation
  | CreateFileOperation
  | ModifyJsonOperation
  | ModifyTextOperation
  | AddEnvExampleOperation
  | ShowMessageOperation
  | VerifyOperation;
```

Example:

```ts
interface RunCommandOperation {
  type: "run_command";
  command: string;
  args: string[];
  cwd: ProjectRelativePath;
  requiresNetwork?: boolean;
  interactive?: boolean;
  longRunning?: boolean;
  description: string;
}
```

Example file operation:

```ts
interface CreateFileOperation {
  type: "create_file";
  path: ProjectRelativePath;
  content: string;
  behavior: "fail_if_exists" | "create_if_missing" | "overwrite";
}
```

Prefer explicit merge operations to blind text replacement.

## 6. Error model

Use stable error codes.

Examples:

```text
CONFIG_INVALID
PROJECT_NAME_INVALID
UNKNOWN_INTEGRATION
UNSUPPORTED_CONTEXT
MISSING_REQUIREMENT
INTEGRATION_CONFLICT
DEPENDENCY_CYCLE
PREREQUISITE_MISSING
PACKAGE_MANAGER_MISSING
FILE_ALREADY_EXISTS
FILE_MUTATION_FAILED
COMMAND_FAILED
VERIFICATION_FAILED
```

Errors must separate:
- machine-readable code;
- human-readable message;
- contextual metadata;
- optional suggested resolution.

## 7. Determinism

Given:
- same RepoSetup config;
- same registry version;
- same target-platform context;

the logical InstallationPlan must be stable.

Do not use AI to choose commands.

## 8. Platform strategy

Support:
- macOS;
- Windows;
- Linux.

v1 should focus on project-level package installation.

System-level prerequisites are detected, not silently installed.

Use platform-aware diagnostics to tell the user what is missing.

## 9. Future website

A future website must consume the same core registry/config concepts.

Do not make any v1 architectural decision that requires a server.
