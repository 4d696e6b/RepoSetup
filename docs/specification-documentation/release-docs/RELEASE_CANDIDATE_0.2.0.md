# 0.2.0 release-candidate record

**Phase 27 status: complete for the frozen alpha candidate.** This records its qualification and the stable transition before Phase 28 publication; stable qualification and delivery remain incomplete. Historical `0.1.x` release documents remain historical evidence and do not qualify this release.

## Candidate identity

- Stable preparation package: `rsetup@0.2.0` (not published)
- Completed alpha package: `rsetup@0.2.0-alpha.1` at `145e167e6b60897da96942545ba6dbd40359ad4a`
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
- [x] The manually dispatched candidate-qualification workflow and the `v0.2.0` publishing workflow wait for Node 24 platform, Python 3.12/3.13 golden, cross-platform failure-path, single-artifact, and cross-platform artifact-acceptance jobs. Required jobs do not allow `continue-on-error`.
- [x] Dependency-license review uses `pnpm licenses list --json`; the current review allows Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, ISC, MIT, and MPL-2.0. The result is stored with candidate artifacts.
- [x] [Run 36563444045](https://github.com/4d696e6b/RepoSetup/actions/runs/36563444045) completed one full qualification for `7aa910e24dfd57be59e41c9b831c7f0d5656ecb4` and retained its candidate artifact record (SHA-256 `789840214ed8a9f3c778ad197ef00f52890d698a51b8c223c55aaea958e89141`).
- [x] Run three consecutive passing full alpha candidate qualifications from the same frozen alpha SHA.
- [x] Complete the frozen alpha seven-calendar-day soak; stable source qualification remains pending.
- [x] [Usability run 36699625878](https://github.com/4d696e6b/RepoSetup/actions/runs/36699625878) recorded five successful observed sessions across Ubuntu, macOS, and Windows, closing Phase 24.
- [x] Complete a [targeted current-source security review](../security-docs/SECURITY_REVIEW_0.2.0.md) covering process/path boundaries, lifecycle scripts, redaction, config injection, and existing-file preservation.
- [x] [Candidate benchmark run 36569048133](https://github.com/4d696e6b/RepoSetup/actions/runs/36569048133) recorded five cold and five warm trials for React and Express fixed-package profiles on Ubuntu, macOS, and Windows, with no failed measurements and one consolidated install subprocess versus five baseline passes.
- [x] Complete the alpha exact-SHA cross-platform failure-path job. It exercises timeout/interruption, permission and existing-user-file safeguards, invalid input and cleanup, plus a React/Vite development command while its default port is occupied. Its per-OS usability evidence is retained as an artifact. The separate exact-SHA candidate benchmark uses fresh benchmark-owned caches to exercise cache misses.
- [x] Recheck Node 24 LTS and current npm trusted publication requirements on October 7; owner publishing access still needs verification.

The alpha runs [36704254757](https://github.com/4d696e6b/RepoSetup/actions/runs/36704254757), [36705418155](https://github.com/4d696e6b/RepoSetup/actions/runs/36705418155), and [36708257011](https://github.com/4d696e6b/RepoSetup/actions/runs/36708257011) passed at the exact frozen alpha SHA; its unchanged-source soak ended 2026-10-07 11:30:20 UTC. The earlier unchecked qualification entries are historical alpha progress, superseded by that evidence. Candidate benchmark [36704251139](https://github.com/4d696e6b/RepoSetup/actions/runs/36704251139) also passed at that SHA.

The stable version correction changes the source and packed manifest. Stable qualification therefore requires its own exact-source evidence; the alpha tarball must not be renamed or relabeled as stable. See [stable delivery runbook](./STABLE_RELEASE_0.2.0.md). On October 7 the owner removed the additional stable seven-day wait and requested release after qualification. The final stable matrix, artifact identity, trusted publisher and actual publication remain release gates. A green unit suite or a passing historical workflow does not replace them.

## Publication boundary

No tag is created, moved, or published by Phase 27 work. Publication requires the owner’s explicit release authorization and must publish the previously qualified tarball, never a rebuilt workspace. The manually dispatched publishing workflow rejects a tag/version/source mismatch and verifies three previous full qualification runs and the completed soak before downloading their final immutable candidate artifact. It defaults to a dry-run and never rebuilds or repacks. An explicit owner-authorized dispatch against `v0.2.0` publishes that exact `.tgz`.

## Evidence locations

- Cross-platform baseline through Phase 26: [Implementation status](../implementing-docs/IMPLEMENTATION_STATUS.md)
- Candidate scope and gates: [0.2.0 roadmap](../implementing-docs/ROADMAP_0.2.0.md)
- Current candidate workflow: [release.yml](../../../.github/workflows/release.yml)
- Final publication gate: [publish-npm.yml](../../../.github/workflows/publish-npm.yml)
- Historical release records: [release documentation directory](.)
