# RepoSetup — Cursor Start Here

This repository is for **RepoSetup**, a terminal-first open-source developer stack composer and installer.

## What RepoSetup is

RepoSetup lets a developer:

1. create a new project from an interactive terminal UI or flags;
2. add supported integrations to an existing project;
3. detect the current stack;
4. validate compatibility before making changes;
5. preview every operation with `--dry-run`;
6. execute a deterministic installation plan;
7. inspect integration metadata;
8. diagnose incomplete or broken setup;
9. export/import reproducible stack configuration.

Examples:

```bash
reposetup create
reposetup create my-app --framework nextjs --typescript --tailwind --database postgres --orm prisma
reposetup add prisma
reposetup search prisma
reposetup info prisma
reposetup stack
reposetup doctor
reposetup export
reposetup create --config reposetup.json --dry-run
```



## Important scope rule

**Version 1 is terminal-first only.**

Do not build:

- a web application;
- Firebase backend;
- accounts;
- hosted presets;
- cloud registry;
- marketplace;
- AI-generated setup logic.

A website may be created after the CLI/core is stable. The architecture must not depend on a future website.

## Source-of-truth order

When requirements conflict, use this priority:

1. `AGENTS.md`
2. `.cursor/rules/*.mdc`
3. `docs/PRODUCT_REQUIREMENTS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/INTEGRATION_SYSTEM.md`
6. `docs/CLI_SPEC.md`
7. `docs/IMPLEMENTATION_PLAN.md`
8. other documentation

Do not silently invent behavior not described by the source of truth.

## Cursor execution instruction

Before making substantial changes:

1. Read `AGENTS.md`.
2. Read the relevant `.cursor/rules/*.mdc` files.
3. Read the relevant requirement document.
4. Inspect the existing repository.
5. State which phase/task is being implemented.
6. Implement the smallest complete vertical slice.
7. Run relevant tests, typecheck, lint, and build.
8. Fix failures before moving to the next task.
9. Update `docs/IMPLEMENTATION_STATUS.md`.
10. Do not jump ahead to later phases simply because they appear easy.



## First implementation target

Do **not** start by building every integration.

The first technical milestone is:

> Given a valid `RepoSetupConfig`, `@reposetup/core` can validate the requested stack, resolve requirements/conflicts, produce a stable dependency order, and create a deterministic `InstallationPlan`.

After that works and is tested, implement the dry-run CLI.

Only then execute real installation commands.

## First guaranteed golden path

Implement and prove this path first:

```text
Node.js
pnpm
Next.js
TypeScript
Tailwind CSS
SQLite
Prisma
Zod
Vitest
Prettier
```

Once it works reliably, expand to the other v1 integrations.

---



# RepoSetup Agent Instructions



## Mission

Build RepoSetup as a reliable, terminal-first, open-source stack composer and installer.

Correctness, safety, reproducibility, and maintainability are more important than the number of supported integrations.

## Mandatory architecture boundaries

- TypeScript is the primary implementation language.
- Node.js is the CLI runtime.
- Use a monorepo with pnpm workspaces.
- Business/domain logic belongs in `packages/core`.
- Integration definitions belong in `packages/integrations`.
- Registry lookup/validation belongs in `packages/registry`.
- CLI parsing, prompts, rendering, and execution belong in `packages/cli`.
- Do not put installation business logic in terminal UI code.
- Do not put shell execution inside integration definitions.
- Integrations must generate typed operations.
- Only the executor may execute processes or mutate project files.
- `@reposetup/core` must not depend on Commander, Inquirer, Ink, React, Firebase, or terminal rendering.
- Do not implement a website in v1.



## Safety rules

- Never interpolate untrusted user input into shell command strings.
- Prefer `spawn(command, args, { shell: false })` or Execa argument arrays.
- Validate project names and paths.
- Never execute arbitrary commands from config/preset files.
- Config files are declarative only.
- Never request or persist real secrets in RepoSetup configuration.
- Generate `.env.example` placeholders instead.
- Support `--dry-run` before real execution.
- Fail compatibility checks before mutating the filesystem.
- Do not silently overwrite existing user files.
- Do not silently install Node, Python, Docker, databases, or other system software requiring elevated privileges.
- Detect missing prerequisites and print actionable instructions instead.



