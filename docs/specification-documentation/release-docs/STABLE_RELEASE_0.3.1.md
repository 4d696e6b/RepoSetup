# Stable 0.3.1 release record

Status: **published on npm and GitHub, and deployed to the existing website on 13 October 2026.** npm publication timestamp: `2026-10-13T13:32:26.884Z`. Owner authorized all three channels.

## Scope

The patch corrects repeated no-op `remove --json` returning text. Four regression variants prove the versioned empty plan, unchanged files and no prompt/process execution. The stable package retains the 0.3.0 registry revision, selection-v1 format and supported contexts. No automatic dependency repair or new integration qualification is advertised.

The 0.3.1 documentation expansion is a separate development branch and is not included. The website is repinned to this CLI patch and retains the current theme and existing routes. Active labels, install examples and no-JavaScript fallback follow the pinned version; 0.3.0 publication history is retained.

## Qualification and delivery gates

- [x] Exact stable CLI artifact and website handoff pin: CLI source `f306e1c877887fe9c2861619ea434a26b996fe2c`, tarball SHA-256 `34a8d5f871333f248af45c28b9d2aa2bde466f04cc23f10d4d395856be827135`, 133,641 bytes.
- [x] Local workspace tests (1,226 passed), typecheck, lint and build. Packed-selection tests: 105 passed; release preparation/workflow tests: 29; release context/handoff/publication gates: 71. Targeted Chrome desktop/mobile and Firefox version/fallback/navigation tests: 9 passed.
- [x] Three consecutive successful first-attempt full release qualification runs at one unchanged SHA.
- [x] Packed selections and real bounded create/add/legacy checks.
- [x] Full five-profile website qualification and published-byte verification.
- [x] npm trusted publication and three-platform registry acceptance.
- [x] GitHub immutable tag/release and matching artifact assets.
- [x] Existing Vercel production deployment from retained qualified static files, verified live.

No formal freeze, soak or calendar wait is required by the owner. Native screen-reader qualification remains explicitly deferred; phone checks are browser emulation and scripted beginner checks do not measure participant comprehension. Existing integration maturity and the inherited generated Next development-tool advisory remain unchanged.

The original 0.2.0 checkout, published 0.3.0 package/tag, owner's 0.3.1 local preview and other development worktrees are preserved.

## Preparation findings

The initial website gate at `771967df0afc3443918e650a81f386a6d5411be7` passed build, unit, typecheck, lint and exact-artifact handoff but reported 394/405 browser cases. Ten failures exposed stale integration labels and no-JavaScript fallback identity. One WebKit case read an old heading link before the new page rendered. Active labels/examples now follow the shared handoff; build-only HTML regression tests guard the actual previous and current published fallback; the heading-link test waits for the target page and URL.

The three in-progress full release runs at that earlier SHA (`38379546722`, `38379551008`, `38379556068`) were cancelled because the website corrections require a new exact-source qualification. They are not publication evidence. No test expectations, safety limits or required jobs were removed.

## Final delivery evidence

Qualified joint source and immutable tag target: `faa3d979bdde6d9de6b45cb8b1c5a9e07a07a1cc`. Annotated tag object: `aac35dd18414ea558e2b5ae213f74fe88e1d578b`. CLI byte-source remains the pin recorded above. Lockfile SHA-256: `3273e9f1aa3024f00aef2d661f88feafcb1f8a708093b4c83745d0c0a791ec08`.

- Three full release waves: [38382788703](https://github.com/4d696e6b/RepoSetup/actions/runs/38382788703), [38382792444](https://github.com/4d696e6b/RepoSetup/actions/runs/38382792444), [38382796076](https://github.com/4d696e6b/RepoSetup/actions/runs/38382796076); all 48 required jobs/steps passed at unchanged source.
- [Packed contract/transport/maintenance](https://github.com/4d696e6b/RepoSetup/actions/runs/38382788486): all ten jobs passed. [Real execution](https://github.com/4d696e6b/RepoSetup/actions/runs/38382788476): 144 create, 126 add and 54 legacy cases passed across six OS/Python cells.
- Candidate website: 405 passed. [Published-mode website](https://github.com/4d696e6b/RepoSetup/actions/runs/38406137483): 405 passed across five browser profiles, with zero skipped, unexpected or flaky cases and matching actual npm bytes.
- [Trusted npm publication and three-OS registry acceptance](https://github.com/4d696e6b/RepoSetup/actions/runs/38405423433): all four jobs passed. npm latest is 0.3.1; the GitHub tarball asset digest matches the qualified and registry bytes.
- [GitHub release](https://github.com/4d696e6b/RepoSetup/releases/tag/v0.3.1). Reviewed source merged through [PR 23](https://github.com/4d696e6b/RepoSetup/pull/23).
- Website deployment: `dpl_pnBPEQGjebLTN1yR7QGhszWPfAJ6`, promoted to [reposetupcli.com](https://reposetupcli.com/). All 15 live file hashes match retained qualified output; security headers verified. The first deployment attempt returned “Not authorized”; the unchanged signed-in account/team succeeded on retry. A live check before promotion finished saw the old asset route return 404; after promotion all 15 passed.
- Rollback remains `dpl_CYCLJAW7pYvJkbXW5VrBfyFu3w9g`. No protection policies were weakened; temporary staged-validation access was removed.

Machine-readable live proof: [delivery receipt](release-delivery-0.3.1.json). The local preview and global installation remain untouched. To update the owner's CLI, use a fresh terminal and `npm install -g rsetup@0.3.1` so the activated preview does not shadow the stable command.
