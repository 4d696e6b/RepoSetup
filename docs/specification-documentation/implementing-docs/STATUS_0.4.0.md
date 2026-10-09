# RepoSetup 0.4.0 implementation status

Last updated: 2026-10-10.

## Current position

**Milestones A–H are complete for the reviewed local/offline implementation scope.** Core
schemas/compiler/context, portable compile/next/status, trusted checks, scoped text
application, private durable state and interruption reconciliation are implemented.
Actual tool/state qualification is macOS arm64 on Node 24.21.0; Linux/packed gates
remain I/J. E/F application/acceptance APIs now support G's reviewed managed CLI;
D handoff commands stay advisory.
Milestone G is complete for offline implementation following the owner's
2026-10-07 request to finish without API access. Provider transport, managed coding
and decomposition are implemented. G's original separately authorized live provider
condition is transferred to I and required before J's managed candidate qualification;
it remains unrun and unconfirmed. The joined no-key test demonstrates compilation,
an actual bug fix, real qualified checks and durable final-phase acceptance through
the managed CLI and real Git with simulated HTTP. See the [roadmap](./ROADMAP_0.4.0.md).
H is complete for the reviewed offline implementation: trusted dated catalogs,
explainable model/effort selection, retained reservations, bounded failure-specific
repair, dependency/evidence invalidation and explicit CLI opt-ins are implemented
and tested. Production capability profiles remain unconfirmed; live routing fails
closed until I/J qualification. Milestone I is now in progress (qualification/evaluation). Historical records below retain
the original G gate; the final scope amendment supersedes that gate assignment.

I now has five frozen independently discriminating fixtures, a complete 75-slot
failure-path diagnostic, vetted G/E success and context/repair joins with privately
retained terminal observations, and extracted packed task/legacy dry-run coverage.
These establish local boundaries and accounting, not model quality or savings.
The required qualified comparative trials, production model/effort evidence,
separately authorized live smoke and remaining installed/Linux qualification stay
open. Per owner steering, unavailable prerequisites are skipped as unverified.
J remains unstarted.

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
- [x] G — Single managed provider adapter, complete for offline implementation and no-key integration; live qualification transferred to I/J by the owner.
- [x] H — Model/effort routing and targeted escalation, complete for the reviewed offline scope.
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

## F completion handoff (historical)

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

## Milestone G, third slice — managed decomposition and inclusive allowance

Continued after committing the managed coding slice as `cc0881e`. Added read-only
bounded decomposition context, exact phase/requirement selection, current write
preimages, full applicable rules and permitted inventory metadata. Subtree body
expansion is explicit, and required rules outside authority fail closed. The executor
performs one structured draft call under the existing private project lease, with
fresh context/complete-baseline guards and durable intent before dispatch. The draft
still passes independent coverage, DAG, check and ownership validation.

Private version 1 compilation checkpoints use CAS revisions and content checksums.
One allowance slot belongs to the independently reviewed phase; changing effort,
timeout or limits cannot retry a failed/unknown call. A completed matching result is
reused without dispatch. Private state records validated public plans and sanitized
usage/configuration/hashes, never raw prompts/responses or credentials. Managed
receipts carry `managedCompilationId` into `task run`; private authority rejects
stripped existing phase identities. Compilation calls/tokens/cost/duration and host
startup consume the phase allowance before coding. Pending dispatch counters are
unknown with reservations already retained, rather than showing a stale known total.

Added actual `task compile --managed`, exact dry-run summary approval and explicit
usage allowance, preserving portable compilation and both binary aliases. Updated
architecture/CLI/security/contracts/support/current-position documentation and the
[finite live smoke protocol](./TASK_PROVIDER_SMOKE_0.4.0.md). No H routing, repair or
escalation, I benchmark, package bump, system/target dependency install, website source
change, merge or publication occurred. **No paid/live provider call was made.**

Validation caught and corrected a strict inventory scope shape, exact-optional
TypeScript annotation, synthetic preference shape and fake wire-format assertion.
The broad workspace run then had one real-tool fixture timeout at 180 seconds while
a second heavy qualification job overlapped: **239 other CLI tests** passed, as did
core **446**, registry **15**, integrations **126** and the inherited website **14**.
The overlapping targeted real-tool run had the same timeout; its **17 other tests**
passed, including the actual SDK/fake HTTP through real pinned verification tools.
These failing runs are not passing qualification. An isolated sequential rerun is
in progress; its final result will be recorded in the validation follow-up.

Current G acceptance: SDK boundary, structured decomposition/context/proposals,
credential/cancellation/budget/failure handling and reviewed run CLI are implemented.
G remains **incomplete** until separately authorized live account/schema/usage and
real task/final-phase acceptance pass. The proposed smoke is one isolated addition
fixture, fixed gpt-6.1-sol/low, at most two calls and $1 estimated allowance; no retry
or extra failure probes. H is next only after G's gate closes. Linux/packed/benchmark
and release remain I/J. Continue in the same worktree and commit each reviewed slice.

Final third-slice focused validation passed on Node **24.21.0** / pnpm **12.5.1**:
workspace build/typecheck/lint and **68 affected CLI tests across 6 files**, including
ledger replay/cancellation, changed options, stripped receipt, inclusive reservation,
exhausted startup, real SDK fake responses, portable compatibility and F lifecycle.
The latest core suite passed **446 tests across 54 files** before the final startup
guard; that guard is covered by the final CLI suite. Documentation formatting,
local links and whitespace passed. The full serial verifier/workspace result remains
pending at this slice's commit; G is not marked complete.

### G final offline validation follow-up

The third implementation slice is committed as **`4ecddd4`**; the coding slice is
**`cc0881e`**, following transport **`16ea4ce`**. The isolated workspace rerun passed
**844 tests across 107 files**: core **446/54**, registry **15/4**, integrations
**126/18**, CLI **243/29**, inherited website **14/2**. All seven concrete verifier
fixture cases passed, including the real SDK with fake HTTP through executor-owned
text replacement and actual pinned TypeScript/ESLint/Vitest task acceptance. The
180-second timeout from the overlapping runs did not recur; serial CLI validation
completed in 460.51 seconds. Inherited tar locale warnings remain non-failing.

The full rerun started before the final host-startup budget guard refinement. Final
source validation after that refinement passed workspace build/typecheck/lint and
**68 affected CLI tests across 6 files**, including exhausted startup before
acquisition/dispatch. All validation uses the existing temporary **Node 24.21.0**;
default Node **22.12.0** is unchanged and unsupported. No system install or paid call.
Changed-document formatting, **92 local links across 11 documents**, and Git
whitespace checks passed before the implementation commit; this documentation-only
follow-up is formatted and whitespace-checked separately. No failing offline check
remains for the implemented local scope.

**G is still not complete.** Actual provider account/model access, strict-schema
acceptance, reported effective configuration/usage and real task/final-phase
completion need the separately authorized smoke. Its concrete fixture, independent
criteria and finite two-call/$1 estimated allowance are documented in
[the smoke protocol](./TASK_PROVIDER_SMOKE_0.4.0.md). The owner's no-paid-call boundary
remains in force. H is the next milestone only after this gate closes; no H or later
implementation has started. All implementation changes are committed; record this
validation follow-up as its own commit and preserve the clean worktree.

### G continuation prerequisite check

On the owner's next continuation, Git was clean on the expected branch and the
remaining smoke protocol/status were reread. Runtime availability is unchanged:
default Node **22.12.0**, existing temporary Node **24.21.0** available. A presence-only
check found **`OPENAI_API_KEY` is not set in this execution session**; no credential
value was read or printed. The desktop sign-in does not establish that this CLI
session has an API credential or provider allowance.

All authorized local G implementation is already committed and qualified above.
The next executable gate needs both a transient API key in the terminal/process
environment and explicit owner authorization for the documented two-call/$1
estimated smoke. The latest general continuation does not explicitly override the
original no-paid-provider-call instruction. No live request, installation, project
fixture mutation or H implementation occurred during this prerequisite check.
Keep G open until the real gate passes; do not manufacture provider evidence or
advance its completion checkbox because the API test cannot currently run.

Continuation validation on Node 24.21.0: workspace typecheck and lint, explicit
changed-document formatting and Git whitespace passed. No runtime source changed;
feature tests/build were not repeated for this documentation-only prerequisite
record. Existing offline qualification above remains the implementation evidence.

### G no-key integration qualification

At the owner's request, extended the existing concrete verifier fixture with a
deliberate subtraction bug and frozen positive/negative/zero addition oracles.
Distinct task/phase criterion bindings and immutable tool/test definitions are
established before decomposition. The joined test first observes a real unit-check
failure with passing typecheck/lint and no acceptance review. Two simulated HTTP
responses then exercise the actual installed SDK, strict compilation, executor-owned
replacement, inclusive compilation/coding allowance and private run state.

