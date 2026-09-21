# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 9 — First complete golden stack** (complete)

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
- [ ] Phase 10 — Project detection
- [ ] Phase 11 — Add
- [ ] Phase 12 — Doctor
- [ ] Phase 13 — JS ecosystem expansion
- [ ] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 9 proves `examples/reposetup.next-sqlite.json` installs without manual repair.

create-next-app uses `--no-src-dir` and `--import-alias @/*` so later official Tailwind/Vitest paths stay under `app/`. Tailwind prepends `@import "tailwindcss"` in `app/globals.css`. Prisma follows the v7 SQLite guide: `prisma@prev`, `@prisma/client@7`, `prisma init --datasource-provider sqlite --output ../generated/prisma`, then `prisma generate`. Vitest loads its config with `vitest run --passWithNoTests`.

pnpm 12 ignored-build failures are handled through adapter `allowBuild` (`--allow-build=<name>` and `--allow-build=!better-sqlite3`). The plan does not add a direct `better-sqlite3` dependency or install node-gyp/Python.

Acceptance gate passed locally:

- Plan tests for the golden command sequence
- Controlled network install of the example stack, then `pnpm exec next build`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 9. Integrations remain experimental until later detection/verify work.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7 integrations stable. DoD-stable requires detection/verify tests in later phases.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-9-golden-stack`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
