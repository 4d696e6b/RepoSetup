# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 2 — Registry** (not started)

## Phase status

- [x] Phase 0 — Repository foundation
- [x] Phase 1 — Domain model and schemas
- [ ] Phase 2 — Registry
- [ ] Phase 3 — Resolver
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

Phase 1 domain model and schemas now live in `@reposetup/core`:

- `RepoSetupConfig` Zod schema and `parseRepoSetupConfig`;
- integration categories;
- relationship models (`requires`, `recommends`, `conflicts`, `includes`, `alternative`);
- installation operation discriminated union;
- `ResolutionResult` / `InstallationPlan` types;
- stable error codes and `RepoSetupError`.

Schema tests cover valid configs (including `examples/reposetup.next-sqlite.json`) and invalid configs (wrong shape, traversal names/paths, unknown enums, extra command-like fields).

Acceptance gate passed locally:

- `pnpm install` (Zod added to `@reposetup/core`)
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 1.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Phase 1 does not look up integration IDs in a registry, generate plans, or execute commands. Unknown IDs remain structurally valid until Phase 2.

Work is on `feat/phase-1-domain-model`, extracted from `phase-0`. `main` remains the pre-Phase 0 baseline.
