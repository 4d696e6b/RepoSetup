# Release notes — v0.1.0

The first **public GitHub** release of RepoSetup.

This is an **early-stage** project. Some integrations remain experimental. Use `--dry-run` before applying changes to important projects.

**npm is not published in this GitHub tag.** Intended command after publication: `npx @pacharapolpimpa/reposetup`. From a clone: `pnpm install && pnpm build && node packages/cli/dist/bin.js --help`.

## Highlights

- Interactive and config-driven project creation
- Declarative `reposetup.json`
- Compatibility resolution and ordered installation plans
- Dry-run before mutation
- Stack detection, doctor, add/remove (where recipes exist)
- Built-in JS/TS and Python registry
- Safety-first `spawn` with `shell: false`

## Current status

The core CLI is implemented. No catalog ID is labeled `stable`. See the README integration table.

## Contributing

See `CONTRIBUTING.md`. Do not include secrets in bug reports.

Human guide: `docs/humanOnly/RepoSetup_0.1.0.md`.
