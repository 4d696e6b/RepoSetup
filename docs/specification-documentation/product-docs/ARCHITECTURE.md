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

This is the curated installation pipeline. The experimental coding TaskPlan pipeline below is separate and does not change installation planning.

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

`run_command`, `install_package` and command-bearing `verify` operations are authority supplied by reviewed, built-in installation definitions and package-manager adapters. Their typed representation does not authorize importing executable operations from a model, TaskPlan or configuration. Coding proposals never deserialize into this union.

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

AI-generated coding decomposition is permitted only in the separate TaskPlan domain. Given the same validated draft and frozen policy/source identities, deterministic compilation must produce the same logical TaskPlan. Draft generation and coding responses are not promised to be deterministic. Neither changes the curated installation determinism contract.

## 8. Platform strategy

Support:

- macOS;
- Windows;
- Linux.

v1 should focus on project-level package installation.

System-level prerequisites are detected, not silently installed.

Use platform-aware diagnostics to tell the user what is missing.

## 9. Owner-approved 0.3.0 companion website

The 0.3.0 companion website consumes a generated public snapshot from the same curated definitions and core planner. Build-time catalog export/validation belongs in registry; editorial definitions belong in integrations; browser presentation belongs in `apps/website`. The browser imports only JSON and app modules at runtime. Core gains no UI dependencies, and the complete Node core barrel never enters the browser bundle. The local CLI remains the only execution surface.

Do not make any v1 architectural decision that requires a server.

## 0.3.0 shared presentation contract

The companion website is an owner-approved 0.3.0 scope exception. Core owns strict selection/catalog models and pure planning; integrations own curated guidance/context evidence/presets; registry validates lookup, bounded combinations and public snapshots; CLI owns local input, detection adapters, confirmation/rendering and executor invocation. A later website consumes validated public data rather than the Node-oriented core barrel or any executable remote registry. No browser UI or hosting dependency enters core. See [selection v1](./SELECTION_V1.md).

## Experimental 0.4.0 coding task domain

Milestones A–F provide schemas, pure compilation, bounded context, portable compile/next/status, trusted checks and durable scoped application. G adds an official CLI-only tool-free SDK transport, executor-owned call ledgers and reviewed managed compilation/run. Core owns policy/transitions/dispatch orchestration; CLI owns concrete provider/filesystem/process adapters, parsing and rendering. Local qualification is recorded separately from the still-open live provider gate; H routing/repair remains unimplemented. See the [product contract](./TASK_COMPILER_0.4.0.md), [versioned contracts](./TASK_CONTRACTS_0.4.0.md), [support and verification profile](./TASK_SUPPORT_0.4.0.md) and [current-source reuse audit](../implementing-docs/TASK_COMPILER_REUSE_0.4.0.md).

Core owns strict task draft/plan/preference/run validation, requirement coverage, task DAG ordering, context selection policy, capability/effort routing, verification classification and state transitions. CLI owns concrete repository, durable state, provider, filesystem and process adapters plus parsing, review and rendering. Existing registry and integration packages retain curated stack planning; models are not registry integrations. Core acquires no provider SDK or terminal/browser dependency.

The coding pipeline is selected requirements and repository evidence → caller/provider decomposition draft → deterministic coverage/DAG/scope validation → frozen TaskPlan → bounded fresh context → portable handoff or one managed provider → typed text proposal → executor application → trusted verification → accepted outputs or bounded targeted repair. Capability and reasoning effort are independent choices. Handoff enforcement is advisory unless the host supplies qualified enforcement evidence.

Only the executor may execute processes or mutate project files. Managed provider responses can request approved context and propose expected-absent text creation or hash-guarded unique text replacement. They cannot supply shell commands, installation operations, arbitrary patches, deletes or renames. Trusted verification IDs resolve through fixed CLI adapters; task data never supplies executable argv. An individual write may be atomic; a batch is not a transaction and partial effects must be recorded.

The initial experimental managed profile is TypeScript/Node with preinstalled dependencies and npm or pnpm metadata. It needs a clean Git baseline, bounded scopes and trusted check definitions. Local functionality requires no AI credits; managed calls require provider credentials and usage allowance. This slice introduces no dependency installation, automatic rollback, parallel workers, MCP, worktree orchestration or website changes. Legacy stack schemaVersion 1, selection v1, commands, output meanings and exit codes stay compatible.
