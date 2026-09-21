# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 7 — First framework/integrations** (complete)

## Phase status

- [x] Phase 0 — Repository foundation
- [x] Phase 1 — Domain model and schemas
- [x] Phase 2 — Registry
- [x] Phase 3 — Resolver
- [x] Phase 4 — Planner
- [x] Phase 5 — CLI skeleton + dry-run
- [x] Phase 6 — Package-manager adapters
- [x] Phase 7 — First framework/integrations
- [ ] Phase 8 — Executor
- [ ] Phase 9 — First complete golden stack
- [ ] Phase 10 — Project detection
- [ ] Phase 11 — Add
- [ ] Phase 12 — Doctor
- [ ] Phase 13 — JS ecosystem expansion
- [ ] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 7 built-in integrations live in `@reposetup/integrations` and emit typed operations only. The CLI default registry is `createBuiltInRegistry()`. Status is experimental. Detection and verify hooks are not implemented.

Registered IDs: `node`, `npm`, `pnpm`, `nextjs`, `tailwind`, `sqlite`, `prisma`, `zod`, `vitest`, `prettier`.

Resolver auto-includes registered `runtime.id` and `packageManager` integrations when those IDs exist in the registry.

External commands were verified from official docs on 2026-09-21:

- create-next-app: `--ts`/`--js`, `--eslint`, `--app`, `--no-tailwind`, `--use-pnpm`/`--use-npm`, `--yes`
- Tailwind v4 Next.js: `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `postcss.config.mjs`
- Prisma v7 SQLite: `prisma init --datasource-provider sqlite --output ../generated/prisma`
- Zod: `pnpm add zod` / `npm install zod`
- Vitest (Next.js guide): official test packages plus `vitest.config.mts`
- Prettier: `--save-dev --save-exact prettier`, `.prettierrc`, `.prettierignore`

create-next-app always receives `--no-tailwind` so the Tailwind integration owns v4 PostCSS setup. SQLite is file-based; RepoSetup does not install a database server.

Acceptance gate passed locally:

- Golden Next.js/SQLite dry-run plan is stable
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 7. Real install execution is Phase 8.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark these integrations stable. DoD-stable requires detection/verify tests in later phases.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-7-first-integrations`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
