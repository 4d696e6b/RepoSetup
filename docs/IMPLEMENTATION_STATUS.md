# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 10 — Project detection** (complete)

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
- [ ] Phase 11 — Add
- [ ] Phase 12 — Doctor
- [ ] Phase 13 — JS ecosystem expansion
- [ ] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 10 adds read-only project detection in `@reposetup/core` and `reposetup stack`.

Detection walks up from the working directory to the nearest project marker, then inspects manifests and lockfiles. Node package managers come from lockfiles or `package.json#packageManager`, not from a globally installed tool. Python `uv` is certain from `uv.lock`; `pip` is only likely from `requirements.txt` when no uv lockfile is present. Yarn lockfiles are reported as warnings, not selected.

Each built-in integration owns `detect()`. Confidence is `certain` | `likely` | `possible`; uncertain names are labeled in `stack` output. Detection never mutates files.

Acceptance gate passed locally:

- Fixture identification: npm lockfile, pnpm Next.js/SQLite-style tree, Python uv, mixed lockfiles, no-lockfile Node
- `reposetup stack` CLI tests
- `pnpm build`
- `pnpm test` (Phase 10 packages; golden install test unchanged)
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 10. Integrations remain experimental. `add`, `doctor`, and `export` still need later phases.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7 integrations stable. DoD-stable requires detection/verify tests in later phases.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-10-project-detection`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
