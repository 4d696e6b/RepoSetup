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

Doctor reports problems and suggested fixes. The inspected baseline already implements explicit `doctor --fix --config <path>` for reviewed, file-only reconstruction of absent known recipe files. It preserves existing files and does not install dependencies. See [CLI specification](./CLI_SPEC.md).

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

Alpha `0.1.0` qualifies a **subset** of these stacks (see README). Catalog entries that appear in this list are not automatically `stable`.

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

- websites outside the owner-approved 0.3.0 companion information/selection scope;
- hosted API;
- Firebase backend;
- cloud account;
- cloud preset sharing;
- remote plugin marketplace;
- package ratings;
- AI-selected stacks;
- AI-generated commands;
- AI-generated installation plans;
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

## 0.3.0 companion information center

The owner explicitly authorized a local English-first companion website in `apps/website`, superseding the earlier website non-goal for 0.3.0. It teaches curated integration choices and exports bounded declarative selections. The local CLI remains authoritative for detection, validation, planning, confirmation and execution. Accounts, payments, secrets, project uploads, browser installation, remote executable plugins, hosted executable registries, arbitrary scripts and deployment remain excluded from this candidate integration. See the 0.3.0 website and beginner-guidance plans.

## Experimental 0.4.0 coding tasks

The owner-authorized task compiler adds a separate coding TaskPlan domain; Milestone A specifies it without shipping task functionality. An existing agent or one configured managed provider may propose decomposition and bounded coding changes. Core validates requirements, scopes, dependencies and acceptance evidence; the executor alone applies changes and runs trusted checks. This permission does not extend to AI-selected stacks, AI-generated commands or AI-generated InstallationPlans.

The product goal is one implementation phase compiled into focused tasks, fresh bounded context, explainable capability/effort choices, sequential execution and failure-specific repair. Current-revision evidence and independent final acceptance determine success. Qualify a narrow TypeScript/Node profile with preinstalled dependencies first; preserve all existing stack, Python, selection and command behavior. Model capability and reasoning effort are separate variables.

Local functionality requires no AI credits. Portable handoff uses the caller's existing agent allowance; managed decomposition/coding requires provider usage allowance. Cost or quality benefits are hypotheses until the [frozen benchmark](../implementing-docs/TASK_BENCHMARK_0.4.0.md) produces evidence, including failed trials and compilation/repair overhead. Do not advertise supported managed execution before qualification.

The complete [task compiler contract](./TASK_COMPILER_0.4.0.md), [versioned contracts](./TASK_CONTRACTS_0.4.0.md) and [support profile](./TASK_SUPPORT_0.4.0.md) define this exception. No dependency installation, automatic rollback, parallel workers, MCP, remote executable plugins or website changes are authorized for 0.4.0.
