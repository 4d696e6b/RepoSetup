# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 13 — JS ecosystem expansion** (complete)

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
- [ ] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 13 adds experimental JavaScript-ecosystem integrations with plan, detect, and verify coverage. RepoSetup still does not install Docker, PostgreSQL, MongoDB, or Playwright browsers.

New IDs: `react-vite`, `express`, `fastify`, `postgresql`, `mongodb`, `drizzle`, `mongoose`, `playwright`, `eslint`, `shadcn`, `docker`, `docker-compose`, `github-actions`. Prisma now plans SQLite or PostgreSQL. Tailwind and Vitest support React + Vite (and Vitest also supports Express/Fastify). A `framework` requirement is satisfied by `backend-framework` so Express/Fastify stacks can include Zod, Prisma, and Prettier without reordering Next.js package installs before `create-next-app`.

Example dry-run configs: `examples/reposetup.react-vite.json`, `examples/reposetup.express-postgres.json`, `examples/reposetup.fastify-mongo.json`.

Acceptance gate passed locally:

- Built-in registry validates with 23 integrations
- React + Vite, Express + PostgreSQL, and Fastify + Mongo example plans are valid
- Next.js/SQLite golden dry-run order is unchanged
- Conflicts reject Next.js + React + Vite and Prisma + Drizzle
- Doctor still does not mutate fixtures
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 13. Integrations remain experimental. `export` and `remove` still need later phases. PATH checks cover node/npm/pnpm only, matching Phase 8. Docker/Postgres/Mongo/browsers are documented, not installed.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7 or Phase 13 integrations stable. DoD-stable requires detection/verify tests in later phases plus a tested compatible execute path.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-13-js-ecosystem`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
