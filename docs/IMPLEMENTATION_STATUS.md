# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 12 — Doctor** (complete)

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
- [ ] Phase 13 — JS ecosystem expansion
- [ ] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 12 adds `reposetup doctor` as a read-only health check for detected projects.

Doctor checks node, npm, and pnpm on PATH when those tools are detected, then runs each detected integration's `verify()`. Checks cover missing packages, expected config files, and `.env.example` placeholders. Doctor never writes files, never runs generate/build, and has no `--fix`. Exit 0 when healthy, 2 when no project is found, 4 when a prerequisite is missing, and 5 when verification fails.

Acceptance gate passed locally:

- Healthy Next.js fixture succeeds
- Missing `next` package is reported
- Missing Prettier config is reported
- Missing Node.js on PATH is reported
- Prisma without `DATABASE_URL` in `.env.example` is reported
- Doctor does not mutate fixtures
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 12. Integrations remain experimental. `export` and `remove` still need later phases. PATH checks cover node/npm/pnpm only, matching Phase 8.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7 integrations stable. DoD-stable requires detection/verify tests in later phases.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-12-doctor`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
