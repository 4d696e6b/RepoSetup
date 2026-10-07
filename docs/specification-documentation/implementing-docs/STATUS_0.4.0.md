# RepoSetup 0.4.0 implementation status

Last updated: 2026-10-07.

## Current position

**Milestones A–F are complete for the reviewed local qualification scope.** Core
schemas/compiler/context, portable compile/next/status, trusted checks, scoped text
application, private durable state and interruption reconciliation are implemented.
Actual tool/state qualification is macOS arm64 on Node 24.21.0; Linux/packed gates
remain I/J. Run/application/acceptance APIs are internal; D commands stay advisory.
Milestone G is in progress: the provider transport and managed coding run are
implemented; managed decomposition and separately authorized live qualification
remain open. See the [roadmap](./ROADMAP_0.4.0.md).

- Development branch: `codex/0.4.0-task-compiler`.
- Worktree: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.4.0-task-compiler`.
- Base branch: `codex/0.3.0-candidate-integration`.
- Base source: `bfeab2f66806d42fa7d32ac4c144d1464bd88a48`.
- Preparation inspected HEAD: `9fa2389176cb822ebae89d7edd301c0a3dbb6cb4`, then runtime source matched the integrated base. Milestone D started at `47db339` with a clean Git status; subsequent runtime extensions are recorded below.
- CLI package version: inherited `0.3.0-alpha.1`; no release bump or tag.
- Prior release qualification stays in its own records; this branch does not close those gates.

## Preparation

- [x] Inspect branch/worktree history and select the newer integrated candidate as the development baseline.
- [x] Create and attach an isolated worktree and named development branch.
- [x] Save the [task compiler product/technical contract](../product-docs/TASK_COMPILER_0.4.0.md).
- [x] Save milestones, dependency order, required tests and acceptance gates.
- [x] Preserve the original checkout's existing branch and untracked user files.
- [x] Relocate the checkout into the owner's Project directory on 2026-10-06, retaining the same branch and a compatibility symlink at its original Codex attachment path.
- [x] Qualify Node 24.21.0 in temporary local tooling for this worktree; system Node remains unchanged.
- [x] Provision frozen-lockfile development dependencies offline under Node 24.21.0 for the requested continued implementation; lifecycle scripts were disabled.

## Implementation milestones

- [x] A — Contracts, support profile, provider research and fixture designs frozen; supported-runtime build/typecheck/lint passed.
- [x] B — Strict schemas, pure compilation, requirement/artifact/scope validation and deterministic graph ordering.
- [x] C — Bounded safe context selection, concrete read-only repository adapter and freshness checks.
- [x] D — Portable compile/next/status CLI, reviewed phase selection and advisory handoff identities.
- [x] E — Serial executor, qualified fixed checks, complete admitted dependency inventories, private scratch/effect audits and live task/final-phase acceptance; reviewed local fixture validated.
- [x] F — Private CAS state, project leases, scoped text/parent effects, original-input/postimage acceptance and honest interruption recovery.
- [ ] G — Single managed provider adapter.
- [ ] H — Model/effort routing and targeted escalation.
- [ ] I — Packed/platform qualification and held-out benchmark.
- [ ] J — Experimental candidate qualification.

## Verification record

Preparation verification:

- Prettier check passed for the three new documents and specification index, using the existing candidate worktree's formatter.
- Git whitespace validation passed for the preparation changes.
- Repository-local Markdown links in the new documents resolve.
- No runtime code or package metadata changed; feature tests, typecheck and build were not run for this documentation-only preparation. Full lint and supported-runtime checks remain unverified.
- No provider calls, release tags or publication occurred. Historical checks from the parent branch do not establish correctness for future 0.4.0 code.

## Milestone A changes and acceptance evidence

- [x] Reconcile [architecture](../product-docs/ARCHITECTURE.md), [CLI](../product-docs/CLI_SPEC.md), [product requirements](../product-docs/PRODUCT_REQUIREMENTS.md) and [security](../security-docs/SECURITY_AND_SAFETY.md): AI coding drafts/proposals are permitted in a separate TaskPlan domain; curated InstallationPlans stay deterministic. Clarify current doctor repair and command inputs from the actual parser, and label all future task commands unimplemented.
- [x] Freeze [task contracts](../product-docs/TASK_CONTRACTS_0.4.0.md): independent version 1 envelopes, authoritative phase/draft input, requirement/criterion/artifact coverage, stable DAG order, exact ownership/scopes, task/run/attempt states, error codes retaining exits 0–5, revision-bound evidence, durable effect semantics and zero-effect task dry-run. Positive/negative future test vectors were specified; schemas were not implemented in A.
- [x] Select [managed-ts-node-v1 and handoff](../product-docs/TASK_SUPPORT_0.4.0.md): one trusted TypeScript package, Node 24.x, npm/pnpm metadata, preinstalled dependencies, Linux x64/macOS arm64 qualification targets, fixed trusted check IDs, finite hard limits, public/private oracle separation and advisory external-agent enforcement. Concrete verifier qualification remains in E.
- [x] Record [single-provider research](./TASK_PROVIDER_RESEARCH_0.4.0.md) from current official documentation: tool-free foreground OpenAI Responses candidate, strict JSON replies, model capability separate from native effort, observed API IDs/prices/capacity, reported/unknown usage, disabled opaque retries, timeout/cancellation limits and retention/cache caveats. No authenticated provider calls were made. Exact SDK/model catalog/account qualification remains in G/H.
- [x] Freeze [benchmark designs](./TASK_BENCHMARK_0.4.0.md): five named offline types/UI-state/API/cross-module/security fixtures, immutable public requirements and independent holdouts, three equal-authority treatments, 75-trial protocol, inclusive failure/cost accounting and finite ceilings. Fixture sources/oracles/runner/results are deferred to I; no savings result is claimed.
- [x] Inspect and document [source reuse/extensions](./TASK_COMPILER_REUSE_0.4.0.md) across core, CLI, executor, config/selection, preview, doctor/repair and verification. Reuse injectable ports, error/output conventions, hashing, lock/path/preflight and exclusive/individual atomic writes. Extend bounded private context, filtered process environment, trusted acceptance, durable state and scoped proposals separately from installer operations.
- [x] Update specification index, high-level contract and roadmap links. Integrated review resolved fixture ID casing, handoff naming, public/private oracle scope, check trust versus mutable checked inputs, own-write preimage/postimage freshness, phase/task verification identity and per-attempt context-call accounting.
- [x] Pass required typecheck/lint on the supported runtime before closing A; see follow-up validation below.

Milestone A validation on 2026-10-06:

- Node availability checked before validation: `/usr/local/bin/node` is `v22.12.0`; pnpm is `12.5.1`. No usable Node 24+ binary was found in the checked Homebrew/nvm/fnm locations. The prior `/tmp/contextnote-node-v24.21.0-darwin-arm64` directory has no Node executable. The desktop dependency-runtime tool reports no configured bundled runtime. No Node/system software was installed.
- `pnpm typecheck` **failed** (root exit 1, registry script exit 2): core typecheck passed, then registry could not resolve the unbuilt `@reposetup/core` declarations and reported consequent implicit-any errors. No build was run to qualify an unsupported runtime. This is not a passing workspace typecheck.
- `pnpm lint` **failed** (exit 1) during dependency bootstrap, before ESLint/Prettier: pnpm could not move an esbuild dependency directory into its staging directory while the two validation invocations were running. Those commands unexpectedly auto-populated 202 packages from the local cache (zero downloads), despite no explicit install command. All six newly created `node_modules` directories were identified by creation time and removed afterward; no tracked source, lockfile or package metadata changed. Future validation must avoid concurrent pnpm bootstrap and explicitly provision dependencies under Node 24+ first.
- Direct whole-workspace ESLint using the existing candidate worktree's ESLint 10.11.0 passed (exit 0) on Node 22.12.0 before dependency cleanup. This is diagnostic evidence only, not supported-runtime `pnpm lint` qualification.
- Targeted Prettier 3.9.8 checks use the existing candidate worktree's formatter with `--ignore-path /dev/null`, because normal lint excludes Markdown. Initial check found formatting issues in the reconciled older docs/index; those were formatted and the final changed-document check passed. The formatter ran on Node 22.12.0 and establishes document formatting only.
- Final `git diff --check`, whitespace checks covering new untracked documents, and repository-local Markdown/source link validation passed. Git scope checks confirm only specification Markdown changed and package versions/lockfile/website/runtime source remain unchanged.
- No runtime feature tests were added/run for this documentation-only slice. Meaningful future positive/negative and legacy regression vectors are defined in the contracts/benchmark; inventing feature tests before B would misrepresent implementation. Build and packed/platform/install checks are unaffected and were not run.
- No later task milestone, placeholder command, package bump, branch merge, publish, release tag or paid provider call occurred. Historical base qualification does not close new task support gates.

## Supported-runtime follow-up

The initial environment blocker is resolved following the owner's instruction to commit and continue implementation. Milestone A specifications were committed as `65a5c41`. A Node 24.21.0 darwin-arm64 archive was fetched from [the official release directory](https://nodejs.org/download/release/v24.21.0/) and matched its official SHASUMS256 entry (`bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057`). It was extracted only to `/tmp/reposetup-task-compiler-tools`; no system Node installation or shell configuration was changed.

Follow-up validation used that Node binary on PATH and pnpm 12.5.1, sequentially: `pnpm install --offline --frozen-lockfile --ignore-scripts` passed (202 cached packages, zero downloads); `pnpm build`, `pnpm typecheck`, and `pnpm lint` all passed. Building workspace declarations resolved the earlier typecheck failure. The inherited root build also built the existing website and regenerated its catalog, with no tracked website changes. These checks close A's validation gate; they do not qualify any managed task adapter or provider.

External questions are assigned to later gates: bounded context/privacy and filesystem races (C/F), trusted exact verifier recipes/report parsing/environment/effects (E), pinned SDK/account access/cancellation/usage/retention qualification (G), model capability/effort/pricing catalogs (H), and concrete independent fixtures/platform/live benchmark evidence (I). These unresolved questions do not authorize broader execution or spending.

## Milestone B changes and acceptance evidence

- [x] Add strict version 1 schemas and inferred TypeScript types in `packages/core/src/tasks` for all twelve task document envelopes, source/dependency/capability references, reviewed compilation policy, finite preferences, context, routing, typed text proposals, usage, verification, attempts and run snapshots. Keep stack configuration and selection schemas untouched. Model capability and native effort remain independent fields; schemas contain no executable recipes or credential fields.
- [x] Add bounded JSON decoding with fatal UTF-8, duplicate-key/depth/byte rejection, sanitized errors and canonical content-identity validation. Preserve ordered arrays and canonicalize declared sets; reject unknown fields/versions and unsafe literal paths. Provider call identities are bounded opaque identifiers rather than logical task IDs.
- [x] Add pure `compileTaskPlan` and `validateTaskPlan`: independently reviewed phase/policy/project inputs, missing-decomposition blocker, requirement-to-task/criterion coverage, unique IDs/artifacts, exact predecessor references, consumer read authority, blocking-question rejection, fixed check requirements, conservative capability floors, deny-first scope constraints and unique exact/case-alias/parent-child write ownership. Stable lexical DAG ordering and canonical hashes produce deeply frozen plans without mutating inputs.
- [x] Append task error codes and map them to existing CLI exits without changing commands, legacy codes or singular/aggregate semantics. Regression tests preserve the aggregate floor of 2 for nonempty general-error arrays and the empty-list exit of 1.
- [x] Add meaningful synthetic unit fixtures and rejection tests. They are schema/compiler fixtures, not the independent held-out benchmark implementation assigned to I. No task commands, repository reader, provider adapter, subprocess execution, project mutation, automatic rollback, dependency installation feature or paid call is added.

Milestone B validation on 2026-10-06, using temporary Node 24.21.0 and pnpm 12.5.1:

- Targeted task suite: **71 tests passed across 3 files**. Covers all envelope kinds, nested unknown fields, versions, malformed/duplicate JSON, invalid Unicode/limits, typed proposal restrictions, usage identities, uncovered requirements, references, graph cycles, deterministic hashing/order, immutability, policy revisions, forbidden scopes and ownership conflicts.
- Final `pnpm test` passed: **625 tests across 85 files** (core 339, registry 15, integrations 126, CLI 131, inherited website 14), including the opaque provider-ID refinement.
- `pnpm build`, `pnpm typecheck`, and `pnpm lint` passed on the final source. Core/CLI declarations build successfully. The inherited root build/tests also exercise the website with no tracked website changes; website tar fixtures emit non-failing default-locale warnings.
- Initial targeted testing found one fixture-injection assertion error, and initial lint found unused bindings/regex issues; corrected before final checks. Initial workspace test run found a new CLI test used the wrong constant name and empty-list expectation; corrected the test without altering runtime behavior, then the workspace suite passed. No failing checks remain.
- Explicit changed-document formatting, local Markdown-link validation and `git diff --check` passed. Package metadata, versions, lockfile, integrations, stack/selection configuration and website sources remain unchanged.

## Milestone C changes and acceptance evidence

- [x] Add core read-only repository ports, byte hashes/strict UTF-8 decoding, exact line selection, privacy screening, conservative local-import discovery and context preparation. Add the concrete filesystem reader in `packages/cli/src/tasks`, separate from inherited detection/execution adapters. No process/provider/fs mutation adapter is called.
- [x] Seed only selected phase/requirements, writable preimages, capability/expansion references, available nearby tests and required predecessor artifacts. Validate producer/attempt/path identity and current hashes; authentic verifier/state authority remains E/F. Merge ranges without rewriting line endings/BOM or suppressing invalid explicit ranges. Preserve missing optional imports as bounded unresolved metadata; required sources block.
- [x] Include complete applicable ancestor `AGENTS.md` files, with exact hashes and per-target applicability; rules outside approved read authority block. Bind all sources, selected byte hashes, rules, write preimages/absence and predecessor revisions into deterministic input/context identities. Recheck source/target bytes and current rule inventory before returning or confirming freshness.
- [x] Bound file reads to 65536 bytes, inventory work/entries to 4096, depth to 32, sources including rules to 128, import expansion to two edges and complete encoded transient packets to 262144 bytes or a lower caller ceiling. Source bodies stay transient; persistent context envelopes contain metadata. Report conservative byte-based token estimates separately from actual provider usage.
- [x] Enforce strict copied reader authority, canonical root/identity, lexical exclusions, regular-file/single-link checks, no symlink components, bounded `O_NOFOLLOW` reads and descriptor/path identity checks. Extend credential path exclusions and screen bodies before range selection. Record [policy revision 1 and limitations](../product-docs/TASK_CONTRACTS_0.4.0.md#milestone-c-context-policy-revision-1), including current [official Node 24 flag semantics](https://nodejs.org/docs/latest-v24.x/api/fs.html#file-open-constants), trusted-project races, secret-screening limitations, native-token qualification and platform gates.

Milestone C validation on 2026-10-06:

- Confirmed the temporary Node **24.21.0** executable before validation; system Node remains unchanged. Used pnpm 12.5.1 and existing frozen dependencies; no installation was performed in this slice.
- Targeted context tests: **18 core context tests**, **10 CLI real-filesystem/integration tests**, and **41 scope tests** passed. Fixtures cover relevance, exact Unicode/line bytes, hash/order stability, complete rules, new/changed rules, expected absence, scope/privacy exclusions, secret/binary/UTF-8 rejection, hardlinks/symlinks, root replacement, finite inventory/depth/packet limits, required/unresolved references, predecessor drift and preservation of project bytes.
- Final workspace `pnpm test`: **657 tests across 87 files** (core 361, registry 15, integrations 126, CLI 141, inherited website 14). `pnpm build`, `pnpm typecheck`, and `pnpm lint` passed under Node 24.21.0. Inherited website build/tests produced no tracked website changes; tar fixtures retain non-failing default-locale warnings.
- Initial typecheck found optional-field typing and a fixture's overly narrow selector type; initial lint rejected a control-character regex. Corrected these before final checks. The real-reader integration caught a strict inventory-scope mismatch; fixed core to pass only read/deny fields. A range rejection test then caught full-file merging hiding an invalid explicit range; now every range is validated first. No failing check remains.
- Changed-document Prettier checks, local Markdown links and `git diff --check` passed. Existing commands, config/selection inputs, curated integrations, package metadata/versions, lockfile and website sources remain unchanged. No task command, process probe, dependency-installation feature, provider call, persistent artifact or later-milestone execution feature was added.

## Milestone D changes and acceptance evidence

- [x] Register only implemented `task compile`, `task next` and `task status` subcommands, with explicit review/root/preferences/artifact flags, exact heading or inclusive-line selectors, text/JSON conventions and no non-TTY prompts. Preserve existing commands/aliases, config/selection inputs and numeric exits. Task JSON works both before the task command and on a leaf subcommand.
- [x] Add strict `task_review` for caller-reviewed phase/project/check/scope authority; extract unchanged compilation policy into a reusable schema module. Bound and decode every artifact, reject duplicate/unknown fields and screen metadata before output. Compare current Markdown/requirement/root identities with independent review. Baseline Git/tool/check availability remain not checked; no subprocess probe runs.
- [x] Produce actionable decomposition requests with exit 3 when a draft is absent, rather than invent tasks. Valid drafts yield deterministic `task_compilation` receipts accepted by next/status along with raw plans. Explicit preference exclusions can only narrow authority and require a correspondingly compiled plan.
- [x] Prepare bounded source/context packets for independent candidates, with exact requirements, outputs, criteria, capability and separate effort. Record the intentional pre-release [portable contract amendment](../product-docs/TASK_CONTRACTS_0.4.0.md#milestone-d-portable-amendment-revision-1): routing nullable instead of fabricated model recommendations; caller-supplied run/attempt identities explicitly advisory and not durable attempts. Complete packet bytes, including rendered envelope/newline, are bounded. No provider/agent is invoked, no typed proposal is applied, and no response claim is accepted.
- [x] Next dry-run prints only context/scope/check metadata and null run/attempt IDs, never source bodies; compile/status dry-runs also avoid writes, processes, locks, journals and prompts. Status separates unknown live authority from caller-reported unverified snapshots. Dependents remain blocked until E/F supply real acceptance/state; a reported succeeded/accepted snapshot cannot unlock them.
- [x] Update actual CLI/help, architecture, contracts, support notes and roadmap/status. Managed `run`/`verify` commands remain absent; no feature code from E or later milestones is implemented.

Milestone D validation on 2026-10-06:

- Confirmed temporary Node **24.21.0** before validation, with pnpm 12.5.1 and existing frozen dependencies. No software/dependency installation, package/version/lockfile change, provider call or publication occurred.
- Targeted suites passed: **10 phase selector tests**, **5 portable policy tests**, **9 schema boundary tests** and **9 real-filesystem CLI tests**. Cover exact CRLF/BOM section/range selection, duplicate/fenced/absent headings, receipt reuse, malformed/secret/stale inputs, preference restrictions, independent task selection, snapshot non-authority, packet hashes/bounds, capability versus effort, non-TTY/plain/JSON/help/alias mapping and effect spies for all dry-run boundaries.
- Workspace `pnpm test` passed: **681 tests across 90 files** (core 376, registry 15, integrations 126, CLI 150, inherited website 14). `pnpm build`, `pnpm typecheck` and `pnpm lint` passed. Built CLI task/compile/next help smoke checks passed with only implemented commands/flags. Website build/tests were inherited and caused no tracked website changes; known tar default-locale warnings remain non-failing.
- Initial CLI testing caught the root default `json: false` overriding a leaf `--json`; fixed global reading to preserve a true local flag and reran targeted/full legacy regressions. No failing checks remain. Changed-document formatting, local Markdown links and `git diff --check` passed.
- Packed/live/platform qualification remains I; alias testing here verifies both manifest aliases share the built entry point, not a newly installed packed artifact. No runtime/acceptance/managed support qualification is implied by these local tests.

## Milestone E, first committed slice — evidence policy and process environment

E remains incomplete. This slice adds executable domain policy, not qualified task check execution or a new CLI command.

- Added strict independently reviewed verification policy, content-addressed catalog definitions and observation/audit boundaries. Check definitions bind authority, criterion/evidence identities and the required test manifest; a report cannot redefine required tests. Unknown fields, duplicate check/test identities and catalog tampering fail closed.
- Added pure task/final-phase evaluation. Required typecheck/lint/unit checks and the appropriate independent acceptance gate cannot be omitted. Model claims, incomplete/timeout/truncated reports, zero/skipped/todo/focused/filtered tests, stale definitions/revisions, missing criterion authority and unexpected writes cannot establish acceptance. Results are hashed and deeply frozen. Phase checks require a fresh phase oracle, rather than historical task passes.
- Extended the existing executor process request with an optional explicit environment. Omission preserves installer inheritance; explicit environments replace it, including Windows executable resolution. The CLI check-environment constructor supplies only fixed PATH/locale/CI/timezone and executor-provided HOME/TMP directories, with no ambient reads. A real Node subprocess test verifies replacement and legacy compatibility. macOS may add `__CF_USER_TEXT_ENCODING` after launch; this is documented in the test and is not a supplied credential.
- Validation used the already available temporary Node **24.21.0** and pnpm **12.5.1**. The 19 new domain tests and 3 new environment tests passed; existing 16 process/filesystem adapter tests passed. Full workspace tests passed: **703 tests across 92 files** (core 395, registry 15, integrations 126, CLI 153, existing website 14). Build, typecheck and lint passed. Initial checks caught a test ordering assumption, TypeScript callback narrowing, a test-edit syntax error, macOS runtime environment injection and a lint control-regex violation; all were corrected before the final checks. Existing tar locale warnings remain non-failing; no website source changed.
- Rechecked current official TypeScript, ESLint and Vitest CLI/reporter documentation, recorded in the support specification. Documentation confirms intended flags, not pinned-tool qualification. No dependency installation, model/provider call, version bump or publication occurred.

These APIs take trusted in-memory executor/reviewer observations. A serialized provenance value, audit boolean or verification result does not authenticate execution. The CLI has no path that imports them for acceptance. Concrete fixed recipe resolution, complete trusted dependency/config closure, bounded tool-report parsing, real filesystem before/after auditing, private temporary directories and executor orchestration still need implementation and qualification before E can close. Durable application receipt/acceptance binding remains F.

## Milestone E, second slice — fixed recipes and bounded tool reports

First E slice committed as `005d1a6` before this continuation. E remains incomplete.

- Added internal CLI recipe factories for the three pinned local Node entry points. Fixed argv selects explicit configs, non-emitting/nonincremental TypeScript, JSON lint with enumerated targets and single-worker Vitest. Scratch directories must be outside the project. Recipes accept no arbitrary command/flag strings and execute no processes themselves.
- Vitest 5.0.1 JSON output defaults to a project artifact directory; the recipe therefore uses an explicit external `--outputFile`, plus `--configLoader=runner` to avoid bundled config temporary output, and explicit false values for `allowOnly`, `passWithNoTests` and snapshot updates. Canonical path consistency matters on macOS: the first fixture exposed ESLint treating a `/var` alias as outside its actual `/private/var` base; realpath-canonical fixtures corrected it.
- Added bounded report parsing using duplicate-key/depth-aware JSON decoding. The combined stdout/stderr/report allowance is 131072 UTF-8 bytes. Timeout, abort, missing tool, overflow, malformed/count-conflicting/duplicate/out-of-root tests and omitted lint targets fail closed. Only digests and logical file/full-name test identities leave the parser; raw logs/report bodies are transient. Zero, skipped/todo, failed or noisy checks cannot become valid reports. Parsed metadata still requires executor provenance and a current frozen definition/audit before domain evaluation.
- Added three recipe tests with real pinned TypeScript **5.9.3**, ESLint **10.11.0** and Vitest **5.0.1**, plus ten report tests. The single-package fixture reuses installed dependencies without installation and demonstrates nonzero unit execution, actual type/lint/test failures, rejection of `.only`, report redirection and no emitted files in the inspected project inventory. This is a macOS Node 24 entry-point smoke check, not complete closure/effect/platform qualification.
- Validation on temporary Node **24.21.0**, pnpm **12.5.1**: targeted **13 tests** passed; full workspace **716 tests across 94 files** passed (core 395, registry 15, integrations 126, CLI 166, existing website 14). Build, typecheck and lint passed. A TypeScript test-narrowing issue and two missing imports during edits were corrected before final checks. Existing website locale warnings remain non-failing; no tracked website/package/lockfile change, install or provider call occurred.

Next E work must implement reviewed tool/config/oracle dependency closure identities, safe bounded report-file reads with freshness, private executor scratch lifecycle, complete project/excluded-path effect auditing and executor orchestration. Recipes and report parsing must not be wired to acceptance before those prerequisites. Linux qualification is still open; the smoke fixture does not qualify TypeScript ESLint plugin closures or arbitrary project configs. F and later milestones remain untouched.

## Milestone E, third slice — file identity, fresh reports and read-only audits

Started at committed `750955c` on the expected branch with a clean worktree. E remains incomplete; this slice implements read-only boundaries and does not register a verification command or execute checks in production.

- Added strict internal version 1 verifier snapshot/file-definition records, canonical identity functions and pure inventory comparison in core. Snapshots bind root identity/metadata and per-path type, audit mode and fingerprint; comparison detects additions, removals, edits, permission/type/audit-mode drift and root metadata effects. Snapshot imports cannot authenticate execution. Definition identities bind fixed recipe revision, reviewed closure label, named roots, finite file hashes/roles and total bytes; arbitrary command fields fail closed.
- Added a concrete read-only POSIX reader with canonical root/inode checks, component symlink rejection, regular/single-link checks, `O_NOFOLLOW`/`O_NONBLOCK`, bounded streamed hashes and descriptor/path rechecks. Private credential paths are not read even for definition hashing. Verifier closure validation requires declared runtime/entry/config roles and rechecks listed dependency/config/rule/oracle bytes, root identities, recipe revision and byte accounting. This validates the reviewed list, not whether a reviewer enumerated every dynamic import or dependency.
- Added complete bounded project inventory traversal. Public text is read with fatal UTF-8/privacy screening and a 65536-byte limit; excluded/ignored/generated/dependency/private bodies are never read. Their metadata is still recursively inventoried, while symlinks are recorded without following them. New audit caps: 16384 entries, depth 32; a listed definition file may be streamed up to 256 MiB with a 512 MiB total. Those binary/tool hash allowances do not raise coding/context limits. Oversized/unsafe inventories block instead of skipping evidence.
- Added one-use report readers prepared before launch: canonical same-owner private directory, report initially absent, fresh regular unaliased file, 131072-byte/fatal-UTF-8 bounds, root/permissions/identity rechecks and sanitized errors. No report is deleted, overwritten or reread on retry. Recipe identities normalize executor scratch paths while binding actual fixed flags, config/targets, pinned version, environment and limits. The existing pinned-tool fixture now uses a newly allocated private scratch directory and the bounded fresh reader for each Vitest call.
- Added **6 core tests** and **10 real-filesystem CLI tests**. They cover identity tampering, inventory overflow/depth, private metadata, edits/adds/removes/mode/root drift, public oversized/binary/private/hardlinked inputs, stale/reused reports, symlink/hardlink/replaced scratch directories, report encoding/bounds/permissions, closure byte/role/recipe/credential/duplicate/transitive tampering, and an actual exit-zero Node verifier that leaves an unexpected file. The unexpected file is detected and retained until fixture cleanup; product rollback is absent.
- Validation on existing temporary **Node 24.21.0** and pnpm **12.5.1**: targeted new/affected suites passed (**19 tests**, including 3 pinned recipe tests). Full workspace **732 tests across 96 files** passed (core 401, registry 15, integrations 126, CLI 176, existing website 14); build, typecheck and lint passed. Early checks caught a missing schema role field and two unused test bindings; corrected before final checks. No software installation, provider call, package/version/lockfile change, website source change, merge or publication occurred. Existing tar locale warnings remain non-failing.

Next E work is executor-owned scratch lifecycle and sequential check orchestration, binding actual qualified runtime/tool/config paths to these definitions, immutable dependency inventories/complete closure qualification and authenticated independent acceptance evidence. Do not substitute a closure label, supplied snapshot or parsed report for those authorities. Audits are bounded point-in-time observations for trusted projects, not an OS sandbox or atomic filesystem snapshot; hostile concurrent races, transient writes restored between observations and external symlink targets are not universally observed. Oversized dependency/Git inventories block; ignored metadata does not replace required content bindings. Linux/profile/complete plugin qualification remains open. No F or later feature code is implemented.

## Milestone E, fourth slice — report validity and missing review evidence

Started at committed `3bb4595` with a clean worktree on the expected branch. E remains incomplete.

- Made report validation status mandatory in trusted internal check observations. Invalid parsed reports fail even with a real exit code of zero; incomplete reports block. The evaluator preserves the actual exit code and the public serialized verification-result shape. A report-status field is not execution authority and must come from the qualified adapter, never a model or imported artifact.
- Missing evidence for a reviewer-authority acceptance definition now produces `needs_review` / `TASK_NEEDS_REVIEW`, for both task and final-phase targets. Missing executor checks still block and take precedence over pending review. Non-pass results never satisfy criteria.
- Added six regression cases covering invalid typecheck/lint/unit reports, incomplete or omitted validation status, task/phase review absence and missing mandatory tool evidence. Updated the internal contract description. No verification command, process orchestration, scratch lifecycle or later milestone code was added.
- Validation: default Node remains **22.12.0**; the existing temporary **Node 24.21.0** was checked and used, with pnpm **12.5.1**. Core suite **407 tests across 49 files** passed; full workspace **738 tests across 96 files** passed (core 407, registry 15, integrations 126, CLI 176, existing website 14). Build, typecheck and lint passed; changed-document formatting and Git whitespace checks passed. Existing tar locale warnings remain non-failing. No dependency/system installation, provider call, version/lockfile change, website source change, merge or publication occurred.

Next E work remains executor-owned scratch lifecycle and sequential orchestration, actual runtime/tool/config binding, complete reviewed closure and immutable dependency inventories, authenticated independent acceptance and Linux/profile qualification. This slice closes evaluator gaps before that wiring; it does not close E acceptance.

## Milestone E, fifth slice — serial executor and live review authority

Started at committed `3c3a36f` with a clean worktree. E is still in progress.

- Added the core verification executor: revalidates the plan/catalog/target, performs zero-port-call dry-run, audits project and definitions before/after serial fixed tool checks, always disposes prepared scratch, preserves actual process failures and requests independent review only after all tool/required-test evidence passes. Review decisions must answer the exact live immutable request. Imported/copied records are not authority; final-phase checks require current same-plan/run executor-issued task receipts and a separate phase review. This is ephemeral verification, not F's durable task acceptance/state.
- Added opt-in process-tree SIGKILL escalation after task-check cancellation/timeout grace; fixed recipes bind a 1000 ms grace. Existing installer requests retain their previous termination behavior. No new command, automatic project rollback, state store or provider call.
- Added 18 executor cases and a real cancellation case with a process ignoring SIGTERM. Targeted executor tests passed. Initial typecheck found literal-inference and optional-timeout issues; corrected before final validation. Existing temporary Node **24.21.0** checked before validation; pnpm **12.5.1**. Full workspace **757 tests across 97 files** passed (core 425, registry 15, integrations 126, CLI 177, existing website 14); build, typecheck and lint passed. Existing tar locale warnings are non-failing. No install, tracked website/package/lockfile change or publication.

The concrete adapter and closure/scratch qualification remain the next E slice. Generic trusted ports cannot establish their own filesystem/runtime facts. Platform/release qualification remains I/J; do not mark E complete before its concrete acceptance cases pass.

## Milestone E, sixth slice — concrete qualification and acceptance evidence

Started at committed `cfeb84a` on the expected branch with a clean worktree. This
slice connects core orchestration to concrete CLI ports, with no task verify/run
command or durable state/application feature.

- Added strict core qualified-check schemas, canonical composite definition
  identities and non-build TypeScript config/metadata policy. CLI compares actual
  Node 24 executable/version, published tool entry, pinned package metadata,
  config/target paths, reviewed file hashes and recipe identity. Required unit
  identities bind exact file/name pairs and frozen oracle source hashes; replacing
  assertions while preserving names fails prelaunch freshness. A validly hashed
  alternative TypeScript entry is rejected. Domain schemas/policy remain core;
  filesystem/process/runtime facts remain CLI.
- Added complete admitted immutable dependency inventories: regular-file content
  hashes, metadata, additions/removals and canonical in-root dependency links,
  using existing finite closure limits. Project dependencies must be one complete
  admitted root. Escaping workspace links and private/unbound roots fail closed.
  Inventory sharing lasts only one audit. Runtime identity freezes the exact Node
  executable; unused npm/Corepack files are not invoked or treated as dependencies.
- Added executor-only private scratch lifecycle with separate HOME/TMP roots,
  bounded fresh reports, permitted transient effects and safe disposal. Unknown,
  linked, replaced or oversized scratch blocks and is retained privately;
  unexpected project writes are reported and retained. Forced Node/Vitest cache
  disabling and reviewed Vite cache redirection prevent project cache artifacts.
  The frozen scratch limits/layout policy is shared by the recipe hash and adapter,
  so changing permitted temporary effects invalidates the reviewed definition.
  Pinned Vitest's transient SSR files and private local API token stay in fresh
  scratch; token contents are never read or included in task artifacts.
- Added a per-process overlap guard, strict target validation and revision-bound
  review decision digests. Final-phase checks require genuine current executor
  task receipts and independent phase review. Serialized pass/approval claims
  remain unauthenticated; no task state is advanced and no portable dependent is
  unlocked. Cross-process locks and durable/application binding remain F.
- New coverage: six core config/metadata cases, five concrete real-tool/closure/
  scratch cases and a core concurrency/target case. The isolated single-package
  fixture copies existing installed tool bytes and removes test-owned workspace
  links; no package manager install/download occurs. It runs actual TypeScript
  5.9.3, ESLint 10.11.0, typescript-eslint 8.70.0 parser/plugin and Vitest 5.0.1,
  proves one independently required unit test executed, then performs distinct
  task and final-phase live reviewer decisions with no project effects. A separate
  actual exit-zero lint verifier writes an unexpected project file; verification
  fails, review is not invoked and the file remains until test-fixture cleanup.
- Initial qualification failures exposed escaping links, unnecessary private npm
  config in a broad runtime tree, Node compile-cache writes and Vitest's temporary
  effects. The executable/dependency boundary and scratch policy were corrected
  without permitting unbound imports or reading private credentials. Early
  typecheck/lint issues were fixed by placing Zod boundaries in core and avoiding
  a control-character regex. Official Node/Vitest/Vite/typescript-eslint sources
  and installed pinned-source observations are recorded in the support document.
- Validation on existing temporary **Node 24.21.0**, pnpm **12.5.1**: full workspace
  **769 tests across 99 files** passed (core 432, registry 15, integrations 126,
  CLI 182, existing website 14). Final build, typecheck and lint passed. The final
  affected adapter/recipe/environment rerun passed **11 tests across 3 files**
  after the published-entry, scratch-policy identity and frozen-oracle guards.
  Final affected core suites passed **31 tests across 3 files**. Changed-document formatting,
  **127 local links across 5 documents** and Git whitespace checks passed. Existing tar locale warnings remain non-failing. No system
  or dependency installation, paid/provider call, package/version/lockfile change,
  website source change, merge, publish or later milestone implementation occurred.

E qualification covers the reviewed **macOS arm64 / Node 24.21.0** fixture and
trusted in-memory host authority. Arbitrary configs/plugins, hostile repositories,
OS isolation, atomic filesystem snapshots and Linux/packed release qualification
are not established by this fixture. Linux x64 and advertised-platform/packed
qualification retain their explicit I/J gates; this is not a release-support claim.

## Milestone E handoff (historical)

E closed its reviewed local implementation scope in `4d27866`, following
`cfeb84a`. The subsequent user continuation authorizes F only. Provider/catalog
allowance/routing qualification remains G/H; Linux/packed/held-out benchmark and
release qualification remain I/J. Qualification is local evidence, not a release
or hostile-repository isolation claim.

## Milestone F, first slice — application and checkpoint policy

Started at committed `4d27866` with a clean worktree. F is in progress; no new CLI
command or provider capability is introduced.

- Added pure whole-batch typed text preflight, exact unique replacements,
  expected-absent creation, owned-target checks and finite encoding/privacy/byte
  policy. Added post-application input checking that retains immutable inputs and
  substitutes only recorded owned postimages, plus complete project-effect audit.
- Added strict internal version 1 checkpoint/checksum and relationship validation,
  metadata-only context bindings and ordered intent/effect records. Checksum and
  imported pass flags do not authenticate acceptance. Concrete durable storage,
  locking, application and interruption recovery are still required.
- Checked default Node 22.12.0 and reused existing temporary Node 24.21.0.
  Core tests passed **442 tests across 53 files**; workspace build, typecheck and
  lint passed. No installation, paid call, package/version/website change or later
  milestone implementation occurred.

## Milestone F, second slice — executor, private state and recovery

First slice committed as `d7072d6` before continuation. This slice implements F's
internal lifecycle and concrete ports; final qualification passed as recorded below.

- Added an executor-owned run UUID, monotonic CAS snapshots, bounded attempt
  opening, original metadata-only context/preimages, no-change outcomes and ordered
  batch intents/effects. Application, reconciliation and acceptance have separate
  executor modules. No provider dispatch or task run/verify CLI command is added.
- Added private same-filesystem state outside the project: canonical owner-private
  roots/directories, 0600 snapshots/stages, a 1 MiB snapshot cap, bounded duplicate-
  key-aware reads, checksums/relational validation, file/directory sync, individual
  snapshot replacement and exclusive project leases. Recovery needs the exact
  reviewed token and a confirmed dead local PID; live owners cannot be stolen.
- Added entire-batch path/hash/encoding/privacy/ownership/writeability preflight,
  canonical component/case/link guards, recorded necessary parent directories,
  individual staged text publication and immediate precondition rechecks. Each
  effect is persisted before continuing; partial or uncertain writes are retained.
  Neither multi-file atomicity nor automatic rollback/installation is claimed.
- Acceptance binds genuine E verification to original immutable inputs, recorded
  owned postimages and current artifact hashes. Required definitions/oracles are
  immutable targets. Consumer dispatch needs live binding/artifact receipts;
  persisted flags alone cannot unlock it after restart. Finalization freshly
  verifies every task at the current revision, then performs separate phase review.
  Original input/output drift invalidates active-run acceptance and consumers;
  succeeded snapshots remain immutable history.
- Reconciliation records absent/current/unavailable observations without replaying
  intents or adopting a coincidental matching pending postimage. Explicit reviewed
  reconciliation can resume a fully recorded batch for fresh checks, or abandon a
  known partial attempt before a bounded fresh attempt. Unknown ownership or
  interrupted verification allowance stays needs-review. Observed wall/check work
  is counted; exhausted allowances or cancellation cannot commit acceptance.
- Targeted evidence: **22 real-filesystem lifecycle/failure cases**, **10 core
  application/checkpoint cases**, and E's existing **19 executor cases** passed.
  A separate real-tool fixture passed after an executor-owned TypeScript replacement:
  TypeScript 5.9.3, ESLint 10.11.0, typescript-eslint 8.70.0 and Vitest 5.0.1 executed
  the independently required test, then bound live review and durable acceptance to
  the original input and exact postimage. Qualification remains macOS arm64 /
  Node 24.21.0; fixture dependencies reuse existing installed bytes.
- Initial fixture failures caught a strict reader-authority mismatch, a recovery
  task-state transition, a missing test import and test-string escaping. These were
  corrected before final qualification. Final review also added a physical-root and
  complete run-baseline guard: unrelated changes before checks and unrecorded edits
  to failed owned outputs cannot be adopted as a fresh execution baseline. A
  concurrently launched typecheck initially raced build cleaning declarations; it
  passed when rerun against stable output. No install, provider/paid call, package or
  version change, website source change, merge, publish or later milestone code.

### F validation and remaining work

Validation used existing temporary **Node 24.21.0** and pnpm **12.5.1**; default
Node **22.12.0** remains unsupported and unchanged. Full workspace tests passed
**799 tests across 102 files** (core 442, registry 15, integrations 126, CLI 202,
existing website 14) before the final inventory/root guards. After those guards,
final core **442 tests across 53 files** and affected CLI **28 tests across 2 files**
(22 lifecycle/failure cases plus 6 real-tool qualification cases) passed. Final
build, stable-output workspace typecheck and lint passed; changed-document
formatting, **141 local links across 5 documents** and Git whitespace passed.
Inherited tar locale warnings remain non-failing; no tracked website source changed.
No implementation acceptance blocker remains for F's reviewed local scope.

The concrete state authority must be
one host-selected, preexisting private POSIX directory outside the project on the
same filesystem. Checksums detect corruption, not a hostile same-UID user's rewrite;
filesystem audits/locks do not provide an OS sandbox or hostile concurrent rename
protection. Ambiguous stages, failed edits and stale locks are explicitly user-owned
recovery/lifecycle work. No automatic deletion, adoption, rollback or replay occurs.

G is next: one researched provider adapter, usage allowance/reservations, cancellation
and explicit run CLI wiring. H retains managed routing/repair automation; I/J retain
Linux/packed/benchmark/release qualification. Local F functionality needs no AI credits.

## Next implementation handoff

Stay in this worktree on `codex/0.4.0-task-compiler` and preserve unrelated changes.
The first F slice is `d7072d6`; this completed slice must be committed before any
continuation. The next milestone is **G — one managed provider adapter**. Do not
implement G or later work under the F request. Provider SDK/model/account and usage
allowance qualification remain open; any live paid call needs separate authorization.
Linux/packed/benchmark/release qualification remains I/J. No system/dependency
installation, package version bump, website change, merge or publication occurred.

## Milestone G, first slice — researched SDK transport

Started from committed `d3fdad5` on the expected branch with a clean worktree.
G remains incomplete. Added provider-neutral request/observation contracts in core
and a CLI-only official Responses SDK adapter with strict draft/proposal wire
schemas, environment-only credentials, bounded fixed-origin HTTP, cancellation,
no tools/retries, usage provenance and conservative cost estimates. The SDK is
external to the CLI bundle and pinned in the lockfile; no package version changed.

The verifier fixture now excludes the unrelated CLI-only SDK from its isolated
toolchain. Its generated credentials API filenames triggered the existing private
path guard when the fixture copied the entire workspace dependency tree. Production
privacy/closure rules are unchanged. The initially selected newest SDK failed pnpm's
publication-age policy; it was replaced by 7.28.0 without retaining an exception.

Validation uses existing temporary Node 24.21.0, not the Node 22 system default.
Targeted fake transport and real verifier qualification, build/typecheck/lint results
are recorded after execution below. No live provider call or paid smoke was made.
Next G work: executor-owned durable call reservations, context-request handling and
reviewed managed run CLI. Live provider qualification still needs separate approval.

First-slice validation: **15 fake SDK transport tests** and **442 core tests**
passed. Full workspace build, typecheck and lint passed on Node 24.21.0. The
frozen-lockfile install passes pnpm supply-chain policies with lifecycle scripts
disabled; license review found no unreviewed licenses. The real verifier fixture
rerun remains in progress at this slice's commit; its result must be recorded before
G completion. The first broad CLI run failed four fixture cases because it copied
the unrelated SDK; that failure is preserved here and the fixture correction is
under validation. Documentation formatting and whitespace checks passed.

## Milestone G, second slice — durable managed coding run

Continued from `16ea4ce`. Added executor-owned pre-dispatch call reservations,
bounded context expansion, fresh proposal identity/preimage guards, usage
aggregation, cancellation and conservative interruption handling. Unknown/pending
usage stops without replay or refund. The serial phase orchestrator uses fixed
filtered-environment Git baseline probes, then existing scoped application and
fresh trusted task/final-phase acceptance. Leased run creation rechecks the reviewed
complete snapshot hash. No model/config command reaches the process port.

Added `task run` with an exact dry-run summary approval and explicit usage allowance,
a separate strict host check manifest, preinstalled single-package profile checks,
fixed strong model and explicit native effort. The dry-run performs read-only review
without credential access, provider factory, subprocess, prompt, lock or state.
Independent task/phase review is requested live; persisted/model claims cannot
approve acceptance. H's routing, escalation and repair remain unimplemented.

The first slice's real-tool qualification rerun passed **20 tests across 2 files**,
including six real verifier cases; this resolves its pending fixture check. For the
second slice, **56 targeted CLI tests across 5 files** and **442 core tests across
53 files** passed before the final leased-baseline guard. Final guard validation and
workspace build/typecheck/lint are recorded below. No paid/live provider call,
system install, target dependency installation, package version bump, website source
change, merge or publication occurred.

G remains **incomplete**: managed decomposition integration and the separately
authorized real provider smoke are next. Account access, actual effective model/effort,
usage and real task completion remain unqualified. The next milestone after G is H;
do not start it while these G gates are open.

Final second-slice checks passed on Node 24.21.0: workspace build/typecheck/lint,
**10 managed run tests** including the leased-baseline race guard, and the preceding
**56-test affected CLI suite**. The new guard test initially used a nonexistent
fixture cleanup method, caught by both targeted test and typecheck; corrected and
rerun successfully. Git whitespace checks passed. Commit this slice before the
managed compilation extension.
