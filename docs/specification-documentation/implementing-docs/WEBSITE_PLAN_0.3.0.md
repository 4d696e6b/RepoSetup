# Companion website — parallel plan for RepoSetup 0.3.0

Date: 2026-10-03. Status: requested planning; no site implementation, hosting selection, or deployment authorization.

## Website role and scope decision

Build an information center that helps beginners understand supported libraries and produce curated/customized selections usable by RepoSetup in real projects. The maintainer explicitly requested this website, superseding the earlier website exclusion for this plan. Accounts, payments, hosted executable registries, remote plugins, ratings, AI-generated plans, and automatic cloud deployment remain outside the requested product scope.

The site explains and exports selections, with one copyable terminal command as the primary action. The CLI detects the real project and the local executor performs installation. Confirmed first scope: RepoSetup-supported integrations and English guidance. The first site needs no user account, database, or hosted project inspection service. Prefer a static-first public site and local browser state for non-sensitive draft selections; choose exact framework/hosting during implementation after checking requirements and official documentation.

If a new standalone website is built using the available Sites workflow, follow its setup/hosting instructions at that time. Planning alone does not invoke building or publishing. The site can release independently against a qualified CLI/catalog version.

## First user journeys

### Learn before choosing

Ask what the user wants to accomplish, then their framework/runtime and whether the project already exists. Show a few appropriate starting points. Users can also browse/search by integration name, category, or goal.

Every selectable library/integration page explains purpose, when to use it, when it is unnecessary, dependencies/prerequisites, setup impact, alternatives, a small example, supported contexts, limitations, maturity, and official documentation/review date. Explain that catalog support describes RepoSetup's tested setup path, not a judgment of the upstream library's overall quality.

Begin with RepoSetup-supported integrations relevant to the selected beginner journeys, as confirmed by the maintainer. Clearly distinguish experimental paths. Educational-only entries may be added later but cannot appear installable without a supported CLI integration.

### Choose a minimal preset

Offer goal-based starter presets and existing-project capability packs. Show what is essential and what is optional, explaining each item's role. Do not preselect every available tool. Initial journey candidates are a frontend, JS/TS API, and Python API; confirm exact frameworks before freezing content.

The choice of “new project” versus “existing project” is visible throughout. A starter recipe cannot masquerade as a safe additive pack.

### Customize and review

Allow bounded library/configuration choices within qualified recipe variants. Option forms derive from validated metadata and permit only reviewed supported values; they are not arbitrary command or JSON editors. Show why an item is required, what a change affects, and understandable conflicts. Always allow users to learn about a disabled option and why it is unavailable in their selected context. Limit the first optional groups to a tractable enumerated variant set; qualify every advertised variant rather than assuming individually supported libraries compose safely in every combination.

Show a selection summary: purpose, integrations, requirements, optional manual steps, versions/support context, and the associated CLI version. Do not present this as an exact local file diff; the site lacks the user's filesystem and environment.

### Use it in a real project

Primary flow: copy one safe RepoSetup invocation carrying a bounded encoded selection, paste it in the intended terminal/project directory, inspect the local plan, and confirm. It applies supported packages and configuration together. Explain where to run it and the intended CLI version. A preview-only command is secondary; validated file download is the fallback when the complete command exceeds the qualified length bound.

The full builder targets proposed `create/add --selection <token>` with mode-specific declarative payloads. Existing `create --config` and option-free `add <ids...>` can support an earlier information-site milestone; an additive config file is a proposed fallback extension. New flags stay unavailable until shipped in the displayed CLI version.

No remote browser installation, project-source upload, `.env` reading, secret collection, or automatic command execution. Initial existing-project context is user-selected and explicitly provisional; the CLI checks the actual context locally.

## Pages and functionality

- **Start by goal:** routes to curated presets or relevant library explanations.
- **Integration catalog:** search/filter by goal, ecosystem, category, framework compatibility, and support maturity.
- **Integration detail:** purpose/use timing, example, requirements, alternatives, supported operations, limitations, official links, and freshness evidence.
- **Preset catalog/detail:** minimal recipe, optional modules, rationale, prerequisites, and qualified context.
- **Builder/review:** bounded choices, conflicts, summary, validated download, and copy-command instructions.
- **How to use RepoSetup:** new versus existing project, preview/confirmation, prerequisites, troubleshooting, and doctor guidance.

Use a clear responsive layout, keyboard-accessible controls, readable explanations, and discoverable definitions of unfamiliar terms. English first is confirmed; keep a localization-ready content structure with stable IDs independent of translated labels.

## Shared data and architecture

Use the [shared knowledge/preset contract](../product-docs/BEGINNER_GUIDANCE_AND_PRESETS_0.3.0.md). A generated public catalog snapshot is built from the curated integration/registry definitions with version identifiers, evidence, and validated content. It is not a runtime executable registry fetched by the CLI.

