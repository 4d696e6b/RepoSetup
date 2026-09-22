# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 18 — Release Hardening and Prerelease Qualification** (in progress)

## Current release candidate

`0.1.0-alpha.1` (not `1.0.0`)

## Phase status

- [x] Phase 0 — Repository foundation
- [x] Phase 1 — Domain model and schemas
- [x] Phase 2 — Registry
- [x] Phase 3 — Resolver
- [x] Phase 4 — Planner
- [x] Phase 5 — CLI skeleton + dry-run
- [x] Phase 6 — Package-manager adapters
- [x] Phase 7 — First framework/integrations
- [x] Phase 8 — Executor
- [x] Phase 9 — First complete golden stack
- [x] Phase 10 — Project detection
- [x] Phase 11 — Add
- [x] Phase 12 — Doctor
- [x] Phase 13 — JS ecosystem expansion
- [x] Phase 14 — Python ecosystem
- [x] Phase 15 — Export/config stability
- [x] Phase 16 — Safe remove support
- [x] Phase 17 — v1 hardening
- [ ] Phase 18 — Release Hardening and Prerelease Qualification
  - [ ] 18.0 Documentation and baseline
  - [ ] 18.1 Golden-stack real execution tests
  - [ ] 18.2 Cross-platform CI qualification
  - [ ] 18.3 npm package/artifact qualification
  - [ ] 18.4 Failure-path and safety qualification
  - [ ] 18.5 Integration maturity classification
  - [ ] 18.6 Release documentation
  - [ ] 18.7 Release automation
  - [ ] 18.8 Alpha release candidate validation

## Last completed work

Phase 17 is complete on `dev`. Phase 18.0 baseline (2026-09-22, this workspace):

| Check | Result |
| --- | --- |
| `pnpm test` | pass (311 tests; Next.js execute skipped unless `REPOSETUP_GOLDEN_EXECUTE=1`) |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm build` | pass |
| `reposetup registry validate` | pass (33 integrations) |
| Node requirement | `>=20` (`engines`); local `22.12.0` |
| pnpm requirement | `12.5.1` |
| Package versions | `0.0.0` before 18.3 |
| Privacy | all workspace packages `private: true` before 18.3 |

## Known blockers

- Developer volume ~551 MiB free. Full Next.js execute can fail with `ENOSPC`.
- GitHub Actions matrix has not been observed to run in this workspace.
- No npm ownership or trusted-publisher config exists here.
- `main` stays pre-Phase 0 until qualification succeeds.
- Integrations must not be labeled `stable` without real execute + platform evidence.

## Golden stacks proven

| Stack | Dry-run plan | Real execute |
| --- | --- | --- |
| Next.js / SQLite | yes | pending 18.1 |
| React + Vite | yes | pending 18.1 |
| Express / Postgres config | yes | pending 18.1 (no live DB) |
| FastAPI | yes | pending 18.1 |
| Flask | yes | pending 18.1 |

## OS environments proven

| OS | Local | GitHub Actions |
| --- | --- | --- |
| macOS | unit/lint/build (this host) | workflow defined, run pending |
| Linux | unit via previous ubuntu workflow | workflow defined, run pending |
| Windows | not run here | workflow defined, run pending |

## Integrations promoted to stable

None.

## Integrations remaining experimental

All 33 catalog IDs until 18.5 classifies candidates. Bun is not in the catalog.

## Release artifact status

Not packed for 0.1.0-alpha.1 yet.

## npm publishing status

Not published. Do not publish from this phase unless every gate passes and the owner requests it.

## Notes

Do not mark Phase 18 complete unless the Release Qualification gates in `docs/ACCEPTANCE_TESTS.md` pass.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-18-hardening`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