## Engineering rules

- Prefer small modules and pure functions.
- Use discriminated unions for installation operations.
- Use Zod for external/config boundaries.
- Use explicit machine-readable error codes.
- Avoid giant switch statements for integrations.
- Avoid hardcoded package-manager commands inside individual integrations.
- Keep package-manager behavior behind adapters.
- Keep runtime/platform-specific behavior behind adapters where practical.
- Keep all supported integration IDs stable once v1 is released.
- Every integration must have tests before it is considered supported.



## Workflow rules

For every implementation task:

1. inspect existing code;
2. identify the relevant requirement;
3. implement only the requested phase;
4. add/update tests;
5. run targeted tests;
6. run typecheck;
7. run lint;
8. run build when affected;
9. report failures clearly;
10. update implementation status.

Do not claim a task is complete if tests/typecheck are failing.

## Version 1 non-goals

Do not implement:

- website;
- Firebase;
- user accounts;
- payments;
- hosted cloud registry;
- remote executable plugins;
- arbitrary third-party scripts;
- AI-generated installation plans;
- package popularity/rating systems;
- mobile UI;
- organization/team features.



## Documentation behavior

When a CLI flag, package command, framework generator flag, or setup behavior depends on an external project, do not guess. Mark it as research-required until verified from current official documentation.

---



# RepoSetup v1 Product Requirements



## 1. Product definition

RepoSetup is an open-source terminal application for composing, creating, extending, inspecting, and validating developer project stacks.

The CLI should remove the need to manually combine setup instructions from multiple documentation sites for supported combinations.

## 2. Core user stories



### New project

As a developer, I can run:

```bash
reposetup create
```

and interactively select a supported stack.

I can also use flags:

```bash
reposetup create my-app \
  --framework nextjs \
  --typescript \
  --package-manager pnpm \
  --tailwind \
  --database sqlite \
  --orm prisma
```

The same configuration must produce the same logical installation plan.

### Add integration

```bash
reposetup add prisma
```

RepoSetup detects enough of the existing project to:

- identify framework/package manager where possible;
- detect already installed integrations;
- resolve Prisma requirements;
- show the proposed delta;
- apply only missing setup.



### Search

```bash
reposetup search database
reposetup search prisma
```

Search the built-in integration registry.

### Info

```bash
reposetup info prisma
```

Show:

- category;
- purpose;
- supported project contexts;
- requirements;
- recommendations;
- conflicts;
- configuration options;
- verification strategy.



### Stack inspection

```bash
reposetup stack
```

Show detected stack with confidence where detection is uncertain.

### Doctor

```bash
reposetup doctor
```

Validate:

- prerequisites;
- expected dependencies;
- expected files;
- required placeholder environment variables;
- integration-specific verification.

Doctor should report problems and suggested fixes. It must not silently repair unless an explicit future `--fix` behavior is introduced.

### Export/import

```bash
reposetup export
reposetup create --config reposetup.json
```

Export a declarative reproducible configuration.

### Dry run

Every mutating top-level command must support dry-run when meaningful.

```bash
reposetup create --dry-run
reposetup add prisma --dry-run
```



## 3. Version 1 integrations



### Runtime / prerequisites

- Node.js
- Python

RepoSetup detects these. v1 does not automatically install them.

### JavaScript package managers

- npm
- pnpm
- Bun package manager (after Node/npm/pnpm path is stable)



### Python package managers

- uv
- pip



### Frontend/framework

- Next.js
- React + Vite



### Node backend

- Express
- Fastify



### Python backend

- FastAPI
- Flask



### Styling/UI

- Tailwind CSS
- shadcn/ui



### Database

- PostgreSQL
- SQLite
- MongoDB



