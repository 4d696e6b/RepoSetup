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
- [ ] Rebind website handoff to the reviewed merged CLI artifact and repeat packed contract/application checks.

Local validation: 1,150 core/registry/integration/CLI tests pass (301/15/680/154), workspace typecheck/lint/build pass. The targeted real Golden C journey passes installation, TypeScript checks, build, endpoint tests, formatting and doctor. Other 39 golden/create cases were deliberately filtered for this targeted check and are not counted as passing.

## Website and delivery

- [ ] Bring the published full documentation, catalog, routes, branding and security safeguards into the development preview alongside the bounded beginner workflows.
- [ ] Check combined browser behavior, artifact handoff and command/file equivalence.
- [ ] Compare performance with published 0.2.3 using equivalent workloads; no speed improvement is claimed yet.
- [ ] Complete required platform/security/manual checks and artifact review.
- [ ] Obtain separate authorization for publication and production promotion.

There is no freeze or elapsed-time gate. The historical monitored branch and production deployment remain preserved. This checkpoint is implementation progress, not a completed release.
