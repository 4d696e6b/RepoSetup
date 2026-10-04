# RepoSetup 0.3.0 — phase progress

Last updated: 2026-10-04. This is the combined release snapshot maintained on `codex/0.3.0-website`. Phase numbers match the ten-phase status document on the CLI track; they do not replace historical 0.2.0 phase numbers.

## Current phase and remaining count

**Phases 1–8 are implemented or qualified for their agreed bounded scopes across the CLI and website branches.** The website has a working information center, selection builder and packed CLI handoff. The owner closed Phase 8 for scripted beginner journeys and bounded automated safety/usability validation, moving manual screen-reader/physical-device checks and combined candidate safety review to Phase 9. The two branches remain separate and the 0.3.0 release is not complete.

- Total release phases: **10**.
- Implemented locally or qualified for its bounded scope: **8 phases — 1–8**.
- Remaining before release: **2 phases — 9 and 10**.
- Of those remaining, **1 has not started** (9) and **1 awaits qualification and explicit delivery authorization** (10).
- Website-facing phases remaining: **2 — 9 and 10**. Candidate-wide packed/platform qualification of Phases 3–5 also remains part of Phase 9.

“Implemented locally” means the bounded source implementation and recorded checks are available. It does **not** mean stable support, complete candidate qualification, publication, or completion of the entire release. Manual accessibility/device assessment and the combined safety review are now explicit Phase 9 gates. This is a count of milestones, not a percentage of effort or a schedule estimate.

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
   A separate static workspace app offers goal discovery, nine integration explanations, three minimal preset explanations and usage guidance. The public catalog is generated and planner-validated from curated definitions. Chrome, Firefox and WebKit browser checks, keyboard navigation and automated accessibility scans pass. Manual screen-reader/device checks remain Phase 9 gates.

7. **Website selection builder — implemented locally for the first slice.**
   Bounded create/add modes, reviewed optional choices, safe project controls, human-readable review, one copyable command and equivalent validated file fallback exist. All 45 variants produce matching token/file plans through the exact packed local CLI. Confirmation and size boundaries are checked. No public released-CLI bootstrap or production deployment is claimed.

8. **Beginner usability and bounded safety validation — complete for the agreed scripted scope.**
   Linked field errors, review-panel layout, context navigation and mobile How-to overflow are corrected. The how-to page gives the exact local artifact setup steps. The [clean-source five-profile run](https://github.com/4d696e6b/RepoSetup/actions/runs/37178840138) passed 70/70 browser cases against the pinned CLI, including 25/25 simulated beginner/profile journeys; packed maintenance and cross-platform create/add suites also passed. At the owner's request, five scripted beginner-style journeys replace the planned participant gate for this phase; **0/5 people were observed**. Scripted tests do not measure beginner comprehension. The owner moved manual screen-reader/device checks and combined candidate safety review to Phase 9.

9. **Freeze and qualify the release candidate — not started.**
   Reconcile final scope/support claims, freeze source/catalog/artifact identities, qualify retained and new workflows on advertised platforms, perform manual screen-reader/physical-device checks and a combined candidate safety review, complete repeated passes/soak under the retained policy, and resolve release-blocking defects. Neither development branch is a frozen qualified 0.3.0 release candidate.

10. **Publish and verify delivery — pending Phase 9 and later explicit authorization.**
    Publish the qualified CLI artifact only under an explicit release request. Website deployment requires a separate request. Verify delivered versions, aliases, catalog and export behavior and record final artifact identities. Nothing was published during the website task.

## Next steps

For the website, use the [beginner-session protocol](./BEGINNER_SESSIONS_0.3.0.md) to interpret the owner-approved scripted walkthroughs and preserve the optional future human-study template. Phase 9 must still include manual screen-reader and physical-device checks. The full automated WebKit gate has passed on macOS 15; local macOS 14 WebKit remains unavailable. Actual apply evidence comes from the qualified packed CLI matrix, not from browser dry-runs alone.

For the combined release, begin Phase 9 by reconciling the branches and candidate scope, then complete manual accessibility/device and candidate-wide safety review alongside frozen-artifact qualification. The five simulated beginner journeys and packed maintenance checks are recorded in the detailed status; no human observations are claimed. Phase 8 completion does not authorize publication or deployment.

## Evidence and scope of this snapshot

- Website branch: `codex/0.3.0-website`; exact website commit and clean-source report are recorded in the detailed website status.
- Website handoff target: committed CLI `b212d35727300325486c70a9a7b0cc54c912d581`, local development CLI `0.3.0-alpha.1`, `selection-v1`, catalog `0.3.0-cli.4`.
- CLI status: Phases 1–5 and retained qualification evidence are maintained in `docs/specification-documentation/implementing-docs/STATUS_0.3.0.md` on `codex/0.3.0-cli`. Only the committed curated definition/recipe files needed by the website were synchronized here; neither sibling checkout was edited by this website task.
- The earlier full-browser [qualification](https://github.com/4d696e6b/RepoSetup/actions/runs/37176769775) passed at website `4615fcc` on macOS 15 against CLI `aab8288`: six checks, **70/70** Chrome/Firefox/WebKit browser cases (including **25/25** simulated beginner journeys) and six packed handoff cases. The invalid-folder usability correction also passed a later [clean-source five-profile rerun](https://github.com/4d696e6b/RepoSetup/actions/runs/37177775840). The website now pins safer CLI `b212d35`; its six exact-artifact handoff checks pass locally, and a full clean-source rerun against that new target remains pending. Local macOS 14 WebKit remains unavailable, but its passing macOS 15 matrix is retained separately.
- Detailed website evidence and remaining gates: [website slice status](./STATUS_WEBSITE_0.3.0.md).
- Feature sequence and acceptance requirements: [release roadmap](./ROADMAP_0.3.0_DRAFT.md), [website plan](./WEBSITE_PLAN_0.3.0.md), and [selection contract](../product-docs/SELECTION_V1.md). The plans retain their original draft wording; use current status/contract documents to distinguish implemented behavior from proposals.

Optional roadmap work has not been selected and adds no phase to this count. The original 0.2.0 candidate checkout and its untracked planning documents remain outside this status update.

## Updating this document

After a phase changes, update its status, the current-phase paragraph and the remaining count together. Record the relevant source/artifact identity and evidence. Keep partial phases in the remaining count, distinguish local implementation from qualification, and preserve authorization requirements for delivery. Refresh the CLI snapshot when a newer committed status changes the count; do not treat uncommitted sibling work as completed evidence.