### JavaScript data layer

- Prisma
- Drizzle ORM
- Mongoose



### Python data layer

- SQLAlchemy
- Alembic



### Validation

- Zod
- Pydantic



### Testing

- Vitest
- Playwright
- pytest



### Quality

- ESLint
- Prettier
- Ruff



### Infrastructure

- Docker
- Docker Compose



### CI

- GitHub Actions



## 4. Guaranteed golden stacks

RepoSetup v1 is not considered stable until these workflows are covered by end-to-end or fixture-based integration tests.

### Golden stack A — Next.js full stack

- Node.js
- pnpm
- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- PostgreSQL or SQLite
- Prisma
- Zod
- Vitest
- Playwright
- ESLint
- Prettier



### Golden stack B — React frontend

- Node.js
- pnpm
- React
- Vite
- TypeScript
- Tailwind
- Zod
- Vitest
- Playwright
- ESLint
- Prettier



### Golden stack C — Express API

- Node.js
- pnpm
- Express
- TypeScript
- PostgreSQL
- Prisma
- Zod
- Vitest
- ESLint
- Prettier



### Golden stack D — FastAPI API

- Python
- uv
- FastAPI
- Pydantic
- PostgreSQL
- SQLAlchemy
- Alembic
- pytest
- Ruff
- Docker



### Golden stack E — Flask API

- Python
- uv
- Flask
- PostgreSQL
- SQLAlchemy
- Alembic
- pytest
- Ruff
- Docker



## 5. Explicit non-goals

Not part of v1:

- website;
- hosted API;
- Firebase backend;
- cloud account;
- cloud preset sharing;
- remote plugin marketplace;
- package ratings;
- AI-selected stacks;
- AI-generated commands;
- automatic installation of system runtimes;
- admin/root package installation;
- automatic deployment to third-party cloud services.



## 6. Product quality requirements

A supported integration must be:

- documented;
- version-aware where necessary;
- deterministic;
- tested;
- safe to dry-run;
- diagnosable by `doctor`;
- discoverable through `search` and `info`.

"Supported" must mean more than "the dependency appears in package.json".

---



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

---



# Integration System Specification



## 1. Integration principle

Each supported technology is represented by an integration definition.

Do not scatter Prisma/Tailwind/FastAPI-specific conditionals throughout the codebase.

## 2. Conceptual interface

```ts
interface IntegrationDefinition<TOptions = unknown> {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;

  status: "stable" | "experimental";
  documentationUrl: string;

  optionSchema?: ZodType<TOptions>;

  requirements?: IntegrationRequirement[];
  recommendations?: IntegrationRecommendation[];
  conflicts?: IntegrationConflict[];

  supports(context: SupportContext): SupportResult;

  detect?(context: DetectionContext): Promise<DetectionResult>;

  plan(context: PlanContext<TOptions>): InstallationOperation[];

  verify?(context: VerificationContext): Promise<VerificationResult>;
}
```



## 3. Categories

Initial categories:

```text
runtime
package-manager
framework
backend-framework
styling
ui
database
orm
migration
validation
testing
linting
formatting
infrastructure
ci
utility
```



## 4. Relationships

Supported relationship semantics:

### requires

Hard requirement.

Example:

- Prisma requires a supported database selection in contexts where RepoSetup configures a datasource.



### recommends

Optional but useful.

Example:

- React Hook Form may recommend Zod in a future version, but Zod is not inherently required.



### conflicts

Known unsupported combination.

### includes

Framework already includes another technology conceptually.

Example:

- Next.js includes React. User should not need to separately install React as an integration.



### alternative

Informational only. Do not use alternatives to block combinations automatically.

## 5. Integration discovery

`reposetup search` searches:

- ID;
- display name;
- category;
- keywords;
- description.

`reposetup info <id>` renders registry metadata without executing commands.

## 6. Detection

Detection can inspect:

- package.json;
- pyproject.toml;
- requirements files;
- lockfiles;
- config files;
- known directories;
- dependency names.

