# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 15 — Export/config stability** (complete)

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
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 15 adds `reposetup export` and keeps `schemaVersion` 1 as the only accepted config version. Export writes `reposetup.json` from the detected stack, omits secrets and absolute paths, and refuses to overwrite an existing file unless `--yes` is passed. `--dry-run` prints the JSON without writing. Exported Next.js/SQLite and FastAPI fixtures parse and produce a valid `create --config` plan.

Migration policy: `docs/CONFIG_MIGRATION.md`. Unsupported `schemaVersion` values are rejected; RepoSetup does not rewrite or download a replacement config.

Acceptance gate passed locally:

- Exported Next.js/SQLite config recreates the golden dry-run plan
- Exported FastAPI config is schema-valid and plans successfully
- Export does not copy `.env.example` values
- Existing `reposetup.json` is not overwritten without `--yes`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 15. Integrations remain experimental. `remove` still needs a later phase. `import` is not a separate command; `create --config` applies exported configs.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7, Phase 13, or Phase 14 integrations stable. DoD-stable requires detection/verify tests in later phases plus a tested compatible execute path.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-15-export`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
