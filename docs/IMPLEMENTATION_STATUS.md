# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 17 — v1 hardening** (complete)

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
- [x] Phase 17 — v1 hardening

## Last completed work

Phase 17 hardens the pre-v1 tree without publishing packages or marking integrations stable.

- Golden dry-run stacks for Next.js, React/Vite, Express, FastAPI, and Flask stay in the test suite. The Next.js execute path is opt-in (`REPOSETUP_GOLDEN_EXECUTE=1`) and skipped on Windows.
- Security review is in `docs/SECURITY_REVIEW.md`. Command failures no longer copy stdout/stderr into error details.
- CI runs on `ubuntu-latest`, `macos-latest`, and `windows-latest`, including the `dev` branch. Tag `v*` packs tarballs and does not npm-publish.
- README, CONTRIBUTING, CHANGELOG, LICENSE, and `docs/RELEASE.md` are in the repo.
- Every built-in integration must have `https://` docs and an ISO `verifiedAt` date. `reposetup info` prints that freshness metadata.
- Workspace packages stay `private` at `0.0.0`.

Acceptance gate passed locally:

- Catalog freshness test
- README quickstart test
- COMMAND_FAILED omits process output
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

Integrations remain experimental. Packages are unpublished. Windows/macOS CI needs a GitHub Actions run to prove the new matrix. `import` is not a separate command; `create --config` applies exported configs. There is no website.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7, Phase 13, or Phase 14 integrations stable. DoD-stable requires detection/verify tests plus a tested compatible execute path.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-17-hardening`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
