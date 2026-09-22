# @reposetup/cli

Command-line interface for RepoSetup. Binary name: `reposetup`.

This package is **not published to npm yet**. From a clone of the monorepo:

```bash
pnpm install
pnpm build
node packages/cli/dist/bin.js --help
```

This is an **early-stage** `0.1.0` release. Integrations are not all equally mature. Use `--dry-run` before changing an important project.

The library packages `@reposetup/core`, `@reposetup/registry`, and `@reposetup/integrations` are runtime dependencies of this CLI.
