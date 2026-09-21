# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 4 — Planner** (not started)

## Phase status

- [x] Phase 0 — Repository foundation
- [x] Phase 1 — Domain model and schemas
- [x] Phase 2 — Registry
- [x] Phase 3 — Resolver
- [ ] Phase 4 — Planner
- [ ] Phase 5 — CLI skeleton + dry-run
- [ ] Phase 6 — Package-manager adapters
- [ ] Phase 7 — First framework/integrations
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

Phase 3 resolver now lives in `@reposetup/core` as `resolveConfig(config, registry)`:

- configuration normalization (unique selections, framework first);
- unknown integration lookup;
- requirement resolution and conflict detection;
- recommendation collection as warnings, not errors;
- support checks;
- requirement graph and stable topological order.

Tests prove missing requirements fail, conflicts fail, recommendations do not block, valid graphs have stable order, and cycles fail. Operations stay empty until Phase 4.

Acceptance gate passed locally:

- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 3.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

`@reposetup/core` does not depend on `@reposetup/registry`. The resolver uses a `RegistryLookup` port.

Work is on `feat/phase-3-resolver`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
