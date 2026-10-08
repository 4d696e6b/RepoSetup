# Installed stack audit — 2026-10-08

## Delivery status

These repairs are implemented on `codex/audit-installed-stack` and are **unreleased**.
The public `rsetup@0.2.2` package and its immutable tag remain unchanged.
Local implementation checks pass; cross-platform qualification of this repair is pending.
Machine-readable evidence is in [installed-stack-audit.json](../release-docs/qualification/installed-stack-audit.json).

## Reported Express project

The owner's Express/TypeScript/PostgreSQL/Prisma/Docker creation stopped after
13 of 19 operations. npm could not write a root-owned directory in its cache:
`EEXIST` followed by `EACCES` while fetching `elkjs`. Dependency installation never
completed, so Express, Node types and the remaining Prisma setup were absent.
The preceding peer warning was not the fatal error. Clean 0.2.2 Express TypeScript
projects with writable caches compiled and returned HTTP 200 with npm and pnpm.

The existing `test/js_test` project was repaired by executing the six remaining
typed operations with a separate writable cache and development dependencies enabled.
Existing source files were preserved. Its eleven required packages resolve;
TypeScript builds; Prisma Client is generated and imports in development and
compiled output; the Express endpoint returns HTTP 200. Docker prerequisite
instructions were added with an exclusive typed file operation.

The machine's old Docker executable on PATH does not complete `docker --version`.
The repaired doctor's five-second probe reports this prerequisite failure.
Docker Desktop's bundled CLI and Compose executable work with an isolated PATH
override. No global cache ownership, PATH, system installation, containers or
database credentials were changed.

## Confirmed product defects and repairs

- Production environment/omit settings could leave generated Node development
  tools uninstalled. Create now carries a typed `includeDev` policy through
  batching, consolidated manifests and scaffold installs. npm uses `--include=dev`;
  pnpm uses `--prod=false`. Explicit development package adds also include dev
  packages; ordinary runtime adds and locked reproduction retain their defaults.
- SQLAlchemy's PostgreSQL recipe lacked a DBAPI driver. It now installs pinned
  `psycopg[binary]==3.3.6`, uses a `postgresql+psycopg://` placeholder, and writes
  `database.py` with a guarded engine factory. Creating the engine does not
  connect. Doctor also checks the binary distribution required by this extra.
- JavaScript Prisma helpers imported a generated `.js` file that did not exist.
  JavaScript recipes now generate real `.ts` import paths and write a `.js`
  helper that imports the client through Node 24's native type stripping.
  TypeScript recipes keep their compiled `.js` import convention.
- Docker-only selections previously left no detectable configuration and doctor
  did not check infrastructure prerequisites. They now create `DOCKER_SETUP.md`;
  doctor checks bounded Docker/Compose CLI availability separately from file health.
- PostgreSQL Compose configuration lacked a host port and credential/database
  alignment. It now publishes on IPv4 loopback, documents configurable values,
  requires a local password, and uses the official PostgreSQL 18 volume layout.
- npm cache permission failures now suggest conditional, safe dependency/generator
  recovery. Failed creation prints the actual project directory and states that
  `create` does not resume over existing files. Completion output distinguishes
  installed packages from unstarted system services and uses the correct
  `DATABASE_URL` or `MONGODB_URI` variable.
- Node prerequisite metadata and plan text now match RepoSetup's existing Node 24
  requirement instead of quoting an unrelated older Next.js minimum.

## Local verification

On macOS arm64, Node 24.21.0 and Python 3.13.1:

- All 1,037 unit tests pass; workspace build, typecheck and lint pass.
- All 38 standard packed E2E tests pass with uv available; no skips.
- Five independent Express TypeScript production/omit installations pass create,
  compilation, doctor and HTTP checks. Two permanent packed npm/pnpm regression
  cases also prove that removing Express declarations fails doctor and compilation.
- Four JavaScript Prisma recipes (Express/Fastify × SQLite/PostgreSQL) pass with
  both npm and pnpm. Each regenerates a model and enum, then imports its generated
  client using plain Node. SQLite executes a local `SELECT 1`; PostgreSQL checks
  client construction/disconnection without opening a connection.
- FastAPI and Flask with SQLAlchemy pass using both uv and isolated pip environments:
  creation, doctor, framework/helper imports, binary driver selection, missing-URL
  refusal, pytest, ruff and dependency consistency. An injected connection trap
  proves the engine helper does not connect. Golden D/E pass; removing binary
  distribution metadata fails doctor without resynchronizing the uv environment.
- Published 0.2.2 representative Prisma, Drizzle and Mongoose TypeScript stacks
  install their declared packages and build using writable caches. These checks
  distinguished cache aborts from the separate SQLAlchemy and JavaScript Prisma defects.
- Actual Compose configuration parsing passes for defaults, custom user/database/
  port values, loopback publication and the persistent volume; a missing password
  fails. Doctor rejects the hanging old Docker CLI and accepts working Docker/Compose
  binaries. These checks do not contact the daemon.

Filtered targeted runs deliberately exclude unrelated golden tests; their filtered
counts are not full-matrix evidence. The permanent matrix now has 22 bare solutions
and 18 recipes: 40 tests per runner/toolchain job, 480 executions across twelve jobs.

## Remaining boundaries

Selecting Docker records a prerequisite; selecting PostgreSQL/MongoDB writes
configuration. RepoSetup does not install system software, start containers or
database servers, provision a database, or store real credentials. Selecting
Docker alone does not generate an application Dockerfile or a database Compose service.
Select `docker-compose` with PostgreSQL for the supported Compose configuration.

Doctor is read-only and checks package metadata, expected configuration and CLI
availability. It cannot guarantee every application import, editor language-server
state, Docker daemon readiness, live PostgreSQL/MongoDB connectivity, migrations,
or browser journeys. Native Windows 11 and Linux arm64 remain outside the existing
CI targets. No integration maturity is promoted by this audit.

## Verified official sources

- [npm include policy](https://docs.npmjs.com/cli/v11/commands/npm-install/)
- [pnpm production dependency policy](https://pnpm.io/cli/install)
- [Prisma 7 generator import extensions](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)
- [Node TypeScript support](https://nodejs.org/api/typescript.html)
- [SQLAlchemy Psycopg dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.psycopg)
- [Psycopg binary installation](https://www.psycopg.org/psycopg3/docs/basic/install.html)
- [Compose ports](https://docs.docker.com/reference/compose-file/services/#ports)
- [Compose config validation](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Official PostgreSQL image](https://hub.docker.com/_/postgres)

All external command behavior above was checked against these sources and real
isolated executions. Automatic system installation and resumable create remain
unsupported; the repair does not imply either behavior.
