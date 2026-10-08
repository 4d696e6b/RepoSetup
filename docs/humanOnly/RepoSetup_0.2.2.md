# RepoSetup 0.2.2 user guide

RepoSetup composes and installs a selected development stack from the terminal.
Version 0.2.2 adds real installed-dependency health checks and pip dependency
manifests, fixes Python environment selection, and explains FastAPI startup.
It retains the create-path and setup repairs from 0.2.1. Publication progress is
recorded in the linked release record; use these commands after publication.

## Install

Use Node.js 24 or later. Node 22.12 is unsupported; ignoring EBADENGINE warnings
does not make that runtime supported. RepoSetup does not install system runtimes.

```sh
node --version
npm install -g rsetup@0.2.2
rsetup --version
reposetup --version
```

Both aliases should report 0.2.2. Without a global install, use
`npx rsetup@0.2.2 --help` or `npx rsetup@0.2.2 create`.
The npm package is `rsetup`; `npx reposetup` is a different project.
Once npm's latest tag identifies 0.2.2, unversioned `npm install -g rsetup`
and `npx rsetup` also select it. A local `npm install rsetup` installs into the
current project; use npx to launch it there.

## Preview and create

Interactive creation:

```sh
npx rsetup@0.2.2 create
```

Preview a named TypeScript Next.js project, then execute the same selection:

```sh
npx rsetup@0.2.2 create my-next --framework nextjs --package-manager npm --typescript --dry-run
npx rsetup@0.2.2 create my-next --framework nextjs --package-manager npm --typescript --yes
```

RepoSetup prints the destination and generated project's actual run/build/test
commands. Change into that directory before using those commands. Only selected
integrations are installed. Preserve user files and lockfiles; a failed execution
may have completed some operations and is not automatically rolled back.

For bundled stacks, list presets and preview your selection:

```sh
rsetup presets
rsetup create my-app --preset next-sqlite --dry-run
rsetup create my-app --preset next-sqlite --yes
```

The other preset IDs are `react-vite`, `express-postgres`, `fastapi` and `flask`.
Node projects support npm/pnpm. Python creation has qualified uv and isolated pip
paths; the bundled Python presets use uv and require Python 3.12+.
Python 3.12/3.13 are covered by qualification. Docker Compose presets require an
existing Docker executable; RepoSetup does not install Docker or database servers.

## Inspect an existing project

Run these commands inside one project package directory:

```sh
rsetup stack
rsetup doctor
rsetup info zod
rsetup add zod --dry-run
```

Choose integrations appropriate to the framework/runtime. Doctor is read-only;
export writes declarative configuration without copying secrets. Preview export
with `rsetup export --dry-run`. Removal is limited to explicit safe recipes and
preserves generated source/configuration; it is not a complete rollback.

## Python dependency health

Run commands from the generated project directory. For a uv FastAPI project:

```sh
uv sync
uv run fastapi dev
rsetup doctor
```

For pip, reactivate the Python environment used during creation, then run:

```sh
python -m pip install -r requirements.txt
fastapi dev
rsetup doctor
```

Create verifies installed dependency metadata before reporting success. Doctor
checks required packages and FastAPI's CLI/Uvicorn; it does not reinstall anything.
A missing uv environment fails health checks until you explicitly run `uv sync`.
An existing pip project from 0.2.1 may lack a manifest; upgrading the CLI does not
retroactively create one. Record the selected dependencies in requirements.txt,
use the original environment, and check the application before relying on it.
These checks complement application builds/tests and do not prove live services.

## Support and troubleshooting

The automated matrix covers Ubuntu 24.04 x64, macOS 15 arm64 and Windows Server
2025 x64. It does not qualify native Windows 11, Linux arm64, every integration
permutation, live PostgreSQL/MongoDB/container connections or actual Playwright
browser journeys. Catalog maturity remains explicit; no individual ID is stable.

If execution fails, keep the error code, runtime/package-manager versions and a
minimal reproduction. Review already-created files before retrying. Do not share
real secrets. A FILE_MUTATION_FAILED on named-folder Next.js app/layout.tsx from
0.2.0 is repaired in this patch; verify both the installed and invoked version.

Generated development tooling retains the documented unpatched braces advisory;
this is not an audit-clean claim. See [release evidence and limitations](../specification-documentation/release-docs/STABLE_RELEASE_0.2.2.md)
and [integration support](../specification-documentation/implementing-docs/INTEGRATION_SUPPORT.md).
