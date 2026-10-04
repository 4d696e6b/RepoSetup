# RepoSetup 0.3.0 — phase progress

Last updated: 2026-10-04. This is the combined release snapshot maintained on `codex/0.3.0-website`. Phase numbers match the ten-phase status document on the CLI track; they do not replace historical 0.2.0 phase numbers.

## Current phase and remaining count

**Phases 1–7 are implemented locally across the CLI and website branches; Phase 2's bounded CLI qualification is complete.** The website has a working information center, selection builder and packed CLI handoff. Phase 8 beginner usability and broader safety/accessibility validation remains partial. The two branches remain separate and the 0.3.0 release is not complete.

- Total release phases: **10**.
- Implemented locally or qualified for its bounded scope: **7 phases — 1–7**.
- Remaining before release: **3 phases — 8, 9 and 10**.
- Of those remaining, **1 is partial** (8), **1 has not started** (9), and **1 awaits qualification and explicit delivery authorization** (10).
- Website-facing phases remaining: **3 — 8, 9 and 10**. Later packed/platform qualification of Phases 3–5 also remains part of Phase 9.

“Implemented locally” means the bounded source implementation and recorded local checks are available. It does **not** mean stable support, complete cross-platform qualification, publication, or completion of the entire release. Phases 6 and 7 still have broader validation work carried into Phases 2 and 8. Partial phases count as remaining. This is a count of milestones, not a percentage of effort or a schedule estimate.

## Phase-by-phase status

1. **Shared foundation and first CLI slice — implemented locally.**
   Strict selection/catalog contracts, reviewed guidance, reusable minimal presets, bounded create/add inputs, local plan/confirmation and preservation safeguards exist. Website and CLI share curated definitions. Bounded real journey qualification is recorded in Phase 2.

2. **Qualify the beginner CLI journeys — complete for the bounded matrix.**
   The CLI branch records 24 create and 21 add variants passing real installation in all six Linux/macOS/Windows × Python 3.12/3.13 cells, plus native transport/confirmation and retained legacy regressions. The website's packed dry-run/confirmation checks are supplementary; they do not independently establish installation success.

3. **File-change previews — implemented locally on the CLI branch.**
   `create`, `add` and `remove` have structural text/JSON `--diff` previews, secret suppression, conflict handling and stale-preview revalidation. Packed/platform qualification remains a later gate.

4. **Doctor checks the intended stack — implemented locally on the CLI branch.**
   `doctor --config` validates schemaVersion 1 input and compares expected dependencies, files, versions and context with evidence. Discovery-only doctor remains available. Packed/platform qualification remains a later gate.

5. **Narrowly scoped repairs — implemented locally on the CLI branch.**
   `doctor --config --fix` previews, confirms, creates only allowlisted missing Prettier or recipe-defined `.env.example` files, rechecks health and preserves existing files. Local tests pass; packed/platform qualification remains open. The website branch retains its older CLI parser and does not execute these commands directly.

6. **Companion information website — implemented locally for the first slice.**
   A separate static workspace app offers goal discovery, nine integration explanations, three minimal preset explanations and usage guidance. The public catalog is generated and planner-validated from curated definitions. Chrome desktop/mobile and Firefox checks, keyboard navigation and automated accessibility scans pass. WebKit, manual screen-reader checks and observed sessions remain Phase 8.

7. **Website selection builder — implemented locally for the first slice.**
   Bounded create/add modes, reviewed optional choices, safe project controls, human-readable review, one copyable command and equivalent validated file fallback exist. All 45 variants produce matching token/file plans through the exact packed local CLI. Confirmation and size boundaries are checked. No public released-CLI bootstrap or production deployment is claimed.