Detection returns confidence:

```ts
type DetectionConfidence = "certain" | "likely" | "possible";
```

Never report uncertain detection as fact.

## 7. Integration options

Options should use schemas, not arbitrary maps internally.

Example conceptual Prisma options:

```ts
z.object({
  database: z.enum(["postgresql", "sqlite", "mysql"]),
  generateClient: z.boolean().default(true)
});
```

UI/prompt rendering can be derived from separate option metadata.

## 8. Built-in registry

v1 integrations are shipped with the RepoSetup package.

Do not download executable integration definitions from the network.

Future community integrations require a separate security design and are not a v1 concern.

## 9. Definition of done for an integration

An integration is "stable" only when it has:

- verified current setup commands;
- official documentation URL;
- option validation;
- requirements/conflicts defined;
- plan-generation tests;
- detection test where supported;
- dry-run rendering;
- verification strategy;
- at least one tested compatible path.



## 10. Version freshness

Store metadata such as:

```ts
interface IntegrationVerificationMetadata {
  verifiedAt: string;        // ISO date
  packageRange?: string;
  runtimeRange?: string;
}
```

Do not claim broad version compatibility without tests or documented evidence.

---



# CLI Specification



## 1. Command tree

```text
reposetup
├── create
├── add
├── remove
├── search
├── info
├── stack
├── doctor
├── export
├── import
├── registry
│   └── validate
└── version/help
```

Some commands may ship after the first alpha, but v1 architecture must support them.

## 2. `reposetup create`



### Interactive

```bash
reposetup create
```

Prompts roughly:

```text
Project name
Runtime
Package manager
Framework
Language/options
Styling
UI
Database
ORM/data layer
Validation
Testing
Quality tools
Infrastructure
Review plan
```

Only show choices that are valid/relevant to the selected context.

### Flags

Example:

```bash
reposetup create my-app \
  --framework nextjs \
  --package-manager pnpm \
  --typescript \
  --tailwind \
  --database sqlite \
  --orm prisma \
  --validation zod
```



### Config

```bash
reposetup create --config reposetup.json
```



### Dry-run

```bash
reposetup create --config reposetup.json --dry-run
```

Dry-run must:

- resolve exactly as real execution would;
- display ordered operations;
- display warnings;
- perform no mutations;
- execute no install/setup commands.



## 3. `reposetup add`

```bash
reposetup add prisma
```

Process:

```text
Locate project
↓
Detect runtime/framework/package manager/integrations
↓
Resolve requested integration against detected context
↓
Calculate missing operations only
↓
Show warnings
↓
Confirm unless --yes
↓
Execute
↓
Verify
```

Options:

```text
--dry-run
--yes
--package-manager
--verbose
```



## 4. `reposetup remove`

Removal is dangerous.

v1 may implement only integrations with explicitly safe removal recipes.

If safe removal is not known:

```text
RepoSetup cannot safely remove this integration automatically.
```

Never reverse arbitrary installation steps heuristically.

## 5. `reposetup search`

```bash
reposetup search prisma
reposetup search --category orm
```

Output compact registry results.

No network required for built-in registry.

## 6. `reposetup info`

```bash
reposetup info prisma
```

Output:

- name;
- category;
- status;
- description;
- requirements;
- recommendations;
- conflicts;
- supported contexts;
- available options;
- verified date;
- official docs link.



## 7. `reposetup stack`

Detect current project and render:

```text
Runtime        Node.js
Package mgr    pnpm
Framework      Next.js
Language       TypeScript
Styling        Tailwind CSS
Database       PostgreSQL (likely)
ORM            Prisma
Validation     Zod
Testing        Vitest
```

Include confidence when not certain.

## 8. `reposetup doctor`

Doctor is read-only by default.

Checks:

- runtime exists;
- package manager exists;
- selected/detected dependencies exist;
- expected config exists;
- required env variable names are represented where appropriate;
- verification commands/checks pass.

Exit codes should distinguish healthy vs issues.

## 9. `reposetup export`

