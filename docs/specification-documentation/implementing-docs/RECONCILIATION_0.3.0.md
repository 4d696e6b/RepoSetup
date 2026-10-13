# 0.3.0 reconciliation with published 0.2.3

## Owner acceptance and qualification repair — 13 October 2026

The owner explicitly replied: **“Defer native screen-reader qualification for 0.3.0.”** Native desktop announcements remain unverified and are now an accepted release limitation, not a passed session. The earlier physical-phone requirement was replaced by the owner-requested installed Chrome simulator; no physical device/native mobile reader or observed participant result is claimed. The Mac was locked before the additional documented VoiceOver last-spoken-phrase technique could be tried. No native setting was changed by that blocked attempt.

At `7d98153226f1896507655473f8de8de0aa8f5579`, local 1,218 workspace tests, both typechecks, lint/build, 222 synthetic published-mode browser cases and exact CLI artifact/launchers pass. Both fast CI and three-runner platform/performance checks pass. [Release qualification wave 1](https://github.com/4d696e6b/RepoSetup/actions/runs/38326769539) failed one Ubuntu end-to-end fixture cleanup: `ENOTEMPTY` removing a test-owned `.git/info` after the release-version assertions. The suite reported 239/240 passing; this is retained failed evidence. Temporary-fixture cleanup now uses five bounded 100ms incremental retries, and automatic Git maintenance is disabled only inside these disposable fixture repositories. No application logic, assertions, workflow skips or automatic test retries are changed. Final exact-source qualification runs at the corrected commit; preceding runs are not counted for changed source.

All readiness gates now comprise the selected automated qualification, exact retained-artifact review, bounded blocker review and these explicit owner accessibility substitutions. Publication/deployment authorization and actual delivery remain separate. This section supersedes earlier pending native-reader decision statements; the reader test itself remains unperformed. No freeze or soak applies.


## Current delivery implementation — 13 October 2026

All selected automated gates passed on reviewed source `506069c960e6a914b5f459c03e9d74786ad38dbd`: 370/370 five-profile browser cases (zero skips/flaky retries), 324 real create/add/legacy cases across six cells, all 12 full golden cells, packed contract/transport/maintenance, platform/performance and three full first-attempt [release qualification](https://github.com/4d696e6b/RepoSetup/actions/runs/38261147473) waves ([first](https://github.com/4d696e6b/RepoSetup/actions/runs/38260972313), [second](https://github.com/4d696e6b/RepoSetup/actions/runs/38261071124)). The retained CLI artifact and actual launchers were verified against the website pin. These are predecessor exact-source results; the following website delivery implementation requires renewed qualification at its own committed source.

The website now has a guarded publication mode. Default/candidate builds remain offline and correctly identify npm 0.2.3. Published builds must verify npm's exact 0.3.0/latest record, actual publication timestamp, canonical registry tarball and matching SHA-512/SHA-256 bytes against the reviewed CLI handoff. The browser receives only public publication facts, never registry execution capabilities. Verified mode changes installation guidance, labels, package links and new release history together, while preserving immutable 0.2.3 history. An actual published-mode build correctly refused while npm remains at 0.2.3. No environment setting can force an unchecked public release claim.

Local checks for the delivery implementation pass: 1,217 workspace unit tests (website 67, including 18 new guard/presentation cases), both typechecks, lint and build. An initial browser run passed 216/222 cases; six assertions incorrectly prohibited every version-pinned installation command. They now allow only the displayed published version and still reject other pins; all 12 affected home/history/all-route/maintenance checks pass across Chrome desktop/mobile and Firefox. Candidate and post-publication browser expectations retain the same journeys and assertions. Final clean-source CI is required after this change; predecessor results are not silently reused.

A synthetic published-mode build using the actual reviewed tarball exposed private artwork provenance retained in a custom output directory. The default deployment output was clean; no private fixture was deployed. Cleanup now resolves Vite's actual output directory, and a real custom-directory build regression verifies private notes/prompts are excluded while public artwork remains. Website unit tests now pass 68/68 (1,218 combined workspace cases); typecheck, lint and build pass. Qualification started at `82a0fbf` was cancelled after this finding so final checks can run on the corrected source. Published-mode fixtures are explicitly synthetic and are never delivery artifacts or actual npm evidence.

Native desktop screen-reader announcements remain unverified. The owner-requested installed Chrome phone simulator checks passed and are recorded as emulation, with zero observed beginner participants and no physical-device/native mobile-reader result. The owner has been asked to retain or explicitly defer native desktop qualification. No deferral is inferred from a request to continue implementation. The generated Next development-tool advisory remains a documented inherited limitation; the clean workspace audit reported zero advisories, which is a separate scope.

Canonical branch/worktree remain `codex/release-0.3.0` / `/Volumes/Developer/zeaek_/.codex/worktrees/release-030-staging/RepoSetup`. CLI source `ae4b9011c47d23d176770a749cde2560c64775c8`, tarball SHA-256 `cf458b036cf78e25445416dc1ba9e73ab2d40c3591828afac576cbd1a406d7e4`, lockfile SHA-256 `3273e9f1aa3024f00aef2d661f88feafcb1f8a708093b4c83745d0c0a791ec08`, catalog/matrix `0.3.0-cli.5` / `0.3.0-selection.5` are unchanged. See [delivery procedure](../release-docs/RELEASE_DELIVERY_0.3.0.md) and [draft PR #21](https://github.com/4d696e6b/RepoSetup/pull/21) for exact latest-source qualification. No main merge, immutable tag, npm publication or production deployment has occurred. There is no freeze, soak or calendar waiting gate.


Updated: 12 October 2026. Branch: `codex/release-0.3.0`.

The owner removed formal freeze, soak and calendar waiting requirements. The soak monitor is paused. Implementation continues against the shipped 0.2.3 behavior and published website. Exact artifact checks, meaningful tests and publication authorization remain separate requirements.

## CLI integration

- [x] Retain the merged 0.2.1–0.2.3 installation, dependency-health, environment, database-driver and recovery fixes.
- [x] Resolve Express/Vitest duplicate `src/app.test.ts` ownership: Vitest owns the test for create and add.
- [x] Reject conflicting exclusive file creation during planning, including dot/backslash path aliases, without discarding legitimate later edits.
- [x] Check every beginner optional subset and all five legacy presets for valid plans.
- [x] Keep the pinned definition provenance available in fast/platform CI with full-history checkout.
- [x] Review all 45 merged plans under catalog `0.3.0-cli.5` and matrix `0.3.0-selection.5`; 39 fingerprints changed from the predecessor. Recipe revision is `2026-10-08`; old exports receive stale-catalog refusal.
- [x] Rebind website handoff to the reviewed merged CLI artifact and repeat packed contract/application checks.

Local validation: 1,150 core/registry/integration/CLI tests pass (301/15/680/154), workspace typecheck/lint/build pass. The targeted real Golden C journey passes installation, TypeScript checks, build, endpoint tests, formatting and doctor. Other 39 golden/create cases were deliberately filtered for this targeted check and are not counted as passing. The packed contract subsequently passes 105/105 cases and website handoff 6/6 against the archive-rebuilt CLI at `8a9644f9e90906f2ae1c7409cb69b4fa85ed42a4`, tarball SHA-256 `04b18a2231f1d8b91251250f1d58358887be8047c51b54497082ef4c1860293b`. All 16 Node create and 14 Node add cases pass real packed execution. Python is explicitly excluded from these local targeted reports because uv is unavailable; full qualification CI cannot narrow the matrix. The first full create attempt stopped at setup and its 24 unrun cases are not passes. A fixture refresh initially used the wrong Python project basename; the seven add fingerprints were corrected to the authored `existing-app` root and the packed matrix then passed.

## Website and delivery

- [x] Bring the published full documentation, catalog, routes, branding and security safeguards into the development preview alongside the bounded beginner workflows.
- [x] Check combined browser behavior, artifact handoff and command/file equivalence.
- [x] Compare local startup/planning latency with published 0.2.3; installation/platform comparisons remain pending.
- [ ] Complete required platform/security/manual checks and artifact review.
- [ ] Obtain separate authorization for publication and production promotion.

There is no freeze or elapsed-time gate. The historical monitored branch and production deployment remain preserved. This checkpoint is implementation progress, not a completed release.

## Integrated website and performance

The development site retains published 0.2.3 reference pages separately from the new 0.3.0 surface: 37 integration references, five legacy presets, 72 docs, release history, original artwork and legacy builder links coexist with nine curated explanations, three minimal starters and create/add selections. Stable facts are checked against the production website source. Development pages identify the local CLI requirement; published examples do not falsely advertise new flags.

The archived CLI rebuild matches the reviewed tarball hash. Browser checks cover legacy downloads, new token/file choices, invalid-input recovery, context navigation, clipboard fallback, accessibility, responsive layouts and motion cleanup. All 156 combined desktop Chrome/mobile emulation/Firefox browser cases pass; actual screen-reader, physical device and renewed WebKit/platform evidence remain separate.

Lazy loading reduces initial JS from 223.94 KB (56.41 KB gzip) to about 153 KB (44.36 KB gzip); a roughly 73 KB beginner module is loaded only on demand. Navigation sequence checks prevent a delayed module from replacing a newer page. Production telemetry keeps only bounded route labels, including the new pages, with queries/configs/tokens excluded.

Seven alternating local Node 24/macOS arm64 startup/planning trials against the verified published 0.2.3 CLI measured baseline/candidate medians of 64/67 ms for version, 73/75 ms for the Express dry-run, and 73/73 ms for the React dry-run. These small changes are not an installation-speed or cross-platform guarantee. Raw measurements are in ignored `tmp/reconciliation-planning-performance.json`.

Remaining work includes final 0.3.0 release-reference generation/version preparation, complete Python/platform/WebKit/manual qualification and production packaging/promotion. No freeze or soak is required.

Final local workspace validation passes 1,193 unit tests (core 301, registry 15, integrations 680, CLI 154, website 43), workspace and selection-test typechecks, lint, build and registry validation. Original supplied artwork hashes match the published website source. Initial private brand prompt/provenance files are removed from built browser output. Local browser review inspected the retained desktop/mobile builder screenshots. Full renewed CI/platform and Python execution remain required; local targeted reports do not claim them.

CI at `78ffaac` exposed that production website source `5e40fa8` was a local Vercel source deployment and is unavailable through GitHub. The reference/artwork integrity tests now use portable SHA-256 pins extracted from that verified source, recorded in `apps/website/tests/fixtures/reference-provenance.json`, instead of requiring its unavailable Git object. They still refuse changed reference/artwork bytes. This corrects provenance transport, not the integrity requirement.

An additional lazy-load failure review found that the fallback needed its own search dialog and focus target. The corrected fallback keeps search, docs and explicit reload usable; 9/9 targeted loading/race/failure browser checks pass across desktop Chrome/mobile emulation/Firefox (six overlap the preceding full suite). Initial JS remains about 153 KB. This is a technical check, not a calendar gate.

## Release readiness repair — 12 October 2026

The owner requested completion of release preparation. The public CLI, private libraries and website now prepare stable `0.3.0` metadata; this is not a tag or publication. The packed repair fixture installs its real dependencies instead of bypassing the 0.2.3 installed-health guard. A new packed regression confirms that missing dependencies refuse both previewed and explicitly confirmed automatic repairs without writing user files. All three targeted maintenance cases pass locally.

WebKit's documented Option-Tab link navigation is used in native keyboard tests. The search modal explicitly returns focus to its opener after pointer activation, and the slideshow deadline test pauses its fake clock so slow browser assertions cannot consume the remaining cycle time. Nine affected Chromium/mobile-emulation/Firefox browser cases pass locally. Workspace unit tests, both typechecks, lint and build pass at the repair checkpoint. Renewed WebKit/platform and stable artifact qualification are still pending; the preceding remote failures remain historical evidence. The full six-cell real selection create/add run at `2b925ec` passed, but it precedes stable version preparation.

The owner can perform both native desktop screen-reader and physical-mobile checks once a fixed preview and its exact identities are prepared. No manual result is claimed yet. Publication and production deployment remain separate actions.

## Stable reference and dependency checkpoint

Stable 0.3.0 manifests and README are prepared. The website now preserves the original published reference bytes in `src/reference/generated/published-0.2.3.json`, generates active public facts from the pinned reviewed CLI, and retains all existing routes/catalog/presets/artwork. Four added documentation pages bring the guide/reference total to 76. Published history still identifies 0.2.3 correctly. New versioned selection/preview/doctor/repair flags come from actual CLI help, with generator checks refusing mismatched versions or changed definitions.

A dependency audit found GHSA-68fv-2mgg-jv7q in build-time source-map-js and GHSA-g7r4-m6w7-qqqr in development-server esbuild. The maintainers' workspace pins patched 1.2.2/0.28.1; the renewed workspace audit reports zero advisories. These build overrides do not alter independently qualified generated-project recipes. The website packer now rebuilds only the CLI dependency graph from its exact Git archive; browser reference generation remains in Git-backed website builds. Full-history checkout preserves those provenance checks on qualification runners.

Final artifact repinning and exact-source qualification follow this checkpoint; no older tarball or CI pass is treated as evidence for changed build-tool bytes. No tag, publication or production deployment has occurred.

## Draft PR qualification checkpoint

Draft PR #21 exposes the complete integrated change. At `d973f59`, fast CI, all three platform runners, packed contract/transport/maintenance, the six-cell real create/add/legacy suite and the five-profile website suite pass. Website qualification records 265/265 browser cases with no skips or retries, CLI version 0.3.0 from `ae4b9011c47d23d176770a749cde2560c64775c8`, tarball SHA-256 `cf458b036cf78e25445416dc1ba9e73ab2d40c3591828afac576cbd1a406d7e4` and lockfile SHA-256 `3273e9f1aa3024f00aef2d661f88feafcb1f8a708093b4c83745d0c0a791ec08`. Prepared deployment JS/CSS bytes match that remote website evidence. Three exact-source release waves and full golden checks had not completed; no final qualification is claimed.

The PR's nested performance checkout exposed one remaining shallow-history case: its candidate build could not find the pinned CLI Git object. Full-history checkout fixes the provenance transport while preserving the guard. This workflow-only correction leaves the CLI tarball and website bytes unchanged, but final exact-source qualification must run at the updated commit. The performance job is a controlled separate-add versus consolidated-install measurement, not a comparison against published 0.2.3 or a promise that all installations are faster.

The fixed local preview is available for the owner's native screen-reader and physical-phone tests. Actual results remain pending; ability to perform the tests is not a pass. No calendar waiting gate, main merge, tag, npm publication or production deployment has been introduced.


## Final documentation and navigation review

The source/development READMEs now describe stable 0.3.0 metadata, the current CLI pin and the integrated 76-page website rather than stale alpha artifacts or the earlier 72-page snapshot. Optional-tool "When can I skip it?" links now open the curated learning page, with a browser regression verifying the explanation and preservation of name, folder, checked choices and the exported command on return. No CLI artifact byte changes result from this website/documentation correction.

At predecessor `6114b9e`, all three 16-job release waves passed on first attempts and the release validator accepted retained artifact 11740378419. Platform, six-cell real create/add/legacy, packed contract/transport/maintenance, full golden and controlled install-pass performance passed. One cumulative Firefox accessibility test hit its 60-second budget after 264 other cases passed; an independent full same-source run passed 265/265 with no skips or automatic retries. The failed run remains recorded, and its PR check was rerun. This history is retained rather than treated as qualification of the next source automatically. The actual browser-export to native-PTY React/Vite + Zod journey also passed decline/dry-run preservation, confirmed creation, build/doctor and repeated refusal without file changes; its operator was the assistant, not a human usability participant.

Final exact-source checks follow the documentation/navigation commit. The owner's actual screen-reader/phone results are still pending; availability to test does not close those gates. The prepared website remains a candidate and production remains at 0.2.3. Publication/tag/main-merge/deployment authorization has not been given by a readiness question.

## Chrome phone extension and qualification reliability — 12 October 2026

At the owner's request, the assistant used the installed Chrome phone simulator on fixed preview source `6a65d65`; React/Vite + Zod and existing-project/FastAPI + pytest flows pass validation recovery, guidance/state retention, compatibility reset and actual clipboard/download checks. Direct Chrome viewport checks cover 390px and 320px reflow. This is explicitly emulated evidence, not a physical phone, Safari/iOS or native mobile reader result. VoiceOver was enabled and restored, but its spoken announcements were not reliably observable; full native-reader validation remains open. The existing assistant-operated native CLI handoff evidence remains separate. See the updated manual protocol for identities and limitations.

The full website run at `6a65d65` passed 269/270 cases, with zero skips/flaky retries; the sole failure was the same cumulative 21-scan accessibility test timing out at 60 seconds, this time on desktop Chrome. Those exact page/width scans now each have a named test and the unchanged 60-second budget, accessibility tags, zero-violation requirement and reflow assertion. The full five-profile suite now has 370 cases; no coverage or assertion is removed. Renewed qualification is required for this source; predecessor release-wave success does not close its gate automatically.

After the scan split, all 63 targeted Chrome desktop/mobile and Firefox accessibility/reflow cases pass locally (33.9 seconds total). The full 1,199 workspace tests, workspace and selection-test typechecks and build pass. Formatting was corrected after the first lint check identified the long parameterized declaration; the exact lint command was rerun. Full clean-source five-profile and three release waves remain required. Browser assets are unaffected by this test/documentation-only change.
