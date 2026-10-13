# RepoSetup 0.3.0 stable delivery record

Delivered on 13 October 2026 for the owner's agreed bounded scope. The owner requested publication on all existing delivery surfaces, removed freeze/soak waiting, accepted scripted beginner journeys and Chrome phone simulation, and explicitly deferred native screen-reader qualification. Those substitutions are limits, not passed human/device sessions.

## Published identities

- Immutable tag: [v0.3.0](https://github.com/4d696e6b/RepoSetup/releases/tag/v0.3.0), source `59976a7fb6bb7bb07e0e7406deab2c8b5033b1c1`. [PR #21](https://github.com/4d696e6b/RepoSetup/pull/21) merged by a regular fast-forward of remote main at this exact commit. The original checkout and earlier candidate branches were not switched or edited for delivery.
- Public package: [rsetup 0.3.0](https://www.npmjs.com/package/rsetup/v/0.3.0), npm latest 0.3.0, published at `2026-10-13T07:26:26.268Z`. Private workspace libraries/website remain private.
- Retained artifact: release wave 3 artifact `11792004750`, 133,557 bytes, SHA-256 `cf458b036cf78e25445416dc1ba9e73ab2d40c3591828afac576cbd1a406d7e4`. Registry bytes and GitHub tarball asset digest match. Registry SRI is `sha512-z7pkMlRAQzL75mAIJk0VW0MTbV7+SGZbKkbroUTwD8TTuoivFFnVgJhi3Tkx3uA0cUmvn+cnxNnTZ9v82DQKNQ==`.
- Lockfile SHA-256: `3273e9f1aa3024f00aef2d661f88feafcb1f8a708093b4c83745d0c0a791ec08`; catalog/matrix `0.3.0-cli.5` / `0.3.0-selection.5`. Website's CLI byte-source pin remains `ae4b9011c47d23d176770a749cde2560c64775c8`: later changes affect the website/tests/docs without changing these CLI bytes.

## Qualification and publication

Local 1,218 workspace unit tests, both typechecks, lint/build and exact-artifact handoff passed. At the immutable release source:

- Three consecutive complete first-attempt release waves: [38352954548](https://github.com/4d696e6b/RepoSetup/actions/runs/38352954548), [38353226205](https://github.com/4d696e6b/RepoSetup/actions/runs/38353226205), [38353407285](https://github.com/4d696e6b/RepoSetup/actions/runs/38353407285). Each required 16 jobs and every required step passed; the actual publisher validator accepted the retained artifact.
- [Packed contract/transport/maintenance](https://github.com/4d696e6b/RepoSetup/actions/runs/38347934035), [platform](https://github.com/4d696e6b/RepoSetup/actions/runs/38347933931), [CI](https://github.com/4d696e6b/RepoSetup/actions/runs/38347933945) and [installation performance](https://github.com/4d696e6b/RepoSetup/actions/runs/38347937224) passed.
- [Real selection create/add/legacy](https://github.com/4d696e6b/RepoSetup/actions/runs/38347933935): 324 cases across six OS/Python cells, no exclusions. [Full golden matrix](https://github.com/4d696e6b/RepoSetup/actions/runs/38347934117): 12 OS/Python/manager cells, 40 cases each.
- Original Windows/npm golden cells timed out at 39/40 (Next/SQLite test budget and Express/Mongoose installer budget); both full 40-case cells passed unchanged retries in attempt 2. The other ten successful cells were retained, not claimed rerun. Earlier release wave [38348532067](https://github.com/4d696e6b/RepoSetup/actions/runs/38348532067) timed out in one Express npm install and was replaced by three new complete first-attempt waves. No time limits, assertions or safety checks were weakened.
- [Retained-artifact publication dry-run](https://github.com/4d696e6b/RepoSetup/actions/runs/38362350128) passed. [Actual npm publication and registry acceptance](https://github.com/4d696e6b/RepoSetup/actions/runs/38362442871) passed on Linux/macOS/Windows: exact version/SRI/latest, both aliases, read-only plan, real Express build/API response outside the monorepo. The publisher did not rebuild the package. Registry provenance identifies this tag/SHA and publication run; the receipt does not claim an independent cryptographic attestation audit.

## Website delivery

[Candidate qualification](https://github.com/4d696e6b/RepoSetup/actions/runs/38347934010) and [actual published-mode qualification](https://github.com/4d696e6b/RepoSetup/actions/runs/38362931333) each passed 395 cases across desktop/mobile Chrome, Firefox and desktop/mobile WebKit, with zero skips, unexpected results or flaky retries. All six build/unit/typecheck/lint/handoff/browser stages passed. The published check's CI-only controller branch is `8d1375a0633bbe29569e9446076d7a1877efd4c6`; it checks out and verifies product source `59976a7` from the immutable tag. It is not a substitute product source. Clean working-tree hash: `8bb51bbb65fbcef3adb76fe02268373ff882dda8e0f038d4b76e365c31a4cab5`.

The registry-verified output is promoted to [reposetupcli.com](https://reposetupcli.com/) in existing Vercel project `reposetup`, deployment `dpl_HZPhBAeJXnrEkxxXL24j1ngQVEmE` (`reposetup-r4bmtcw3z-mink2551s-projects.vercel.app`). All 15 public files match the qualified build; CSP/frame denial, nosniff, referrer policy, immutable asset caching and revalidated HTML passed. Private artwork notes/prompts, maps, repository files and reports are excluded. www.reposetupcli.com and reposetup.vercel.app retain their redirects to the main domain. The project alias is retained. Existing deployment protection and Git build policy are preserved; the CLI-generated preview validation token was revoked after testing.

Published assets:

- `entry-D9b3nvSl.js`: `38abd5bbc420ee2ac189ed3b40acd9f28da63802e564c78f0750176fcc536e2c`.
- `index-ByFLEHhB.css`: `d420a968dee26a039cac00a7ec24d0522b58f6753135343be3ff07983b9b8121`.
- `index-doftjXY6.js`: `338d9c78eb0079b29d3a6389a201f2eaae931e010066c17910240c185f18d012`.

Live browser observation confirmed 0.3.0 installation guidance, compact Explore navigation, actual publication date/retained history, validation and recovery, and an actual JSON download. That downloaded React/Vite+Zod selection was accepted by the published CLI in dry-run mode with the destination unchanged. Copy showed its success status; the control bridge retained a previous clipboard value, so no independent live OS clipboard payload pass is claimed. The published-mode clipboard/data/fallback browser tests passed. The browser download-event waiter timed out despite the file being saved, and subsequent controls reported unavailable; no further live screenshot or route check is invented. The earlier macOS 14 WebKit protocol failure is local runner unavailability; the macOS 15 full run supplies the supported evidence.

Rollback target: prior 0.2.3 deployment `dpl_9nxr3wqu1WwFGRJSGJVjRKEBdPwX`, `reposetup-5init5ycj-mink2551s-projects.vercel.app`.

## Limits and completion

Native desktop screen-reader checks are explicitly deferred, phone checks are emulation, and observed beginner participants remain zero. Bounded reported-blocker review found no open non-PR issues or repository security advisories at delivery; workspace audit reported zero advisories. This does not establish absence of all defects or an independent specialist safety review. The inherited generated Next development-tool [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) remains documented. Integration maturity, arbitrary combinations, native Windows 11, Linux arm64 and broader live-service/browser support are not promoted.

Phases 1–10 are delivered for the owner-agreed 0.3.0 scope. Freeze/soak were removed by the owner and the obsolete monitor was deleted. This documentation-only delivery record follows the immutable release; it does not move the tag, repack npm or change the deployed source. Later product changes require their own qualification/version.

Machine-readable delivery and qualification receipts are attached to the [GitHub release](https://github.com/4d696e6b/RepoSetup/releases/tag/v0.3.0).

Browser recovery after delivery: the in-app browser was available again and independently showed the live goals/home pages, 0.3.0 notice, installation text and copy success status. A production screenshot was saved. Clipboard payload readback remained unavailable through the control bridge; the earlier limitation is retained.
