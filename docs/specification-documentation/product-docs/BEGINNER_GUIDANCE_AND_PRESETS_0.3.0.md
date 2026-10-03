# Beginner guidance and preset contract — 0.3.0 draft

Date: 2026-10-03. Status: planning only; interfaces below are proposed unless explicitly described as existing.

## Product problem and outcome

Beginners may know the kind of application they want without knowing the libraries needed to build it. A registry listing names is insufficient: users need purpose, timing, prerequisites, tradeoffs, and a safe path into their project.

The confirmed shared journey is: describe a goal, understand a minimal preset, choose libraries and their supported configuration, copy one generated command, and let the CLI validate/review/apply it locally. File download is a fallback for large selections. Start with RepoSetup-supported integrations and English guidance. Support both JS/TS and Python, with somewhat less initial Python editorial breadth. Never lower Python safety or retained qualification standards.

## Library knowledge model

Keep stable integration IDs distinct from upstream package names. An integration can represent a runtime, framework, tool, or several dependency packages; the website must explain that distinction when relevant.

For each selectable integration, curate:

- Plain-language purpose and the user problem it solves.
- When to consider adding it, when it is unnecessary, and a small example.
- Prerequisites, required integrations, included capabilities, alternatives, and conflicts.
- Setup impact: dependencies, generated/configuration files, environment placeholders, and extra manual steps.
- Supported contexts and operations: create, add, remove, diagnose, and any allowlisted repair.
- Official documentation links, source/review dates, qualified version information, and maturity/evidence labels.
- User-goal keywords and separate short CLI/full website descriptions.

Teach “start small, add when a concrete need appears.” Optional recommendations must explain a reason and must not be selected automatically merely because a package is popular. Do not add package rating/popularity systems or AI-generated installation plans.

Editorial content belongs with curated integration resources. Registry validates identifiers, relationships, references, and catalog exports. Core owns decisions; CLI and website render the guidance. Update `search`, `info`, prompts, and presets from the same source instead of maintaining independent prose that changes the support contract.

## Preset model and initial selection

Existing bundled preset IDs remain supported. Do not silently replace their contents with a new minimal recipe. Introduce new IDs/versioned definitions when behavior differs, or make an explicit compatibility decision with tests.

Each new preset describes its user outcome, audience, framework/runtime/manager context, minimal required selection, optional capabilities, why each item is selected, maturity, known limitations, and tested operations. Separate a project starter from an existing-project capability pack.

Proposed first starter journeys:

1. A minimal React/Vite frontend, with individually explained styling, validation, and testing additions.
2. A minimal JS/TS API in an already qualified backend context, with optional validation, testing, and a researched data layer.
3. A minimal Python API in an already qualified FastAPI or Flask context, with optional testing, linting, and persistence.

These are product candidates, not qualified recipes. Use existing dependencies and support evidence to finalize exact contents. Prefer useful capability packs such as testing or formatting over adding a large database stack to every application. Every selectable variant must have evidence or be clearly blocked/experimental.

## Website-to-CLI contracts

### Catalog snapshot

Export versioned public data from the local curated registry during website build: schema version, catalog revision, CLI compatibility identifier/range, integration metadata, preset definitions, supported option descriptions, and qualified context combinations.

Include no functions, operation executables, credentials, local paths, or installation scripts. This is a public documentation snapshot, not a hosted executable registry the CLI downloads at runtime. The CLI continues to work without the website.

Current integration `supports` functions are not serializable JSON. Do not invent a second independent rules engine from their names. Initially bound customization to a finite tested variant/context set generated and checked using the actual core resolver/planner at build time. A browser-safe pure resolver entry point is a future option only after dependency/bundle boundaries are proven; importing the full Node-oriented core entry point into the browser is not an approved shortcut.

### Single-command selection contract

Proposed input on create/add: `--selection <token>`. It is not available in the current CLI. The website's primary action produces one invocation using a qualified released CLI; package-manager bootstrap, version pinning, and platform quoting remain research-required for the exact chosen launcher.

Use a separately versioned strict declarative envelope, provisionally `selectionVersion: 1`, with a discriminated create/add mode, catalog/CLI compatibility information, and the appropriate input payload. Create wraps an existing schemaVersion 1 config. Add carries integration IDs and validated options plus optional expected context. Mode in the envelope must match the selected CLI command. No commands, executable operations, secret values, local absolute paths, or arbitrary script fields are permitted.

Encode bounded UTF-8 JSON as canonical unpadded base64url so the payload uses a restricted argument alphabet; do not compress the first format. Validate the alphabet/encoded length before allocation, then decoded size, strict UTF-8/JSON, JSON depth/selection counts, strict structural schema, and option/context semantics. Reconstruct operations solely from the CLI's built-in registry; the token is untrusted data. Corruption, unsupported format versions, unknown options, and extra executable fields fail before mutation.

