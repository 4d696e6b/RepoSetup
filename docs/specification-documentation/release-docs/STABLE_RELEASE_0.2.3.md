# Stable 0.2.3 release and delivery record

Status — 2026-10-08: **preparation; publication pending**. The owner authorized
publication after the required health checks. Version-specific artifact
qualification, publication and fresh registry delivery must pass before this
record is marked delivered. Existing published versions and tags remain immutable.

## Changes prepared for delivery

[PR #17](https://github.com/4d696e6b/RepoSetup/pull/17) repairs installed-stack
failures and misleading setup guidance:

- Generated Node projects and explicit development package additions include dev
  dependencies even when the parent environment uses production/omit settings.
- PostgreSQL SQLAlchemy recipes install the pinned Psycopg binary driver, write
  a driver-specific URL and provide a guarded engine factory. JavaScript Prisma
  helpers import the generated client through supported Node 24 TypeScript paths.
- Docker selections leave detectable prerequisite guidance. Doctor checks bounded
  Docker/Compose CLI probes. PostgreSQL Compose publishes a loopback port, aligns
  environment placeholders, requires a local password and uses persistent storage.
- Cache permission failures, timeouts and partial creation retain actionable,
  bounded and redacted diagnostics. Failed creation reports its destination and
  makes clear that `create` does not resume over existing files.
- Completion output separates installed packages from manual service setup.
  Doctor's recovery commands include development packages and repair damaged pnpm
  links without reinstalling anything automatically. Node prerequisite wording
  matches the existing Node 24 requirement.

The reported Express installation failed because npm could not write a root-owned
cache directory, not because a completed install lost Express. It stopped after
13 of 19 operations. The user's project was repaired separately with the remaining
typed operations and a writable cache; its build, Prisma imports and HTTP response
passed. No system cache ownership, global PATH or service installation was changed.
This environment failure is distinct from the confirmed product defects above.

Only bundled `rsetup` is public; workspace libraries remain private. Node 24+
is required. Python qualification covers 3.12/3.13 with uv and isolated pip.

## Completed repair evidence

The [installed-stack audit](../implementing-docs/INSTALLED_STACK_AUDIT.md) and its
[machine-readable record](./qualification/installed-stack-audit.json) retain exact
source identities, test scopes and initial failures. This repair evidence does
not replace qualification of the newly versioned 0.2.3 artifact.

- Local checks pass: 1,043 unit tests; all 38 packed E2E tests with uv available;
  workspace typecheck, lint and build.
- [Full expanded matrix](https://github.com/4d696e6b/RepoSetup/actions/runs/37785128517)
  passes all 480 cases across twelve configurations: Ubuntu 24.04 x64, macOS 15
  arm64 and Windows Server 2025 x64, with npm/pnpm and Python 3.12/3.13 paths.
  Two Windows/npm jobs initially timed out at the unchanged 300-second operation
  deadline. Only those failed jobs were retried on unchanged source: 80 new passes
  and ten carried-forward successful jobs. There are no skipped full-matrix cases.
  The initial logs do not establish the original timeout cause.
- [Dependency recovery](https://github.com/4d696e6b/RepoSetup/actions/runs/37793811607)
  passes 24 selected packed create/damage/recover/build/doctor cases. The scoped
  run filters unrelated tests and is not full-matrix evidence.
- [Preset usability](https://github.com/4d696e6b/RepoSetup/actions/runs/37785134229)
  passes 117 checks across fifteen sessions. Eight explicit expected failures
  cover occupied ports and unavailable Docker prerequisites; unavailable Docker
  is never described as healthy.
- Targeted checks cover production/omit installs, JavaScript Prisma regeneration
  and imports, SQLAlchemy binary driver availability, and actual Compose
  configuration parsing. PostgreSQL helper construction does not open a connection.
- [Controlled measurements](https://github.com/4d696e6b/RepoSetup/actions/runs/37785093781)
  complete on all three platforms. Warm Express medians improve, while two cold
  Express medians are slower than the baseline. They do not promise universal
  registry or generator speed.

## Additional live database acceptance

Isolated macOS host PostgreSQL 14.20 and MongoDB 8.2.3 acceptance passed five
cases: generated Prisma and Drizzle helpers performed real queries and CRUD;
both FastAPI/Flask SQLAlchemy factories used the Psycopg binary driver for real
queries; Mongoose performed insert/read/delete. Express/Fastify HTTP endpoints
returned 200. Both temporary servers exited cleanly, their ports closed and
owned data/cache/dependencies were removed. User projects and services were
unchanged. Helpers matched the current integration templates at checkout
`7e5f815`; these were retained generated-project copies, not new CLI creations.

Linux generated Compose PostgreSQL 18.6 and MongoDB 8.0.32 container acceptance remains
pending. The permanent opt-in service suite requires actual connectivity, not
just generated configuration or an available Docker executable.

Local typechecking first overlapped a build that was replacing workspace declaration
files. Repeating it after build completion passed without a code change; both
logs are retained. The dedicated opt-in service suite is separate from standard
packed E2E and must pass two real cases with no skips and successful cleanup.

To run the dedicated container acceptance on a POSIX Docker host with Node 24,
Python 3.13 and uv available:

```sh
REPOSETUP_LIVE_SERVICES=1 pnpm test:services
```

The explicit opt-in starts only disposable test services and removes their
containers and volumes afterward. A default opt-out or missing prerequisite
is not live-service qualification. The CI evidence must contain two passing
cases, no skips and successful cleanup, bound to the candidate source/version.

## Version-specific release gates

- [x] Owner authorizes 0.2.3 publication after required checks.
- [x] Installed-stack repair qualification is complete, with original failures retained.
- [ ] Merge the repairs and release preparation; current manifests, publication checks and guides target 0.2.3.
- [x] Prepared 0.2.3 passes 1,043 unit tests, 38 packed E2E tests with no skips, typecheck, lint, build and 37 registry definitions; production audit and bounded review pass. Final retained-artifact license review remains required.
- [ ] Required exact-source release runs pass every required job and step.
- [ ] Final candidate passes the full matrix, preset sessions and controlled benchmarks.
- [ ] Retain the final artifact identity, source, byte length and hashes.
- [ ] New immutable `v0.2.3` identifies the qualified source; tag-bound publication dry-run passes.
- [ ] Publish only the retained artifact with OIDC; verify registry integrity and signed provenance.
- [ ] Fresh npm registry acceptance passes on Linux, macOS and Windows.
- [ ] Publish GitHub release, verify npm `latest`, and close current documentation/status.

The [version-specific machine record](./qualification/0.2.3.json) retains attempts
and publication/delivery identity. Until those gates pass, the repair branch is not a delivered npm release.

## Installation after publication

```sh
npm install -g rsetup@0.2.3
rsetup --version
npx rsetup@0.2.3 create
```

Both `rsetup` and `reposetup` are installed aliases. The npm package is `rsetup`.
Unversioned `npm install -g rsetup` and `npx rsetup` select the registry's `latest`
tag; this record must confirm that tag before promising it identifies 0.2.3.
Existing generated projects are not silently rewritten by a CLI upgrade.
See the [0.2.3 user guide](../../humanOnly/RepoSetup_0.2.3.md) for recovery and setup.

## Security and support limits

Installed dependency metadata and configuration do not prove every import,
transitive dependency, editor language-server state or external service.
Docker/Compose CLI checks do not prove daemon readiness. Local read-only probes
found the Docker daemon unresponsive; no containers or database images were started
to create artificial evidence. Representative local PostgreSQL/MongoDB queries passed as recorded above.
Linux container qualification is pending. General migration workflows, native
Windows 11, Linux arm64 and actual Playwright browser journeys remain unqualified. No integration is promoted to stable.

The documented generated development-tool advisory remains. A clean production
workspace audit does not make all generated stacks audit-clean. RepoSetup does
not install system software, provision database servers, persist real secrets,
silently overwrite user files or resume an interrupted create.

Historical delivery records: [0.2.2](./STABLE_RELEASE_0.2.2.md),
[0.2.1](./STABLE_RELEASE_0.2.1.md) and [0.2.0](./STABLE_QUALIFICATION_0.2.0.md).
