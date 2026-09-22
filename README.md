# RepoSetup

**Build your stack from the terminal.**

RepoSetup is an open-source CLI that composes, validates, and configures development stacks from a curated integration registry.

A modern project often means piecing together setup instructions from several documentation sites. RepoSetup turns supported combinations into a **deterministic installation plan** you can preview with `--dry-run` before anything on disk changes.

[![CI](https://github.com/4d696e6b/RepoSetup/actions/workflows/ci.yml/badge.svg)](https://github.com/4d696e6b/RepoSetup/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

RepoSetup is currently an **early-stage** open-source project (`v0.1.0`). The core CLI and integration architecture are implemented. Integration maturity varies; some IDs remain experimental. This is not `1.0.0`.

**npm packages are not published yet.** Use a clone of this repository until the next publishing step.

## Why RepoSetup

RepoSetup is not “run `npm install` on a list of packages.”

The useful work is:

- compatibility and requirement resolution
- stable installation ordering
- typed configuration generation
- existing-project detection
- health checks (`doctor`)
- a plan you can inspect before mutation

Configs are declarative. They cannot carry shell scripts, callbacks, or remote executable plugins.

## Features

- Interactive `reposetup create` and flag-driven create
- Declarative `reposetup.json` (`schemaVersion` 1)
- Compatibility resolution and dependency ordering
- `--dry-run` using the real planner (no writes, no installers)
- Existing-project detection (`stack`)
- Add supported integrations to an existing project
- Safe `remove` where an explicit recipe exists
- Project health checks (`doctor`)
- Config export with no secrets
- Built-in local registry (JavaScript/TypeScript and Python ecosystems)
- argv-based process execution (`spawn` with `shell: false`)

## Quick start

Requires **Node.js 20+** and **pnpm 12.5.1**.

```bash
git clone https://github.com/4d696e6b/RepoSetup.git
cd RepoSetup
pnpm install
pnpm build
node packages/cli/dist/bin.js --help
node packages/cli/dist/bin.js --version   # 0.1.0
```

Preview a Next.js example without changing files:

```bash
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --dry-run
```

Create for real (skips the confirmation prompt):

```bash
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --yes
```

Always try `--dry-run` first on a project you care about.

After a future npm publish (not available in this release):

```text
npx @reposetup/cli --help
```

The binary name is `reposetup`. Python stacks also need **Python 3.9+** and **uv**.

## Example

Interactive create (prompts are skipped when you pass flags or `--config`):

```text
$ node packages/cli/dist/bin.js create

? Project name my-app
? Runtime node
? Package manager pnpm
? Framework Next.js
? Use TypeScript? Yes
? Styling Tailwind CSS (tailwind)
? Database SQLite (sqlite)
? ORM/data layer Prisma (prisma)
? Validation Zod (zod)
? Testing Vitest (vitest)
? Quality tools Prettier (prettier)
```

A dry-run prints the real plan, then stops:

```text
$ node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --dry-run

Dry-run for example-next-app
  runtime          node
  package manager  pnpm
  framework        nextjs

Resolved integrations:
  node                 runtime
  pnpm                 package-manager
  nextjs               framework
  ...

Operations (N):
  1. check_prerequisite  ...
  2. run_command         ...

No files or commands were executed.
```

Without `--dry-run`, the CLI asks `Proceed with installation?` unless you pass `--yes`.

Flag form (only flags that exist today):

```bash
node packages/cli/dist/bin.js create my-app \
  --framework nextjs \
  --package-manager pnpm \
  --typescript \
  --dry-run
```

Styling, database, ORM, and other options go in the interactive flow or in `reposetup.json` — they are not separate CLI flags.

## CLI commands

```text
reposetup create [name]
reposetup add <id>
reposetup remove <id>
reposetup search [query]
reposetup info <id>
reposetup stack
reposetup doctor
reposetup export
reposetup registry validate
```

| Command | What it does |
| --- | --- |
| `create` | Plan (and optionally execute) a new stack from prompts or `--config` |
| `add` | Plan a delta for one integration on an existing project |
| `remove` | Remove an integration that has an explicit safe recipe |
| `search` | Search the local registry (offline) |
| `info` | Show category, status, requirements, and docs URL for one ID |
| `stack` | Detect the current project |
| `doctor` | Read-only health checks |
| `export` | Write `reposetup.json` (IDs and options only; no `.env` secrets) |
| `registry validate` | Validate the built-in catalog |

There is no separate `import` command. Apply an exported file with `create --config`.

`reposetup info <id>` prints `experimental`, `candidate`, `stable`, or `deprecated`. **None are `stable` in v0.1.0.**

## Integration status

Status is per ID, not “the catalog is production-ready.”

| Status | Meaning in v0.1.0 |
| --- | --- |
| **stable** | Real execute + advertised-platform evidence. **None yet.** |
| **candidate** | Official commands verified; plan/detect/doctor tests exist. Cross-platform or real execute evidence may still be incomplete. |
| **experimental** | Implemented; not treated as a qualified path. |
| **deprecated** | None. |

### Catalog

| Category | IDs | Maturity |
| --- | --- | --- |
| Runtime | `node`, `python` | candidate |
| Package manager | `npm`, `pnpm`, `uv`, `pip` | candidate (`bun` is not in the catalog) |
| Framework | `nextjs`, `react-vite` | candidate |
| Backend | `express`, `fastapi`, `flask` | candidate |
| Backend | `fastify` | experimental |
| Styling / UI | `tailwind` | candidate |
| Styling / UI | `shadcn` | experimental |
| Database | `sqlite` | candidate |
| Database | `postgresql`, `mongodb` | experimental (config only; no server install) |
| ORM / data | `prisma`, `sqlalchemy`, `alembic` | candidate |
| ORM / data | `drizzle`, `mongoose` | experimental |
| Validation | `zod`, `pydantic` | candidate |
| Testing | `vitest`, `pytest` | candidate |
| Testing | `playwright` | experimental |
| Quality | `eslint`, `prettier`, `ruff` | candidate |
| Infrastructure / CI | `docker`, `docker-compose`, `github-actions` | experimental |

`remove` currently has package-only recipes for `zod`, `prettier`, `pydantic`, `pytest`, and `ruff`. `pip uninstall` is refused.

## Tested stack recipes

| Recipe | Dry-run plan | Real execute |
| --- | --- | --- |
| Next.js + TypeScript + Tailwind + SQLite + Prisma + Zod + Vitest + Prettier | yes | pending CI / a machine with enough disk |
| React + Vite + TypeScript + Tailwind + Zod + Vitest + Prettier | yes | yes (local `pnpm test:golden`) |
| Express + TypeScript + Prisma (PostgreSQL **config** only) | yes | generation + `tsc`; no live database |
| FastAPI + uv + Pydantic + SQLAlchemy + Alembic + pytest + Ruff | yes | pending `uv` in this workspace |
| Flask + uv + SQLAlchemy + Alembic + pytest + Ruff | yes | pending `uv` |

Example configs live in `examples/`.

## How it works

```text
Config or prompts
  → schema validation
  → registry lookup
  → requirements / conflicts
  → dependency order
  → typed InstallationPlan
  → dry-run renderer  or  executor
  → verification
```

Integrations only generate typed operations. Only the executor runs processes or writes files.

## Safety

RepoSetup can modify real projects. The safety model is part of the product:

- `--dry-run` uses the same resolver and planner as a real run
- plans are typed operations, not shell strings
- process execution uses `spawn(command, args, { shell: false })`
- configs cannot contain arbitrary commands
- missing Node/Python/Docker/databases are reported, not silently installed
- existing files are not silently overwritten
- `.env.example` placeholders only; exports never include `.env` secrets
- compatibility failures stop before filesystem mutation

See [`SECURITY.md`](SECURITY.md).

## Open source

RepoSetup is built in the open.

Contributions are welcome — especially integration improvements, platform testing, bug reports, and new verified setup recipes. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

Please do not include secrets in issues.

## Development

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm registry:validate
pnpm test:e2e
pnpm test:golden
```

There is no `test:pack` script; packing is covered by `pnpm test:e2e`.

## Roadmap

- Qualify remaining golden stacks (Next.js execute, FastAPI/Flask with `uv`) and OS CI evidence
- Promote integrations to `stable` only with that evidence
- Publish `@reposetup/cli` to npm (separate task; not part of this GitHub launch)
- A website is explicitly out of scope for this architecture

## License

[MIT](LICENSE)