Creates `reposetup.json` representing the detected or known stack.

Do not include:

- secrets;
- local absolute paths unless unavoidable;
- arbitrary commands.



## 10. `reposetup import`

Alias/flow for applying a known declarative config to a target context may be considered, but `create --config` is canonical for new projects.

## 11. Global flags

Recommended:

```text
--help
--version
--verbose
--quiet
--no-color
```

Mutating commands:

```text
--dry-run
--yes
```



## 12. Exit codes

Suggested initial contract:

```text
0 success
1 general execution failure
2 invalid input/config
3 compatibility/resolution failure
4 prerequisite missing
5 verification failure
```

Document before v1 stable and avoid changing casually.

## 13. Terminal UX

Default output should be concise.

Verbose mode includes:

- resolved config;
- operation IDs;
- command details;
- detection evidence;
- timing if useful.

Interactive prompt library: `@inquirer/prompts`.

Ink is optional later for a richer explorer but must not be required for basic functionality.

---



# Project Detection Specification



## Goal

RepoSetup must understand supported existing projects sufficiently to power:

- `add`;
- `stack`;
- `doctor`;
- `export`.



## Detection order

1. locate project root;
2. inspect lockfiles/package manifests;
3. detect package manager;
4. detect runtime/ecosystem;
5. detect framework;
6. detect supported integrations;
7. collect evidence/confidence.



## Node project evidence

Inspect:

- `package.json`;
- `pnpm-lock.yaml`;
- `package-lock.json`;
- `yarn.lock`;
- `bun.lock` / relevant Bun lockfile;
- framework config files;
- known dependencies.

Do not infer package manager from a globally installed tool if a lockfile clearly identifies the project manager.

## Python project evidence

Inspect:

- `pyproject.toml`;
- `uv.lock`;
- `requirements.txt`;
- relevant tool config;
- known package directories/configs.



## Framework examples



### Next.js

Evidence may include:

- `next` dependency;
- `next.config.*`;
- app/pages structure as supporting evidence.



### Vite React

Evidence may include:

- `vite` and React dependencies;
- Vite config;
- React plugin.



### FastAPI

Evidence should rely primarily on declared dependencies/project configuration, not source-code guessing.

## Integration evidence

Each integration owns detection rules where practical.

Example Prisma:

- Prisma package dependency;
- `prisma/schema.prisma`.

Example Tailwind:

- Tailwind dependency;
- framework-specific CSS/config evidence.



## Confidence

Return evidence:

```ts
interface DetectionResult {
  detected: boolean;
  confidence: "certain" | "likely" | "possible";
  evidence: DetectionEvidence[];
}
```

Never hide ambiguous evidence.

## Read-only requirement

Detection never mutates files.

---



# Security and Safety Requirements

RepoSetup executes tools on developer machines. Safety is a product requirement.

## 1. Declarative configs only

`reposetup.json` may describe:

- runtime;
- package manager;
- framework;
- known integration IDs;
- validated integration options.

It may not contain:

- raw shell scripts;
- arbitrary commands;
- JavaScript callbacks;
- URLs to executable scripts;
- postinstall hooks supplied by config authors;
- arbitrary absolute write paths.



## 2. Process execution

Prefer:

```ts
execa("pnpm", ["add", "zod"], { cwd })
```

Never:

```ts
exec(`pnpm add ${userValue}`)
```

unless a specifically reviewed shell requirement exists.

## 3. Project paths

All project-scoped file operations must remain inside the normalized target project root.

Block path traversal.

## 4. Overwrites

No silent overwrites.

Operations declare behavior:

- fail if exists;
- create if missing;
- merge;
- overwrite only when explicitly safe and expected.

For existing projects, prefer structured/AST-aware edits when feasible.

## 5. Secrets

Never store real secrets in exported configuration.

Generate:

```env
DATABASE_URL="<DATABASE_CONNECTION_STRING>"
```

rather than a real credential.

## 6. Prerequisites

RepoSetup v1 does not silently install system-level prerequisites.

