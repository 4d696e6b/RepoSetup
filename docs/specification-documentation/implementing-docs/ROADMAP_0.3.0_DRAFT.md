# RepoSetup 0.3.0 — beginner guidance, presets, and safe maintenance

Planning date: 2026-10-03. Inspected source: `145e167`.
Status: draft for discussion; no feature implementation or release authorization.

## Recommended release outcome

Help beginners understand which libraries they need, when to add them, and how to apply a curated or customized preset safely to a real project. Maintain the earlier goal of safe maintenance after initial installation.

Confirmed primary audience: developers maintaining small projects, including beginners who do not know the library ecosystem. The maintainer wants a companion information website and beginner presets, alongside the CLI. JS/TS and Python both receive the core workflow; Python has somewhat less initial editorial breadth. This is a personal open-source project with continuous improvement and no fixed release date; contributor capacity has not been quantified. Use completion gates rather than calendar deadlines, and keep 0.3.0 bounded even as the longer-term backlog grows.

The maintainer's explicit website request supersedes the earlier website exclusion for this plan. It does not authorize implementation or deployment in this planning task. Preserve TypeScript, Node, pnpm workspaces, the local CLI registry, typed operations, declarative configuration, and the remaining architecture/safety rules and non-goals. Before website implementation, reconcile AGENTS.md and the product/architecture specifications with this scope decision.

Website business logic remains in core, integration content/recipes in integrations, and catalog export/validation in registry. The website is a presentation and selection surface; only the local executor performs project mutations or process execution. No React, hosting SDK, or browser UI dependency enters core.

Companion specifications: [beginner guidance and preset contract](../product-docs/BEGINNER_GUIDANCE_AND_PRESETS_0.3.0.md) and [parallel website plan](./WEBSITE_PLAN_0.3.0.md).

## Inspected baseline

- The checkout identifies its CLI candidate as `0.2.0-alpha.1`. The 0.2.0 candidate record still has open exact-source qualification, repeated-run, soak, and publication-research gates. This inspection does not establish live npm or GitHub publication status.
- Presets, multi-integration add, JSON plan/stack/doctor/error output, pinned recipes, install consolidation, execution cancellation, and failure journals already exist. They should not be presented as new 0.3.0 features.
- `runDoctor` verifies detected integrations, rather than comparing every expected integration from a selected declarative config. Removing an integration can therefore also remove the evidence that would have prompted its check.
- Dry-run shows typed operations and their targets; it does not currently provide a before/after file-change preview.
- Core has declarative recipe-record and locked-reproduction helpers. The inspected CLI does not expose a complete recipe-record import/export/reproduction workflow. Recipe provenance is a foundation to extend, not a finished user workflow to assume.
- Add/remove operate on one project package; ambiguous pnpm workspace roots are refused. Removal preserves generated source and configuration. Failure journals do not implement automatic resume or rollback.
- Some older README/status sections disagree with newer qualification records. Establish a reconciled baseline before freezing 0.3.0 support claims.

Sources: [CLI parser](../../../packages/cli/src/run-cli.ts), [doctor](../../../packages/core/src/doctor/run-doctor.ts), [plan renderer](../../../packages/cli/src/render-plan.ts), [recipe records](../../../packages/core/src/planning/recipe.ts), [0.2.0 candidate record](../release-docs/RELEASE_CANDIDATE_0.2.0.md), [implementation status](./IMPLEMENTATION_STATUS.md).

## Proposed features, in priority order

### 1. Teach library decisions in the CLI and website

- Explain the problem each supported integration solves, when it helps, when it is unnecessary, prerequisites, alternatives, and the setup impact.
- Search by user goals as well as names: testing an app, validating input, formatting code, persisting data, or calling an API.
- Improve `info`, `search`, interactive prompts, and preset explanations using the shared curated metadata. Proposed guided discovery can use a future `guide` command; final naming is not yet committed.
- Let a user choose a minimal working preset and deliberately add optional capabilities. Use tested rules and editorial guidance, never AI-generated installation plans or popularity rankings.
- Ship at least one qualified minimal frontend, JS/TS API, and Python API journey. Exact recipe contents must be chosen from existing qualified contexts and tested; the labels do not promise support for every library combination.

