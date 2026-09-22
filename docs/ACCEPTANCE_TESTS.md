# RepoSetup v1 Acceptance Criteria

Checked items have automated coverage in this tree. Unchecked items wait on a real v1 stable release or a GitHub Actions run that has not happened in this workspace.

## Core

- [x] Invalid configs are rejected before planning.
- [x] Unknown integration IDs are rejected.
- [x] Missing requirements fail clearly.
- [x] Conflicts fail clearly.
- [x] Recommendations do not block installation.
- [x] Dependency cycles are rejected.
- [x] Ordering is stable.
- [x] Plans contain typed operations only.
- [x] Core performs no process execution.

## Registry

- [x] IDs are unique.
- [x] References point to valid integrations/categories.
- [x] Search works by ID/name/category/keywords.
- [ ] `info` data is complete for stable integrations.
- [ ] Stable integrations include official docs and verification metadata.

Experimental integrations already record `documentationUrl` and `verifiedAt`. None are marked stable.

## CLI

- [x] `reposetup --help` works.
- [x] `reposetup --version` works.
- [x] `reposetup create` works interactively.
- [x] `reposetup create --config` works non-interactively.
- [x] `reposetup create --dry-run` performs zero mutation.
- [x] `reposetup search` works offline.
- [x] `reposetup info` works offline.
- [x] User-facing errors contain actionable explanations.

## Executor

- [x] Commands are executed with separate executable/arg representation.
- [x] Project name validation blocks injection/path traversal cases.
- [x] File operations stay inside project boundary.
- [x] Existing files are not silently overwritten.
- [x] Command failure stops dependent work.
- [x] Partial failure is reported truthfully.
- [x] Secrets are not logged.

## Detection

- [x] npm project detection.
- [x] pnpm project detection.
- [x] Node runtime detection.
- [x] Python runtime detection.
- [x] Next.js detection.
- [x] React/Vite detection.
- [x] FastAPI detection.
- [x] Flask detection.
- [x] Prisma detection.
- [x] SQLAlchemy detection.
- [x] Ambiguous detection reports confidence.

## Add

- [x] Add computes a delta rather than recreating project.
- [x] Adding already present integration does not duplicate setup.
- [x] Missing requirements are resolved before mutation.
- [x] Dry-run works for add.

## Doctor

- [x] Healthy fixture returns success.
- [x] Missing package is reported.
- [x] Missing expected config file is reported.
- [x] Missing prerequisite is reported.
- [x] Verification failure is reported.
- [x] Doctor is read-only.

## Export

- [x] Export contains no secrets.
- [x] Export is schema-valid.
- [x] Exported stable golden stack can be consumed by `create --config`.

The golden examples are still experimental stacks. Export round-trips them through `create --config`.

## Golden stacks

- [x] Next.js full-stack path passes.
- [x] React/Vite frontend path passes.
- [x] Express API path passes.
- [x] FastAPI path passes.
- [x] Flask path passes.

Dry-run plans pass in CI. The Next.js execute path is opt-in (`REPOSETUP_GOLDEN_EXECUTE=1`) and skipped on Windows.

## Release quality

- [x] Linux CI passes.
- [x] macOS CI passes for supported paths.
- [x] Windows CI passes for supported paths.
- [x] README quickstart is tested.
- [ ] Every stable integration has tests.
- [x] No website/backend dependency exists.

Linux/macOS/Windows jobs are defined in `.github/workflows/ci.yml`. Windows skips the Next.js execute test. First GitHub matrix results depend on a remote run.

## Release Qualification

Phase 18 gates for `0.1.0-alpha.1`. Unchecked items block calling Phase 18 complete.

- [ ] unit tests pass
- [ ] typecheck passes
- [ ] lint passes
- [ ] build passes
- [ ] registry validation passes
- [ ] packaged CLI works outside monorepo
- [ ] `--version` works
- [ ] `--help` works
- [ ] Next.js golden stack passes
- [ ] React/Vite golden stack passes
- [ ] FastAPI golden stack passes
- [ ] Flask golden stack passes
- [ ] Express generation path passes
- [ ] Linux qualification passes
- [ ] macOS qualification passes
- [ ] Windows qualification passes for advertised features
- [ ] dry-run mutation tests pass
- [ ] injection/path tests pass
- [ ] failure behavior tests pass
- [ ] add idempotency tests pass
- [ ] README finished
- [ ] SECURITY.md finished
- [ ] CONTRIBUTING.md finished
- [ ] CHANGELOG.md finished
- [ ] LICENSE confirmed
- [ ] package metadata correct
- [ ] npm tarball inspected/tested
- [ ] release workflow exists
- [ ] release process documented

