# RepoSetup 0.3.0 implementation status

Last updated: 2026-10-03.

## Current position

**Phase 1 and the Phase 2 CLI harnesses are implemented locally. All 24 create, 21 add, six native-transport and nine legacy-regression cases pass on the local macOS/arm64, Node 24 and Python 3.13 cell. Full platform/Python evidence, Windows terminal confirmation and later roadmap phases remain pending.** The complete 0.3.0 release is not finished or authorized for publication.

This document turns the [0.3.0 roadmap](./ROADMAP_0.3.0_DRAFT.md) into the ten reviewable phases discussed with the owner. Numbers here are local to 0.3.0; historical 0.2.0 Phase 19–28 identifiers stay unchanged. The roadmap and website plan retain their original planning snapshots, so some proposed flags there now have implementation. Use this document and [selection v1](../product-docs/SELECTION_V1.md) for current behavior.

- Development branch: `codex/0.3.0-cli`.
- Worktree: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.3.0-cli`.
- First CLI slice commit: `626fce93214af8554c3a0700ead52c5e3db8ae7a`; later section commits and exact artifact identities are recorded in Git history and qualification reports.
- Exact starting candidate SHA: `145e167e6b60897da96942545ba6dbd40359ad4a`, on `codex/phase-27-release-candidate`.
- Development CLI version: `0.3.0-alpha.1`, unpublished.
- Current catalog: `0.3.0-cli.3`; matrix: `0.3.0-selection.3`. Older catalog selections must be regenerated; schemaVersion 1 configs and the selection v1 envelope remain supported.
- The original candidate checkout and its three untracked planning documents were preserved. Work on this release stays in the separate 0.3.0 worktree.

Status meanings: **implemented locally** means source and required local checks exist; **partial** means some work/evidence exists with open acceptance gates; **not started** means that phase's new deliverable has not been implemented; **pending delivery** requires qualification and later explicit authorization. A checked implementation item is not a stable-support or release claim.

## Phase 1 — Shared foundation and first CLI slice

**Status: implemented locally.**

- [x] **1.1 Shared models:** strict Zod selection/catalog contracts, separate envelope version, catalog revision and CLI compatibility identifier.
- [x] **1.2 Curated guidance:** purpose, when to consider/skip, prerequisites, alternatives, examples, setup impact, goals, official links and evidence limitations; consumed by info/search/prompts/preset explanations.
- [x] **1.3 Reusable presets:** existing definitions moved to integrations with legacy IDs/contents preserved; separate minimal React/Vite, Express and FastAPI starter IDs.
- [x] **1.4 Declarative handoff:** create/add `--selection`, create `--selection-file`, additive add `--config`, bounded canonical base64url/UTF-8/JSON and strict option/context validation.
- [x] **1.5 Local review and execution:** decoded choices, typed local plan, confirmation, dry-run, existing JSON plan/error envelopes, and refusal of conflicting inputs or confirmation bypass.
- [x] **1.6 Preservation and repeated application:** new-directory reservation/scoping, actual-context checks, missing-package deltas, preservation of existing targets/pins, satisfied-add no-op and revalidation after confirmation.
- [x] **1.7 Scope/documentation:** companion website exception reconciled while retaining the remaining architecture/safety boundaries; planning documents copied without altering originals.

Implementation entry points: [core format](../../../packages/core/src/selection/format.ts), [scoped starter planning](../../../packages/core/src/selection/plan-create.ts), [curated catalog](../../../packages/integrations/src/beginner-catalog.ts), [presets](../../../packages/integrations/src/presets.ts), [registry validation/export](../../../packages/registry/src/selection.ts), and [CLI input/review](../../../packages/cli/src/selection.ts).

Current selection contexts: React/Vite + TypeScript + pnpm, Express + TypeScript + pnpm, and FastAPI + uv. Node optional choices are Zod/Vitest/Prettier; Python choices are Pydantic/pytest/Ruff. Framework TypeScript configuration is explicit; these optional libraries currently accept absent options or `{}` only. Unknown options are rejected. These are bounded candidate journeys, not new stable qualification claims.

Exit condition met: the first slice is implemented and locally tested. Real installation/platform evidence is owned by Phase 2.

## Phase 2 — Qualify the beginner CLI journeys

**Status: partial; recommended next phase.**

- [x] Local selection/delta tests cover valid and malformed inputs, size bounds, hostile names, incompatible contexts, preservation and repeated application.
- [x] Built-CLI dry-run fixtures exercise create/add token/file equivalence and retain legacy dry-run behavior.
- [x] **2.1 Freeze the evidence matrix and packed acceptance fixtures:** [matrix revision `0.3.0-selection.3`](../../../tests/e2e/fixtures/selection-v1.matrix.json) freezes 24 create/21 add journeys, typed-plan fingerprints, limits, catalog pins and targets. Identified-tarball tests, reports and a manual single-artifact workflow are implemented; [qualification protocol](./SELECTION_QUALIFICATION_0.3.0.md) distinguishes dry-run contract evidence from pending real/native execution. No parent-recipe or new platform-support promotion.
- [ ] **2.2 Real create journeys (partial):** the [execution suite](../../../tests/e2e/selection-create.test.ts) and [manual six-cell workflow](../../../.github/workflows/selection-create.yml) are implemented. Local 24/24 minimal/customized starters pass real installation, locks/version checks, builds/API responses, selected library/tool checks, doctor and confirmed repeat refusal with preservation. Confirmation uses the packed command handler's reviewed-plan adapter; native TTY remains section 2.4. Full Linux/macOS/Windows × Python 3.12/3.13 evidence is pending; the workflow has not been dispatched.
- [ ] **2.3 Real add journeys (partial):** the [execution suite](../../../tests/e2e/selection-add.test.ts) and the shared [manual six-cell workflow](../../../.github/workflows/selection-create.yml) are implemented. Local 21/21 additive variants pass real installation into freshly created apps with context refusal, user-file and existing-version preservation, selected tool checks, doctor and repeated no-op plans. Full runner/Python evidence and native TTY confirmation are pending.
- [ ] **2.4 Transport/launcher qualification (partial):** the [packed transport suite](../../../tests/e2e/selection-transport.test.ts) checks both npm-installed aliases, create/add through the native shell, an exact 4,096-character token, exact 16 KiB file fallback, oversized refusals and non-TTY review/refusal. On local macOS, a real POSIX pseudo-terminal checks “no” and “yes” for both create and add. A Windows pseudo-console driver now tests the same confirmation path. The [three-runner job](../../../.github/workflows/selection-contract.yml) has a branch-scoped push trigger; Windows and cross-platform results remain pending.
- [ ] **2.5 Legacy regression evidence (partial):** the [packed legacy suite](../../../tests/e2e/selection-legacy.test.ts) passes locally: real schemaVersion 1 config creation followed by positional Vitest/pytest add in the three qualified contexts, dry-run JSON plans for all five existing preset IDs, and real React/Vite preset installation. A no-op positional `add --json` now emits the versioned empty plan. The suite is in the manual six-cell workflow, which has not been dispatched; real execution of the other four existing presets remains covered by their separate historical golden workflows, not by this local suite.

Target qualification: Node 24; Python 3.12/3.13 with uv 0.12.17; supported Linux/macOS/Windows runners. Exact versions and runner identities must be recorded with each run.

Section 2.2 fixes discovered during real execution: minimal React installs its scaffold dependencies after the esbuild policy; Express explicitly approves esbuild for tsx and uses a stable compiled start entry even with Vitest/root-level/generated library source; doctor resolves the same Python launcher as installation; FastAPI only advertises a generated pytest test when selected. The React catalog distinguishes create-vite 8.3.0 from its generated React/Vite ranges. These changes advance the catalog/matrix and preserve the historical 0.2.0 branch.

Local validation: 24 real create cases, 21 real add cases and 105 packed matrix/contract cases pass. The prior workspace run had 502 tests and 11 legacy/selection dry-run fixtures; final checks for this section are recorded below. Observed tools: Node 24.21.0, pnpm 12.5.1, Python 3.13.1 and uv 0.12.17. Generated locks/logs and reports are retained outside Git; dirty development runs are not frozen-source qualification. Temporary dependency trees/cache are cleaned after each case by default.

Exit condition: every advertised selection journey has passing packed-artifact execution evidence for its stated context/platform. Wider option or integration support needs its own qualification.

## Phase 3 — File-change previews

**Status: not started.** Existing typed plans and add deltas provide groundwork; a general before/after preview is not implemented.

- [ ] **3.1 Preview model:** deterministic file/dependency change categories and reasons, computed in core from supplied snapshots.
- [ ] **3.2 CLI presentation:** implement and document the proposed `--diff` interface with text/JSON output and dry-run.
- [ ] **3.3 Safety:** secret suppression, existing-file conflicts, unknown generator/package-manager effects, line endings, Unicode and symlink boundaries.
- [ ] **3.4 Revalidation:** detect relevant changes after preview and refuse stale execution.

Exit condition: meaningful mutating workflows show safe, accurate previews without writes or installation subprocesses during dry-run.

## Phase 4 — Doctor checks the intended stack

**Status: not started.** Existing discovery-based doctor remains available.

- [ ] **4.1 Intended input:** define and validate the proposed `doctor --config` interface using supported schemaVersion 1 configs.
- [ ] **4.2 Comparison:** diagnose missing expected dependencies/files, version differences and conflicting manager evidence.
- [ ] **4.3 Explanation/output:** evidence and confidence, informational extra integrations, clear error codes and compatible JSON.
- [ ] **4.4 Regression tests:** dependency removed from detection, malformed inputs, custom versions/files and read-only guarantees.

Exit condition: missing intended components remain diagnosable even when ordinary detection no longer finds them.

## Phase 5 — Narrowly scoped repairs

**Status: not started.** Depends on Phase 3 previews and Phase 4 findings.

- [ ] **5.1 Repair allowlist:** missing dedicated Prettier configuration and recipe-defined `.env.example` placeholders, subject to fixture qualification.
- [ ] **5.2 Conservative eligibility:** recognize valid alternative configuration, require known compatible recipe/template evidence, preserve user edits and never read real `.env` values.
- [ ] **5.3 Execution:** define the proposed `doctor --fix` interface, preview/confirmation and consistent noninteractive behavior; use typed operations and the existing executor.
- [ ] **5.4 Verification:** rerun health checks; repeat repair is a no-op; changed/conflicting files stop safely; unsupported cases receive manual guidance.

Exit condition: every advertised repair has preservation, dry-run, confirmation and real execution evidence. Dependency reinstall, source replacement, lockfile regeneration and system-software installation are outside the initial allowlist.

## Phase 6 — Companion information website

**Status: not started.** Can proceed alongside CLI Phases 2–5 against the shared Phase 1 contracts.

- [ ] **6.1 Website foundation:** research/select framework and static-output behavior; establish browser boundaries and supported browser coverage.
- [ ] **6.2 Public catalog consumption:** build-time validated snapshot, catalog/CLI versions, official links and evidence-based support labels.
- [ ] **6.3 Education pages:** library explanations, goals, minimal presets, prerequisites and troubleshooting in English.
- [ ] **6.4 Presentation quality:** responsive layout, keyboard navigation, accessible labels and content consistency with the CLI.

Exit condition: the information center passes content/accessibility/browser checks without importing executor/process/filesystem capabilities into the browser. See [website plan](./WEBSITE_PLAN_0.3.0.md).

## Phase 7 — Website selection builder

**Status: not started.** Depends on Phase 6; advertised handoff support must match Phase 2 qualification.

- [ ] **7.1 Bounded customization:** create/add modes, qualified contexts and optional capabilities derived from shared validated data.
- [ ] **7.2 Review/export:** readable choices, safe bounded copy-command output, equivalent file download and stale catalog/version guidance.
- [ ] **7.3 Joint contract tests:** website exports through the packed CLI; matching plans/refusals, supported options, size limits and hostile inputs.
- [ ] **7.4 Browser usability:** command copying, download fallback, conflict explanation and keyboard/screen-reader flows.

Exit condition: every advertised website export succeeds or fails consistently with authoritative local CLI validation. Unqualified combinations remain unavailable; loading the site never installs into a local project.

## Phase 8 — Beginner usability and safety validation

**Status: partial.** The first slice has automated safety fixtures; new observed beginner sessions and whole-release validation remain pending.

- [x] First-slice fixtures for invalid selections, context refusal, confirmation, dry-run, preservation and repeated application.
- [ ] **8.1 Observed sessions:** at least five beginner sessions covering frontend, TypeScript API and Python API; explain a library, customize a preset, preview and apply it.
- [ ] **8.2 Maintenance sessions:** intended-stack diagnosis and the selected repair cases, with retained platform coverage.
- [ ] **8.3 Whole-release safety:** secret suppression, malformed records, traversal/symlinks, conflicts, concurrent changes, interruption and repeated repairs.
- [ ] **8.4 Usability fixes:** resolve confusing wording and blockers; document remaining manual interventions and retain evidence.

Exit condition: the advertised journeys are understandable and work without undocumented intervention or unresolved safety defects.

## Phase 9 — Freeze and qualify the release candidate

**Status: not started.** The existing qualification infrastructure is groundwork, not 0.3.0 evidence.

- [ ] **9.1 Reconcile/freeze scope and docs:** implemented commands, support matrix, examples, limitations and optional-feature decision agree.
- [ ] **9.2 Candidate identity:** exact source SHA, catalog revision, one packed artifact and cryptographic hash.
- [ ] **9.3 Complete qualification:** retained golden workflows and new create/add/preview/doctor/repair workflows pass on advertised platforms without hidden qualification skips; website and joint handoff checks pass independently.
- [ ] **9.4 Repeated passes/soak:** carry forward three consecutive passing full qualifications from the same candidate SHA and seven-calendar-day soak unless explicitly revised by the maintainer.
- [ ] **9.5 Release blockers:** no open P0/P1, security or data-loss defects; required evidence and quality checks recorded.

Exit condition: the frozen candidate satisfies every selected release gate. Source changes after freezing require renewed evidence appropriate to the change; local unit success alone is insufficient.

## Phase 10 — Publish and verify delivery

**Status: pending delivery; requires Phase 9 and later explicit authorization.**

- [ ] **10.1 CLI authorization:** obtain the owner's explicit release request after presenting the concrete qualified artifact/evidence.
- [ ] **10.2 CLI delivery:** publish the previously qualified artifact, create the authorized release/tag and verify installed version, both aliases and supported commands.
- [ ] **10.3 Website authorization/delivery:** obtain a separate deployment request, publish the qualified site and verify catalog/version/export behavior.
- [ ] **10.4 Final evidence:** record delivered artifact identities and URLs, and update implementation/release documents.

Exit condition: delivered artifacts match their qualification evidence. Website hosting delays can have a separate delivery milestone; they do not justify advertising an unqualified builder or CLI handoff.

## Optional scope — not selected

Choose at most one after the core gates pass: complete the recipe-record export/frozen-reinstall CLI workflow; qualify one experimental integration in one context; or explicitly target one existing pnpm workspace package. None is currently a required completion gate. New ideas belong in the later-release backlog unless they fix a blocker.

## Validation evidence for the implemented slice

Recorded for implementation commit `626fce93214af8554c3a0700ead52c5e3db8ae7a` on macOS arm64, Node 22.12.0 and pnpm 12.5.1:

- Workspace tests: 491 passed.
- Targeted core selection/delta tests: 41 passed; included in the workspace coverage, not an additional 41 independent tests.
- Targeted built-CLI selection and legacy dry-run e2e: 11 passed.
- Typecheck, lint and build: passed.

The local host is below the supported Node 24 execution floor. This is local implementation/dry-run evidence, not packed cross-platform or real external-installation qualification. Historical 0.2.0 runs are context, not qualification of this 0.3.0 commit. Detailed history remains in [implementation status](./IMPLEMENTATION_STATUS.md).

## Section 2.1 validation — 2026-10-03

- Frozen-matrix/packed-contract suite: 105 passed (49 matrix checks + 56 packed acceptance cases), covering every advertised optional subset.
- Workspace regressions: 491 passed.
- Workspace and selection-test typechecks, lint and build: passed. Workflow YAML and documentation links checked.
- Local runtime: macOS arm64, Node 22.12.0, npm 10.9.0, pnpm 12.5.1. Evidence reports explicitly set `qualification: false`; the Node 24 gate is not met by this host.
- Initial stderr-envelope assumptions and nondeterministic Python fixture names were corrected. All 45 final plan fingerprints are enforced; no failing or skipped contract case remains.
- The new workflow is authored but not dispatched. Real create/add, native shell limits/confirmation and retained cross-platform regression execution remain sections 2.2–2.5. The release and website remain unfinished and unpublished.

## Section 2.3 local validation — 2026-10-03

- Real add suite: 21/21 installed-tarball journeys pass locally, alternating token/file transport. React/Vite, Express and FastAPI receive all seven nonempty optional subsets each. Cases check context refusal, dry-run, reviewed-plan confirmation, generated locks and selected packages/tools, user-file and existing-declaration preservation, doctor and two no-op repeats.
- Frozen contract: 105/105 cases pass with revision 3, including all 45 create/add plan fingerprints. The 16 changed fingerprints are confined to Express/Vitest and FastAPI/pytest variants; 29 did not change.
- Workspace tests: 502/502. Broad end-to-end suite: 133/133, including legacy create/add/JSON paths. Workspace and selection-test typechecks, lint and build pass. The broad e2e run used a test-owned uv cache because the host's default uv cache was not writable.
- This is one local macOS/arm64 cell with Node 24.21.0, pnpm 12.5.1, Python 3.13.1 and uv 0.12.17. The manual six-cell workflow is authored but not dispatched. Native shell and TTY qualification and the later phases remain open.

## Section 2.4 local validation — 2026-10-03

- The packed transport suite passes six local cases: four alias/mode native-shell combinations plus POSIX terminal acceptance/refusal for create and add. Maximum valid token and file sizes, oversized errors, matching token/file dry-run plans, non-TTY refusal and no mutation on refusal are checked.
- The transport job reuses the contract workflow's one identified tarball on Ubuntu 24.04, macOS 15 and Windows 2025. It has not been dispatched. Windows terminal confirmation is outside this POSIX-only driver and remains pending; local macOS evidence does not establish Windows or Linux support.

## Section 2.5 local validation — 2026-10-03

- The packed legacy suite passes nine local cases: three real schemaVersion 1 create/positional add journeys with JSON output, five retained preset-ID dry-run plans, and one real React/Vite preset create/build/test/doctor journey. No-op positional add now preserves the JSON v1 plan envelope; its unit regression test is in the CLI suite.
- Workspace tests: 503/503. Broad end-to-end regressions: 133/133. Workspace and selection-test typechecks, lint and build pass.
- The same identified artifact can be reused by create, add and legacy jobs in each manual platform/Python cell. Those jobs have not been dispatched. This local evidence does not qualify the unexecuted legacy presets on the advertised runners.

## Execution order and update rules

Recommended CLI order: Phase 2 → Phase 3 → Phase 4 → Phase 5. Website order: Phase 6 → Phase 7, alongside CLI work. Phase 8 validates available completed journeys; Phase 9 follows the selected implementation/usability gates; Phase 10 follows qualification and authorization.

For each phase, inspect code/requirements, implement only that phase, add meaningful tests, run targeted tests/typecheck/lint/build as affected, report failures and update this document. Record evidence links, source/artifact identity and limitations when checking an item. Keep implementation and qualification status distinct. Update the current-position paragraph and the relevant numbered section together; preserve historical evidence and the isolated 0.2.0 candidate.