Acceptance: the user can explain what one chosen library does and why it is optional or required; CLI and website guidance agree; all initial selectable integrations have reviewed educational metadata and official documentation links.

### 2. Build and apply beginner presets

- Existing bundled presets and `create --preset` remain supported. The new feature is goal-based explanation, customization, and a qualified handoff into existing projects.
- Move curated preset definitions out of CLI presentation code into the appropriate shared definition layer. Preserve existing preset IDs and behavior.
- Provide reviewed minimal presets with optional modules, prerequisites, support labels, and a clear distinction between creating a project and adding capabilities to an existing project.
- Confirmed primary website handoff: choose libraries and their configuration, then copy one command that performs the supported installation/configuration through the CLI. A downloaded declarative file is a fallback, not a required first step for ordinary selections.
- Proposed `--selection <token>` input carries a bounded encoded declarative selection for create/add, never scripts or typed executable operations. The token format, decoder limits, safe command rendering, and mode/input conflicts must be qualified before shipping. These flags are not available today.
- New-project payload uses supported schemaVersion 1 config inside a separately versioned selection envelope. Existing-project payload carries additive integration IDs/options/context expectations. Keep optional file input for large selections; it must validate to the same semantic input.
- The CLI detects the actual target, validates the selection, resolves requirements, shows the delta, and asks for confirmation. It must not recreate an application or replace its framework just because a website preset described a different context.
- Version mismatch, incompatible selection, path abuse, and unknown options fail before mutation. Website exports never become an executable operation list.

Acceptance: create and add journeys pass from website export through the packed CLI; repeated application makes no changes; user files remain intact; old create configs and JSON consumers retain their supported behavior.

### 3. Explain changes before execution

Proposed interface: extend meaningful mutating commands with `--diff`, paired with `--dry-run` for a preview. Final syntax remains a product decision; these flags are not available today.

- Summarize files that would be created, modified, preserved, or blocked, and dependencies that would be added or removed.
- Show a focused before/after preview for deterministic RepoSetup file operations when their inputs are available.
- Explain why a required integration or operation was included, with a link back to its requirement or selected option.
- Classify generator output and package-manager side effects as unknown until execution. Do not run generators merely to make a dry-run look complete.
- Suppress sensitive and unknown file contents by default. Show paths/change categories or masked values rather than dumping arbitrary user files or `.env` contents.
- Keep preview computation in core over supplied snapshots; CLI adapters read permitted files and render results. Planning remains process-free and write-free.

Acceptance: deterministic text/JSON previews; no writes or subprocesses during dry-run; existing-file conflicts visible before execution; secret-bearing fixtures never appear in output; LF/CRLF, Unicode, and symlink-boundary coverage. A file changed after preview must trigger revalidation before mutation, rather than silently applying stale assumptions.

### 4. Check the intended stack with doctor

Proposed interface: `reposetup doctor --config <path>`. Existing `doctor` remains read-only, with discovery-based behavior when no trusted intended-stack input is available.

- Compare validated expected integrations with observed dependencies and relevant setup artifacts.
- Distinguish missing dependencies, missing required files, conflicting package-manager evidence, incompatible declared versions, and intentional or unclassified differences.
- Report the evidence and confidence behind each finding. A dependency declaration is not proof that packages are installed or an application runs.
- Report extra integrations as informational differences; do not propose deleting them automatically.
- Accept existing schemaVersion 1 configs. Define error codes, JSON compatibility, and checks' scope before implementation.
- Reuse the recipe-record model where useful. If file provenance is needed for repairs, introduce a separately versioned, strictly validated record of owned paths/template identities/hashes; it must contain no commands, credentials, or raw file contents.
- Treat custom changes and an absent provenance record conservatively. A hash establishes a recorded state, not permission to overwrite a user's edits.

Acceptance: deleting an expected dependency remains diagnosable even when detection no longer finds it; malformed/unsupported records fail clearly; custom versions and files produce accurate findings; checks do not mutate or install anything; old config fixtures continue to parse.