If Node/Python/Docker/database server is missing, diagnose and explain.

Do not invoke sudo/admin installation automatically.

## 7. Network

Operations should state whether they require network access.

Dry-run must not perform network-dependent installation.

Registry search in v1 uses built-in local metadata.

## 8. Imported configs

All imported configs:

1. parse;
2. schema validate;
3. lookup integration IDs against trusted built-in registry;
4. validate integration options;
5. resolve compatibility;
6. only then generate operations.



## 9. Logs

Avoid logging:

- access tokens;
- environment variable values;
- credentials;
- full secret-bearing URLs.

Redact when necessary.

## 10. Failure behavior

On command failure:

- stop dependent operations;
- show which operation failed;
- preserve logs;
- never falsely report success;
- explain whether partial changes were made.

Full transactional rollback is not required for v1, but operations should be designed to support recovery later.

---



# RepoSetup Implementation Plan for Cursor

Implement sequentially.

Do not start later phases until the acceptance gate for the current phase passes.

---



## Phase 0 — Repository foundation

Create:

- pnpm workspace;
- TypeScript base config;
- packages/core;
- packages/registry;
- packages/integrations;
- packages/cli;
- Vitest;
- lint/format setup;
- build scripts;
- CI skeleton.



### Gate

- `pnpm install` succeeds;
- `pnpm build` succeeds;
- `pnpm test` succeeds;
- `pnpm typecheck` succeeds;
- `pnpm lint` succeeds.

---



## Phase 1 — Domain model and schemas

Implement:

- `RepoSetupConfig`;
- Zod schemas;
- integration categories;
- relationship models;
- operation discriminated union;
- `ResolutionResult`;
- stable error model.

No integration-specific execution yet.

### Gate

Schema tests cover valid and invalid configs.

---



## Phase 2 — Registry

Implement:

- register;
- get;
- list;
- search;
- byCategory;
- registry validation;
- duplicate detection;
- missing reference detection;
- dependency cycle validation.

Use small fake integrations in tests.

### Gate

Registry validation is deterministic and fully tested.

---



## Phase 3 — Resolver

Implement:

- configuration normalization;
- requirement resolution;
- conflict detection;
- recommendation collection;
- support checks;
- dependency graph;
- topological sort.



### Gate

Tests prove:

- missing requirement fails;
- conflict fails;
- recommendations do not behave as requirements;
- valid graph produces stable order;
- cycles fail.

---



## Phase 4 — Planner

Implement integration planning into typed operations.

Use fake/test integrations first.

Implement plan validation.

### Gate

Same config + registry context produces stable operation sequence.

---



## Phase 5 — CLI skeleton + dry-run

Use Commander.js.

Commands initially:

- create;
- search;
- info;
- registry validate.

Use Inquirer for interactive `create`.

Implement `--dry-run`.

No real install execution required yet.

### Gate

A config can flow:
CLI -> validation -> resolver -> plan -> human-readable dry-run.

Dry-run test proves zero mutations.

---



## Phase 6 — Package manager adapters

Implement:

- npm;
- pnpm;
- uv;
- pip.

Bun can follow after core JavaScript path is stable.

Adapters produce command operations.

### Gate

Unit tests verify command/arg output for each supported action.

---



## Phase 7 — First framework and integrations

Implement only:

- Node prerequisite detection;
- pnpm/npm;
- Next.js;
- TypeScript option;
- Tailwind;
- SQLite;
- Prisma;
- Zod;
- Vitest;
- Prettier.

Research every external command from current official docs before coding it.

### Gate

Golden Next.js/SQLite stack has a correct dry-run plan.

---



## Phase 8 — Executor

Implement:

- filesystem boundary;
- safe process runner;
- create directory/file;
- install package;
- run command;
- JSON mutation;
- env-example mutation;
- logging;
- failure propagation.



### Gate

Test executor with fixtures/fake processes, then run controlled real integration test.

---



## Phase 9 — First complete golden stack

Prove:

```text
Next.js
TypeScript
pnpm
Tailwind
SQLite
Prisma
Zod
Vitest
Prettier
```



### Gate

Generated project:

- installs;
- builds/typechecks as appropriate;
- Prisma setup verifies;
- tests/config load;
- no manual repair is required for the guaranteed path.

---



## Phase 10 — Project detection

Implement:

- project root discovery;
- Node package manager detection;
- Python package manager detection;
- framework detection;
- integration detection API.

Add:

- `stack`.



### Gate

Fixture projects are identified correctly.

---



## Phase 11 — `add`

Implement delta planning for existing projects.

Start with:

- Zod;
- Prisma where supported;
- Vitest;
- Prettier.

Do not support an integration's `add` path until tested.

### Gate

Adding an already installed integration is idempotent or safely reports no-op.

---



## Phase 12 — `doctor`

Implement read-only health checks.

### Gate

Doctor detects intentionally broken fixtures.

---



## Phase 13 — Expand JavaScript ecosystem

Add:

- React + Vite;
- Express;
- Fastify;
- PostgreSQL;
- MongoDB;
- Drizzle;
- Mongoose;
- Playwright;
- ESLint;
- shadcn/ui;
- Docker/Compose;
- GitHub Actions.

One integration at a time with tests.

---



## Phase 14 — Python ecosystem

Add:

- Python detection;
- uv;
- pip;
- FastAPI;
- Flask;
- Pydantic;
- SQLAlchemy;
- Alembic;
- pytest;
- Ruff;
- PostgreSQL integration path;
- Docker path.



### Gate

FastAPI and Flask golden stacks pass.

---



## Phase 15 — Export/config stability

Implement:

- `export`;
- stable schema version 1;
- migration policy documentation.



### Gate

Exported config can recreate supported golden stack.

---



## Phase 16 — Remove support

Implement only for integrations with explicit safe removal recipes.

Never assume install plan can simply be reversed.

---



## Phase 17 — v1 hardening

Before v1 stable:

- all golden stacks passing;
- security review;
- Windows/macOS/Linux CI where possible;
- docs;
- contribution guide;
- release automation;
- package publishing;
- changelog;
- integration freshness metadata.

Do not build the website in this phase.

---



# RepoSetup v1 Acceptance Criteria



## Core

- [ ] Invalid configs are rejected before planning.
- [ ] Unknown integration IDs are rejected.
- [ ] Missing requirements fail clearly.
- [ ] Conflicts fail clearly.
- [ ] Recommendations do not block installation.
- [ ] Dependency cycles are rejected.
- [ ] Ordering is stable.
- [ ] Plans contain typed operations only.
- [ ] Core performs no process execution.



## Registry

- [ ] IDs are unique.
- [ ] References point to valid integrations/categories.
- [ ] Search works by ID/name/category/keywords.
- [ ] `info` data is complete for stable integrations.
- [ ] Stable integrations include official docs and verification metadata.



## CLI

- [ ] `reposetup --help` works.
- [ ] `reposetup --version` works.
- [ ] `reposetup create` works interactively.
- [ ] `reposetup create --config` works non-interactively.
- [ ] `reposetup create --dry-run` performs zero mutation.
- [ ] `reposetup search` works offline.
- [ ] `reposetup info` works offline.
- [ ] User-facing errors contain actionable explanations.



## Executor

- [ ] Commands are executed with separate executable/arg representation.
- [ ] Project name validation blocks injection/path traversal cases.
- [ ] File operations stay inside project boundary.
- [ ] Existing files are not silently overwritten.
- [ ] Command failure stops dependent work.
- [ ] Partial failure is reported truthfully.
- [ ] Secrets are not logged.



## Detection

- [ ] npm project detection.
- [ ] pnpm project detection.
- [ ] Node runtime detection.
- [ ] Python runtime detection.
- [ ] Next.js detection.
- [ ] React/Vite detection.
- [ ] FastAPI detection.
- [ ] Flask detection.
- [ ] Prisma detection.
- [ ] SQLAlchemy detection.
- [ ] Ambiguous detection reports confidence.



