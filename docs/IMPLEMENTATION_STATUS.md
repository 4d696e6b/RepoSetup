# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 7 — First framework/integrations** (not started)

## Phase status

- [x] Phase 0 — Repository foundation
- [x] Phase 1 — Domain model and schemas
- [x] Phase 2 — Registry
- [x] Phase 3 — Resolver
- [x] Phase 4 — Planner
- [x] Phase 5 — CLI skeleton + dry-run
- [x] Phase 6 — Package-manager adapters
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

Phase 6 package-manager adapters live in `@reposetup/core` and emit `run_command` operations (command + args arrays). They do not execute processes.

Verified from current official docs:

- npm: `npm install`, `npm install --save-dev`
- pnpm: `pnpm add`, `pnpm add --save-dev`, `pnpm install`
- uv: `uv add`, `uv add --dev`, `uv sync`
- pip: `python -m pip install`, `python -m pip install -r <file>`

Bun is not implemented. `pip` has no `--dev` flag, so `dev: true` does not change pip argv.

Acceptance gate passed locally:

- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 6.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-6-package-managers`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
