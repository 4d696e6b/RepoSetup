# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

RepoSetup has not published a prior npm release. This file starts at the first intended prerelease.

## [0.1.0-alpha.1] - 2026-09-22

### Added

- CLI: `create`, `add`, `remove`, `search`, `info`, `stack`, `doctor`, `export`, `registry validate`.
- Monorepo packages `@reposetup/core`, `@reposetup/registry`, `@reposetup/integrations`, `@reposetup/cli` at `0.1.0-alpha.1`.
- Golden-stack real execution harness (`pnpm test:golden`) and packed-artifact smoke tests (`pnpm test:e2e`).
- Fast / platform / golden GitHub Actions workflows and an OIDC-ready release workflow that does not publish on push.
- Integration maturity labels: `experimental`, `candidate`, `stable`, `deprecated`.

### Changed

- CLI `--version` reads `packages/cli/package.json` instead of a hardcoded string.
- Workspace packages are public-ready (not `private: true`) at the alpha version. The root workspace remains private.

### Fixed

- `stack` / `doctor` warn when `package.json` exists but is not valid JSON, instead of inventing Node dependencies.
- Prisma client helper now imports `../generated/prisma/client.js` so Express `nodenext` typecheck succeeds.

### Known limitations

- This is an alpha prerelease, not `1.0.0`.
- No integration is labeled `stable`.
- PostgreSQL/MongoDB paths are generation/config only unless a live database is provided separately.
- Next.js full execute is intended for CI or a machine with enough disk.
- Bun is unimplemented. `remove` is package-only for a small set of IDs. pip uninstall is refused.
- npm publish still requires the owner to configure trusted publishing.
