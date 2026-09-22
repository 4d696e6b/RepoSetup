# RepoSetup

RepoSetup is a terminal-first stack composer. It turns a declarative config into a typed installation plan, then dry-runs or executes that plan.

**This is an alpha prerelease (`0.1.0-alpha.1`). It is not `1.0.0`.** Some integrations remain experimental. Use `--dry-run` before applying changes to an important project.

## Status labels

| Label | Meaning |
| --- | --- |
| implemented | Code exists in the catalog. Not a publish promise. |
| experimental | Implemented; complete supported paths are not release-qualified. |
| candidate | Official commands verified and automated tests exist; cross-platform or real execute evidence is incomplete. |
| release-qualified | A golden stack that includes the integration passed real execution. Not the same as stable. |
| stable | Real execute + advertised-platform evidence. **None in this alpha.** |

Do not treat every registry ID as equally mature. `reposetup info <id>` prints the current status.

## Installation

Packages are not published to npm until the owner completes trusted publishing. From a clone:

```bash
pnpm install
pnpm build
node packages/cli/dist/bin.js --help
```

After a public publish:

```bash
npx @reposetup/cli --help
pnpm dlx @reposetup/cli --help
```

The binary name is `reposetup`. Requires **Node.js 20+** (Vite stacks need 20.19+; Next.js needs 20.9+). Python stacks need **Python 3.9+** and **uv**.

## Quick start

```bash
pnpm install
pnpm build
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --dry-run
```

Dry-run uses the same resolver and planner as a real run. It must not write files or spawn installers.

Create for real (isolated directory, confirmation skipped):

```bash
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --yes
```

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

Examples:

```bash
node packages/cli/dist/bin.js search prisma
node packages/cli/dist/bin.js info prisma
node packages/cli/dist/bin.js add zod --dry-run
node packages/cli/dist/bin.js stack
node packages/cli/dist/bin.js doctor
```

`import` is not a separate command. Apply an exported file with `create --config`.

## Golden stacks

| ID | Stack | Notes |
| --- | --- | --- |
| A | Next.js, pnpm, TypeScript, Tailwind, SQLite, Prisma, Zod, Vitest, Prettier | `examples/reposetup.next-sqlite.json` |
| B | React + Vite, pnpm, TypeScript, Tailwind, Zod, Vitest, Prettier | `tests/e2e/fixtures/golden-react-vite.json` |
| C | Express, pnpm, TypeScript, PostgreSQL **config**, Prisma, Zod, Vitest, Prettier | Generation only; no live Postgres |
| D | FastAPI, uv, Pydantic, SQLAlchemy, Alembic, pytest, Ruff | PostgreSQL config placeholder; no live DB |
| E | Flask, uv, SQLAlchemy, Alembic, pytest, Ruff | Same as D |

`pnpm test:golden` runs real `create --yes` in temporary directories. Next.js full execute runs in CI (or with `REPOSETUP_GOLDEN_NEXT=1`) because local disk may be too small.

## Supported platforms

Advertised for this alpha:

- macOS, Linux, Windows (unit tests; GitHub Actions matrix on `dev` / `release/**`)
- Node.js 20 (current 20.x) and 22
- Python 3.12 in golden CI; integrations document Python 3.9+

## Supported integrations

See `docs/V1_INTEGRATION_REGISTRY.md` and `docs/INTEGRATION_SUPPORT.md`. Catalog IDs include Node/Python runtimes, npm/pnpm/uv/pip, Next.js, React + Vite, Express, Fastify, FastAPI, Flask, Tailwind, shadcn, SQLite, PostgreSQL, MongoDB, Prisma, Drizzle, Mongoose, SQLAlchemy, Alembic, Zod, Pydantic, Vitest, Playwright, pytest, ESLint, Prettier, Ruff, Docker, Docker Compose, and GitHub Actions.

Bun is not implemented. PostgreSQL/MongoDB integrations do not install a database server.

## Limitations

- Alpha quality. Prefer `--dry-run`.
- `remove` is package-only for zod, prettier, pydantic, pytest, and ruff.
- pip uninstall is refused.
- RepoSetup does not install Node, Python, Docker, or databases.
- Config files are declarative only.

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

Read `CONTRIBUTING.md` before changing integrations. Do not guess third-party CLI flags.

## Security

See `SECURITY.md`. Process execution uses `spawn` with `shell: false`. Exports never include `.env` secrets.

## License

MIT
