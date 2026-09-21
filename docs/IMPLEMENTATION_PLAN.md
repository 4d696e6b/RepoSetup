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