### 5. Offer a small, explicit repair workflow

Proposed interface: `reposetup doctor --fix --dry-run` to preview a repair plan; `reposetup doctor --fix` to review and confirm execution. Define an explicit noninteractive confirmation option consistently with existing commands.

- Start with missing dedicated Prettier configuration for a known supported recipe and missing `.env.example` files built solely from that recipe's declared placeholder keys. These are proposed allowlisted repair cases, subject to fixture qualification.
- Recognize alternative valid configuration locations before suggesting a new file. Reconstruct only when the selected recipe/template version is known and compatible; otherwise provide manual guidance.
- Do not read `.env` values to generate placeholders. An arbitrary project's unknown environment keys are not automatically repairable.
- Repair definitions emit typed operations; the normal planner/preflight/executor performs execution. No parallel filesystem-writing path in doctor or integrations.
- Initially avoid package reinstallation, lockfile regeneration, source restoration, deletion, edits to existing files, system-prerequisite installation, and external services.
- Rerun health checks after a repair and report remaining manual actions. Repeating a successful repair is a no-op.

Acceptance: each allowlisted repair has tests; dry-run does not mutate; existing files and alternative configs remain intact; conflicting edits between preview and execution stop safely; unsupported cases receive guidance; confirmation and JSON behavior work without a TTY.

## Optional scope: choose at most one after the core gates pass

- **Complete the recipe-record CLI workflow:** expose validated recipe export and frozen reinstall for the existing npm/pnpm/uv paths. Keep it distinct from recreating a new project and do not claim to recreate a missing transitive lockfile from config alone.
- **Qualify one existing experimental integration in one context:** choose from observed user demand. Playwright for React/Vite is a candidate, but qualification must include a real browser test, not only test discovery. Browser installation and OS dependency management require a separate explicit product policy and researched adapters.
- **Target one package in an existing pnpm workspace:** explicit package selection only, with root/shared-lockfile handling, refusal of ambiguous targets, and proof that sibling package files are preserved. Full monorepo composition is a separate scope and should not enter by accident.

The maintainer's “yes” to the earlier optional-feature question did not select one of these items. None is committed. Beginner education, preset customization/application, and previews take priority; reduce repair breadth before expanding integration or monorepo scope.

## Implementation sequence

1. **Shared foundation.** Reconcile 0.2.0 records and the website scope exception. Freeze educational metadata, preset/context schemas, catalog revision, command handoff, and acceptance fixtures. Planning can proceed while 0.2.0 qualifies; do not alter its frozen candidate or treat its open gates as completed.
2. **Parallel milestone A.** CLI: improve info/search/preset explanations and preview summaries. Website: create the supported-integration information center and goal-based preset pages against the same catalog snapshot.
3. **Parallel milestone B.** CLI: implement validated single-command selection decoding, existing-project options-aware delta planning, and fallback file input. Website: implement bounded customization and the primary copy-command handoff. Qualify new-project selection first, then existing-project add, with file/token equivalence fixtures.
4. **Parallel milestone C.** CLI: intended-stack doctor and the explicit missing-file repair allowlist. Website: troubleshooting guides, stale-catalog/version messages, and evidence-based support labels. Both: run beginner sessions and fix confusing decisions.
5. **Qualify independently, then connect.** The CLI requires its packed-artifact/platform gates; the website requires content, accessibility, export, and browser checks. Joint export-to-CLI fixtures must pass before advertising integration. Hosting delays need not block a qualified CLI release; a companion site can have a separate version/deployment milestone against the frozen 0.3.0 contract.
6. **Freeze candidates and document releases.** Execute old and new workflows on the advertised matrix, record source/artifact/catalog identities, and publish only under a later explicit release/deployment request. Optional scope enters only after the core gates pass.

There is no calendar estimate or fixed deadline. Each milestone should be independently reviewable and merged after its required checks pass. Freeze one candidate source/artifact only when the selected scope is implemented and qualified. New ideas discovered during continuous development go to the next-release backlog unless they address a blocking defect.

