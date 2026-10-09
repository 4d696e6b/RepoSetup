# RepoSetup

**Build your stack from the terminal.**

RepoSetup is an open-source CLI that composes, validates, and configures development stacks from a curated integration registry.

A modern project often means piecing together setup instructions from several documentation sites. RepoSetup turns supported combinations into a **deterministic installation plan** you can preview with `--dry-run` before anything on disk changes.

[![CI](https://github.com/4d696e6b/RepoSetup/actions/workflows/ci.yml/badge.svg)](https://github.com/4d696e6b/RepoSetup/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

RepoSetup is an **early-stage** open-source project with released `v0.2.3`. Qualification and delivery evidence are recorded in the [0.2.3 release record](docs/specification-documentation/release-docs/STABLE_RELEASE_0.2.3.md). The core CLI and integration architecture are implemented. Integration maturity varies; some IDs remain experimental. This is not `1.0.0`.

The public package name on npm is **`rsetup`**. Unscoped `reposetup` / `reposetup-cli` are blocked by npm as too similar to `repo-setup` / `repo-setup-cli`.

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
- Project health checks (`doctor`), including installed dependency metadata and bounded Docker/Compose prerequisite probes
- Config export with no secrets
- Built-in local registry (JavaScript/TypeScript and Python ecosystems)
- argv-based process execution (`spawn` with `shell: false`)

## Install and run

The published CLI requires **Node.js 24+**. Python recipes additionally require **Python 3.12+** and the selected manager (**uv** or an activated **pip** environment); Python 3.12 and 3.13 were covered by the 0.2.x qualification matrix. RepoSetup does not install these system prerequisites for you.

Version 0.2.3 is the published installed-stack stability patch. npm `latest` identifies it; both pinned and unversioned installs are verified. See the [release record](docs/specification-documentation/release-docs/STABLE_RELEASE_0.2.3.md) for qualification and delivery evidence:

```bash
npx rsetup@0.2.3 --help
npx rsetup@0.2.3 --version
```

For a global install, run `npm install -g rsetup@0.2.3`. Both `rsetup` and `reposetup` then work as command names. `npx reposetup` refers to a different package.

## Develop from source

The repository uses **pnpm 12.5.1**:

```bash
git clone https://github.com/4d696e6b/RepoSetup.git
cd RepoSetup
pnpm install
pnpm build
node packages/cli/dist/bin.js --help
node packages/cli/dist/bin.js --version   # 0.2.3
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

`reposetup info <id>` prints `experimental`, `candidate`, `stable`, or `deprecated`. **None are `stable` in the 0.2.3 support contract.**

## Integration status

Status is per ID, not “the catalog is production-ready.”

| Status | Meaning in the 0.2.3 support contract |
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
| Application settings | `pydantic-settings` | candidate (FastAPI only) |
| Testing | `vitest`, `testing-library`, `pytest`, `httpx` | candidate (`testing-library` and `httpx` have generated interaction/API tests) |
| Testing | `playwright` | experimental |
| Client state | `tanstack-query` | candidate (React + Vite only) |
| Quality | `eslint`, `prettier`, `ruff` | candidate |
| Infrastructure / CI | `docker`, `docker-compose`, `github-actions` | experimental |

`remove` currently has package-only recipes for `zod`, `prettier`, `pydantic`, `pydantic-settings`, `pytest`, `ruff`, `testing-library`, `tanstack-query`, and `httpx`. Generated source, tests, and `.env.example` files are preserved. `pip uninstall` is refused.

## Tested stack recipes

The table records the cross-platform generation and application-test scopes from
the earlier 0.2.x qualification. Its PostgreSQL checks did not connect to a live
server. The separate 0.2.3 live-service acceptance below adds bounded evidence;
it does not extend every recipe's platform or integration coverage.

| Recipe | Dry-run plan | Real execute |
| --- | --- | --- |
| Next.js + TypeScript + Tailwind + SQLite + Prisma + Zod + Vitest + Prettier | yes | passed cross-platform golden qualification |
| React + Vite + TypeScript + Tailwind + Zod + Vitest + Prettier | yes | passed cross-platform golden qualification |
| Express + TypeScript + Prisma (PostgreSQL **config** only) | yes | passed cross-platform generation, build and HTTP test; no live database |
| FastAPI + uv + Pydantic + SQLAlchemy + Alembic + pytest + Ruff | yes | passed cross-platform Python 3.12/3.13 golden qualification |
| Flask + uv + SQLAlchemy + Alembic + pytest + Ruff | yes | passed cross-platform Python 3.12/3.13 golden qualification |
| React + Vite + Vitest + Testing Library + TanStack Query | yes | generated interaction/query tests |
| FastAPI + Pydantic + pytest + HTTPX + Pydantic Settings | yes | generated HTTPX/settings tests; no real secrets |

Example configs live in `examples/`.

The frozen 0.2.3 candidate `a213a6a1edf63771aba8d5b91bfdcf44d665de22` passed
[two Linux live-service tests](https://github.com/4d696e6b/RepoSetup/actions/runs/37813979567)
with no failures or skips. Five PostgreSQL checks cover new CLI create/doctor,
generated Prisma, Drizzle and FastAPI/uv SQLAlchemy helpers, and data persistence
through both a Compose restart and container recreation using PostgreSQL 18.6.
Two MongoDB checks cover new CLI create/doctor and authenticated CRUD through the
generated Mongoose helper using MongoDB 8.0.32. These Node projects use Express
with JavaScript; both tests verify cleanup of their disposable services. This is
separate from five local checks using retained generated helpers on macOS with
PostgreSQL 14.20 and MongoDB 8.2.3. See the [installed-stack audit](docs/specification-documentation/implementing-docs/INSTALLED_STACK_AUDIT.md)
for the exact scopes. Artifact qualification, publication and three-platform npm
delivery pass; no integration maturity is promoted.

Create installs selected Node development tools even when the parent environment omits dev dependencies. PostgreSQL SQLAlchemy recipes include Psycopg's binary driver; JavaScript Prisma helpers use the generated client's supported Node 24 import paths. Docker selections write prerequisite guidance, and PostgreSQL Compose includes a loopback port and persistent storage. RepoSetup does not install system software or start those services.

A failed installation is incomplete even if generated source files exist. Review the printed project directory and error before retrying; `create` does not resume over existing files. Doctor reports missing dependencies and manual recovery commands without reinstalling them. See the [0.2.3 user guide](docs/humanOnly/RepoSetup_0.2.3.md) for production settings, npm cache failures and service setup.

The published 0.2.0 baseline passed [qualification and delivery](docs/specification-documentation/release-docs/STABLE_QUALIFICATION_0.2.0.md). The expanded 0.2.x repairs passed the [stability matrix](docs/specification-documentation/implementing-docs/STABILITY_0.2.x.md). The [installed-stack audit](docs/specification-documentation/implementing-docs/INSTALLED_STACK_AUDIT.md) covers the additional 0.2.3 fixes; version-specific artifact qualification and publication are tracked in the [0.2.3 release record](docs/specification-documentation/release-docs/STABLE_RELEASE_0.2.3.md). Qualification runs on Ubuntu 24.04, macOS 15, and Windows Server 2025 CI runners. The Windows CI runner is not a direct Windows 11 desktop test. Normal creation prepares PostgreSQL configuration without installing, starting or connecting to a database server; the separate live-service tests explicitly start their own disposable services.

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

See the [phased roadmap to 0.2.0](docs/specification-documentation/implementing-docs/ROADMAP_0.2.0.md) for cross-platform qualification, faster installation, usability improvements, integration priorities, and release gates.

- Follow the [0.2.x stability plan](docs/specification-documentation/implementing-docs/STABILITY_0.2.x.md) for create regressions, real generated-app checks and patch release gates
- Qualify each patch candidate across npm/pnpm, all six frameworks and the supported CI platforms
- Expand the bounded live database checks and add native platform evidence before promoting the corresponding integrations to `stable`
- A website is explicitly out of scope for this architecture

## License

[MIT](LICENSE)
