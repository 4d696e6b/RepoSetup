# Stable 0.2.2 release and delivery record

Status — 2026-10-08: **published and delivery accepted**. npm `latest` identifies
`rsetup@0.2.2`. [GitHub release](https://github.com/4d696e6b/RepoSetup/releases/tag/v0.2.2). The owner authorized
publication and documentation updates; no additional calendar soak was required.
Existing published versions and tags were preserved.

## Delivered changes

[PR #13](https://github.com/4d696e6b/RepoSetup/pull/13) repairs misleading
post-create dependency health: pip records selected pinned requirements in the
new project; create and doctor check actual Node/Python distribution metadata;
FastAPI standard includes CLI/Uvicorn checks; Python environment selection and
startup/recovery guidance are corrected. Doctor remains read-only and does not
reinstall packages or recreate missing environments. [Repair coverage](../implementing-docs/POST_CREATE_DEPENDENCY_HEALTH.md).

All four workspace manifests identify 0.2.2; only bundled `rsetup` is public.
Node 24+ is required. Python coverage is 3.12/3.13 with uv and isolated pip.

## Completed release gates

- [x] Owner authorization; repair and preparation merged through PR #13/#14.
- [x] Current manifests, publication gates, package README and guides target 0.2.2.
- [x] Local 977 unit tests, all 38 packed E2E tests without skips, typecheck, lint, build and 37 registry definitions pass; production workspace audit reports zero vulnerabilities.
- [x] Three consecutive first-attempt release runs on exact source `c447e461e6e66935f077449c99d8d759e6067482` pass all 16 required jobs and every required step: [37753011583](https://github.com/4d696e6b/RepoSetup/actions/runs/37753011583), [37753017211](https://github.com/4d696e6b/RepoSetup/actions/runs/37753017211), [37753022845](https://github.com/4d696e6b/RepoSetup/actions/runs/37753022845).
- [x] [Expanded full matrix](https://github.com/4d696e6b/RepoSetup/actions/runs/37753026671) qualifies twelve configurations with 34 cases each (408 successful executions, no skipped cases). The initial Windows/Python 3.12/npm job had 33 passes and one Next.js/SQLite npm installation timeout at the 300-second operation deadline. Only that job was rerun on unchanged source; [recovered job](https://github.com/4d696e6b/RepoSetup/actions/runs/37753026671/job/113262619227) passes all 34. The initial failure is retained, not counted as a successful full job.
- [x] [Preset sessions](https://github.com/4d696e6b/RepoSetup/actions/runs/37753078760) pass 117 checks across fifteen sessions, including three expected occupied-port refusals. [Controlled benchmarks](https://github.com/4d696e6b/RepoSetup/actions/runs/37753083035) pass on all three platforms; they do not establish universal generator speed.
- [x] [Fast CI](https://github.com/4d696e6b/RepoSetup/actions/runs/37753095771) and [platform suite](https://github.com/4d696e6b/RepoSetup/actions/runs/37753095235) pass. These PR jobs checked synthetic merge `b8bfe39`, whose Git tree equals the candidate. Conditional platform skips are recorded in JSON; the local full E2E and full golden cases have no skips.
- [x] Final run retains artifact ID `11541295559`, dependency-license review and `rsetup-0.2.2.tgz` (111924 bytes). SHA-256: `5a16e3f9ba26a619c8aa42193d3be820cc2ab95a6a77036a746ccc17566b9495`.
- [x] New immutable `v0.2.2` identifies the qualified source; source branch was unchanged through publication.
- [x] [Tag-bound dry-run](https://github.com/4d696e6b/RepoSetup/actions/runs/37770098836) passes before [artifact-only OIDC publication](https://github.com/4d696e6b/RepoSetup/actions/runs/37770326352). Publication uses the retained archive without rebuilding.
- [x] Registry 0.2.2/latest integrity equals the retained archive; downloaded registry bytes match SHA-256/SHA-512. Signed provenance binds the package, source, tag and approved workflow; `npm audit signatures` passes (27 registry signatures, 20 attestations).
- [x] The publishing run's fresh npm registry acceptance passes on Ubuntu 24.04/x64, macOS 15/arm64 and Windows Server 2025/x64, including both launchers and a real Express build/start/HTTP check.
- [x] GitHub release is published; current documentation/status is closed with final evidence.

[Machine-readable evidence](./qualification/0.2.2.json) records attempts, source,
artifact identity and signed provenance. Original logs/artifacts are retained in
GitHub Actions subject to retention and locally in `/tmp/reposetup-0.2.2-release`.

## Installation

```sh
npm install -g rsetup@0.2.2
rsetup --version
npx rsetup@0.2.2 create
```

Verified npm latest is 0.2.2, so `npm install -g rsetup` and `npx rsetup` also
select it. Both `rsetup` and `reposetup` are installed command aliases; the npm
package is `rsetup`. For uv FastAPI projects run `uv run fastapi dev` from the
project directory. For pip projects activate their Python environment first.
Existing 0.2.1 projects are not silently rewritten; explicitly record missing
requirements before relying on doctor's checks.

## Security and support limits

[Bounded security review](../security-docs/SECURITY_REVIEW_0.2.2.md). Installed
metadata does not prove all imports, transitive compatibility, native modules,
live services or every integration permutation. Native Windows 11, Linux arm64,
live PostgreSQL/MongoDB/container connections, SQLAlchemy DBAPI connectivity and
actual Playwright browser journeys remain unqualified. No integration is promoted
to stable. The documented generated development-tool braces advisory remains;
zero production workspace audit findings do not make every generated stack audit-clean.

Historical delivery records: [0.2.1](./STABLE_RELEASE_0.2.1.md) and
[0.2.0](./STABLE_QUALIFICATION_0.2.0.md).
