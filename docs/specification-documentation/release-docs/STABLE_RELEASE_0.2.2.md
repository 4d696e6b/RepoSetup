# Stable 0.2.2 release and delivery record

Status — 2026-10-08: **preparing exact-source qualification; not yet published**.
The owner explicitly authorized npm/GitHub publication and current-documentation
updates. Branch: `codex/release-0.2.2`. Existing published versions and tags remain
immutable. No additional calendar soak is required.

## Scope

Ship the dependency-health repair merged through
[PR #13](https://github.com/4d696e6b/RepoSetup/pull/13): pip manifests and correct
project detection, real installed package checks after create and in doctor,
FastAPI CLI/Uvicorn checks, Python environment selection and recovery guidance.
The earlier source `0432bd6` passed 977 local unit tests, 38 packaged E2E tests
and the twelve-job/408-case matrix. Those earlier results qualify the repair,
not the new 0.2.2 artifact. See [repair evidence](../implementing-docs/POST_CREATE_DEPENDENCY_HEALTH.md).

All four workspace manifests identify 0.2.2; only bundled `rsetup` is public.
Node 24+ is required. Python coverage is 3.12/3.13 with uv and isolated pip.

## Exact-source gates

- [x] Owner authorizes publication; merged repair has regression tests.
- [x] Version manifests, publication gates, package README and current guides target 0.2.2.
- [x] Local 977 unit tests, all 38 packed E2E tests (including release gates and isolated 0.2.2 delivery), typecheck, lint, build and 37 registry definitions pass.
- [ ] Three consecutive complete first-attempt release runs pass on the same candidate source.
- [ ] Full npm/pnpm golden matrix, all preset sessions and controlled benchmarks pass on that source.
- [ ] Retain final candidate artifact, license review, byte count, SHA-256 and source identity.
- [ ] Merge release preparation and create new immutable v0.2.2 at the qualified source.
- [ ] Tag-bound publication dry-run passes.
- [ ] Publish the same qualified tarball using the approved GitHub OIDC workflow.
- [ ] Registry version/latest integrity and signed source/tag provenance match the artifact.
- [ ] Fresh npm registry acceptance passes on Linux, macOS and Windows.
- [ ] Publish GitHub release notes and close documentation/status with final evidence.

The [machine-readable record](./qualification/0.2.2.json) records progress.
Release evidence is retained locally in `/tmp/reposetup-0.2.2-release` as well as
GitHub Actions artifacts, which are subject to retention. Publication uses the
final retained tarball without rebuilding; tags and npm bytes are never replaced.

## Security and support limits

[The bounded security review](../security-docs/SECURITY_REVIEW_0.2.2.md) retains
existing-file protection, typed operations, isolated read-only probes and
artifact/source verification. Metadata checks do not prove all imports, native
module execution, transitive compatibility, live services or every permutation.
Native Windows 11, Linux arm64, live PostgreSQL/MongoDB/container connections,
SQLAlchemy DBAPI connectivity and Playwright browser journeys remain unqualified.
Catalog maturity is unchanged; no integration is promoted to stable.
The generated development-tool braces advisory remains documented separately;
zero production audit findings do not make all generated stacks audit-clean.

## Installation after publication

```sh
npx rsetup@0.2.2 --help
npm install -g rsetup@0.2.2
rsetup --version
```

Once npm latest is verified as 0.2.2, `npx rsetup` and `npm install -g rsetup` select
it. For uv FastAPI projects, use `uv run fastapi dev` from the project directory.
For pip projects, activate their Python environment first. Existing projects
from 0.2.1 are not silently rewritten; an absent requirements manifest must be
recorded explicitly before relying on doctor's checks.

Historical delivery evidence remains in [0.2.1](./STABLE_RELEASE_0.2.1.md) and
[0.2.0](./STABLE_QUALIFICATION_0.2.0.md).
