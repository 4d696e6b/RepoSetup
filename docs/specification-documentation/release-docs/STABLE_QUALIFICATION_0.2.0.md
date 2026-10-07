# Stable 0.2.0 qualification evidence

Phase 27 is complete for the frozen alpha source. Phase 28 implementation preparation and initial stable qualification have passed; stable soak, explicit owner release authorization, publication/provenance and install-from-registry acceptance remain incomplete.

## Frozen stable identity

- Branch: `codex/phase-28-stable-release`
- Source: `4a6f49ca139cbd4f0915a3556497f48ae7543ae6`
- Package: `rsetup@0.2.0`, requiring Node.js 24+
- Tarball: `rsetup-0.2.0.tgz`, 106623 bytes
- SHA-256: `3ac07e71812f90b95b60802900bf1fa862e0b9129ed32b13232dd2c1eee8cde8`
- Final Actions archive: `candidate-artifact`, immutable artifact ID `11496212208`, retained by run `37648836155`

This evidence branch contains documentation progress only. Keep the candidate branch at the source above. The final owner release request must identify that source and its qualified tarball; a documentation-branch commit is not the source to tag.

## Qualification runs

Three consecutive first-attempt `release.yml` runs passed from the same source:

- [37648824809](https://github.com/4d696e6b/RepoSetup/actions/runs/37648824809), completed `2026-10-07 16:14:59 UTC`.
- [37648831078](https://github.com/4d696e6b/RepoSetup/actions/runs/37648831078), completed `2026-10-07 16:10:23 UTC`.
- [37648836155](https://github.com/4d696e6b/RepoSetup/actions/runs/37648836155), completed `2026-10-07 16:12:59 UTC`.

Each run passed all 16 required jobs and their steps: Ubuntu/macOS/Windows platform checks, six OS/Python 3.12/3.13 recipe checks, three failure-path checks, one identified pack, and three same-tarball installation/launcher acceptance jobs. Required jobs and steps were not skipped. The first run finished last; the soak deadline uses the latest completion across all three, not their creation order.

Exact-source [benchmark run 37648841040](https://github.com/4d696e6b/RepoSetup/actions/runs/37648841040) and [usability-check run 37648846715](https://github.com/4d696e6b/RepoSetup/actions/runs/37648846715) also passed. These usability checks are automated delivery checks; previously recorded Phase 24 observed-session evidence remains separate.

A downloaded CI tarball was additionally verified on macOS outside the monorepo: expected source/version, byte count, SHA-256, installed manifest and both npm aliases matched. Its hash is identical to the local stable build. This is tarball acceptance, not an npm registry publication result.

## Recorded failed attempt

Initial stable preparation source `3821519511acd79b3263f42f1be14a752149cd4f` passed [37647145314](https://github.com/4d696e6b/RepoSetup/actions/runs/37647145314) and [37647150898](https://github.com/4d696e6b/RepoSetup/actions/runs/37647150898), but [37647155958](https://github.com/4d696e6b/RepoSetup/actions/runs/37647155958) failed a Windows locked-install test's 30-second deadline. The local-file fixture could perform a registry lookup when its manifest was deliberately drifted. The correction uses a second local-file dependency, npm offline mode and a bounded 90-second budget for four npm processes. Production code and dependencies were unchanged. The failed run is preserved and none of these superseded runs count toward the current three-pass gate.

## Remaining gates

- [ ] Complete the unchanged-source soak through **2026-10-14 16:14:59 UTC / 23:14:59 Asia/Bangkok** with no blocking product, security or data-loss defect.
- [ ] Owner reviews current evidence, known limitations, security/license/benchmark records and npm trusted publisher permissions, then explicitly authorizes the stable tag and publication.
- [ ] The manual publication workflow is available on the default branch; create the existing-version-matching tag at the frozen candidate source only after authorization, preserving all older tags.
- [ ] Publish the retained qualified tarball with provenance; pass all three registry-delivery jobs and verify the `latest` dist-tag and exact integrity.

The actual release validator currently rejects publication because the seven-day stable soak is incomplete. Its earliest time is the deadline above. The daily monitor checks this source and these runs; it does not publish or run additional tests automatically. Follow [the stable delivery runbook](./STABLE_RELEASE_0.2.0.md) after the remaining gates pass.
