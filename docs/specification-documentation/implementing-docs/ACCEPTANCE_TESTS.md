# RepoSetup acceptance criteria

The checked Phase 0–18 entries below are historical coverage records. They do not establish the frozen `0.2.0` support contract. See [Phase 19 baseline and acceptance scope](./PHASE_19_BASELINE.md) for current source/artifact evidence, explicit blockers, and the replacement gates.

Historical unchecked entries describe what was unobserved at that checkpoint;
they are not current blockers. Individual integration promotion to `stable`
remains separate from qualifying a bounded recipe.

## Current 0.2.x automated acceptance — 2026-10-08

Evidence: [stability plan](./STABILITY_0.2.x.md) and
[machine-readable results](../release-docs/qualification/0.2.x-create-stability.json).
Product source `448beb4` is qualified; the patch is not published.

- [x] Reported named-folder Next.js file-mutation failure is reproduced and repaired.
- [x] Current, named and nested destinations have plan coverage; all twenty bare packed-npx solutions execute in nested destinations.
- [x] All six frameworks execute with npm/pnpm or isolated uv/pip, including TypeScript and JavaScript Node variants.
- [x] Fourteen real recipes pass creation and their generated build/test/import checks with no golden skips.
- [x] Next.js, FastAPI and Flask golden execution passes in the full matrix; historical local disk/uv limitations no longer block automated qualification.
- [x] Ubuntu 24.04 x64, macOS 15 arm64 and Windows Server 2025 x64 pass all twelve full jobs, 34 cases each (408 executions), with Python 3.12/3.13 and npm/pnpm.
- [x] All five packaged presets pass fifteen platform sessions and 117 checks, including three expected occupied-port refusals.
- [x] Windows/npm Next.js Vitest canonical-root regression passes in focused and full qualification.
- [x] Tailwind/shadcn initialization and build pass for Next.js/Vite in both Node languages; `components.json` existence is asserted.
- [x] Fastify/Drizzle and Express/Mongoose generated code builds/tests/imports as applicable; no live database connection is claimed.
- [x] Playwright initializes and lists generated tests with the selected manager's lockfile; no browser execution is claimed.
- [x] Local 959 unit tests, typecheck, lint, build and all 37 registry definitions pass.
- [x] Packed E2E passes 37 tests; one external release-artifact check is explicitly skipped and remains outside this result.
- [x] Corrected workflow writers produce parseable JSON on all matrix targets; the original Windows artifact trailer limitation is recorded.
- [ ] Maintainer review of the unresolved generated development-tool advisory is complete.
- [ ] Native Windows 11 and Linux arm64 qualification is complete.
- [ ] Live database/container and SQLAlchemy DBAPI connectivity is qualified.
- [ ] Actual Playwright browser journeys are qualified.
- [ ] A separately versioned patch is published and accepted from the npm registry.

The historical checklists below retain their original results. None of the above
checks promotes an integration ID to `stable` or qualifies every permutation.

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

## Historical 0.1.x release qualification

Phase 18 gates for `0.1.0`. Unchecked items block calling Phase 18 complete. GitHub source launch may proceed with documented blockers; it is not `1.0.0`.

- [x] unit tests pass
- [x] typecheck passes
- [x] lint passes
- [x] build passes
- [x] registry validation passes
- [x] packaged CLI works outside monorepo
- [x] `--version` works
- [x] `--help` works
- [ ] Next.js golden stack passes (CI / `REPOSETUP_GOLDEN_NEXT=1`; skipped locally — ~475 MiB free)
- [x] React/Vite golden stack passes (local `pnpm test:golden`)
- [ ] FastAPI golden stack passes (`uv` not installed in this workspace)
- [ ] Flask golden stack passes (`uv` not installed in this workspace)
- [x] Express generation path passes (local `pnpm test:golden`; no live PostgreSQL)
- [ ] Linux qualification passes
- [ ] macOS qualification passes
- [ ] Windows qualification passes for advertised features
- [x] dry-run mutation tests pass
- [x] injection/path tests pass
- [x] failure behavior tests pass
- [x] add idempotency tests pass
- [x] README finished
- [x] SECURITY.md finished
- [x] CONTRIBUTING.md finished
- [x] CHANGELOG.md finished
- [x] LICENSE confirmed
- [x] package metadata correct
- [x] npm tarball inspected/tested
- [x] release workflow exists
- [x] release process documented
