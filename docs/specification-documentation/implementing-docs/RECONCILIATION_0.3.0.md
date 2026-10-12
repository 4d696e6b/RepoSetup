# 0.3.0 reconciliation with published 0.2.3

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
