# Installed stack audit — 2026-10-08

## Delivery status

These repairs are implemented on `codex/audit-installed-stack` and are **unreleased**.
The public `rsetup@0.2.2` package and its immutable tag remain unchanged.
Automated installed-stack qualification is complete. All 480 cases pass across
twelve full-scope jobs after retrying the two failed Windows/npm jobs on unchanged
source. The initial timeout failures remain recorded. Live-service limits below
remain unqualified; this audit does not qualify a newly versioned release artifact.
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
- Doctor's recovery commands explicitly include development dependencies under
  production settings. For damaged pnpm package links, its instructions use the
  documented forced reinstall; a plain install can report up to date without
  restoring a missing link. Doctor never performs that reinstall itself.

## Local verification

On macOS arm64, Node 24.21.0 and Python 3.13.1:

- All 1,043 unit tests pass after the timeout diagnostic and fixture corrections;
  workspace build, typecheck and lint pass. Splitting six grouped fixture cases
  increases the test count by five while preserving their original assertions.
- All 38 standard packed E2E tests pass with uv available; no skips.
- Five independent Express TypeScript production/omit installations pass create,
  compilation, doctor and HTTP checks. Two permanent packed npm/pnpm regression
  cases also prove that removing Express declarations fails doctor and compilation,
  and that following doctor's recovery commands restores both under the same
  production/omit settings.
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

## Cross-platform evidence

The primary repair source is `d26b912eb321b55fd930b169b1fcd9a230f1d6da`;
the full expanded matrix and preset sessions test its documentation descendant
`4630f86359123d118524f8a1d988fe7cd5ad611a`. The subsequent doctor recovery hint and
its extended packed tests are committed at `a39610ecb2a7527b9c71fb555de6e2d854b0ac42`.
This separation is recorded explicitly; these runs are not a publication gate for
a newly versioned release artifact.

- [Fast CI](https://github.com/4d696e6b/RepoSetup/actions/runs/37793787603) and
  [platform checks](https://github.com/4d696e6b/RepoSetup/actions/runs/37793786901)
  pass for the recovery follow-up PR head. Both check out merge commit
  `4ee2c84` (parents `4db2f40` and `a39610e`), rather than the literal branch head.
  Platform CI conditionally skips one uv-dependent
  E2E test on each runner where uv is not installed, and one POSIX-only unit test
  on Windows. Local uv-enabled E2E and the required golden Python paths cover uv;
  these conditional skips are not counted as passing tests.
- [Dependency recovery](https://github.com/4d696e6b/RepoSetup/actions/runs/37793811607)
  passes all twelve jobs: 24 packed npm/pnpm create/damage/recover/build/doctor
  executions. Its `dependency-recovery` scope deliberately filters twenty unrelated
  tests per job and cannot qualify the complete matrix.
- [Preset usability](https://github.com/4d696e6b/RepoSetup/actions/runs/37785134229)
  passes fifteen sessions and 117 step checks. Eight expected failure checks include
  three occupied-port refusals and five unavailable Docker prerequisite reports;
  no unexpected failures are accepted. Missing Docker is never presented as healthy.
- [Controlled installation measurements](https://github.com/4d696e6b/RepoSetup/actions/runs/37785093781)
  complete on all three platforms. All commands pass and consolidated installs use
  one subprocess instead of five. Two cold Express medians are slower than the
  baseline (Windows 7.75%, macOS 8.53%); warm Express medians improve 44.97–67.64%.
  This is a controlled fixed-package comparison, not a promise about registry latency.
  PR-triggered measurements checked out GitHub's merge commit
  `65dde7d5cb107044fdca747509319c9556cad623`, whose parents are `4db2f40` and `4630f86`.
- [The full expanded matrix](https://github.com/4d696e6b/RepoSetup/actions/runs/37785128517)
  initially finished with 478 passes, two failures and no skipped tests. Both Windows/npm
  jobs timed out at the 300-second deadline during the first Next.js/SQLite
  consolidated install, before Prisma initialization. The initial logs do not
  establish a registry/network cause. Timeout diagnostics now retain bounded,
  redacted installer output. A focused Next run then passed all twelve jobs
  with unchanged installation deadlines (twelve selected tests, 204 filtered
  tests). Its artifacts confirm `next-vitest` scope, so it does not qualify
  the full matrix. The two failed full-matrix jobs then passed on unchanged
  source: 80 new passes with no failures or skips, with ten successful jobs
  carried forward. The latest qualification covers all 480 cases with no failures
  or skipped tests. All twelve retained artifacts confirm the intended source,
  Node 24 and `full` scope. This result does not establish the original timeout
  cause, and it does not mean all 480 cases were reexecuted during the retry.

A subsequent [manual platform run](https://github.com/4d696e6b/RepoSetup/actions/runs/37797889659)
passes all three targets at timeout-diagnostic source `d433f1b`. The corresponding
PR platform run exposed two five-second unit-fixture timeouts on Windows. One
fixture grouped six filesystem cases under a single deadline; another accidentally
probed the host Python installation despite mocking prerequisite availability.
The fixture-only correction at `c4f5049` splits those six cases, injects missing
Python resolution, asserts no process runs, and retries cleanup of test-owned
temporary directories. Assertions and production deadlines are preserved.
[Fresh fast CI](https://github.com/4d696e6b/RepoSetup/actions/runs/37799760007)
and [all three platform jobs](https://github.com/4d696e6b/RepoSetup/actions/runs/37799760068)
pass for this correction, checking out merge `f4c8bdf` with parents `4db2f40` and
`c4f5049`. Windows passes 1,042 unit tests and skips one POSIX-only case; each
platform passes 37 packed E2E tests and skips the uv-only case when uv is absent.

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

A later read-only local readiness check found Docker's daemon unresponsive:
server queries timed out after five seconds and a socket ping after three.
Only 1.1 GiB was free at that check. Live PostgreSQL/Compose testing cannot be
qualified from this machine now; no images were pulled or containers started.

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
