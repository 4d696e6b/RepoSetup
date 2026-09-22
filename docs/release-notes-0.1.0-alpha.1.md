# Release notes — v0.1.0-alpha.1

This is an **alpha prerelease**. Some integrations remain experimental. Use `--dry-run` before applying changes to important projects.

## Install (after npm publish)

```bash
npx @reposetup/cli --help
```

Until publish, run from a clone: `pnpm install && pnpm build && node packages/cli/dist/bin.js --help`.

## Qualified stacks

See README golden stacks A–E. Express/FastAPI/Flask include PostgreSQL **configuration placeholders** only. RepoSetup does not start a database server.

## Supported platforms

- Node.js 20.x (current) and 22
- Python 3.9+ for Python stacks (golden CI uses 3.12 + uv)
- Linux, macOS, Windows for advertised unit/CLI tests

## Known limitations

- Not `1.0.0`. No integration is labeled stable.
- Disk-heavy Next.js `next build` is intended for CI.
- Bun, live Postgres/Mongo connectivity, and most `remove` recipes are out of scope or incomplete.

## Bugs

Use the GitHub bug template. Include version, OS, runtime, command, stack, and error output. Do not paste secrets.

## Changelog

See `CHANGELOG.md`.
