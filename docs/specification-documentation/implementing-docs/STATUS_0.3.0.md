# RepoSetup 0.3.0 — phase progress

Last updated: 2026-10-03. This is the combined release snapshot maintained on `codex/0.3.0-website`. Phase numbers match the ten-phase status document on the CLI track; they do not replace historical 0.2.0 phase numbers.

## Current phase and remaining count

**The website is implementing Phase 8: beginner usability and broader safety/accessibility validation. Phases 6 and 7 have a working local information center, selection builder and packed CLI handoff. The CLI track is at Phase 2: local real-create qualification in section 2.2 is committed; section 2.3 real-add and repeat/preservation qualification is next.**

- Total release phases: **10**.
- Implemented locally: **3 phases — 1, 6 and 7**.
- Remaining before release: **7 phases — 2, 3, 4, 5, 8, 9 and 10**.
- Of those remaining, **2 are partial** (2 and 8), **4 have not started** (3, 4, 5 and 9), and **1 is pending qualified delivery and authorization** (10).
- Website-facing phases remaining: **3 — 8, 9 and 10**. They also depend on the required CLI work and qualification in Phases 2–5.

“Implemented locally” means the bounded source implementation and recorded local checks are available. It does **not** mean stable support, complete cross-platform qualification, publication, or completion of the entire release. Phases 6 and 7 still have broader validation work carried into Phases 2 and 8. Partial phases count as remaining. This is a count of milestones, not a percentage of effort or a schedule estimate.

## Phase-by-phase status

1. **Shared foundation and first CLI slice — implemented locally.**
   Strict selection/catalog contracts, reviewed guidance, reusable minimal presets, bounded create/add inputs, local plan/confirmation and preservation safeguards exist. Website and CLI share curated definitions. Real journey qualification remains Phase 2.

2. **Qualify the beginner CLI journeys — partial; current CLI phase.**
   Section 2.1 is implemented: a committed evidence matrix and packed acceptance fixtures cover 24 create and 21 add variants. Section 2.2 now has 24/24 real creates passing locally on macOS/Node 24/Python 3.13, including curated recipe corrections; its full advertised runtime/platform matrix remains open. Remaining sections include 2.3 real add and repeat/preservation checks, 2.4 native launchers/transport/confirmation, and 2.5 retained legacy regressions. Website macOS Node 24 dry-run/confirmation checks are supplementary evidence, not completion of this phase.

3. **File-change previews — not started.**
   Add a safe deterministic change model, text/JSON presentation, researched final CLI syntax, secret suppression, conflict handling and stale-preview revalidation. Existing typed plans are not a general before/after file diff.

4. **Doctor checks the intended stack — not started.**
   Validate an expected config, compare it with detected dependencies/files/versions, and report evidence while remaining read-only. Existing discovery-based doctor is available; intended-stack checks are still pending.

5. **Narrowly scoped repairs — not started.**
   Depends on Phases 3 and 4. Qualify an explicit missing-file allowlist, conservative eligibility, preview/confirmation, existing-executor execution, preservation and repeat no-op behavior. Proposed repair commands are not available in this slice.

6. **Companion information website — implemented locally for the first slice.**
   A separate static workspace app offers goal discovery, nine integration explanations, three minimal preset explanations and usage guidance. The public catalog is generated and planner-validated from curated definitions. Chrome desktop/mobile and Firefox checks, keyboard navigation and automated accessibility scans pass. WebKit, manual screen-reader checks and observed sessions remain Phase 8.

7. **Website selection builder — implemented locally for the first slice.**
   Bounded create/add modes, reviewed optional choices, safe project controls, human-readable review, one copyable command and equivalent validated file fallback exist. All 45 variants produce matching token/file plans through the exact packed local CLI. Confirmation and size boundaries are checked. No public released-CLI bootstrap or production deployment is claimed.

8. **Beginner usability and safety validation — partial; current website phase.**
   The local validation slice fixes linked field errors, review-panel layout and context navigation. Twenty-four browser tests pass across Chrome desktop/mobile and Firefox, scanning all 22 routes and testing the built browser policy. A five-session protocol is ready; **0/5 sessions are observed**. WebKit page setup fails on this macOS 14 host, so that gate remains open alongside manual screen-reader checks, physical-device checks, maintenance journeys after Phases 3–5 and whole-release safety validation. Passing automated tests does not substitute for participant sessions.

9. **Freeze and qualify the release candidate — not started.**
   Reconcile final scope/support claims, freeze source/catalog/artifact identities, qualify retained and new workflows on advertised platforms, complete repeated passes/soak under the retained policy, and resolve release-blocking defects. Neither development branch is a frozen qualified 0.3.0 release candidate.

10. **Publish and verify delivery — pending Phase 9 and later explicit authorization.**
    Publish the qualified CLI artifact only under an explicit release request. Website deployment requires a separate request. Verify delivered versions, aliases, catalog and export behavior and record final artifact identities. Nothing was published during the website task.

## Next steps

For the website, use the prepared [beginner-session protocol](./BEGINNER_SESSIONS_0.3.0.md), run a manual screen-reader check and run the explicit WebKit gate on a compatible host. Continue the existing learn → choose → copy → review journey with real participants. Actual apply sessions require the appropriately qualified local CLI and prerequisites; do not infer installation success from dry-run checks.

For the CLI, continue section 2.3 real add and repeat/preservation journeys, then sections 2.4–2.5 and the remaining platform coverage for 2.2 before promoting the handoff to released support. Phases 3–5 follow. These are recommended next tasks, not authorization to publish or deploy.

## Evidence and scope of this snapshot

- Website branch: `codex/0.3.0-website`; exact website commit and clean-source report are recorded in the detailed website status.
- Website handoff target: committed CLI `f99f63a198986c30bba92dc1cd6af2ec68ec87e9`, local development CLI `0.3.0-alpha.1`, `selection-v1`, catalog `0.3.0-cli.2`.
- CLI Phase 2 snapshot: committed `f99f63a` (`test(cli): qualify real beginner create variants locally`) on `codex/0.3.0-cli`. Its 24/24 real-create result is local evidence, not full runtime/platform qualification. Only its committed shared recipe/catalog changes were copied here; neither sibling checkout was edited.
- Current website checks: **498 workspace unit tests**, build, typecheck, lint, **24 local browser tests and 6 packed handoff tests** pass against the new target. The artifact SHA/byte checks, browser policy and source-identified qualification are in place. The full browser matrix remains open: WebKit fails before navigation with `Unknown setting: PushAPIEnabled` on this macOS 14 host. Exact versions and the separate gate are recorded in the detailed website status.
- Detailed website evidence and remaining gates: [website slice status](./STATUS_WEBSITE_0.3.0.md).
- Feature sequence and acceptance requirements: [release roadmap](./ROADMAP_0.3.0_DRAFT.md), [website plan](./WEBSITE_PLAN_0.3.0.md), and [selection contract](../product-docs/SELECTION_V1.md). The plans retain their original draft wording; use current status/contract documents to distinguish implemented behavior from proposals.

Optional roadmap work has not been selected and adds no phase to this count. The original 0.2.0 candidate checkout and its untracked planning documents remain outside this status update.

## Updating this document

After a phase changes, update its status, the current-phase paragraph and the remaining count together. Record the relevant source/artifact identity and evidence. Keep partial phases in the remaining count, distinguish local implementation from qualification, and preserve authorization requirements for delivery. Refresh the CLI snapshot when a newer committed status changes the count; do not treat uncommitted sibling work as completed evidence.