Freeze conservative payload/complete-command length limits against supported launchers/shells before implementation. Do not promise every size of selection fits one command. The website provides a validated file/download fallback when the bound is exceeded, with an equivalent reviewed input. Tokens are not encrypted; explain that they contain public library choices/options, never request secrets, and render a human-readable selection summary beside the command. Do not put user project names or selection contents into analytics or shared URL history by default.

Keep one-paste installation with the existing plan review and confirmation. A preview-only invocation may be offered as a secondary action; never attach `--yes` to the normal command by default. After confirmation, supported recipes handle packages and generated configuration, then verification. Missing prerequisites or external services receive actionable instructions rather than silent elevated installation. Token and file routes must produce equivalent validated inputs and semantic plans.

### New-project handoff

Existing interface: `reposetup create --config <path> --dry-run`, followed by the existing confirmed execution flow.

Primary new workflow: generated `create --selection` invocation with schemaVersion 1 config in the selection envelope. Download schemaVersion 1 configuration as the existing `create --config` fallback. Keep website editorial labels outside the strict config, validate project names/relative paths, and use a separately versioned envelope for transport information. Never claim config alone freezes the transitive graph; recipe records and package-manager lockfiles have a separate reproduction purpose.

### Existing-project handoff

Existing interface: `reposetup add <ids...> --dry-run` accepts integration IDs and detects the current project. It does not currently accept a website config or integration options file.

Proposed primary extension: `reposetup add --selection <token>` accepts the additive mode of the selection envelope. Proposed fallback `reposetup add --config <path> --dry-run` accepts the equivalent validated additive selection, with format version, known integration IDs/options, optional expected context, and catalog compatibility information. Name and exact schema are to be frozen before implementation.

- Do not reuse a new-project config as instructions to replace the framework or recreate the project.
- The actual target, runtime, framework, package manager, existing dependencies, and files are detected locally. Expected context is a constraint, not permission to change the project into that context.
- Reject incompatible options, unknown IDs, missing requirements, unsafe paths, and unsupported versions before mutation.
- Define whether hard requirements can be explicitly added to the reviewed selection. Show required additions and ask the user to resolve ambiguous categories; never guess a database or framework choice.
- Preserve existing positional `add` behavior. Define mutually exclusive IDs, input-file, and selection-token modes. Also reject ambiguous create config/preset/token modes rather than choosing silently.
- Feed validated options into pure subset planning and the existing delta/executor path. Repeating the selection must be a no-op on a satisfied project; do not silently rewrite a user's pinned versions.
- Website checks cannot establish local compatibility; local CLI validation is authoritative.

Before the new contract is qualified, an informational site can generate the existing `add <ids...>` form for supported option-free selections. Do not advertise the full configuration builder for those older commands or show proposed flags as working commands for an older CLI. The 0.3.0 builder's primary target is the confirmed single-command, options-aware handoff.

### Generated commands

“Custom command” is confirmed to mean a RepoSetup invocation derived from selected libraries and configuration, rather than arbitrary script execution. Copy-command output uses an allowlisted command template and validated arguments; platform-specific quoting must be researched and tested. The ordinary selection fits the bounded token transport; a downloaded file with a fixed safe filename handles oversized selections.

One pasted command shows the decoded selection and actual local plan, then asks for confirmation within that invocation. Offer `--dry-run` as an optional preview-only path. Use a qualified published CLI version, never an unreleased version or an uncontrolled floating generator. Do not embed operation lists, shell pipelines, callbacks, remote script URLs, or real secrets in presets. Hosting the website must not give it process execution on a user's computer.

## Compatibility and acceptance

- Old supported configs, preset IDs, CLI invocations, JSON output, and platform behavior retain their contracts.
- Preset/catalog formats are strictly validated with Zod at external boundaries; additional exported JSON Schema may support tools but does not replace CLI validation.
- Use positive/negative contract fixtures shared by website build and CLI. Include unknown IDs/options, extra executable-looking fields, stale catalog data, incompatible contexts, hostile names, and missing requirements.
- Qualify encoded/decoded size bounds, malformed base64url/UTF-8/JSON, excessive nesting, mode mismatch, ambiguous input combinations, equivalent file/token plans, and command transport through supported platform launchers.
- A website export validates and dry-runs through the packed CLI, then creates/adds correctly in the advertised contexts. Prove preservation and idempotency, plus relevant generated tests and doctor behavior.
- Every selectable preset variant has an evidence record. Avoid an unbounded framework × manager × option matrix; unsupported combinations are unavailable or explicitly blocked.
- Version mismatch yields understandable guidance. The site offers only handoffs valid for the CLI version it displays; CLI resolves from its own built-in registry, not a remote plan.
- Educational metadata changes do not trigger installations or silently change a recipe. External commands/options/version ranges remain research-required until verified for the qualified versions.

This specification is paired with [the release roadmap](../implementing-docs/ROADMAP_0.3.0_DRAFT.md) and [the website plan](../implementing-docs/WEBSITE_PLAN_0.3.0.md).
