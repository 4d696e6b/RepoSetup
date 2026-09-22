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
3. `docs/specification-documentation/product-docs/PRODUCT_REQUIREMENTS.md`
4. `docs/specification-documentation/product-docs/ARCHITECTURE.md`
5. `docs/specification-documentation/product-docs/INTEGRATION_SYSTEM.md`
6. `docs/specification-documentation/product-docs/CLI_SPEC.md`
7. `docs/specification-documentation/implementing-docs/IMPLEMENTATION_PLAN.md`
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
9. Update `docs/specification-documentation/implementing-docs/IMPLEMENTATION_STATUS.md`.
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
