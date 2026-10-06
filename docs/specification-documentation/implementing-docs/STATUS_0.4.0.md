# RepoSetup 0.4.0 implementation status

Last updated: 2026-10-06.

## Current position

**Milestones A–D are complete after supported-runtime validation. Milestone E is in progress.** Core schemas/compiler/context and portable compile/next/status commands are implemented. Trusted task verification, durable task effects and managed execution remain absent. See the [roadmap](./ROADMAP_0.4.0.md).

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
- [ ] E — Trusted verification.
- [ ] F — Durable state and bounded text changes.
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

## Remaining blockers and next milestone

No D acceptance blocker remains for the reviewed portable profile. E is open; the evidence evaluator, environment port and recipe/report smoke checks do not qualify complete check execution. Handoff is stateless and advisory: dependent tasks cannot proceed on caller claims, host scope/model/budget enforcement is unconfirmed, and real acceptance/effect/attempt accounting remains E/F. Clean Git/snapshot probes, executor pre-effect checks, native token capacity, managed provider/catalog qualification, Linux/packed evidence and benchmark trials remain later gates. The trusted-project privacy/race limitations from C still apply.

## Next implementation handoff

Stay in the existing worktree and preserve unrelated changes. The owner requires every change committed before continued implementation. Prior commits: A `65a5c41`, A validation `0c7904c`, B `010b38c`, C `47db339`. D was committed as `484455e`. Commit each E slice before continuing E implementation. **Milestone E — trusted verification** must qualify fixed check adapters, environment/report/effect boundaries, genuine nonzero test execution, independent criterion evidence and current revision binding. Only the executor may invoke processes. Do not implement durable text application, provider calls, routing/escalation or later milestones while completing E.