## Add

- [ ] Add computes a delta rather than recreating project.
- [ ] Adding already present integration does not duplicate setup.
- [ ] Missing requirements are resolved before mutation.
- [ ] Dry-run works for add.



## Doctor

- [ ] Healthy fixture returns success.
- [ ] Missing package is reported.
- [ ] Missing expected config file is reported.
- [ ] Missing prerequisite is reported.
- [ ] Verification failure is reported.
- [ ] Doctor is read-only.



## Export

- [ ] Export contains no secrets.
- [ ] Export is schema-valid.
- [ ] Exported stable golden stack can be consumed by `create --config`.



## Golden stacks

- [ ] Next.js full-stack path passes.
- [ ] React/Vite frontend path passes.
- [ ] Express API path passes.
- [ ] FastAPI path passes.
- [ ] Flask path passes.



## Release quality

- [ ] Linux CI passes.
- [ ] macOS CI passes for supported paths.
- [ ] Windows CI passes for supported paths.
- [ ] README quickstart is tested.
- [ ] Every stable integration has tests.
- [ ] No website/backend dependency exists.

---



# RepoSetup v1 Integration Registry

This document defines the planned v1 integration set. "Planned" does not mean "stable"; an integration becomes stable only after meeting the integration Definition of Done.


| ID             | Name           | Category                | Initial priority |
| -------------- | -------------- | ----------------------- | ---------------- |
| node           | Node.js        | runtime                 | P0               |
| python         | Python         | runtime                 | P0               |
| npm            | npm            | package-manager         | P0               |
| pnpm           | pnpm           | package-manager         | P0               |
| bun            | Bun            | package-manager/runtime | P1               |
| uv             | uv             | package-manager         | P0               |
| pip            | pip            | package-manager         | P0               |
| nextjs         | Next.js        | framework               | P0               |
| react-vite     | React + Vite   | framework               | P0               |
| express        | Express        | backend-framework       | P0               |
| fastify        | Fastify        | backend-framework       | P1               |
| fastapi        | FastAPI        | backend-framework       | P0               |
| flask          | Flask          | backend-framework       | P0               |
| tailwind       | Tailwind CSS   | styling                 | P0               |
| shadcn         | shadcn/ui      | ui                      | P1               |
| postgresql     | PostgreSQL     | database                | P0               |
| sqlite         | SQLite         | database                | P0               |
| mongodb        | MongoDB        | database                | P1               |
| prisma         | Prisma         | orm                     | P0               |
| drizzle        | Drizzle ORM    | orm                     | P1               |
| mongoose       | Mongoose       | orm                     | P1               |
| sqlalchemy     | SQLAlchemy     | orm                     | P0               |
| alembic        | Alembic        | migration               | P0               |
| zod            | Zod            | validation              | P0               |
| pydantic       | Pydantic       | validation              | P0               |
| vitest         | Vitest         | testing                 | P0               |
| playwright     | Playwright     | testing                 | P1               |
| pytest         | pytest         | testing                 | P0               |
| eslint         | ESLint         | linting                 | P1               |
| prettier       | Prettier       | formatting              | P0               |
| ruff           | Ruff           | linting/formatting      | P0               |
| docker         | Docker         | infrastructure          | P1               |
| docker-compose | Docker Compose | infrastructure          | P1               |
| github-actions | GitHub Actions | ci                      | P1               |




## P0 implementation order

Do not implement all P0 integrations simultaneously.

Recommended sequence:

1. Node + npm/pnpm
2. Next.js
3. Tailwind
4. SQLite
5. Prisma
6. Zod
7. Vitest
8. Prettier
9. React + Vite
10. Express
11. PostgreSQL
12. Python + uv/pip
13. FastAPI
14. Flask
15. Pydantic
16. SQLAlchemy
17. Alembic
18. pytest
19. Ruff

P1 follows only after the related base ecosystem is stable.