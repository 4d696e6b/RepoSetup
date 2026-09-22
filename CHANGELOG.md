# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This is the first public GitHub release. There is no prior npm publication.

## [0.1.0] - 2026-09-22

First public open-source launch of RepoSetup.

### Added

- Terminal-first CLI: `create`, `add`, `remove`, `search`, `info`, `stack`, `doctor`, `export`, `registry validate`.
- Monorepo packages `@reposetup/core`, `@reposetup/registry`, `@reposetup/integrations`, `@reposetup/cli` at `0.1.0`.
- Declarative `reposetup.json` (`schemaVersion` 1) with dry-run planning.
- Built-in registry of 33 integration IDs across JavaScript/TypeScript and Python ecosystems.
- Integration maturity labels: `experimental`, `candidate`, `stable`, `deprecated` (none are `stable` in this release).
- Golden-stack harness (`pnpm test:golden`) and packed-artifact smoke tests (`pnpm test:e2e`).
- Fast / platform / golden GitHub Actions and an OIDC-ready release workflow that does not publish npm on push.

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
- npm packages are not published in this GitHub launch.
- PostgreSQL/MongoDB paths are generation/config only.
- Next.js full execute is intended for CI or a machine with enough disk.
- FastAPI/Flask real execute needs `uv`.
- Bun is unimplemented. `remove` is package-only for a small set of IDs. pip uninstall is refused.

## [0.1.0-alpha.1] - 2026-09-22

Internal prerelease. Not published to npm or GitHub. Superseded by `0.1.0`.