Real pinned TypeScript/ESLint/Vitest processes run for the broken baseline, task
acceptance, fresh task re-verification and final-phase acceptance: **12 processes**.
After the fix, the final unit check reports **3 executed tests**. The independent
test reviewer checks current source, frozen oracle bytes, exact revision and distinct
criteria at all three acceptance requests. The saved checkpoint equals the returned
`succeeded` run, contains both call reservations and the compilation identity, and
contains no sentinel credential. Verifier scratch is cleaned up. Default `fetch`
is forbidden and asserted unused; no real key, network request or credits are needed.
The [smoke protocol](./TASK_PROVIDER_SMOKE_0.4.0.md#testing-without-an-api-key) now
documents the runnable no-key command and its limits.

Validation uses the existing temporary **Node 24.21.0** / pnpm **12.5.1**. Default
Node **22.12.0** was checked first and remains unsupported and unchanged. The joined
test passed in **340.78 seconds**; **77 offline tests across 6 CLI files** also passed
(SDK boundary, compilation ledger, managed/portable commands, durable lifecycle and
report parsing). The shared fixture's original managed-SDK mode passed separately
in **105.43 seconds**. That is **79 passing selected tests across 7 files** over the
three runs, not a repeat of every concrete fixture case. Workspace build/typecheck/lint,
final changed-document formatting and Git whitespace passed. The full workspace
suite is not repeated for this test/documentation-only change; its prior result
remains recorded above.

Initial validation found a recursive test callback return-type inference error and
an incorrect assertion using `outcome` instead of check `status` and expecting a
count on nonzero exit. Both test issues were corrected. The existing verifier
intentionally leaves that failure's count unset; no runtime behavior was changed
to make the assertion pass. The final joined test and typecheck pass.

**G remains open.** HTTP responses, requested/effective model configuration, request
IDs and usage are simulated; Git baseline probes are simulated too. The successful
local integration test establishes neither actual model capability nor remote
schema/account/usage/billing or CLI/Git smoke qualification. Live evidence remains
the unresolved G acceptance gate under the original no-paid-call boundary. H is
next only after that gate closes; no H or later implementation, dependency/system
installation, package version bump, website source change, merge or publication
occurred. Commit this reviewed slice and preserve the clean worktree.

### G offline managed CLI and real Git follow-up

Continued from committed no-key qualification **`1dcaa7b`**. The same serial concrete
fixture now runs actual `task compile --managed` and `task run` through the parser,
bounded artifact loaders, JSON previews, exact approvals, managed receipt accounting
and independent CLI criterion prompts. Test-injected host factories compose the
production profile/state/verification adapters with the actual SDK's fake transport;
the default credential-backed host factory and a packed binary remain untested here.
Provider construction is lazy: previews, missing allowance and wrong approvals
construct no SDK, enter no host factory, invoke no process or acceptance prompt and
create no private state. The already completed compilation stays separate from run
preview/approval, with no additional dispatch.

Added a test-only Git fixture helper using preinstalled **Git 2.39.5 (Apple Git-154)**,
an empty template directory, fictional author/committer identity, disabled hooks and
signing and filtered global/system configuration. Fixed setup options were checked
against current official Git documentation, linked in the
[smoke protocol](./TASK_PROVIDER_SMOKE_0.4.0.md#testing-without-an-api-key). One local
baseline commit precedes review; the model/executor creates no Git commit. The
existing single-package metadata guard and independently pinned installed verifier
tree are used without any installation. This proves the current metadata guard,
not a dependency/lockfile consistency guarantee.

A deliberately introduced untracked file produces **`TASK_PROJECT_DRIFT`, exit 3**
from real Git probes before coding or creation of a run checkpoint. Compilation
state and the original source remain intact and no acceptance prompt occurs. The
test removes only its introduced drift, then uses the same reviewed receipt and
approval for the successful run. The executor performs **6 real Git probes** across
the rejected and accepted baselines and **12 real tool checks** across broken
baseline, task, fresh task and final phase. Both managed call reservations and the
compilation identity are retained; the public JSON run equals the saved private
checkpoint's run. Three independent native CLI review prompts inspect current source,
frozen oracle bytes, exact revision and separate criterion statements. Final checks
prove unchanged HEAD, empty staged diff, only `src/add.ts` changed, unchanged Git
inventory metadata, three final executed tests, empty verifier scratch and no SDK
network call or sentinel credential in state.

Validation on existing temporary **Node 24.21.0** / pnpm **12.5.1**: the expanded
joined fixture passed in **338.43 seconds**, and **77 offline tests across 6 CLI
files** passed. That is **78 selected passing tests across 7 files**; the other
concrete fixture cases and full workspace suite were not repeated. Workspace
typecheck/lint/build passed. Initial fixture testing correctly rejected drift but
caught an incorrect assertion expecting exit 5; it was corrected to the established
exit 3 without changing production code. Final formatting and whitespace checks
passed before this slice's commit. Default Node **22.12.0** remains unchanged
and unsupported; no system software/dependencies were installed.

**G remains open for real provider account/model/schema/configuration/usage evidence.**
All provider responses/IDs/counters in this test are simulated, and no model quality
or billing qualification is claimed. The owner's no-paid-call boundary remains in
force. H is next under the current roadmap after G's live gate; offline H sequencing
is a scope question presented to the owner, not assumed authorization or a completed
gate. No H or later implementation, package version bump, website source change,
merge, publication or paid request occurred. Commit this slice before continuing.

### G completion attempt — full current-source regression

On 2026-10-07, rechecked the actual worktree instructions and clean expected branch
at **`dce8210`**, then reread G's roadmap and live smoke gate. Default Node remains
**22.12.0**; validation used the existing temporary **Node 24.21.0** and pnpm
**12.5.1**, without installing software. A presence-only environment check again
found **`OPENAI_API_KEY` unset**; no credential value was read or printed.

Fresh full workspace `pnpm test` passed **845 tests across 107 files**: core
**446/54**, registry **15/4**, integrations **126/18**, CLI **244/29** and inherited
website **14/2**. This includes every concrete verifier case and the latest joined
no-key managed CLI/real Git qualification, rather than only the selected cases in
the previous record. The CLI suite ran serially in **796.83 seconds** with no
overlapping heavy verification job; no timeout or failing test remained. Inherited
tar locale warnings were non-failing. Workspace `pnpm typecheck` and `pnpm lint`
also passed. No runtime source changed during this completion attempt; the passing
workspace build recorded for `dce8210` remains its build evidence and was not
repeated for this documentation-only update. Final explicit document formatting,
local-link and Git whitespace checks passed before committing this record.

**G's local implementation and regression checks are finished; G's original live
acceptance condition is still unsatisfied.** Simulated SDK responses do not prove
actual account/model access, strict-schema acceptance or remote effective
configuration/usage. The owner was asked whether to close the offline implementation
scope and defer live qualification to the release gate; no such scope change was
authorized during this attempt. Keep the original G checkbox open. The live smoke
requires a transient API credential and explicit spending authorization under the
[recorded protocol](./TASK_PROVIDER_SMOKE_0.4.0.md). H is next only after G's gate
closes or the owner explicitly changes that milestone boundary. No H/later code,
paid call, dependency/system installation, package bump, website source change,
merge or publication occurred. Commit this validation record before continuing.

### G complete offline — owner-approved scope amendment

On 2026-10-07 the owner explicitly requested finishing G without API access,
following the presented option to close offline implementation and defer live
qualification to the release gate. Reinspected the clean expected branch at
**`8d18b0b`**, actual instructions and current CLI source: managed previews still
report `liveQualification: "unconfirmed"`, and real provider construction still
requires an environment credential. No runtime behavior was changed.

Reconciled the roadmap, smoke protocol, provider research, support profile, product,
architecture, CLI specification and documentation index. G now closes the completed
local SDK/compilation/coding/CLI/Git/tool/state implementation. Its original live
provider/profile smoke condition is explicitly transferred to I and remains required
before J's managed candidate qualification. The condition was deferred, not passed
or waived. Earlier incomplete-G records remain historical evidence of the former
gate; this owner-approved amendment supersedes their milestone assignment.

Acceptance evidence remains the **845 passing tests across 107 files** recorded in
`8d18b0b` for unchanged runtime source, including all **244 CLI tests** and the joined
no-key actual bug fix with real Git, frozen independent oracles, qualified tool
checks and durable final-phase acceptance. SDK responses/configuration/IDs/usage
remain simulated; this establishes local integration, not remote schema/account,
model quality, billing or effective-configuration qualification. No real key or paid
call is needed to close this amended G scope. Real managed requests still need
credentials and explicit provider usage allowance.

**Next milestone: H — model/effort routing and targeted escalation.** H is not
implemented in this amendment. Its qualified capability/catalog work and I's live
smoke, frozen benchmark/platform/packed evidence and J's candidate/release gates
remain open. No provider spending, feature code, dependency/system installation,
package/version bump, website source change, branch merge or publication is
authorized or performed by this documentation-only completion.

Completion validation: checked default Node **22.12.0** first, then used the existing
temporary **Node 24.21.0** / pnpm **12.5.1**. Workspace `pnpm typecheck` and `pnpm lint`
passed; explicit Prettier checks, **88 local link targets across 9 changed Markdown
documents** and Git whitespace checks passed. Only specification Markdown changed.
The just-recorded full suite and prior build remain evidence for unchanged runtime
source; feature tests/build were not repeated for this documentation-only amendment.
No validation failure remains for G's amended offline scope. Commit this completed
scope record before any later implementation.

## Milestone H — routing foundation

Started from clean **`e67cd09`** on the expected worktree/branch. Reinspected current
core lifecycle, context, provider reservation, application, acceptance and recovery
code and the concrete managed CLI/SDK ports. Default Node **22.12.0** remains
unsupported; validation uses the existing temporary **Node 24.21.0** / pnpm **12.5.1**.

Added strict version 1 trusted-host model catalogs with canonical identities, dated
validity, native effort/output policies, price revision and explicit qualification
scope/evidence. Pure routing independently filters capabilities, native effort,
context/output capacities, availability, qualification and remaining finite
reservations. Equal-cost eligible choices retain stable catalog order. Requested
configuration never becomes effective evidence by inference. The first focused
repair preserves its configuration; two implementation failures may independently
raise capability or the same model's reviewed native effort. No router effects occur.

The CLI's dated Luna/Sol/Astra transport mappings were refreshed from official
documentation using the OpenAI Docs skill; see the [research record](./TASK_PROVIDER_RESEARCH_0.4.0.md).
Actual pinned SDK request preparation is checked offline for every mapped effort.
These production profiles remain **unconfirmed for capability routing**. Synthetic
offline-qualified test catalogs cannot authorize live routing; live capability
evidence stays an I/J qualification requirement. This slice does not add a command
or alter G's explicit fixed-model behavior. H remains incomplete until routing,
classified repair, durable evidence and dependent invalidation are wired and tested.

Initial targeted validation passed **55 core tests across 3 files**. The first
workspace build caught a callback narrowing error in the capability filter;
it was corrected before final validation. Final results are recorded below after
execution. No API call, secret, paid usage, installation, version bump, website
source change, merge or publication is introduced.

Final foundation validation: **55 core tests across 3 files** and **17 CLI tests
across 2 files** passed (**72 selected tests / 5 files**). Workspace build,
typecheck and lint passed on Node 24.21.0 after the narrowing fix. Explicit changed
document formatting and Git whitespace checks passed before committing this slice.
The inherited website build produced no tracked changes. Full workspace tests and
joined repair execution are reserved for the completed H wiring; this slice's
tests do not claim live model capability or H completion.

### H focused repair executor slice — 2026-10-07

Implemented failure classification, bounded failure metadata, current owned-write
preimages, transitive acceptance invalidation and a serial task-local repair loop.
Failed edits and call reservations remain retained. Only fresh executor failure
receipts authorize automatic repair; imported failure claims require fresh checks.
Implementation failures can retry up to the reviewed maximum (never above three).
Known model truncation can increase output within the reviewed ceiling; verifier
truncation, policy violations, drift and infrastructure failures cannot trigger
implementation repair. Typed executor stop transitions retain terminal state when
allowance or output headroom is exhausted. Existing fixed-run behavior remains the
default; CLI opt-in and routed dispatcher wiring are the next H slice.

Validation on existing Node 24.21.0/pnpm 12.5.1: 62 selected core tests across five
files and 35 selected CLI tests across three files passed, including actual scoped
filesystem repair, retained edits, forged failure rejection, dependency blocking,
and the terminal third failure. Workspace build, typecheck and lint passed. An
initial declaration-generation optional-field mismatch was fixed. Four initial
CLI failures exposed default skipped checks masking the actual implementation
failure; classification now excludes unexecuted blocked checks, with a regression
test. No real credentials, live provider calls, dependency installation or later
milestone implementation. H remains in progress pending CLI/routing wiring and
joined acceptance coverage; production model capability qualification stays
unconfirmed and remains an I/J release gate.

### H routed dispatcher and CLI validation — 2026-10-07 (in progress)

Wired trusted routing into leased attempt creation, durable catalog/preferences/
policy identity and per-attempt decisions. Exact SDK preparation rechecks capacity
and conservative price revision before reservation/dispatch; reported mismatches
or unknown routed configuration cannot authorize application. Context expansion
keeps the chosen configuration and updates the decision's context identity. CLI
`--routing` and `--repair` are independent opt-ins bound to the exact dry-run review;
existing fixed-run behavior remains available. Production catalog qualifications
remain unconfirmed; real routing fails before provider construction. Trusted test
injection is explicitly offline and cannot authorize live selection.

Selected validation so far: 19 CLI managed run/repair tests across two files and 41
core routing/checkpoint/context tests across three files passed. An additional owned
input rebasing guard test passed (19 context tests). The actual SDK/offline transport
suite exercises third-attempt capability escalation, output-only increase, retained
allowance, non-repairable failures and live rejection of offline qualifications.
Extended the joined real Git/tool fixture with a failed scoped edit, reviewed repair
and fresh frozen task/final-phase acceptance. Its result is pending the serial full
workspace run. Initial test fixture errors (missing no-change rationale, unintended
consumer truncation and mismatched plan identity) were corrected. A mechanical
parenthesis edit caused one initial core build error and was fixed. Workspace build
and lint passed; running typecheck concurrently with a cleaning build briefly lost
integration declaration files. Repeating typecheck after the completed build passed.

Source review tightened incomplete-response configuration checks so a mismatched or
unknown routed response cannot authorize a truncation retry. This last guard and its
two regressions will be built/tested after the ongoing full suite to avoid replacing
distribution files under running verification. Full-suite evidence therefore covers
the preceding built runtime; final guard validation will be recorded separately.
No real key, live provider call, system/dependency installation, website source or
version changes, I/J feature code, merge, push or publication. H is not yet marked
complete. Next milestone after offline H acceptance is I (qualification/evaluation).

Additional review before final validation: routed requests independently recompute
selection from the trusted host authority and current remaining allowance before
SDK preparation, rather than trusting a rehashed stored capacity/configuration
claim. Added a regression that changes a stored capacity and recomputes its hashes;
integrity validation alone succeeds, but dispatch must reject it with zero calls.
Final typecheck passed for the source additions while the heavy suite runs. The
final rebuilt provider/managed/repair tests remain required before committing.

### H offline completion and final validation — 2026-10-07

**Milestone H is complete for offline implementation.** All four H implementation
conditions are satisfied: dated host catalogs/explainable independent filtering;
finite retained reservation and requested/effective provenance; failure-specific
context with at most three attempts; transitive dependency/evidence invalidation.
The production catalog's capability qualifications remain **unconfirmed**. Actual
live capability/feature evidence and provider/account/schema qualification are
mandatory I/J gates, not satisfied by fake SDK responses or this completion.

Validation used existing Node **24.21.0** / pnpm **12.5.1** (default Node 22.12.0
was checked and remains unsupported). The full workspace suite passed **896 tests
across 112 files**: core 483/56, registry 15/4, integrations 126/18, CLI 258/32,
and existing website regressions 14/2. The CLI suite took 907.04 seconds. It includes
the joined real Git/pinned TypeScript/ESLint/Vitest fixture: an applied incorrect
edit fails frozen tests, a current-preimage repair fixes it, then fresh task and
final-phase acceptance pass. Three simulated SDK calls (compilation plus two coding
attempts), all three reservations and 90 reported synthetic tokens are retained;
21 executor process observations include 15 tool checks and six actual Git probes.
Provider replies/configuration/usage are simulated, and no billing/model-quality
or savings claim is made. Existing tar locale warnings did not fail the regression.

After the full run, rebuilt the workspace and ran **75 selected CLI tests across
seven files** against the final core, including three new guard cases for incomplete
configuration and rehashed capacity claims. All passed. Final core routing,
checkpoint and context checks passed **42 tests across three files**, including
accurate repair-policy rejection reasons and immutable/model-request hash guards.
Synthetic runtime qualification dates are generated for the fixture's execution
window; they are never live provider evidence. The full suite preceded the last
selection/configuration guards; these last changes received the rebuilt targeted
coverage rather than repeating the expensive unrelated qualification fixtures.
Final workspace build, typecheck and lint passed. Explicit changed-document
formatting, **72 local documentation link targets**, and Git whitespace checks
passed. No validation failure remains in the reviewed H implementation scope.

No API key or live/paid provider call was used. Local draft/context/handoff/check
functionality continues to require no AI credits. A real managed request still
requires a provider credential and explicit usage allowance; there is no RepoSetup
payment system or new payment feature. No dependency/system installation, package
version bump, website source change, I/J implementation, branch merge, push or
publication occurred. Failed edits and unknown calls remain retained for review.

**Next milestone: I — qualification and routing evaluation.** Remaining blockers
are dated live capability/profile and provider smoke evidence, representative frozen
fixtures/holdouts and inclusive treatment comparisons, Linux/packed/legacy gates,
and J candidate/release qualification. These are open and require their own scope
and provider allowance; H completion does not authorize spending or a supported
managed release. Commit this completed H slice before continuing.

## Milestone I — frozen fixtures and local oracle discrimination (2026-10-07)

Implemented the five normative fixture seeds, references, 15 deliberate incorrect
variants and separately stored independent holdouts under `tests/tasks/fixtures`.
The UI fixture is pure view-model logic; the API fixture uses an injected local
repository. Public examples and baseline callers are read-only. Model-authored
test targets are separate. Each source manifest freezes sorted byte inventories,
requirements, write scopes, entrypoints, source/oracle/phase/lock/tool/recipe hashes,
criterion inventory and identical finite resource ceilings. The ceiling is an
accounting limit, not payment or permission to spend.

Core owns strict manifest validation and safe oracle-result contracts; test-only
infrastructure uses the existing CLI process adapter, the preinstalled TypeScript
compiler and fixed Node assertion runner. It hydrates a private temporary project,
keeps holdout sources outside that project, clears inherited credentials from
child environments, runs serially, bounds process time/output, checks input hashes
after runtime oracles and removes temporary trees. Reports contain identities and
pass/fail metadata, never source text or raw exception/holdout diagnostics. No
provider or network call, dependency installation or product command was added.

Validation passed on macOS arm64 using the existing Node 24.21.0 and pnpm
12.5.1 tooling (default Node remains 22.12.0): workspace build, workspace
typecheck, separate task-runner typecheck, workspace lint/format, changed-document
formatting and Git whitespace checks. The fixture suite passes all five cases (25 candidate evaluations): five
references pass public/baseline/holdout checks, five seeds retain baseline behavior
and fail new acceptance, and all 15 wrong variants fail type or holdout acceptance.
There are 37 runtime holdout cases and one TypeScript public-type oracle. Three
core tests cover manifest tampering, protected scope, missing coverage, changed
ceilings and executable-field rejection. Initial root-package resolution and a
rounding oracle gap were found and fixed; the latter now discriminates fractional
cent rounding instead of accepting the advertised incorrect implementation.

This establishes local fixture/oracle discrimination only. It does not establish
the full E managed TypeScript/ESLint/Vitest recipe on each fixture, treatment/model
quality, savings, production model qualification, operating-system isolation or
Linux/packed acceptance. The cross-module fixture's pure oracle does not itself
prove executor predecessor invalidation; existing H boundary tests and further I
integration evidence remain relevant. Next: inclusive three-treatment accounting
and offline packed boundary/legacy qualification. Live provider/profile smoke and
production capability/native-effort evidence remain unrun without separately
authorized API access/allowance. Milestone I stays unchecked; J is not started.
Also corrected H's stale checklist entry to match its existing final acceptance
record; this is bookkeeping, not new H qualification.

## Milestone I — inclusive report accounting foundation (2026-10-07)

Added pure core campaign validation/report reduction and a working developer
report command for retained campaign JSON. Strict records bind fixture/support/
runner/catalog/policy/pricing identities, ordered paired trial slots, finite equal
authority/ceilings, strong capability plus independent native effort, requests,
attempt/final evidence hashes and independent acceptance metadata. Reports retain
failures/setup blockers/missing trials, all compilation/context/repair/verification
overhead in inclusive measured wall time, shared analytical versus actual cash
accounting, unknown usage/cost, separate local estimates and undefined zero-success
denominators. No source text, raw private logs, credentials or executable recipes
are admitted. Offline/synthetic campaigns cannot qualify live comparisons.

Validation passed on Node 24.21.0/macOS arm64: workspace build/typecheck/lint,
separate task-runner typecheck, changed-document formatting and Git whitespace
checks. Six offline e2e cases across two files pass, including the report command;
16 core boundary/accounting tests across two files pass. Thirteen accounting tests
cover a synthetic 75-slot matrix, shared compile charging, failed
compilation, failed repairs, paired setup blockers, missing records, unknown usage,
subset accounting and rejection of mismatched plan/authority/order/request IDs,
missing holdouts, zero tests, forbidden effects and command fields. These are
contract tests, not 75 real model trials. The developer tool's separate no-key
process test checks incomplete output and safe duplicate/executable-input errors.

Still open: a complete trial orchestration adapter joining real retained E–H
evidence, full fixture managed-recipe qualification, packed/platform/legacy
checks, live capability/native-effort qualification and authorized provider smoke.
The report reducer validates metadata but cannot authenticate an evaluator/provider
artifact; genuine qualification requires independently retained execution evidence.
No model calls or cost/savings claim occurred. Milestone I remains in progress.

## Milestone I — offline extracted artifact and compatibility slice (2026-10-07–08)

Added serial packed-contract tests that pack the existing unchanged CLI version,
identify its bytes, extract it and hydrate dependencies from the already installed
frozen workspace. No npm/project dependency installation or lifecycle script is
run. Both `rsetup` and `reposetup` manifest bin targets execute through Node with an
empty project-tools PATH and no inherited credentials. This is extracted artifact
contract evidence, not npm installation or native shell alias qualification.

The security fixture exercises local compile, advisory next/status, their zero
effect previews, managed decomposition preview, missing allowance/key rejection
and executable/broader/traversal draft rejection. Public README instructions stay
inert and the denied synthetic marker never appears in output. Hash inventories
prove project preservation; the private state directory stays empty. Preset,
stack-config, selection-token and selection-file create dry-runs retain existing
JSON plan behavior and preserve files. Real installations remain outside this
no-install slice. The suite emits bounded artifact/source/lock/host metadata with
qualification explicitly false, including dirty-source disclosure.

Validation: 499 core tests across 58 files and 155 selected CLI tests across 12
files pass on Node 24.21.0/macOS arm64. The CLI selection covers portable/managed
commands, provider/catalog/repair boundaries, selection, preview, intended doctor,
curated repair, existing CLI behavior and concrete process adapters. The combined serial e2e run passes 10 cases across three files; workspace
typecheck/lint, separate task-runner typecheck, changed-document formatting and
Git whitespace checks pass. Build passed in the preceding accounting slice; this
slice changes only tests/docs. Initial test assumptions
about optional process-result flags, handoff envelope fields, selection fixture ID
and managed preview/state prerequisites were corrected against current source;
no product behavior was changed to make those tests pass.

The inspected artifact payload hash was
`sha256:095fa1ccba94a9437cfd7c2bce909f6ae48bf679d76086721a8043d96b5c972c`;
pre-commit test metadata identified source `dab365e` with dirty test-source
disclosure, inherited package `0.3.0-alpha.1`, Node 24.21.0 and the frozen workspace
lock. This is local development evidence, not candidate/release acceptance.

Remaining I work: full managed verifier qualification for the five fixtures, a
real retained-evidence trial orchestration/campaign, npm-installed artifact and
full legacy installation journeys, Linux x64/native shell/platform evidence,
production capability/native-effort qualification and separately authorized live
provider/profile smoke. None is waived or inferred from mocks/extracted tests.
Milestone I remains in progress; the next milestone is J after I's required gates.
No API key, paid call, system installation, rollback, package version change,
website source change, merge, push or publication occurred.

## Milestone I — ordinary CI coverage wiring (2026-10-08)

Connected the standalone task infrastructure typecheck and serial fixture/report/
extracted-pack suite to existing fast CI and existing Linux/macOS platform jobs.
No provider secrets, new jobs, extra workers or live campaign are configured.
Windows continues its existing installer/portable qualification; this POSIX managed
fixture suite is not advertised there. Existing action/dependency bootstrap steps
are reused without running them locally or dispatching remote workflows.

Reviewed current official
[GitHub runner labels](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
[setup-node inputs](https://github.com/actions/setup-node) and
[pnpm setup behavior](https://github.com/pnpm/action-setup). The existing
`ubuntu-24.04` x64 and `macos-15` arm64 matrix matches the advertised support targets;
workflow/action/server execution is still untested here. The setup steps prepare
the development toolchain before the no-install trial infrastructure starts.
These added steps record ordinary offline contract behavior, not the full installed
artifact/live/platform acceptance gates.

Adjusted the task-suite command to build the packed CLI and its dependencies before
testing, so a fresh checkout can run the complete suite. Workflow YAML syntax/
format review and workspace lint passed locally; GitHub execution/action semantics
remain unverified. The standalone combined build-and-test command passed (workspace build plus
10 serial e2e cases across three files). `actionlint` is unavailable locally; no
workflow runner/action validation is claimed. Workspace lint and whitespace checks
passed after the YAML/package-script changes.
No remote CI was started and Linux remains unqualified until actual results exist.
Milestone I is open for the remaining campaign, full fixture recipe, installed/
native/platform and live evidence listed above. J remains unstarted.

## Milestone I — frozen managed-check recipe probe (2026-10-08)

Added frozen ESLint/Vitest configs and a public unit wrapper to all five fixture
seeds, plus exact reviewed public test identities. The manifest revision now
includes those files and the direct TypeScript, ESLint, typescript-eslint and Vitest
package inventories. The local evaluator runs the existing E fixed typecheck, lint
and unit recipes with a filtered process environment, parses their bounded reports,
requires the frozen unit identities and restores temporary hydration before checking
for project changes. Private holdouts stay in the separate evaluator.

Initial targeted qualification passed for all five references and their seeds:
references pass the three managed recipes and independent public/holdout assertions;
seeds pass typecheck/lint and preserve baseline tests while failing new acceptance.
The 15 previously frozen wrong variants remain independently rejected. The test
infrastructure links only the preinstalled frozen development dependencies and
installs nothing. No provider calls or trial quality/savings claims occurred.

Validation on Node 24.21.0/macOS arm64: workspace build, typecheck, task-test
typecheck and lint passed; 500 core tests across 58 files, 16 selected CLI
check-recipe/report/environment tests across three files, and 10 serial task e2e
tests across three files passed. Git whitespace checks passed. This probe does not establish E's
full transitive dependency closure, protected tool/config file definitions or
executor-owned effect audit for these five fixtures. Actual retained 75-trial
execution, installed/native/Linux evidence and live capability/provider gates
remain open. Milestone I stays in progress; J is unstarted.

## Milestone I — exact public-test campaign accounting (2026-10-08)

Extended the strict campaign envelope so every trial records bounded public test
IDs and outcomes. An accepted trial now requires exactly the frozen fixture's
`publicTestIds`, all passing; missing, duplicate, substituted or failed public
cases are rejected before aggregation. The benchmark protocol revision changes
with this contract. Synthetic reducer tests exercise missing and failed cases.
This is metadata validation, not evidence authentication or a claim that any
trial ran. Reconciled outdated protocol prose with the implemented fixture,
oracle, report and packed-test infrastructure while retaining the open gates.

Validation on Node 24.21.0/macOS arm64: 502 core tests across 58 files,
workspace build/typecheck/lint, task-test typecheck, focused report e2e and Git
whitespace checks passed. Milestone I remains in progress;
J remains unstarted. Full E verifier closure/effect qualification, retained
campaign execution, installed/native/Linux evidence and live provider/profile
qualification remain open. No API keys or paid calls were used.

## Milestone I — extracted native POSIX alias smoke (2026-10-08)

The offline packed-contract suite now checks executable mode and invokes both
declared aliases directly through their shebang, using only the current Node
runtime directory on `PATH`. Both aliases pass help and a legacy preset create
dry-run on macOS arm64 without package installation or provider access. The
extracted tarball retains preinstalled workspace dependency hydration; the test
therefore does not qualify an npm-installed package or other platforms.

Validation on Node 24.21.0/macOS arm64: the focused packed suite passed five
cases; task-test typecheck, workspace lint, all 11 serial task e2e cases across
three files and Git whitespace checks passed. Milestone I stays in progress;
J is unstarted.
The roadmap now checks only I's frozen-fixture/holdout item; treatment comparison,
full packed/platform qualification and live provider/profile gates remain open.

## Milestone I — full reference verifier integration (2026-10-08)

Added a separate serial `test:tasks:verifier` qualification using E's concrete
adapter and core executor on the five frozen references. The test-only host copies
preinstalled dependency bytes into an isolated, completely inventoried tree,
removing workspace links and the unrelated provider SDK. Reviewed runtime/tool/
config and imported public-oracle file bindings feed the existing verifier;
no alternate product execution path or dependency installation is introduced.
The reference task and final-phase checks use actual executor-issued receipts,
full immutable audits, exact public test identities and scratch/project effect
checks. Dry-run and imported-oracle/dependency-drift faults must execute nothing.
Reference review is explicitly restricted to frozen source identity; generic
candidate review, trial quality and cross-module treatment behavior remain open.

Validation on Node 24.21.0/macOS arm64: the complete seven-case qualification
passed in 973.12 seconds. All five references pass actual task and final-phase
verification, with 30 fixed tool launches in total and no project effects or
remaining scratch. Both drift faults block before any process or review call.
The reviewed copied closure contains 7,294 entries and 134,098,040 bytes;
qualification metadata discloses source `ce1c4c7` with dirty test-source status
and runner revision `sha256:4dd2d1dfaf85f748c18a5134d70a4712bc89f0f0184c91d6bc05589a3b004cf7`.
Workspace build/typecheck/lint, task-infrastructure typecheck and whitespace
checks passed. All 11 ordinary fixture/report/packed regression cases across
three files passed in 25.57 seconds, confirming the heavy suite stays separate.
A first harness scope mistake was correctly rejected by the existing compiler
and corrected in test authority; product scope rules were unchanged. The heavy
suite is excluded from ordinary fixture CI and uses a documented serial runtime
allowance. This establishes full E reference-verifier integration locally;
generic candidate review, cross-module treatment/predecessor drift, retained
trial execution/evidence, installed/native/Linux and live provider/profile gates
remain open. Milestone I stays in progress; J is unstarted. No API keys or paid
calls were used. No installation, version bump, website source change, merge,
push or publication occurred.

## Milestone I — actual-candidate evaluator prototype (2026-10-08)

Added test-only candidate projection/evaluation helpers and 14 serial acceptance
tests. The evaluator reads an actual supplied project through the existing bounded
verifier readers, preserves frozen public inputs and exact write scopes, and binds
each check to a fresh project revision. Fixed compiler/Node assertions operate on
a private copy with scrubbed environments, bounded reports and projected/emitted
effect audits. Public checks remain reusable after repair; private runtime/type
holdouts run only after an explicit terminal request irreversibly closes that
session. Detailed frozen final outcomes use a separate host recorder; final caller
feedback contains only pass/fail, revision and evidence hash.

Tests cover all five candidates with changed reference bytes, including a distinct
UI implementation; public failure/repair and stale evidence; a candidate passing
public examples but failing private criteria; protected-oracle, foreign/secret-path
and escaping-link rejection before processes; emitted effects, sanitized private
report failure and concurrent/terminal session enforcement. The new helper bytes
are included in the runner freeze and all five manifests were regenerated; only
recipe/fixture revisions changed. Earlier campaign revisions remain separate.

Validation on Node 24.21.0/macOS arm64 with pnpm 12.5.1: workspace build/typecheck,
task-test typecheck and lint passed. All 19 targeted core fixture/report tests and
25 ordinary serial task e2e tests across four files passed (combined suite 34.81
seconds). The final focused candidate suite passed all 14 tests in 9.44 seconds;
changed-document formatting and Git whitespace checks passed. The inherited root build
also built the existing website, with no tracked website source change. The
16-minute full-reference verifier suite was not repeated: E adapters, protected
tool/config definitions and fixture source/oracles are unchanged; its previous
record applies to its recorded freeze, not new trial qualification.

This prototype checks vetted local candidate behavior, not hostile-runtime
isolation/report authenticity, generic criterion review or complete managed
acceptance. Public examples alone are insufficient. Sessions/recording are not
durable or authenticated campaign evidence. Remaining I work includes joining
candidate review with E receipts, serial three-treatment orchestration and budgets,
retained terminal failures/evidence, cross-module predecessor drift, installed
artifact/real legacy install and Linux/platform qualification. Production capability
and native-effort profiles plus separately authorized live provider smoke/trials
remain unconfirmed. Milestone I stays in progress; J is the next milestone after
those gates and is unstarted. No keys, provider calls, payments, installation,
version bump, merge, push or publication occurred.

## Milestone I — cross-module dependency lifecycle (2026-10-08)

Added a test-only three-task domain → totals → presenter plan using the frozen
cross-module requirements and exact source ownership. The presenter declares both
direct predecessor artifacts. Actual compiler/context selection, filesystem/run
adapters, locks, scoped application, private durable state and reconciliation are
used. Seed domain/presenter already match the reference and explicitly record
no-change; only the hash-guarded totals replacement mutates the project. Verification
process/report/reviewer ports and baseline commit identity are simulated and cannot
establish model quality, actual tool behavior or a qualified compiled treatment.

Six serial e2e cases cover zero-port-call consumer/phase previews, dependency order
despite reversed draft tasks, consumers blocked before acceptance, exact downstream
artifact/source hashes, final receipt refresh, stale/substituted output rejection,
accepted/queued transitive invalidation and retained attempts/journals/source edits.
A fresh Vitest executor module cannot use intact durable pass flags to unlock a
consumer; fresh predecessor verification restores that authority. This is loss of
in-memory receipts, not OS process-restart qualification. The positive resulting
project separately passes the actual-candidate terminal public/private behavior
evaluator, without copying private oracles into the caller project. No fixture
definitions, manifests, product code, commands or package metadata changed.

Validation on Node 24.21.0/macOS arm64 and pnpm 12.5.1: workspace build/typecheck,
task-test typecheck and lint passed. The focused initial five-case suite passed;
the final ordinary task suite passed all 31 cases across five files in 43.10 seconds,
including the new preview case and existing evaluator/fixture/report/packed
regressions. Initial harness errors were corrected: task read authority omitted
the frozen applicable `AGENTS.md`, and a post-invalidation assertion expected a
dependency error instead of the earlier project-effect audit rejection. Product
checks were not weakened. The inherited root build included the existing website;
no tracked website source changed. The expensive reference-verifier suite was not
rerun because its source, adapters and fixture freeze are unchanged.

This closes concrete cross-fixture dependency lifecycle coverage with fake verifier
ports; full managed cross-module treatment qualification remains open. Remaining I
gates include candidate criterion review/qualified E joining, serial three-treatment
trials and full overhead/budget accounting, durable authenticated evidence,
installed/real legacy install and Linux/platform checks, production capability and
native-effort qualification, and separately authorized live provider/profile
smoke. Milestone I remains in progress. J is next after those gates and remains
unstarted. No keys, provider calls, payments, installations, version bump, merge,
push or publication occurred.

## Milestone I — core serial offline coordinator (2026-10-09)

Implemented internal `executeTaskBenchmark` in the core executor with trusted
setup/compilation/trial/retention ports. It validates a fresh offline campaign,
preflights each paired block, rotates and dispatches all 75 slots sequentially,
and shares one frozen strong compilation metadata object between fixed/routed
consumers. Actual plan replay/isolation remains the concrete driver's responsibility.
No public command, concrete provider/filesystem/process adapter, resume feature
or live mode was introduced. Exported the existing compilation schema/type for
reuse without changing campaign/fixture contracts, versions or manifest freezes.

Before dispatch, the host must acknowledge a versioned campaign-bound intent with
sequence and previous-event hash; it must also acknowledge results before the next
dispatch. Paired setup failures create three blocked records without requests;
reported compilation failure fails both compiled slots without calling them.
Valid failed execution records and unknown usage remain in inclusive report totals.
Wrong slot/compilation/check/stage metadata stops execution. Thrown outcomes retain
intent and stop incomplete without invented terminal usage or automatic retry.
Unacknowledged storage returns the known event because persistence may have
succeeded before acknowledgement failed. Cancellation reaches work ports; returned
in-flight results are retained before stopping. Same-campaign dispatch is serialized
within the module, with host leases/persistent duplicate protection still pending.

Twenty-one new core tests simulate all four host boundaries, including a full
75-slot/250-event pass, serial execution, one shared decomposition per block,
analytical/cash accounting, paired failures, unknown usage, throws, each retention
boundary, mismatched metadata, rejected live/imported inputs, cancellation and
concurrency. They are not model trials. Concrete durable storage/authentication,
actual plan/task/verifier joining, budget reservations inside work ports and
partial-journal resource accounting are still open. Known compilation requests can
exist only in an event on interruption; the partial campaign report alone must not
be presented as complete cost accounting. No quality/savings result is claimed.

Validation on Node 24.21.0/macOS arm64 with pnpm 12.5.1: final workspace build,
workspace/task-test typechecks and lint passed. All 523 core tests across 59 files
passed via `pnpm --filter @reposetup/core exec vitest run`. The earlier focused
coordinator/report run passed 35 cases before the final stage-rejection case;
the full core run includes that case. The final ordinary offline task suite passed
31 cases across five files in 36.26 seconds, including extracted packed aliases
and evaluator/dependency regressions. Changed-document formatting and staged Git
whitespace checks passed. Initial mock typing and uppercase failure-category test inputs were
corrected to match the existing contracts. No product safety checks were weakened.

The first final rebuild failed with `ENOSPC` writing registry output. A retry built
the complete workspace and passed typechecks/lint, then pnpm could not allocate its
next script lock due to another `ENOSPC`. Disk availability fluctuated around
429–647 MiB; no unrelated files were deleted. Running tests through `pnpm exec`
avoided that script-lock failure. The inherited build included the existing website
without tracked website source changes. An interrupted offline test session lost
its completion output and was rerun; no unobserved pass was assumed. The expensive
reference-verifier suite was not rerun: verifier code/configs and fixture freeze
are unchanged, and that earlier evidence retains its recorded scope/revision.

Milestone I remains in progress for concrete trial/storage drivers, pending-work
and coordinator/retention overhead accounting, candidate criterion review/qualified E joining, retained authenticated
artifacts, installed/real legacy install and Linux/platform qualification, and
production capability/native-effort plus separately authorized live provider/profile
smoke. J remains the next milestone after I's gates and is unstarted. No keys,
provider calls, payments, installations, version bump, merge, push or publication
occurred.

## Milestone I — private offline journal and interrupted request accounting (2026-10-09)

Added strict versioned event parsing and a read-only core replay auditor. It validates
campaign/hash/sequence identity and actual prepare/compile/trial ordering, slot and
shared compilation consistency, and every retained terminal trial against the existing
campaign contract. Reports include known compilation requests not yet assigned to a
terminal trial. Pending operations retain unknown usage; `dispatchAccountingComplete`
only describes terminal dispatch coverage, not complete measured costs or evidence
qualification. Hashes and schema validity do not authenticate actual execution.

Added a concrete CLI private filesystem retention adapter using the existing owned
0700 directories, exclusive 0600 regular files, no-follow/link checks, bounded reads,
fsync and identity guards. The factory and inspection are read-only. Only the core
executor invokes the mutating retention port. An exclusively allocated campaign
folder prevents a second process/store from adopting or overwriting the same run.
Changed, foreign, linked, unsafe or partial records stop further writes. Preserved
records are diagnostic evidence, never automatic retry, recovery or resume authority.

Nine new core audit cases and ten real-filesystem cases cover the complete synthetic
75-slot/250-event chain, interrupted compilation accounting, rehashed invalid ordering,
duplicate dispatch, truncation/tampering, file/root permissions, links and inventory
changes. Shared synthetic campaign construction was extracted into a test helper;
it still represents simulated requests/checks, not model trials or managed acceptance.
No campaign/fixture revision or release version changed. Concrete trial joining,
budget/authentic artifact authority, coordinator/retention timing and live/platform
qualification remain open. Milestone I remains in progress; J remains unstarted.

Validation: Node 24.21.0, pnpm 12.5.1, macOS arm64. Focused core audit/coordinator
checks passed 30 cases; private filesystem suite passed ten cases in 60.22 seconds.
Workspace and task-test typechecks and full lint passed after correcting test-only
readonly/unused import errors. Final workspace build passed; all 532 core tests across 60 files passed in five
seconds, and ordinary offline task checks passed 41 cases across six files in
95.89 seconds, including extracted packed aliases. Formatting and Git whitespace
checks passed. No keys, provider calls, dependency/system installations, release
changes, pushes or publication occurred.

## Milestone I — inclusive host timing and read-only journal reporting (2026-10-09)

The core coordinator now accepts an optional trusted monotonic clock and returns
measured elapsed, retention, paired preparation, shared compilation, trial-port and
residual coordinator durations. Compilation and retention are counted once in the
host invocation ledger; existing per-treatment analytical compilation charging stays
unchanged. Thrown work remains timed. Missing or invalid clocks produce unknown timing;
invalid observations stop subsequent dispatch. A known result is preserved if its
trailing clock observation fails. Timing is invocation-local diagnostic data and is
not durable request evidence, charged provider usage, a treatment comparison, or an
acceptance authority. Final return/report serialization lies outside that interval.
The CLI journal store supplies the concrete performance clock.

The existing developer report command also accepts `--journal <fresh offline campaign
JSON> <private state root>`. It inspects and audits retained records without allocating,
writing, recovering or executing a trial, then reports known unassigned compilation
requests and pending/unknown dispatch. Input reads are bounded, regular and no-follow/
nonblocking. The CLI adapter has a built internal module entry so Node 24 can run the
report from built JavaScript; the report script builds workspace prerequisites. Public
CLI commands, aliases, selection/config compatibility and package versions are unchanged.
Private inspection additionally rechecks folder identity, mode and inventory at the end.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: eight timing tests pass, including
clock failure before effects and after a known terminal result; focused coordinator/
audit/timing tests pass 38 cases. Both developer report cases pass. Final workspace
build, workspace/task-test typechecks and lint pass. All 540 core tests across 61 files
pass in 5.06 seconds; ordinary offline task tests pass 42 cases across six files in
94.61 seconds, including built/extracted packed aliases and private journal reporting.
The broader CLI regression suite is running separately; its pass is not assumed.

A new vetted-candidate executor/full-verifier join is being qualified separately.
It is not yet accepted: test expectations were corrected for the explicit dependency
symlink and the owned parent-directory metadata changed by atomic replacement. The
latter run reached successful fresh task/final receipts and nine real tool launches,
but failed its own later directory-metadata assertion before holdout evaluation. No
failing run is counted as completion. Milestone I remains open for actual three-treatment
trials, complete retained/authenticated artifacts, arbitrary-candidate review/isolation,
installed/legacy/platform and production model/native-effort/live qualification. Docker
read-only version inspection did not respond within two minutes and was terminated;
no Linux/container qualification or installation is claimed. J remains unstarted.

## Milestone I — vetted candidate joined to scoped execution and qualified E (2026-10-09)

The corrected `task-managed-fixture.test.ts` passed in 344.70 seconds. A fresh frozen
cross-module seed becomes the reference through the core executor's guarded
`src/totals.ts` replacement, real CLI application adapter, private lease/CAS run state,
and qualified E adapter. Dry-run validation performs zero check launches or
project/state changes. Fresh task verification, task refresh at finalization and final
phase acceptance launch nine real curated TypeScript/ESLint/Vitest processes, with three
independent reference-identity reviews. Durable task status, accepted artifact hashes,
final receipt, protected files and empty verifier scratch are checked. The owned `src`
parent's metadata legitimately changes during atomic replacement; all other protected
snapshot entries remain exact. A separate terminal evaluator then passes actual public,
compatibility and private holdout behavior without supplying private feedback to repair.

This closes one concrete executor/application/state/qualified-verifier/behavior join.
It is a vetted host-authored single-task reference case, with simulated baseline Git
identity and requested configuration, zero provider calls and no G/H managed routing
execution. It does not qualify arbitrary model output, a general criterion reviewer,
hostile JavaScript isolation, all five fixtures as managed candidates, a shared compiled
DAG replay or the full three-treatment campaign. The emitted diagnostic records source
SHA/dirty state, fixture/closure identity, host, plan, task/phase/behavior evidence IDs,
applied paths and tool count; `qualification` remains false. This run was from a dirty
implementation tree, not repeated clean-source release/platform qualification.

The case is included in the existing expensive serial verifier suite and excluded from
ordinary credential-free task CI. Workspace/task-test typechecks, lint, final build and
Git whitespace checks pass. The ordinary suite remains 42 passing cases; the final core
suite remains 540 passing cases. Earlier link/parent-metadata test assertion failures
are retained above; the final corrected run passed rather than weakening verifier or
project safety checks. The preexisting seven-case full reference suite was not repeated:
its underlying verifier/configuration/fixture freeze remains unchanged. The broader CLI
regression result will be recorded after completion.

Milestone I is still **in progress** under its documented acceptance conditions.
Remaining work is the actual frozen three-treatment driver/campaign and inclusive
retained execution artifacts, generic independent candidate review/isolation and complete
resource evidence; installed/real legacy and Linux/platform qualification; dated production
capability/native-effort evidence and separately authorized live provider/profile smoke.
Offline simulations and the new local join cannot satisfy those live/platform gates.
The next milestone is J only after I's gates; J remains unstarted. No API keys, live
provider calls, paid usage, dependency/system installation, package version change,
merge, push or publication occurred.

## Milestone I — frozen logical decomposition and fresh physical bindings (2026-10-09)

Added pure version 1 benchmark decomposition/binding contracts and freeze/replay/
validation helpers in core, reusing `validateTaskPlan`, `compileTaskPlan`, reviewed
phase/policy schemas, canonical hashing and privacy screening. Copying a source
TaskPlan into another checkout is invalid: its root, baseline inventory and qualified
check catalog are physical bindings. The new helper retains the validated source plan
and policy, freezes an identical logical phase/task graph/criteria/coverage/scope/profile
and host-frozen logical verifier revision, then recompiles that exact draft against a
fresh independent review. Actual root-bound plan IDs differ; the decomposition identity
stays equal. The source is never rewritten and no model is called again.

Strict decomposition and binding records distinguish full record/binding hashes from
logical identity. Reconstructed bindings must match their fresh review. Changed phase,
requirements, authority (including narrowing), profile/path rules, required checks or
logical runtime/tool/config/oracle identity reject replay. Physical check-catalog binding
may change only alongside unchanged logical policy/verifier identity. The benchmark's
six-task limit, bounded document bytes and secret screening apply to the new artifact.
These hashes are diagnostic integrity, not authenticated host/model evidence, provider
usage, acceptance, or automatic imported-plan execution authority. The host must actually
qualify the logical verifier identity and fresh baseline before executor use.

Clarified the benchmark's “exact shared plan” requirement as identical frozen decomposition
contents with separately validated physical bindings. Existing task/config/selection and
campaign contracts, protocol/fixture freezes and package versions are unchanged. The
source compilation remains charged to both analytical treatments and once to cash;
local revalidation belongs in each trial's measured overhead. The helper is not yet
wired to the three-treatment driver or G's root-bound durable compilation allowance.
That join must retain both source/decomposition and derived plan identities plus actual
usage; parsed artifacts must never grant imported acceptance or reset budgets.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: all 22 new replay/privacy/size
cases pass within the final **562 passing core tests across 62 files** (4.58 seconds).
Final workspace build, workspace/task-test typechecks and lint pass. The rebuilt packed
artifact passed its five extracted Node/native POSIX alias/dry-run cases in 3.44 seconds;
formatting and Git whitespace checks pass. Separately, the complete preexisting
CLI suite passed **261 tests across 32 files in 1009.92 seconds**, including the real
managed compile/repair/routing/Git/tool integration with simulated HTTP responses. There
were no live provider calls. The previously recorded 344.70-second vetted-fixture join
and 42 ordinary offline task cases remain passing evidence within their recorded scope.

Milestone I stays in progress: the remaining actual campaign/budget/artifact join,
general independent candidate review/isolation and live/platform qualification cannot
be replaced by schema integrity or synthetic model results. J stays unstarted. The
source/qualified verifier/config/fixture recipe is unchanged by this pure replay module;
no expensive verifier rerun is justified solely by the new unused benchmark helper.


## Milestone I — authenticated compilation charges for fresh trial roots (2026-10-09)

Implemented `executeTaskBenchmarkReplay` in core's executor. A newly dispatched,
durably completed, successfully released compilation issues process-local receipt
identity. Parsed/cloned checkpoints, read-only cached source results, unsuccessful
calls and replay receipts cannot seed a pair. Each original receipt can bind only one
fixed and one routed treatment, with two distinct fresh physical roots and independent
reviews. Pure decomposition replay still validates unchanged logical scope/graph/checks.

The executor checks the actual fresh baseline under its project lease, retains a private
pending intent using the existing compilation CAS adapter, rechecks the baseline, then
seals the completed charge. Both consumers retain the full original reservation and usage,
plus measured local replay duration. Source request/context hashes explicitly describe
the original request; versioned `benchmarkReplay` provenance records the source checkpoint,
plan/root/call identity, logical decomposition, physical binding and treatment. The same
source usage appears in both analytical charges; this is one original provider call for
cash accounting. The metadata is diagnostic, not imported execution or acceptance authority.

Existing TaskRun creation now carries replay provenance and consumes its charge through
G's ordinary private compilation allowance. Omission is blocked; an exhausted remaining
call allowance prevents coding dispatch. A replay slot cannot become a new decomposition
request. Interrupted or absent attempted saves stay review-owned and are never reset or
automatically completed. Dry-run validates data without invoking adapter ports. No new
CLI commands, configuration fields, model tools, package versions or provider calls were
introduced. Cached source reads deliberately cannot restart a benchmark after process loss.

Validation: Node 24.21.0/macOS arm64/pnpm 12.5.1. All **13 new real private-filesystem
cases** pass, within **49 passing targeted CLI tests across four files** (8.35 seconds),
covering existing managed compilation, TaskRun and repair. All **562 core tests across
62 files** pass (7.18 seconds). Workspace build, final workspace typecheck, task-test
typecheck and lint pass. The first targeted test used a malformed host request and was
corrected; an initial concurrent build/typecheck encountered transient missing generated
core declarations, so workspace typecheck was rerun after build and passed. No checks
remain failing. The qualified fixture tools/recipes are unchanged; this small executor
bridge has not rerun or replaced the prior qualified-tool integration evidence.

Milestone I remains **in progress**. The full driver/evidence/accounting join, general
independent candidate review and hostile-code isolation, 75 actual comparative trials,
live provider/model qualification and Linux/platform evidence remain open. A host must
include source compilation final persistence/release and other overhead in its inclusive
campaign measurement; this ledger's duration stops before its own final persistence tail.
The next implementation is extraction of actual failed/uncertain run evidence without
inventing missing measurements or promoting imported pass records. J remains unstarted.

## Milestone I — actual request footprints and private run evidence (2026-10-09)

Added version 1 request footprints to compilation and coding intents before dispatch:
the exact input document hash/UTF-8 bytes, prepared payload bytes and prepared pricing
catalogue revision. No input/payload bodies or secrets are retained. These are byte
measurements, not measured token usage or charged cost. Coding input includes identity,
task/requirements, materialized context and any repair metadata; payload size additionally
includes the concrete adapter's transport/schema/instruction framing. Existing reservation
token bounds and usage provenance keep their original meanings. Footprints are optional
for compatibility with existing private checkpoints; absent older measurements stay absent.
Fresh-root replay carries the source footprint, explicitly describing the original call.

Added pure `collectTaskBenchmarkRunEvidence` and bounded strict version 1 evidence records,
with integrity/privacy validation. They retain private resource limits/reservations/usage,
all coding intents (including pending calls with null usage), compilation charge and optional
original receipt metadata, attempt hashes/failures/application effects, task states and
final verification identity. Compilation and coding records stay separate, preserving source
call identity for analytical versus cash accounting. Unknown usage is not zero; estimates,
reported values and synthetic host reports are not relabelled as charged provider cost.

The executor's `inspectTaskBenchmarkRun` reads under the existing private lease, validates
plan/policy/root and compilation bindings, and reports current project revision/drift. It
does not reconcile, execute checks/providers, rewrite checkpoints or mutate project files.
The adapter can create/remove ordinary lease metadata. Missing compilation ports yield
explicit charge-only evidence; missing/corrupt state or mismatched authority fails closed.
Imported/retained verification IDs are diagnostic: every evidence record requires
`acceptanceAuthenticated: false` and `qualificationEligible: false`, including succeeded
private runs. This API does not grant resume, verification or benchmark acceptance authority.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: **21 benchmark replay/evidence cases**
pass within **79 targeted CLI tests across six files** (7.87 seconds), including managed
compilation/run/repair and durable TaskRun behavior. All **562 core tests across 62 files**
pass (5.86 seconds). Workspace build/typecheck, task-test typecheck and lint pass; whitespace
checks pass. Initial build caught a duplicate local variable, corrected before validation.
Two test assertions were corrected to existing semantics: a completed provider response
can fail proposal validation, and a successful phase state is `succeeded`.

Several initial test/typecheck attempts encountered real ENOSPC or unavailable temporary
transform files; they are not passing evidence. A bounded, separately owned temporary
directory outside the Git worktree on the Developer volume allowed final successful runs.
Only this turn's own temporary test files were cleaned; unrelated files were preserved.
Disk headroom remains limited (about 323 MiB at the final code checks), so the expensive
qualified fixture/campaign runs were not attempted. Prior full CLI/qualified-tool evidence
retains its recorded scope; the new targeted cases use synthetic provider/verification
ports and real private project/state adapters, never live calls or paid model allowance.

Milestone I remains **in progress**. The next local work is joining the actual fixture
driver, G/H execution, these private evidence records and independent terminal evaluation
to campaign retention/reporting, with complete host overhead accounting and general
candidate review/isolation. Full 75-trial comparative evidence, provider/model qualification
and Linux/platform qualification remain open; J remains unstarted. No package versions,
CLI commands, configuration/selection inputs or website source files changed.

Post-commit packed verification at clean source `fb8729c6cd8a1f38aa8fc8e2a985ce9a619f23a7`:
all **five extracted-tarball Node/native POSIX alias and zero-effect dry-run cases** pass
(3.47 seconds), with artifact hash
`sha256:974694485fa1a6b00b1670c9859076b94ff2bcd41defdd88c9b18de6f5782bff`
and unchanged lockfile hash
`sha256:0109073e327bd45bf138ded5803571ce0aac044af73f0d21a07b45af515c6bd4`.
This uses preinstalled dependency hydration, no installation, and remains explicitly
offline/non-qualifying evidence. Its separately owned temporary files were cleaned.

## Milestone I — actual ledger projection and uncertain campaign accounting (2026-10-09)

Added pure core projection from original compilation checkpoints and diagnostic private
run evidence into campaign request rows. Every coding intent is retained, including
pending/null usage and invalid/refused/cancelled/failed observations. Raw reservations,
usage and checkpoint identity stay available; host/estimated tokens do not become
provider-reported measurements, allowance ceilings do not become token estimates and
estimated versus reported charged cost remain separate. Original source compilation
projects once for cash accounting; valid analytical replay checkpoints are rejected
as additional compilation calls. Integrity/privacy checks grant no imported acceptance.

Extended the pre-release version 1 diagnostic contracts compatibly: missing duration,
document bytes/pricing and legacy purpose can remain unknown, pending intents are
explicit and actual task error codes coexist with older lowercase failure labels.
Observed compilation preflight failures can retain zero intents; successful compilation
still requires a source request. New coding intents persist implementation/repair purpose
before dispatch; validated context replies classify the current durable call before
expansion. The context classification adds one acknowledged private save, with no new
dispatch. Existing optional checkpoint fields and old report inputs remain compatible.

Reports distinguish retained/settled intents from uncertain dispatch accounting. Aggregate
provider-call count stays null while any intent is pending; settled accounting does not
prove an HTTP response or billed usage. Unknown metadata prevents quantitative comparison,
pending requests prevent acceptance and a fully terminal 75-slot journal cannot close
dispatch accounting with a pending private request. Fixture/protocol freezes, treatment
order, limits, legacy CLI/config/selection inputs and package versions are unchanged.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: all **583 core tests across 63 files**
pass (7.46 seconds), including 18 projection cases and pending/preflight/journal cases.
All **76 targeted CLI tests across five files** pass (7.90 seconds), including actual
private-filesystem projection of invalid/uncertain calls, valid replay rejection,
legacy unknown metadata and context/repair purpose retention. Workspace build,
workspace/task-test typechecks, lint and Git whitespace checks pass. The ordinary
offline task suite passes **42 tests across six files** (116.82 seconds), including
fixture/oracle discrimination, candidate/dependency tests, private journal/reporting
and five packed Node/native POSIX alias/dry-run checks. That packed artifact came from
a dirty `ed02e41` tree and is diagnostic, not clean-source/platform qualification.

Initial new tests exposed rejection of actual uppercase executor error codes and a
stale object reference after checkpoint resealing; both were corrected. One test run
used stale generated exports after a reporting field rename; rebuilding and the final
targeted run passed. No final check is failing. The expensive qualified E reference
suite was not rerun: its tool/profile/recipe inputs are unchanged. No API keys, live or
paid calls, installation, website source edits, version bump, merge or publication occurred.

Milestone I remains **in progress**. Next work joins actual frozen fixture trial execution,
G/H, retained ledgers and terminal independent evaluation to the campaign/store. General
candidate review/isolation, 75 actual comparative trials, Linux/platform qualification,
dated production model/effort evidence and separately authorized live smoke remain open.
J is the next milestone only after I's acceptance gates and remains unstarted.

## Milestone I — frozen managed failure block joined to campaign retention (2026-10-09)

Added a bounded developer/test driver and simulated host for the first frozen types
fixture. Four independent exact-seed roots use real clean Git baselines: whole,
fixed, routed and the original source compilation. The existing test Git helper can
skip its default extra prerequisite files for exact frozen hydration; default behavior,
fixed options and environment remain unchanged. Whole has one host-authored phase
task using explicit strong configuration. One actual G executor dispatch to a simulated
provider returns a two-task DAG; executor-authenticated replay binds that unchanged
graph to both compiled roots. H selects the synthetic offline baseline/none profile
for routed coding while fixed uses strong/low, keeping capability and effort separate.

The whole dispatch throws after durable reservation; fixed/routed return refusal.
Repair remains enabled to prove these failures cause no hidden retries. Real G/H,
concrete CLI project/private-state adapters, original compilation charge, fresh root
binding, diagnostic ledger inspection/projection and the existing serial coordinator/
private store retain all ten first-block events and all three terminal failures.
The pending whole intent remains uncertain. Analytical ledgers include compilation
twice; cash contains four retained intents (one source plus three coding), three
settled intents, one uncertain intent and null actual token/cost/call measurements.

Each unchanged terminal seed is independently evaluated with actual local compiler,
public/compatibility and private runtime/type oracles exactly once. Hidden results
never enter provider input; seed holdout acceptance fails. Project snapshots remain
unchanged, no source is applied and no candidate is accepted. The E definition ports
are simulated, and actual E check/review launch ports throw if reached; nine actual
managed-process launches are fixed Git probes, not qualified E tools. This does not
exercise the SDK/HTTP boundary, qualify general candidate code or production profiles.

The first-block stop is deliberate and recorded as cancellation after three observed
terminal slots: 72 slots remain missing, no coordinator operation is pending and
dispatch accounting/qualification remain false. Diagnostics include real source SHA/
dirty state, driver hashes, host/fixture identity, terminal hashes, measured coordinator
buckets and full driver elapsed time through private journal inspection. Cleanup timing
is explicitly excluded; evaluator records remain test-memory-only. Disposable state/
journal roots are cleaned, so this does not close durable independent artifact retention.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: the joined test passes alone
(5.58 seconds), then within **43 ordinary offline task tests across seven files**
(117.76 seconds), including the prior fixture/candidate/dependency/private journal and
packed alias checks. The packed artifact hash is unchanged from the previous slice;
the run is a dirty `f943825` source diagnostic, not clean-source release qualification.
**55 targeted CLI tests across five files** pass (7.90 seconds). Workspace/task-test
typechecks and lint pass, with final formatting/whitespace validation. Runtime/core
and tool recipes are unchanged by this test-only slice; the preceding 583-test core
suite and workspace build retain their recorded scope. The expensive qualified E
reference suite was not repeated. Disk headroom is about 1.5 GiB; no installation,
keys, live or paid calls, website source edit, version bump, merge or publication occurred.

Initial fixture setup lacked read authority for a declared absent write path and a
required synthetic unit-test inventory; the existing compiler/policy guards rejected
both before coding. The test host bindings were corrected without weakening those
guards. Adapter literal typing was corrected before final typechecking. No final check
remains failing. The test is automatically included by the existing ordinary CI glob.

Milestone I remains **in progress**. The next implementation must join successful/
repair/context paths and retained independent artifacts under qualified candidate
review/isolation, then cover all five fixtures and the required 75 comparative trials.
Installed/legacy and Linux/platform qualification, production capability/effort evidence
and separately authorized live smoke remain open. No offline synthetic driver or
failure fixture can satisfy those gates. J remains unstarted.

Post-commit verification at clean source `4daa44068b5f9c50337ec2825ea8a5ba18c8ed1d`:
the frozen managed failure block plus five extracted packed alias/dry-run cases pass
(**six tests across two files**, 9.73 seconds). Both diagnostics report
`sourceDirty: false`; driver revision remains
`sha256:7e6d55904e4b5412c75380e37d86754b4cc309a14d4be5b31a3be41dd09fed77`.
Packed artifact hash is
`sha256:b9355d4e6228cea5aa33253f10b5fb218f6f7274d8ab6a991979ef66011279f0`,
with unchanged lockfile hash
`sha256:0109073e327bd45bf138ded5803571ce0aac044af73f0d21a07b45af515c6bd4`.
The repeated block still has three failed trials/72 missing slots, unknown cash
usage/call measurements and false qualification. This is clean-source macOS offline
diagnostic evidence, not successful managed candidate, live or platform qualification.
All owned temporary roots were cleaned and the Git worktree was clean after validation.

## Milestone I — independent terminal evidence retention (2026-10-09)

Added strict versioned core contracts and read-only joining for independent terminal
evaluator records. Records bind the original campaign and exact fixture/block/
treatment to the final evidence hash; inventory, duplicates, executed type checks,
compiler-failure null suites and contradictory positive pass claims are validated.
Joining rejects substitutions/future slots and exposes missing artifacts and records
whose terminal journal event is still pending. Imported records remain explicitly
unauthenticated and cannot grant acceptance, execution or qualification.

Added a CLI private evidence adapter using the existing guarded state-file helpers:
exclusive campaign directory allocation, immutable 0600 writes, 0700 directories,
fsync, bounded inventory/bytes, no-follow reads and ownership/link/permission checks.
Factories and inspection allocate nothing; only the executor-host recorder retains
records. Existing storage cannot resume retention in a new process. No public CLI
command, configuration input, installation behavior or model execution changes.

The actual frozen managed failure block now fsyncs all three terminal independent
observations, reads them back and joins their exact hashes/results to terminal
journal events. Tests cover reopening for read-only inspection, interruptions,
missing records, substitutions, duplicate slots, unsafe files and preservation after
failure. The test cleans its own disposable evidence roots; this is durable adapter
and local driver evidence, not a completed long-lived comparative campaign.

Owner steering on 2026-10-09 permits continuing available local work while skipping
unavailable prerequisites. Live/provider/platform gates remain unverified; no paid
calls, credentials, installation or remote CI actions are authorized by that steering.
The installed Docker client did not return a server response during a bounded probe;
the probe was cancelled without starting/installing a runtime. Linux remains unrun.

Validation details are recorded after final checks below. Milestone I remains in
progress; successful qualified G/H/E trials, all-fixture trials and production/live/
platform evidence remain open. J remains unstarted.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: **595 core tests across
64 files** pass (8.64 seconds), including 12 new strict record/join cases. The two
new/updated evidence-driver files pass **11 targeted task tests** (11.17 seconds).
The full ordinary offline task suite passes **53 tests across eight files**
(128.56 seconds), including fixture/candidate/dependency/journal/report and five
packed alias/dry-run cases. Workspace build, workspace/task-test typechecks, lint,
formatting and Git whitespace checks pass. An initial test-helper type error was
fixed by validating the unknown trial port result before spreading it; no final
check fails. Tool recipes/evaluator inputs are unchanged, so their preceding
expensive qualification retains its recorded scope and was not repeated.

The packed artifact hash is
`sha256:b55f86f8b4fdeda2353010c9f4c6caf924e72d94813b5f8911da993463b3cd93`;
this run used dirty `0a6abcb` source and remains diagnostic. All three independent
records are linked, with no missing/unreferenced artifacts; the block still has
three failed trials, 72 missing slots, one uncertain provider intent and false
qualification. No secrets/API calls, installation, website source changes, version
bumps, merges, publication or paid actions occurred.

## Milestone I — retain reviewer coverage without fabricated test counts (2026-10-10)

Preparing the successful managed fixture join exposed a report mismatch: real
independent task/phase reviewer checks have no executable test inventory, while
benchmark acceptance previously required a positive executed-test count for those
checks. Added optional reviewer/executor provenance and reviewed-criterion counts.
Null test counts now require explicit reviewer provenance and positive coverage;
unit and compatibility checks still require real positive executed counts. Existing
report rows remain compatible. Parsed records still grant no execution/acceptance
or qualification authority.

Validation on Node 24.21.0/macOS arm64: **49 targeted core tests across three files**
pass (2.15 seconds), including reviewer coverage and zero-unit-test cases; all
**597 core tests across 64 files** pass (8.24 seconds). Workspace build, core and
task-test typechecks, lint/formatting and Git whitespace checks pass. The new vetted
managed-success fixture is still under validation and is not claimed by this
reporting change. Milestone I remains in progress; J is unstarted. No provider calls,
credentials, installation, version bump, website source edit or publication occurred.

## Milestone I — vetted two-task G/E success with retained independent acceptance (2026-10-10)

Generalized the bounded first-block test driver without changing its existing
failure-only behavior. Added a vetted fixed-treatment host using actual qualified
TypeScript/ESLint/Vitest definitions, exact frozen seed hydration, a real clean Git
baseline, private state and the actual G decomposition/replay boundary. The result
interface is independently accepted through a no-change proposal; its module output
is supplied to the dependent page task. Only the executor applies vetted reference
bytes to `src/page.ts`. Two task reviews, two refreshed reviews and final phase
review establish current target/catalog/criterion and reference-file identity.
The optional agent-test path remains write authority but is not falsely declared a
produced output. Final task evidence shares the final phase's checked revision.

Actual terminal compiler/public/compatibility/runtime holdout/type-oracle evaluation
passes for the fixed trial and fails for the two unchanged seed failures. All three
independent records are fsynced and joined to terminal journal hashes/results. The
successful trial retains actual unit-test counts and reviewer criterion counts,
without fabricated reviewer test execution. Protected project inputs remain unchanged.
Whole remains uncertain; H routes the third trial to the offline baseline/none profile
and records refusal. No hidden feedback is present in provider inputs.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: the new expensive joined case
passes (**one test**, 616.27 seconds). It reports one source compilation/four coding
simulations, **24 actual managed process launches** (nine fixed Git probes plus
15 qualified E tools), five independent reviews and one accepted/two failed trials.
All three independent records are linked, with 72 campaign slots still missing.
The cash ledger has five intents, four settled, one uncertain and null measured
call/token/cost totals. Host execution is 599307.80 ms; full driver time is 615120 ms,
including 15681 ms tool/host setup; cleanup is excluded. These are diagnostic dirty
`5c67862` source observations, not a clean-source qualification or savings result.
Driver revision is
`sha256:0fde5cd78d7139637bffb4b39449eb0557a1607aa1e946f080b6062b28377a32`;
verifier closure revision is
`sha256:147ea6bc514fbe74c65638491c428721b69375a43678ce8256c5f38653f36752`.

The ordinary offline suite passes **53 tests across eight files** (124.34 seconds).
**44 CLI tests across four files** pass (6.53 seconds), then all **11 managed compile
cases** pass (2.34 seconds). Packed aliases/reporting pass **seven targeted tests**
(5.91 seconds); artifact hash is
`sha256:ecf7598f0871882193703a56bc16669cde98edc6e8bb1791cc6a7d8837354fd6`.
Workspace/task-test typechecks and lint/formatting/whitespace checks pass. The
preceding 597-test core suite/workspace build retains its recorded scope; core/tool
recipes are unchanged by this test-only slice. The expensive case is included by
the existing verifier command and excluded from ordinary CI. Development probes
were stopped while correcting helper typing/assertions and declared output inventory;
only owned scratch roots were cleaned. The final complete case passes; no final
check is failing.

Milestone I remains in progress. This closes one vetted successful G/E/campaign join,
not arbitrary candidate review/isolation, context/repair joins, all five fixture
campaigns/75 comparative trials, production model/effort evidence, separately
authorized live smoke or remaining platform/installed qualification. Per owner
steering, unavailable prerequisites are skipped while local work continues; they
are unverified, not passed. J remains unstarted. No API keys/live/paid calls,
installation, website source edit, package version change, merge or publication occurred.

## Milestone I — all frozen seeds through G/replay/ready-frontier H (2026-10-10)

Added independently authored simulated-provider drafts for all five frozen fixture
phases. Module output declarations exclude optional agent-test write paths. API,
cross-module and security graphs declare their actual interface dependencies;
cross-module presentation depends on both domain and totals outputs. Capability
floors/features are independent of native effort: cross-module/security use strong
floors, while baseline-ready frontiers remain eligible for baseline/none. The catalog
is explicitly synthetic/offline and all five live-routing attempts fail closed.

Each new case hydrates three exact seeds, makes real clean Git baselines, dispatches
one simulated G compilation, retains its private checkpoint, and authenticates
unchanged graph/charge replay to distinct fixed/routed roots. Source token/cost/
reservation facts are unchanged; replay host duration includes its actual overhead.
Only the dependency-free frontier is routed, with no invented accepted predecessor.
No coding or E launch occurs; no candidate is accepted. The existing failure block
still retains all three failures and independent records after the helper extension.
Driver hashes now include the new blueprint source.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: **six targeted tests across two
files** pass (10.16 seconds), including all five real-seed compilation/replay cases.
The full ordinary offline suite passes **58 tests across nine files** (124.96 seconds),
including five packed cases with unchanged artifact hash
`sha256:ecf7598f0871882193703a56bc16669cde98edc6e8bb1791cc6a7d8837354fd6`.
Workspace/task-test typechecks, lint/formatting and whitespace checks pass. An initial
assertion incorrectly compared replay duration to source-only duration; it was fixed
to assert original usage facts and inclusive host overhead. No final check fails.
Runtime/curated tool recipes are unchanged; their previously recorded build/core/E
validation retains its scope and was not repeated. The owned package-runner cache
left in the prior validation parent was removed after verifying that parent's identity.

Milestone I remains in progress: these are no-key boundary tests, not 75 qualified
comparative trials or general model/candidate qualification. Successful context/repair
joins and remaining campaign/platform/live evidence remain open; unavailable gates
stay unverified under owner steering. J is unstarted. No keys, API/paid calls,
installation, website source changes, version bump, merge or publication occurred.

## Milestone I — complete frozen failure-path campaign (2026-10-10)

Extended the existing bounded diagnostic driver with an optional complete
failure-only mode, preserving its three-slot stop and vetted fixed-success behavior.
The complete mode uses all five real frozen fixture seeds and five blocks each,
with the existing rotated treatment order. Every block gets four fresh real Git/
private-state roots and one original G compilation receipt, replayed to both compiled
roots. One synthetic offline catalog/date authority is frozen for all blocks; source,
driver, support policies, host and fixture identity remain bound to diagnostics.

All terminal seeds receive actual independent local compiler/public/compatibility/
holdout/type evaluation. The driver fsyncs independent slot records before terminal
journal events, reads all records back and joins their results and hashes. Whole
simulates transport uncertainty, while fixed/routed simulate refusal. E definitions
remain simulated/unreached; candidates are unchanged and none are accepted. The
full case lives in the existing expensive verifier suite, outside ordinary fast CI.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: the complete case passes
(one test, 209.87 seconds), with **250 acknowledged events, 75 linked independent
records and zero missing slots**. It reports 25 source compilation and 75 coding
simulations, 100 distinct project roots and 225 managed process launches, all fixed
Git probes. There are zero accepted trials; all protected project snapshots remain
unchanged. The cash ledger retains 100 intents, 75 settled and 25 uncertain, with
null measured provider calls/tokens/cost. Analytical ledgers retain 25/50/50 intents.
Dispatch accounting and comparison qualification remain false.

Measured host time is 207634.59 ms, including 68186.79 ms journal retention,
13374.71 ms preparation, 3706.92 ms compilation and 121877.26 ms trial work.
Full driver time is 208667 ms, including source identity/preparation and final
read-back; cleanup is excluded. This run used dirty `ec69377` source. Driver revision
is `sha256:abd48db9947468ba974b6a173179f57a650bbc8ce57a900fb0c0f3b28a36ff44`.
The existing bounded failure block and all five compilation/replay cases still pass
(six tests across two files, 9.67 seconds). Workspace and task-test typechecks,
lint/formatting and whitespace checks pass. Runtime/tool recipes are unchanged;
their preceding build/core/E validation retains its recorded scope and was not
repeated. No final check fails, and owned disposable roots were cleaned.

This is a complete failure-path diagnostic, not the required 75 qualified comparative
trials. Milestone I remains in
progress; context/repair joins, general candidate review/isolation, remaining installed/
platform qualification, production model/effort evidence and separately authorized
live smoke remain unverified. J is unstarted. Per owner steering, unavailable
prerequisites are skipped while available local implementation continues.
No keys/API/paid calls, installation, website source changes, package version change,
merge or publication occurred.

## Milestone I — broader extracted packed legacy dry-run coverage (2026-10-10)

Expanded the existing no-install packed contract test across all three frozen
selection contexts (React/Vite, Express and FastAPI), including legacy stack config,
selection token/file create, positional add and additive selection token/file inputs.
Paths contain spaces and Thai characters. Existing detection-only projects retain
user scripts, source, config and a synthetic private marker; previews preserve every
file and do not expose that marker. All five existing legacy presets also retain
valid schemaVersion 1 create previews with no project tools available. Both declared
aliases, native POSIX shebang execution and existing task boundaries remain covered.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: all **eight packed cases** pass
(9.35 seconds), with unchanged artifact hash
`sha256:ecf7598f0871882193703a56bc16669cde98edc6e8bb1791cc6a7d8837354fd6`
and frozen lockfile hash
`sha256:0109073e327bd45bf138ded5803571ce0aac044af73f0d21a07b45af515c6bd4`.
Workspace/task-test typechecks, lint/formatting and whitespace checks pass. The first
run exposed an incorrect test assumption about the additive file flag; it now uses
the existing `add --config` contract. CLI behavior/flags were not changed. No final
check fails. Runtime/tool recipes are unchanged, so the preceding build/core/E
validation retains its scope and was not repeated.

This is dirty `25dcec6` source, extracted tarball/preinstalled dependency hydration
and dry-run evidence, not installed-package lifecycle, real installer execution or
Linux/platform qualification. Milestone I remains in progress; J is unstarted.
Unavailable provider/platform gates remain unverified under owner steering. No
keys, API/paid calls, installation, website source change, version bump, merge or
publication occurred. Disposable packed/project roots were cleaned.

## Milestone I — vetted context and repair joined to terminal acceptance (2026-10-10)

Added an opt-in test-only variant of the vetted fixed-treatment host. It requests the
unchanged compiler settings for the Result task, then uses the existing same-attempt
context expansion boundary. The page task first proposes independently authored
safe code that incorrectly accepts invalid input. Actual qualified unit checks must
reject that applied edit and skip acceptance review. Only then may the existing
implementation-repair policy open a second page attempt.

The repair requires the exact retained faulty preimage/hash and replaces it with
vetted frozen reference bytes through the executor. No rollback or hidden-oracle
feedback is used. The new expensive joined case checks purpose/attempt/revision
attribution, retained edit chaining, refreshed task/phase review, terminal independent
acceptance, private evidence joining and inclusive failed-attempt/context accounting.
The original reference-only variant and bounded failure driver remain available.

Validation on Node 24.21.0/macOS arm64/pnpm 12.5.1: the complete joined case passes
(one test, **725.15 seconds**). It retains one accepted fixed trial and two failed
whole/routed trials, with all three independent records linked and 72 slots missing.
One source compilation and six coding simulations include the fixed treatment's
context/implementation/implementation/repair requests. The fixed ledger retains
the source reservation and all four requests. Two page effects chain the retained
faulty postimage to the repaired preimage; the failed attempt remains in history.
The nonzero unit exit/output hash justifies implementation repair; its executed-test
count remains null. Successful task/phase checks retain their actual unit counts.

The run makes **27 managed process launches** (nine fixed Git probes plus 18
qualified E tools), and five current task/phase reviews; failed tools skip review.
Final independent public/compatibility/holdout/type acceptance passes only for the
fixed candidate, with no hidden feedback in provider inputs. Cash has seven intents,
six settled and one uncertain, with null measured calls/tokens/cost. Analytical
whole/fixed/routed ledgers have 1/5/2 intents. No comparison is qualified.

Measured host time is 708242.32 ms; full driver time is 724024 ms, including 15651 ms
shared host/tool setup and final private read-back. Cleanup is excluded. The run used
dirty `d3d800a` source, driver revision
`sha256:e785e502961a73dcfec71e947abb2d632c82ada4402a9cce2b4097db738a5dbf`
and actual verifier closure revision
`sha256:27e43832957cf5053823b5e6c884923bd456c12db4707e9849e3e964d8bf2e99`.
All **61 ordinary offline tests across nine files** pass (133.08 seconds), including
eight packed cases with unchanged artifact/lockfile hashes from the preceding slice.
Workspace/task-test typechecks, lint/formatting and whitespace checks pass. Runtime/
curated tool recipes are unchanged, so preceding build/core qualification retains
its scope; this case directly executes the new qualified closure. No final check fails.

Development probes were
stopped while correcting assertions on retained effect metadata, null test counts
for failed process observations and fixed-plan input filtering. The assertions now
retain the existing sequence/change-index fields, require the actual nonzero unit
exit/output hash and exclude the separate routed root from fixed-attempt inputs.
The first complete run reached final acceptance with 27 managed processes but failed
an assertion that expected six reviews; failed tools correctly skip review, giving
five. That assertion and the documentation were corrected before rerunning.
The final complete run passes. Complete diagnostics are printed before assertions
so a future assertion failure does not discard the completed observation.
Only those probes' owned private scratch directories were removed after checking
identity and process termination. No runtime/tool recipes or public CLI behavior
changed. Milestone I remains in progress; J remains unstarted. Unavailable provider/
platform gates remain unverified under owner steering, and no keys/API/paid calls,
installation, website source change, version bump, merge or publication occurred.
