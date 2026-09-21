# RepoSetup

RepoSetup is a terminal-first stack composer. It turns a declarative config into a typed installation plan, then dry-runs or executes that plan.

This tree is a **pre-v1** monorepo. Built-in integrations are **experimental**. Do not treat IDs as stable until a real v1 release.

## Quickstart

From a clone:

```bash
pnpm install
pnpm build
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --dry-run
```

Dry-run resolves the same plan as a real run and must not write files or spawn installers.

Other examples live in `examples/`:

- `examples/reposetup.next-sqlite.json`
- `examples/reposetup.react-vite.json`
- `examples/reposetup.express-postgres.json`
- `examples/reposetup.fastapi.json`
- `examples/reposetup.flask.json`

## Commands

```text
reposetup create
reposetup add <id>
reposetup remove <id>
reposetup search [query]
reposetup info <id>
reposetup stack
reposetup doctor
reposetup export
reposetup registry validate
```

`import` is not a separate command. Apply an exported file with `create --config`.

## Packages

| Package | Role |
| --- | --- |
| `@reposetup/core` | Config, resolve, plan, execute |
| `@reposetup/registry` | Registry lookup and validation |
| `@reposetup/integrations` | Built-in integration definitions |
| `@reposetup/cli` | Commander CLI |

Workspace packages stay `private` until a tagged public release. See `docs/RELEASE.md`.

## Development

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Read `CONTRIBUTING.md` before changing integrations. Do not guess third-party CLI flags.

## Safety

RepoSetup does not install Node, Python, Docker, or databases for you. Config files are declarative only. Process execution uses `spawn` with `shell: false`.

## License

MIT
