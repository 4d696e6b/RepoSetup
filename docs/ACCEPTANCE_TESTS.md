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
