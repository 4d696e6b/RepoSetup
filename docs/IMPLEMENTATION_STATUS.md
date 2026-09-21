# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 16 — Safe remove support** (complete)

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
- [x] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 16 adds `reposetup remove` for integrations with an explicit `remove()` recipe. It never inverts `plan()`. This phase uninstalls packages only for `zod`, `prettier`, `pydantic`, `pytest`, and `ruff`. Prettier config files are left in place. Prisma, frameworks, ORMs, and other integrations print `RepoSetup cannot safely remove this integration automatically.` pip is refused because `pip uninstall` does not rewrite `requirements.txt`.

Verified uninstall argv from current official docs: `pnpm remove`, `npm uninstall`, `uv remove` (no invented `--dev`). `--dry-run` prints the plan; `--yes` skips confirmation.

Acceptance gate passed locally:

- Zod dry-run emits `pnpm remove zod` and does not reverse the Next.js scaffold
- Prettier remove does not delete `.prettierrc` / `.prettierignore`
- Prisma and Next.js print the unsafe-removal sentence
- Pydantic dry-run emits `uv remove pydantic`
- pip remove is refused
- Absent packages are a no-op
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 16. Integrations remain experimental. Phase 17 is v1 hardening (golden stacks, security review, CI, docs, publishing). `import` is not a separate command; `create --config` applies exported configs.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7, Phase 13, or Phase 14 integrations stable. DoD-stable requires detection/verify tests in later phases plus a tested compatible execute path.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-16-remove`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