- Core: pure selection, validation, requirements, planning, and comparison logic.
- Integrations: definitions, curated recipe selections, educational resources, and typed operation generation.
- Registry: lookup, relationships/catalog validation, and safe snapshot generation.
- CLI: local detection adapters, prompts/rendering, input handoff, confirmation, and executor invocation.
- Website application: browser presentation and selection/export using public data and verified browser-safe boundaries.

Proposed website application location: `apps/website` in the pnpm workspace, kept separate from CLI packages. This is a planning recommendation; no app directory is created now. Core must not depend on React or web tooling. The current Node-oriented core barrel cannot simply be imported wholesale into the browser.

Initially support a finite set of tested customization variants generated/checked with the real core planner at build time. Any later shared browser resolver requires a proven pure entry point and tests for matching CLI decisions. Do not maintain unrelated website compatibility logic by hand.

## Parallel milestones and integration points

### Foundation: required before both tracks depend on shared data

- Reconcile the website scope decision in project instructions/specifications before implementation.
- Freeze metadata, starter/add-pack distinctions, preset/context schema, public catalog version, version mismatch behavior, and export fixtures.
- Choose the first minimal frontend, JS/TS API, and Python API journeys from qualified contexts.

### Milestone A: independently useful education

Website builds the catalog, integration pages, goal navigation, and preset explanation pages. CLI improves info/search/preset explanations and preview summaries. Both consume the frozen metadata contract. This milestone can be reviewed before the full builder exists.

### Milestone B: a qualified handoff

Website implements bounded selection/review and the primary single-command output, plus file download fallback. CLI adds bounded token decoding, create/add mode contracts, existing-project options support, and safe delta planning. First qualify create token/file equivalence, then existing-project token/file equivalence and local detection. Disable the full builder handoff until its advertised CLI contract is shipped.

### Milestone C: maintenance and usability

Website adds troubleshooting and catalog/CLI mismatch guidance. CLI adds intended-stack doctor and the selected missing-file repair cases. Run beginner sessions across both surfaces and fix terminology, unnecessary selections, and failed handoffs.

### Candidate/release

Freeze site source, catalog revision, and supported CLI version alongside the CLI artifact evidence. Qualify independently and run joint contract/handoff tests. A delayed hosting task should not block a qualified CLI artifact; do not advertise a site export flow until the corresponding CLI feature exists.

For a personal maintainer, “parallel” means independently reviewable tracks against stable contracts, worked on as capacity permits. It does not require simultaneous staffing, fixed weekly deadlines, or continuously running agents.

## Website acceptance gates

- All selectable entries have reviewed guidance, official links, purpose/use timing, support context, and maturity labels; no unverified combination appears guaranteed.
- Catalog generation rejects missing IDs/links, duplicate presets, incompatible variants, invalid exported files, and forbidden executable/secret fields.
- Exported create/add token/file inputs and command fixtures validate with the supported packed CLI. Platform launchers/quoting, size limits, malformed/hostile input, and fallback behavior are tested. Browser messages and local CLI results agree within the site's explicitly bounded context.
- Core/CLI package boundaries pass typecheck/build without web UI dependencies. The site's browser bundle contains no executor/process/filesystem capability.
- Mobile/desktop navigation, keyboard operation, form labels, conflict explanations, downloads, and command copying work in the advertised browsers; exact browser coverage is frozen during implementation.
- Review/download works without an account or project upload. Loading the site never reads local project files or `.env` content.
- At least five beginner sessions cover the supported journeys: explain a selected library's purpose, choose a minimal preset, customize deliberately, export, preview locally, and apply without undocumented repair.
- The site shows catalog/CLI version and review dates. Stale support claims are corrected before release. Ongoing content refresh uses reviewed changes; this plan creates no recurring automation.
- Production publication requires a later explicit deployment request, with a concrete tested site available for review.

## Deferred scope

Full npm/PyPI cataloging, remote executable plugins, user accounts/cloud-saved presets, community uploads, ratings, arbitrary scripts, AI-selected stacks, project uploads, direct browser installation, monorepo composition, and external-service deployment.

Public static educational pages are in scope; a live hosted registry that controls CLI execution is not. Local declarative preset files can be shared manually without introducing account or team features.

## Research to complete during implementation

- Exact website framework/static-output behavior, hosting provider, and browser coverage. English-first content is confirmed.
- Safe public snapshot generation, strict preset option schemas, qualified CLI invocation/version and quoting per supported shell.
- Current official package guidance and setup behavior for every displayed example/qualified version.
- Config precedence/alternative-file detection used by repairs; support matrices for every selectable variant.

Planning references: [JSON Schema documentation](https://json-schema.org/learn/getting-started-step-by-step) explains annotations/validation for data contracts; [MDN File API guidance](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications) documents user-mediated file selection. Neither establishes RepoSetup compatibility or authorizes reading user files. The initial site needs export, not project-file upload.

See [the combined release roadmap](./ROADMAP_0.3.0_DRAFT.md) for decisions, release gates, and open questions.
