# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Fresh Node scaffolds and selected development package additions include required dev dependencies even under production/omit settings.
- PostgreSQL SQLAlchemy recipes install the pinned Psycopg binary driver and provide a guarded engine helper. JavaScript Prisma recipes import their generated client using supported Node 24 TypeScript paths.
- Docker selections persist prerequisite guidance; doctor reports missing or unusable Docker/Compose CLIs with bounded probes. PostgreSQL Compose publishes a loopback port with aligned environment placeholders, a required password and persistent storage.
- Cache permission failures and partial creation explain safe recovery and the actual project directory. Completion output distinguishes package installation from manual system-service setup and names the correct database environment variable.
- Node prerequisite text and metadata match the existing Node 24 requirement.
- Timed-out installations retain bounded, redacted installer diagnostics and still stop before later operations.
- Doctor recovery commands restore development packages under production/omit settings and rebuild damaged pnpm package links; packed regressions follow those commands through a successful repair.

See the [installed stack audit](docs/specification-documentation/implementing-docs/INSTALLED_STACK_AUDIT.md) for qualification and limits. These fixes are not in the immutable published 0.2.2 package.

## [0.2.2] - 2026-10-08

Published dependency-health stability patch; qualification and delivery evidence are in the
[release record](docs/specification-documentation/release-docs/STABLE_RELEASE_0.2.2.md).

### Fixed

- Pip creation records every selected pinned runtime/development dependency in a new `requirements.txt`, so doctor detects the actual generated project instead of a parent config or no project.
- Create verifies installed dependency metadata before reporting success; doctor detects missing required Node/Python packages instead of treating declarations as proof of installation.
- FastAPI standard checks include its CLI and Uvicorn. Doctor inspects uv's existing project environment without syncing or recreating it; pip uses the active interpreter, including activated environments on Windows.
- Python README/startup guidance explains environment activation, `uv run` and dependency recovery. Configuration checks describe their actual scope.

### Changed

- Packed create tests assert the canonical generated root, framework and installed dependency checks; damaged package metadata and missing uv environments are regression-tested across twenty bare solutions and fourteen recipes.
- Node 24+, existing catalog maturity and native/live-service/browser qualification limits remain unchanged. Installed metadata does not prove all imports, transitive compatibility or live services.

## [0.2.1] - 2026-10-08

Stability patch; qualification/publication status is in the
[release record](docs/specification-documentation/release-docs/STABLE_RELEASE_0.2.1.md).

### Fixed

- Named and nested create destinations now scope generated files and installation commands correctly, including Next.js `app/layout.tsx` and Python initialization.
- Bare Vite dependencies and pnpm Express esbuild approval are installed before verification; dependency pins, install ordering and destination lockfile safeguards apply consistently.
- Tailwind/Vite setup and shadcn TypeScript/JavaScript aliases, defaults and configuration-file verification produce usable generated projects.
- npm launch settings and package-manager identity no longer leak into nested generators; Playwright uses the selected manager and Prisma initialization does not fetch coding-agent skills.
- Next.js Vitest uses compatible pinned test tooling and canonical roots on Windows; doctor distinguishes a test-only Vite dependency from a Vite application.
- Express/Fastify startup paths, server feedback, README commands and Python testing guidance match generated files; Compose context survives subsequent add operations.
- Text insertion preserves LF/CRLF and workflow evidence is parsed before upload.

### Changed

- Next.js generator/framework/eslint pins use the qualified 16.3.6 security patch.
- All six frameworks have packed-npx bare-solution coverage, with npm/pnpm, TypeScript/JavaScript and isolated uv/pip; fourteen recipes and five presets have expanded cross-platform regression coverage.
- Node.js 24+ remains required. Native Windows 11, Linux arm64, live services and actual Playwright browser journeys remain outside the qualified matrix. No catalog integration is promoted to stable.
- Generated development-tool advisory GHSA-vfj7-8cjw-p6xm has no published fix as of the release review; do not describe generated stacks as audit-clean.

