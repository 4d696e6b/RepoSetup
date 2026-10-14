# 0.3.1 CLI local test environment

Status: local `0.3.1-test.1` preview ready for the owner's testing; not a stable release.

- [x] Separate `codex/0.3.1-testing` worktree from released source `dbf691e7db9a88554e1ddf467afcced903e4a8f5`.
- [x] No-op `remove --json` correction and four file-preservation/no-execution regression tests included.
- [x] CLI and private library manifests aligned to `0.3.1-test.1`.
- [x] Existing 0.3.1 website documentation branches preserved.
- [x] Affected package tests: core 301, registry 15, integrations 680 and CLI 158 (1,154 passed).
- [x] Packed selection contract/matrix tests: 105 passed.
- [x] Workspace typecheck, root lint and affected CLI graph build passed.
- [x] Packed local runtime and both launchers: 15 smoke checks passed, including JSON repeat removal and file preservation.
- [x] Real Express create/stack/doctor/add/remove/repeat/build lifecycle: 9 checks passed; test-owned notes preserved.
- [x] Fresh owner playground and local activation guide prepared.
- [ ] Owner's manual test results.
- [ ] Stable 0.3.1 version, exact-artifact release qualification and reviewed website handoff.
- [ ] Explicit stable publication.

See [the testing guide](../../../TESTING_0.3.1.md). Production remains on 0.3.0.

Source worktree: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.3.1-test`.
Local runtime: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/test/0.3.1`.
The runtime's `ENVIRONMENT.json` records its committed source and retained tarball hash;
`checks/smoke-results.json` and `checks/lifecycle-results.json` record local execution evidence.

The global CLI, published npm package, release tags and production website were not changed.
This local Mac environment is not a new cross-platform release qualification.
The existing website's immutable 0.3.0 CLI pin is retained; a stable 0.3.1 website
handoff remains pending rather than bypassing the pin check.
