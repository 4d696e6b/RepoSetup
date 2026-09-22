# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 18 — Release Hardening and Prerelease Qualification** (in progress)

## Current release candidate

`0.1.0-alpha.1` (not `1.0.0`) on `feat/phase-18-hardening`. `main` is untouched.

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
  - [x] 18.0 Documentation and baseline
  - [x] 18.1 Golden-stack real execution tests (harness + B/C local; A/D/E blocked here)
  - [x] 18.2 Cross-platform CI qualification (workflows added; remote run pending)
  - [x] 18.3 npm package/artifact qualification
  - [x] 18.4 Failure-path and safety qualification
  - [x] 18.5 Integration maturity classification (candidates; none stable)
  - [x] 18.6 Release documentation
  - [x] 18.7 Release automation (publish remains opt-in / unconfigured)
  - [ ] 18.8 Alpha release candidate validation (Next.js, FastAPI, Flask, OS matrix still open)

## Last completed work

Phase 18 local hardening (2026-09-22):

| Check | Result |
| --- | --- |
| `pnpm test` | pass (150+15+98+68; Next.js execute skipped unless `REPOSETUP_GOLDEN_EXECUTE=1`) |
| `pnpm typecheck` | pass (after `pnpm build`) |
| `pnpm lint` | pass |
| `pnpm build` | pass |
| `pnpm registry:validate` | pass (33 integrations) |
| `pnpm test:e2e` | pass (12 tests including pack-install) |
| `pnpm test:golden` | React/Vite and Express generation pass; Next.js skipped (disk); FastAPI/Flask skipped (no `uv`) |
| Node requirement | `>=20` (`engines`); local `22.12.0`; Vite/Next need 20.19+/20.9+ |
| pnpm requirement | `12.5.1` |
| Package versions | `0.1.0-alpha.1` |
| Privacy | public packages not `private`; root workspace private |

## Known blockers

- Developer volume ~475 MiB free. Next.js execute is skipped locally.
- `uv` is not installed here, so FastAPI/Flask goldens did not run.
- GitHub Actions platform/golden jobs have not been observed in this workspace.
- No npm ownership or trusted-publisher config exists here.
- `main` stays pre-Phase 0 until remaining gates pass.
- No integration is `stable`.

## Golden stacks proven

| Stack | Dry-run plan | Real execute |
| --- | --- | --- |
| Next.js / SQLite | yes | pending CI / `REPOSETUP_GOLDEN_NEXT=1` |
| React + Vite | yes | yes (this host, `pnpm test:golden`) |
| Express / Postgres config | yes | yes generation + `tsc --noEmit`; no live DB |
| FastAPI | yes | pending `uv` |
| Flask | yes | pending `uv` |

## OS environments proven

| OS | Local | GitHub Actions |
| --- | --- | --- |
| macOS | unit/lint/build/e2e/golden B+C (this host) | platform workflow defined, run pending |
| Linux | not run here | ci + platform + golden workflows defined |
| Windows | not run here | platform workflow defined, run pending |

## Integrations promoted to stable

None.

## Integrations remaining experimental

fastify, shadcn, postgresql, mongodb, drizzle, mongoose, playwright, docker, docker-compose, github-actions.

Candidates (not stable): node, python, npm, pnpm, uv, pip, nextjs, react-vite, express, fastapi, flask, tailwind, sqlite, prisma, zod, prettier, vitest, pydantic, pytest, ruff, sqlalchemy, alembic, eslint.

## Release artifact status

`pnpm test:e2e` packed all four packages, installed them with npm in a temp project, and ran `--help`, `--version`, `search`, `info`, and `create --dry-run`.

## npm publishing status

Not published. Release workflow publish job is opt-in (`workflow_dispatch` + `publish=true`) and needs npm trusted publisher setup.

## Notes

Do not mark Phase 18 complete unless the remaining Release Qualification gates pass.

Work is on `feat/phase-18-hardening`. `main` remains the pre-Phase 0 baseline.
