# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 18 — Release Hardening and Prerelease Qualification** (GitHub `0.1.0` launch; remaining golden/OS evidence still open)

## Current release

`0.1.0` public GitHub source launch. npm package `reposetup` is prepared (Model A) and not published until authentication + qualification.

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
- [ ] Phase 18 — Release Hardening and Prerelease Qualification
  - [x] 18.0 Documentation and baseline
  - [x] 18.1 Golden-stack real execution tests (harness + B/C local; A/D/E blocked here)
  - [x] 18.2 Cross-platform CI qualification (workflows added; remote run pending)
  - [x] 18.3 npm package/artifact qualification
  - [x] 18.4 Failure-path and safety qualification
  - [x] 18.5 Integration maturity classification (candidates; none stable)
  - [x] 18.6 Release documentation
  - [x] 18.7 Release automation (publish-npm.yml prepared; trusted publisher requires manual npmjs.com settings after first publish)
  - [ ] 18.8 Alpha/release-candidate validation (Next.js, FastAPI, Flask, OS matrix still open locally)

## Last completed work

Public GitHub launch plus Model A npm packaging (2026-09-22): public package name `rsetup`; workspace libraries private and bundled into the CLI.

## Known blockers

- Next.js execute skipped locally when disk is tight.
- `uv` may be missing locally, so FastAPI/Flask goldens skip.
- First GitHub Actions run happens after origin exists.
- No npm trusted-publisher config until `rsetup` exists on the registry. First publish needs maintainer `npm login` + OTP from `packages/cli`.
- Unscoped `reposetup` and `reposetup-cli` are blocked by npm as too similar to `repo-setup` and `repo-setup-cli`.
- GitHub tag `v0.1.0` points at pre-bundle `@reposetup/cli` source. Do not move that tag.
- No integration is `stable`.

## Golden stacks proven

| Stack | Dry-run plan | Real execute |
| --- | --- | --- |
| Next.js / SQLite | yes | pending CI / `REPOSETUP_GOLDEN_NEXT=1` |
| React + Vite | yes | yes (local `pnpm test:golden`) |
| Express / Postgres config | yes | yes generation + `tsc --noEmit`; no live DB |
| FastAPI | yes | pending `uv` |
| Flask | yes | pending `uv` |

## OS environments proven

| OS | Local | GitHub Actions |
| --- | --- | --- |
| macOS | unit/lint/build/e2e/golden B+C | platform workflow on `main`/`dev` |
| Linux | not run here | ci + platform + golden workflows |
| Windows | not run here | platform workflow |

## Integrations promoted to stable

None.

## npm publishing status

| Item | Status |
| --- | --- |
| GitHub source release | complete (`v0.1.0` tag remains at `78ef16c`; do not move it) |
| Public package name | `rsetup` (unscoped `reposetup` / `reposetup-cli` blocked by similarity) |
| Model | A — single bundled CLI |
| Local quality suite | passed (`lint`, `typecheck`, `test`, `build`, `registry:validate`, `test:e2e`, `test:golden` with A/D/E skipped) |
| Tarball | `rsetup-0.1.0.tgz`; isolated install covered by `pnpm test:e2e` |
| Packed golden | React + Vite create + `stack` + `doctor` + `tsc -b` passed from an earlier tarball; re-verify after rename |
| npm v0.1.0 | not published |
| npx verification | not run against the registry |
| global install verification | not run against the registry |
| Trusted publishing workflow | prepared (`.github/workflows/publish-npm.yml`) |
| OIDC / provenance | workflow requests `id-token: write`; provenance not disabled |
| Trusted publisher on npmjs.com | requires manual settings after first publish |

See `docs/NPM_TRUSTED_PUBLISHING_SETUP.md`.

## Notes

Do not mark Phase 18 complete unless remaining Release Qualification gates in `ACCEPTANCE_TESTS.md` pass. GitHub `v0.1.0` is a source launch, not `1.0.0`.
