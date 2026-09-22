# RepoSetup Implementation Plan for Cursor

For the proposed next release, follow [Roadmap to 0.2.0](./ROADMAP_0.2.0.md). It extends this historical Phase 0–18 plan with Phases 19–28 and stricter cross-platform, performance, usability, and release gates. Existing Phase 18 qualification gaps remain open until proven.

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

## Phase 18 — Release Hardening and Prerelease Qualification

Transform the Phase 17 tree into a qualified public prerelease. Target version: `0.1.0-alpha.1`. This is not `1.0.0`.

Do not add integrations to increase catalog size. Do not build a website. Do not modify `main` until qualification succeeds. Do not npm-publish or push release tags from this phase unless the owner explicitly requests publication after every gate passes.

### 18.0 Documentation and baseline

Update source-of-truth docs. Record baseline `pnpm test`, `typecheck`, `lint`, `build`, and registry validation.

#### Gate
Docs describe Phase 18. Baseline commands pass.

### 18.1 Golden-stack real execution tests

Prove generated projects in isolated temporary directories. Separate generation from live database connectivity.

#### Gate
Harness exists (`pnpm test:e2e`, `pnpm test:golden`). Golden A–E have execution evidence or an explicit documented blocker.

### 18.2 Cross-platform CI qualification

Split CI: fast PR checks, OS matrix, optional golden job. Test Node minimum and primary where practical.

#### Gate
Workflows exist for Linux, macOS, and Windows without an uncontrolled Cartesian explosion.

### 18.3 npm package/artifact qualification

Public packages use `0.1.0-alpha.1`. Packed CLI works outside the monorepo.

#### Gate
Tarball install runs `--help`, `--version`, `search`, `info`, and `create --dry-run`.

### 18.4 Failure-path and safety qualification

Cover invalid config, missing tools, path traversal, dry-run non-mutation, and add idempotency.

#### Gate
Failure and dry-run tests pass. Command-safety audit is recorded.

### 18.5 Integration maturity classification

Statuses: `experimental`, `candidate`, `stable`, `deprecated`. Promote only with evidence.

#### Gate
Registry, `info`, and docs show honest maturity. No fabricated stable labels.

### 18.6 Release documentation

README, CONTRIBUTING, SECURITY.md, CHANGELOG, LICENSE, issue templates, release notes.

#### Gate
Docs distinguish implemented / experimental / release-qualified / stable.

### 18.7 Release automation

Controlled release workflow (tag or `workflow_dispatch`). OIDC-ready publish job. No tokens in the repo. Publish remains opt-in.

#### Gate
Qualification jobs run before any publish job. Default trigger does not publish.

### 18.8 Alpha release candidate validation

Create `release/0.1.0-alpha.1` from qualified `dev`. Do not merge `main` on a failed gate.

#### Gate
Release-blocking checklist in `docs/specification-documentation/implementing-docs/ACCEPTANCE_TESTS.md` is either checked with evidence or Phase 18 stays incomplete.
