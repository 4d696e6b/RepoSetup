# Stable 0.2.3 release and delivery record

Status — 2026-10-09: **published and delivery accepted**. npm `latest` identifies
`rsetup@0.2.3`. [GitHub release](https://github.com/4d696e6b/RepoSetup/releases/tag/v0.2.3).
The owner authorized publication after health checks; no additional calendar
soak was required. Existing published versions and tags remain immutable.

## Delivered changes

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

[Linux live-service acceptance](https://github.com/4d696e6b/RepoSetup/actions/runs/37813979567)
passes both actual tests, with no failures or skips, on candidate `a213a6a`.
Fresh CLI creations connect through Prisma, Drizzle, SQLAlchemy/Psycopg binary
and authenticated Mongoose helpers. PostgreSQL 18.6 data survives restart and
container recreation using the generated persistent volume. MongoDB 8.0.32 CRUD
passes. Five PostgreSQL and two MongoDB checks retain exact source/version,
image digests and successful resource cleanup in artifact `11565988004`.
These representative cases do not qualify every service combination or migration.

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

## Initial version-specific qualification attempts

Candidate `a213a6a` passed the first full release run
[37813984536](https://github.com/4d696e6b/RepoSetup/actions/runs/37813984536).
The second run failed after its Windows Golden H application tests passed:
Node exited with a libuv shutdown assertion. The third run lost communication
with its hosted macOS runner; job logs were unavailable, and the API annotation
records the runner loss. These runs do not satisfy the consecutive publication
gate. The three new first-attempt runs on unchanged source passed as recorded below.

The first expanded matrix passed eleven complete jobs, totaling 440 cases with
no skips. Its Windows/Python 3.12/npm job reported a Next/SQLite recipe failure,
then reached the 90-minute workflow deadline before a final summary. That partial
job is not counted as a pass; its original logs and API metadata are retained.
The single failed job was retried on unchanged source and passed all forty
cases. The final matrix has 480 passes with no skips: 440 carried-forward
passes and forty new passes. A separate focused Next diagnostic passed all
twelve configurations with 204 unrelated tests deliberately excluded. It did
not reproduce or explain the suppressed initial assertion.

All fifteen candidate usability sessions pass 117 checks, with eight expected
occupied-port or unavailable-prerequisite refusals and no unexpected failures.
Controlled benchmarks pass all 120 command trials on the three release platforms.
Their lower medians in this sample do not promise universal network speed.

## Completed publication and delivery

Immutable tag/source: `v0.2.3` / `a213a6a1edf63771aba8d5b91bfdcf44d665de22`.
The final consecutive first-attempt release runs all pass sixteen required jobs
and every required step:
[37863956517](https://github.com/4d696e6b/RepoSetup/actions/runs/37863956517),
[37863959982](https://github.com/4d696e6b/RepoSetup/actions/runs/37863959982),
[37863963775](https://github.com/4d696e6b/RepoSetup/actions/runs/37863963775).
The candidate branch stayed unchanged through publication.

The final run retains artifact `11588707141` and `rsetup-0.2.3.tgz`
(115325 bytes), plus identified-source evidence and a clean dependency
license review. SHA-256: `f740df147bc9e8dbf4dc076322f2424d96ad2f27a0da14ef3e46c818e26edd2b`.
[Tag-bound dry-run](https://github.com/4d696e6b/RepoSetup/actions/runs/37875863670)
passes before [artifact-only OIDC publication](https://github.com/4d696e6b/RepoSetup/actions/runs/37875932749).
No release build was recreated during publication.

Fresh npm acceptance passes on Ubuntu 24.04/x64, macOS 15/arm64 and Windows
Server 2025/x64. Each checks both launchers, dry-run, actual Express creation,
build and HTTP-response test outside the monorepo. Registry 0.2.3 and latest
integrity match the retained archive; downloaded bytes match SHA-256/SHA-512.
Signed SLSA provenance binds the archive, source, tag and approved publishing
workflow/run. Transparency log index: `3155772957`.
An isolated unversioned `npm install rsetup` resolves 0.2.3; both aliases report
0.2.3. `npm audit signatures` verifies 27 registry signatures and twenty attestations.

GitHub release assets include the exact archive, source/hash identity and license
review. [Machine-readable evidence](./qualification/0.2.3.json) retains the
attempts and proof; raw local evidence is in `/tmp/reposetup-0.2.3-release`, and
GitHub logs/artifacts remain subject to their retention periods.

## Version-specific release gates

- [x] Owner authorizes 0.2.3 publication after required checks.
- [x] Installed-stack repair qualification is complete, with original failures retained.
- [x] Merge the repairs and release preparation; current manifests, publication checks and guides target 0.2.3.
- [x] Prepared 0.2.3 passes 1,043 unit tests, 38 packed E2E tests with no skips, typecheck, lint, build and 37 registry definitions; production audit and bounded review pass. Final retained-artifact license review passes.
- [x] Required exact-source release runs pass every required job and step.
- [x] Final candidate passes the full matrix, preset sessions and controlled benchmarks.
- [x] Retain the final artifact identity, source, byte length and hashes.
- [x] New immutable `v0.2.3` identifies the qualified source; tag-bound publication dry-run passes.
- [x] Publish only the retained artifact with OIDC; verify registry integrity and signed provenance.
- [x] Fresh npm registry acceptance passes on Linux, macOS and Windows.
- [x] Publish GitHub release, verify npm `latest`, and close current documentation/status.

The [version-specific machine record](./qualification/0.2.3.json) retains attempts
and publication/delivery identity. All delivery gates pass; historical repair evidence remains distinct from final artifact qualification.

## Installation

```sh
npm install -g rsetup@0.2.3
rsetup --version
npx rsetup@0.2.3 create
```

Both `rsetup` and `reposetup` are installed aliases. The npm package is `rsetup`.
Unversioned `npm install -g rsetup` and `npx rsetup` select the registry's `latest`
tag, now verified as 0.2.3.
Existing generated projects are not silently rewritten by a CLI upgrade.
See the [0.2.3 user guide](../../humanOnly/RepoSetup_0.2.3.md) for recovery and setup.

## Security and support limits

Installed dependency metadata and configuration do not prove every import,
transitive dependency, editor language-server state or external service.
Docker/Compose CLI checks do not prove daemon readiness. Historical local
read-only probes found an unresponsive daemon and did not pull images or start
containers. The separate Linux tests started only their own disposable services. Representative local PostgreSQL/MongoDB queries passed as recorded above.
The separate Linux container cases passed as recorded above. General migration workflows, native
Windows 11, Linux arm64 and actual Playwright browser journeys remain unqualified. No integration is promoted to stable.

The documented generated development-tool advisory remains. A clean production
workspace audit does not make all generated stacks audit-clean. RepoSetup does
not install system software, provision database servers, persist real secrets,
silently overwrite user files or resume an interrupted create.

Historical delivery records: [0.2.2](./STABLE_RELEASE_0.2.2.md),
[0.2.1](./STABLE_RELEASE_0.2.1.md) and [0.2.0](./STABLE_QUALIFICATION_0.2.0.md).
