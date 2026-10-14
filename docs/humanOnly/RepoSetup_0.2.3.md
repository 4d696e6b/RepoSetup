# RepoSetup 0.2.3 user guide

RepoSetup composes and installs selected development stacks from the terminal.
Version 0.2.3 repairs installation under production settings, PostgreSQL
SQLAlchemy drivers, JavaScript Prisma imports, and Docker/Compose guidance.
It retains the create-path and installed-dependency checks from 0.2.1/0.2.2.
Publication and three-platform registry delivery pass; npm `latest` is 0.2.3. See the
[release record](../specification-documentation/release-docs/STABLE_RELEASE_0.2.3.md).

## Install

Use Node.js 24 or later. Node 22.12 is unsupported. RepoSetup does not install
system runtimes. These commands install published 0.2.3:

```sh
node --version
npm install -g rsetup@0.2.3
rsetup --version
reposetup --version
```

Both aliases should report 0.2.3. Without a global installation, use
`npx rsetup@0.2.3 --help` or `npx rsetup@0.2.3 create`.
The npm package is `rsetup`; `npx reposetup` invokes a different project.
An unversioned install selects npm's verified `latest` tag, currently 0.2.3. A local
`npm install rsetup` installs into the current project; use npx to launch it there.

Upgrading the CLI does not rewrite or reinstall an existing generated project.

## Preview and create

```sh
npx rsetup@0.2.3 create
npx rsetup@0.2.3 create my-next --framework nextjs --package-manager npm --typescript --dry-run
npx rsetup@0.2.3 create my-next --framework nextjs --package-manager npm --typescript --yes
```

Review the plan before accepting installation. RepoSetup prints the destination
and the generated application's run/build/test commands. Change into that exact
directory before running them. Only selected integrations are installed.

For bundled stacks:

```sh
rsetup presets
rsetup create my-app --preset next-sqlite --dry-run
rsetup create my-app --preset next-sqlite --yes
```

The other preset IDs are `react-vite`, `express-postgres`, `fastapi` and `flask`.
Node recipes support npm/pnpm. Python recipes require Python 3.12+ and the selected
manager; qualification covers Python 3.12/3.13 with uv and isolated pip environments.
Bundled Python presets use uv. Create includes selected Node development tools
even when the parent environment uses production/omit settings.

## Inspect and recover packages

Run these commands inside the generated project package directory:

```sh
rsetup stack
rsetup doctor
rsetup add zod --dry-run
```

Doctor reads installed dependency metadata, expected configuration and required
CLI prerequisites. It never reinstalls packages. Run the project's build and tests
as well: installed metadata does not prove every import or transitive dependency.

For missing Node development packages, use the project's selected manager:

```sh
npm install --include=dev
# For a pnpm project with damaged or missing package links:
pnpm install --prod=false --force
```

Then rerun doctor and the generated build. pnpm's manual recovery command
reinstalls package links; normal creation does not use a forced reinstall.

For a uv FastAPI project, run `uv sync`, then `uv run fastapi dev` from its root.
For pip, reactivate the environment used during creation, install its
`requirements.txt`, and run `fastapi dev`. Doctor inspects uv's existing environment
without syncing it and uses the active interpreter for pip.

## Incomplete creation and npm cache errors

An error followed by “Execution stopped” means creation is incomplete. Source files
may already exist while Express, Node types or Prisma setup are still absent.
`create` does not resume over those files and does not automatically roll back.
Review the actual target directory and failed operation before recovery or choosing
a fresh destination.

The reported 0.2.2 Express project stopped because npm could not write its cache
(`EEXIST`/`EACCES`). Its preceding peer warning was not the fatal error. A writable
cache was used to finish that project's remaining operations without overwriting
its source. The new diagnostics make this failure and its recovery clearer; they
do not change global cache ownership or silently repair an interrupted generator.

If npm cannot write its configured cache, select a separate writable cache in
your terminal. For an existing npm project whose package manifest is complete:

```sh
npm install --include=dev --cache ./npm-cache-recovery
```

Keep this task-specific directory out of version control. If a framework generator
itself failed, inspect its output first; installing dependencies alone does not
complete the missing generated files. Preserve the error and selected options for
a bug report, and never share real secrets.

## Docker, databases and Prisma

Selecting Docker writes `DOCKER_SETUP.md`. Install Docker yourself if needed.
Doctor checks bounded Docker/Compose version probes; a passing CLI probe does not
prove that the daemon or a container is running. Docker alone does not generate
an application Dockerfile or a database service.

For the supported PostgreSQL service configuration, select both `docker` and `docker-compose` with
PostgreSQL. Compose uses a loopback port, a persistent volume and environment
placeholders. Set your own local password and connection settings, then follow
the generated instructions. RepoSetup does not start containers, provision a
database, apply migrations or store real credentials in its configuration.

SQLAlchemy PostgreSQL recipes include Psycopg's binary driver and a guarded engine
helper using a `postgresql+psycopg://` URL. Creating an engine does not connect to
the server. JavaScript Prisma helpers use generated TypeScript import paths
supported by Node 24; TypeScript projects retain their compiled JavaScript paths.
PostgreSQL and MongoDB still require reachable services and valid credentials
before application database operations can work.

## Support limits

The frozen candidate `a213a6a1edf63771aba8d5b91bfdcf44d665de22` passed
[two Linux live-service tests](https://github.com/4d696e6b/RepoSetup/actions/runs/37813979567)
with no failures or skips. Five PostgreSQL checks cover new create/doctor,
generated Prisma and Drizzle CRUD, FastAPI/uv SQLAlchemy with Psycopg CRUD, and
PostgreSQL 18.6 data persistence across a Compose restart and container recreation.
Two MongoDB checks cover new create/doctor and authenticated generated Mongoose
CRUD against MongoDB 8.0.32. The Node projects use Express with JavaScript; both
tests verify cleanup of their disposable services.

Separately, five local cases exercised retained generated helpers on macOS against
PostgreSQL 14.20 and MongoDB 8.2.3. Those checks include compiled Express/Prisma
and Fastify/Drizzle helpers, both FastAPI and Flask SQLAlchemy helpers, and
Express/Mongoose. They are not five additional fresh CLI creation tests or
cross-platform live-service qualification. Published CLI delivery and its exact
artifact/provenance evidence are recorded in the release record.

The automated matrix covers Ubuntu 24.04 x64, macOS 15 arm64 and Windows Server
2025 x64. It does not qualify native Windows 11, Linux arm64, every integration
permutation, live services on every platform or recipe, migrations or actual
Playwright browser journeys. The bounded live checks above do not change those
limits. No integration ID is promoted to stable.

The documented generated development-tool advisory remains; this is not an
audit-clean claim. See the [installed-stack audit](../specification-documentation/implementing-docs/INSTALLED_STACK_AUDIT.md),
[release record](../specification-documentation/release-docs/STABLE_RELEASE_0.2.3.md)
and [integration support](../specification-documentation/implementing-docs/INTEGRATION_SUPPORT.md).
