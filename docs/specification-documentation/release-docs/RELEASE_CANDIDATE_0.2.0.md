# 0.2.0 release-candidate record

This is the active Phase 27 record. Historical `0.1.x` release documents remain historical evidence and do not qualify this release.

## Candidate identity

- Candidate package: `rsetup@0.2.0-alpha.1`
- Intended stable package/tag: `rsetup@0.2.0` / `v0.2.0`
- Required runtime: Node.js 24 or later
- Python recipe coverage: CPython 3.12 and 3.13, with uv 0.12.17
- Artifact identity: `candidate-artifact.json`, produced once beside the packed `.tgz`

The evidence record contains the package/version, exact source SHA, artifact filename and byte count, and SHA-256. Artifact acceptance installs that identified tarball into a temporary directory outside the monorepo and invokes both `rsetup` and `reposetup` through npm’s launchers on Ubuntu, macOS, and Windows.

## Support contract

Guaranteed qualification covers the recipe contexts recorded in [Integration support](../implementing-docs/INTEGRATION_SUPPORT.md), using Node 24 and the Python matrix above. It does not promise compatibility with Node 20/22, Python below 3.12, Bun, Yarn, pip-only locked reinstalls, external databases, browser installation for Playwright, hosted registry plugins, or arbitrary config scripts.

All configuration remains declarative. RepoSetup does not persist real secrets, install system runtimes, overwrite existing user files silently, or execute a shell command assembled from configuration.

## Blocking checklist

- [x] Public manifest, CLI prerequisite preflight, quick start, and packed-artifact tests use the 0.2.0-alpha.1 / Node 24 contract.
- [x] Package tarball naming and version assertions derive from the public manifest rather than a hard-coded release number.
- [x] Candidate artifact evidence records SHA-256 and exact source SHA, and the installed artifact checks both CLI aliases.
- [x] The `v0.2.0` publishing workflow waits for Node 24 platform, Python 3.12/3.13 golden, single-artifact, and cross-platform artifact-acceptance jobs. Required jobs do not allow `continue-on-error`.
- [x] Dependency-license review uses `pnpm licenses list --json`; the current review allows Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, ISC, MIT, and MPL-2.0. The result is stored with candidate artifacts.
- [ ] Run one full candidate qualification from the exact candidate SHA and retain all CI evidence artifacts.
- [ ] Run three consecutive passing full candidate qualifications from the same candidate SHA.
- [ ] Complete a seven-calendar-day soak from the candidate SHA without open P0/P1, data-loss, or security defects.
- [ ] Record five observed manual usability sessions across Ubuntu, macOS, and Windows. This also closes the outstanding Phase 24 gate.
- [ ] Complete a targeted current-source security review covering process/path boundaries, lifecycle scripts, redaction, config injection, and existing-file preservation.
- [ ] Record cold/warm benchmark and failure-path evidence for the candidate SHA: offline/cache miss, registry timeout, permission error, interruption, occupied port, changed user file, and cleanup.
- [ ] Recheck Node lifecycle status and current npm publication requirements before any stable tag or publication request.

The unchecked items are release blockers. A green unit suite or a passing historical workflow does not replace them.

## Publication boundary

No tag is created, moved, or published by Phase 27 work. Publication requires the owner’s explicit release authorization and must publish the previously qualified tarball, never a rebuilt workspace. The `v0.2.0` workflow rejects a tag/version/source mismatch and publishes the downloaded candidate `.tgz` only after every required gate succeeds.

## Evidence locations

- Cross-platform baseline through Phase 26: [Implementation status](../implementing-docs/IMPLEMENTATION_STATUS.md)
- Candidate scope and gates: [0.2.0 roadmap](../implementing-docs/ROADMAP_0.2.0.md)
- Current candidate workflow: [publish-npm.yml](../../../.github/workflows/publish-npm.yml)
- Historical release records: [release documentation directory](.)