Split milestones into small implementation tasks as capacity permits. Do not expand the support matrix merely because development has no deadline.

For each implementation phase: inspect the affected code and requirements, implement only that phase, add meaningful tests, run targeted tests/typecheck/lint/build as affected, report failures, and update implementation status.

## Proposed release gates

- All retained 0.2.0 golden workflows pass without hidden qualification skips.
- Every advertised beginner preset passes create or existing-project add as appropriate, including customization, supported options, idempotency, and doctor checks.
- Website exports and CLI input use the same versioned contracts and catalog fixtures. Invalid/stale selections never receive a guaranteed-compatible claim from the website.
- New create/add/remove preview and doctor check/repair workflows pass on each advertised context, including required supported platforms.
- Safety fixtures cover secret suppression, malformed records, traversal/symlinks, conflicting files, concurrent changes, interruption, and repeated repair.
- schemaVersion 1 examples and the agreed versioned JSON contract remain compatible, or an explicit tested migration is documented.
- Every advertised integration/repair case has tests and real execution evidence where applicable. Maturity promotion requires evidence for its stated context.
- At least five observed beginner sessions cover choosing libraries, explaining their purpose, selecting/customizing a preset, previewing, and applying it, with frontend, JS/TS API, and Python API represented. Retain platform coverage and exercise the selected repair cases; remaining manual interventions are documented.
- Candidate evidence records the exact source and packed-artifact hash, required quality checks, support matrix, and blocking defects. Carry forward the established repeated-qualification and soak policy unless maintainers explicitly revise it.
- No open P0/P1, data-loss, or security defects. Documentation agrees with implemented commands and actual evidence.

## Confirmed decisions and remaining questions

Confirmed by the maintainer during planning:

- Main outcome: safely maintain existing projects.
- Primary audience: developers maintaining small projects, including beginners unfamiliar with libraries and their use cases.
- Main pain: users do not know which libraries exist, why/when to add them, or how to add them.
- Ecosystems: both JS/TS and Python; Python receives somewhat less initial focus, without relaxing safety or retained regression checks.
- Website: explicitly requested information center plus preset/custom-command builder, planned alongside the CLI.
- Command UX: choose specific libraries and their configuration on the website, then paste one generated command for supported package/config installation. Keep the normal local plan review/confirmation; this does not authorize arbitrary scripts or silent system-software installation.
- Catalog: RepoSetup-supported integrations first.
- Language: English first.
- Compatibility: preserve supported 0.2.0 configs, JSON consumers, and platform/package-manager behavior. New contracts are separately versioned.
- Development cadence: personal open source, continuous improvement, no fixed time budget or deadline.

Remaining questions:

1. **First outcomes:** are a minimal frontend, JS/TS API, and Python API the right first three beginner journeys? Which specific framework choices matter most? Proposed defaults: React/Vite, Express, and FastAPI, subject to recipe evidence.
2. **Repair boundary:** the answer “yes” supports guided repair but did not distinguish missing-file restoration from dependency reinstall. Recommended default: missing known setup files only, after preview and confirmation.
3. **Site/CLI launch relationship:** should the website's full builder launch with 0.3.0, or can the English information center arrive first against existing supported CLI features? Recommended default: independent milestones, with no advertisement of unshipped handoff flags.

## External research boundaries

Official documentation checked during planning supports these boundaries:

- [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) requires an existing lockfile, fails on manifest/lock disagreement, and removes an existing `node_modules` directory. A frozen reinstall is therefore a distinct mutating operation, not a harmless doctor check.
- [pnpm filtering](https://pnpm.io/filtering) supports package selection, but that alone does not prove safe RepoSetup handling of shared workspace configuration or lockfiles.
- [Playwright browsers](https://playwright.dev/docs/browsers) distinguishes browser downloads from installation of system dependencies, and browser binaries depend on the Playwright version.

Any new external generator flags, package-manager invocation changes, supported version pins, config precedence rules, and browser setup behavior remain **research-required** until verified against official documentation for the exact versions selected for 0.3.0. These references do not qualify new integrations or execution paths.
