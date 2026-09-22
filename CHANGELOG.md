# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