## [0.2.0] - 2026-10-07

- Published the terminal-first CLI with Node 24+, Python 3.12/3.13 qualification, five curated presets, reproducible pinned recipes, consolidated installs, platform adapters and safer execution/recovery diagnostics.
- Added React Testing Library/TanStack Query and FastAPI HTTPX/Pydantic Settings examples.
- Qualified and verified registry delivery on Ubuntu 24.04, macOS 15 and Windows Server 2025. Individual integration maturity and external-service limitations remain explicit.
- See the immutable [0.2.0 evidence record](docs/specification-documentation/release-docs/STABLE_QUALIFICATION_0.2.0.md).

## [0.1.1] - 2026-09-22

Patch release. `rsetup@0.1.0` is on npm; this fixes the first failures real users hit.

### Fixed

- npm scaffold paths now pass `npx --yes` **before** the package name. `npx` treats anything after the package as package arguments, so `create-next-app` and other `dlx` scaffolds could stall on npm's "Ok to proceed?" prompt.
- `COMMAND_FAILED` now prints a trimmed snippet of the failed command's output instead of only an exit code. Failures such as npm `EACCES` on a root-owned `~/.npm/_npx` cache are now readable, and the npm cache-ownership case gets a targeted suggestion.

### Safety

- The printed snippet redacts secret-looking assignments (`*SECRET*`, `*TOKEN*`, `*PASSWORD*`, `*API_KEY*`, `*CREDENTIAL*`, `DATABASE_URL`) and is capped in lines and characters.
- Machine-readable error details still omit `stdout` and `stderr`.
- RepoSetup still refuses to run `sudo`; it reports the command the user must run.

## [0.1.0] - 2026-09-22

First public open-source launch of RepoSetup.

### Added

- Terminal-first CLI: `create`, `add`, `remove`, `search`, `info`, `stack`, `doctor`, `export`, `registry validate`.
- Public npm package name `rsetup` (single bundled CLI; executables `rsetup` and `reposetup`). Unscoped `reposetup` and `reposetup-cli` are blocked by npm as too similar to `repo-setup` and `repo-setup-cli`. Workspace libraries `@reposetup/core`, `@reposetup/registry`, and `@reposetup/integrations` stay private.
- Declarative `reposetup.json` (`schemaVersion` 1) with dry-run planning.
- Built-in registry of 33 integration IDs across JavaScript/TypeScript and Python ecosystems.
- Integration maturity labels: `experimental`, `candidate`, `stable`, `deprecated` (none are `stable` in this release).
- Golden-stack harness (`pnpm test:golden`) and packed-artifact smoke tests (`pnpm test:e2e`).
- Fast / platform / golden GitHub Actions. npm publish is a separate tag workflow (`.github/workflows/publish-npm.yml`) and does not run on pull requests.

### Safety

- Process execution uses `spawn` with `shell: false`.
- Config files are declarative only (no scripts, callbacks, or remote plugins).
- `--dry-run` uses the real planner and does not mutate.
- Path traversal is rejected; existing files are not silently overwritten.
- Exports never include `.env` secrets; `.env.example` placeholders only.
- Missing Node, Python, Docker, or databases are reported, not silently installed.

### Developer experience

- CLI `--version` reads `packages/cli/package.json`.
- Human guide in `docs/humanOnly/`.
- Bug, feature, and integration GitHub issue templates.

### Known limitations

- Early-stage release, not `1.0.0`. No integration is labeled `stable`.
- `rsetup@0.1.0` is prepared for npm; publication waits on maintainer 2FA after `npm login`.
- PostgreSQL/MongoDB paths are generation/config only.
- Next.js full execute is intended for CI or a machine with enough disk.
- FastAPI/Flask real execute needs `uv`.
- Bun is unimplemented. `remove` is package-only for a small set of IDs. pip uninstall is refused.

## [0.1.0-alpha.1] - 2026-09-22

Internal prerelease. Not published to npm or GitHub. Superseded by `0.1.0`.
