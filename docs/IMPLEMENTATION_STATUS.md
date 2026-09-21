# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 11 — Add** (complete)

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
- [ ] Phase 12 — Doctor
- [ ] Phase 13 — JS ecosystem expansion
- [ ] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 11 adds `reposetup add <id>` with delta planning for existing projects.

Only integrations marked `addable` can be added: Zod, Prisma (when SQLite is already detected), Vitest, and Prettier. The planner resolves against the detected stack, generates operations for the requested integration only, then drops steps that are already satisfied. Adding an installed integration is a no-op. `--dry-run` mutates nothing. `--yes` skips confirmation.

Acceptance gate passed locally:

- Already-installed Zod is a no-op
- Prisma add requires detected SQLite and does not re-run `prisma init` when a schema exists
- Next.js is not addable
- `pnpm build`
- `pnpm test` (Phase 11 packages; golden install test unchanged)
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 11. Integrations remain experimental. `doctor` and `export` still need later phases.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7 integrations stable. DoD-stable requires detection/verify tests in later phases.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-11-add`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