8. **Beginner usability and safety validation — partial; current website phase.**
   The local validation slice fixes linked field errors, review-panel layout and context navigation. The how-to page now gives the exact local artifact setup steps instead of sending beginners to a repository file. Browser tests cover Chrome desktop/mobile and Firefox, all 22 routes and the built browser policy. A five-session protocol is ready; **0/5 sessions are observed**. WebKit page setup failed on this macOS 14 host, so that gate remains open alongside manual screen-reader checks, physical-device checks, maintenance journeys for Phases 3–5 and whole-release safety validation. Passing automated tests does not substitute for participant sessions.

9. **Freeze and qualify the release candidate — not started.**
   Reconcile final scope/support claims, freeze source/catalog/artifact identities, qualify retained and new workflows on advertised platforms, complete repeated passes/soak under the retained policy, and resolve release-blocking defects. Neither development branch is a frozen qualified 0.3.0 release candidate.

10. **Publish and verify delivery — pending Phase 9 and later explicit authorization.**
    Publish the qualified CLI artifact only under an explicit release request. Website deployment requires a separate request. Verify delivered versions, aliases, catalog and export behavior and record final artifact identities. Nothing was published during the website task.

## Next steps

For the website, use the prepared [beginner-session protocol](./BEGINNER_SESSIONS_0.3.0.md), run a manual screen-reader check and run the explicit WebKit gate on a compatible host. Continue the existing learn → choose → copy → review journey with real participants. Actual apply sessions require the appropriately qualified local CLI and prerequisites; do not infer installation success from dry-run checks.

For the combined release, qualify the newer CLI preview/doctor/repair behavior on the retained platforms, complete Phase 8 human and maintenance journeys, then freeze and qualify Phase 9. These are remaining tasks, not authorization to publish or deploy.

## Evidence and scope of this snapshot

- Website branch: `codex/0.3.0-website`; exact website commit and clean-source report are recorded in the detailed website status.
- Website handoff target: committed CLI `aab82881bd8e4752b99041176cdc6df00a939718`, local development CLI `0.3.0-alpha.1`, `selection-v1`, catalog `0.3.0-cli.4`.
- CLI status: Phases 1–5 and retained qualification evidence are maintained in `docs/specification-documentation/implementing-docs/STATUS_0.3.0.md` on `codex/0.3.0-cli`. Only the committed curated definition/recipe files needed by the website were synchronized here; neither sibling checkout was edited by this website task.
- Previous clean-source local qualification at `be8b2bc` passed all six automated steps: **498 workspace unit tests**, build, typecheck, lint, **24 local browser tests and 6 packed handoff tests**. The current Phase 8 setup guidance passes a targeted browser check. The exact newer CLI target `84168ce` packs to SHA-256 `e7bc83beb97e53e3826db0d4fb4d6c9d1a71109f5d146bbfe7d2d02fbcf7b7b5` and passes all six handoff tests; the ignored qualification directory records the clean-source full result for the current HEAD. The full browser matrix remains open: WebKit failed before navigation with `Unknown setting: PushAPIEnabled` on this macOS 14 host. Exact versions and the separate gate are recorded in the detailed website status.
- Detailed website evidence and remaining gates: [website slice status](./STATUS_WEBSITE_0.3.0.md).
- Feature sequence and acceptance requirements: [release roadmap](./ROADMAP_0.3.0_DRAFT.md), [website plan](./WEBSITE_PLAN_0.3.0.md), and [selection contract](../product-docs/SELECTION_V1.md). The plans retain their original draft wording; use current status/contract documents to distinguish implemented behavior from proposals.

Optional roadmap work has not been selected and adds no phase to this count. The original 0.2.0 candidate checkout and its untracked planning documents remain outside this status update.

## Updating this document

After a phase changes, update its status, the current-phase paragraph and the remaining count together. Record the relevant source/artifact identity and evidence. Keep partial phases in the remaining count, distinguish local implementation from qualification, and preserve authorization requirements for delivery. Refresh the CLI snapshot when a newer committed status changes the count; do not treat uncommitted sibling work as completed evidence.
