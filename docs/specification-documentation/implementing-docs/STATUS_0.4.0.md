# RepoSetup 0.4.0 implementation status

Last updated: 2026-10-06.

## Current position

**Milestones A–C are complete after supported-runtime validation. Milestone D is next.** Core schemas, pure task-plan compilation and bounded context preparation through a read-only CLI repository adapter are implemented; task commands and managed execution are not. See the [roadmap](./ROADMAP_0.4.0.md).

- Development branch: `codex/0.4.0-task-compiler`.
- Worktree: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.4.0-task-compiler`.
- Base branch: `codex/0.3.0-candidate-integration`.
- Base source: `bfeab2f66806d42fa7d32ac4c144d1464bd88a48`.
- Inspected worktree HEAD: `9fa2389176cb822ebae89d7edd301c0a3dbb6cb4`; Git status was clean before this slice. Runtime source matches the integrated base; the intervening preparation changes are documentation only.
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
- [ ] D — Portable compilation/handoff CLI.
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

## Remaining blockers and next milestone

No C acceptance blocker remains for the reviewed local context profile. This is not a hostile-filesystem sandbox or a universal secret detector. Clean Git baseline/project snapshot probes, immediate executor pre-effect checks, authentic verification/artifact acceptance, durable state, native token capacity and managed enforcement remain later gates. E/F/G/H/I retain their verification, effects, provider, routing and independent qualification work. Linux/platform/packed task qualification and benchmark trials remain unperformed.

## Next implementation handoff

Stay in the existing 0.4.0 worktree and preserve unrelated changes. The owner requires every change to be committed before continued implementation. A was committed as `65a5c41`, its supported-runtime closure as `0c7904c`, and B as `010b38c`. This slice completes C only; commit its implementation and actual status before the next slice, **Milestone D — portable compilation/handoff CLI**. D must use the compiler/context ports, explicit structured decomposition and advisory portable enforcement, preserve existing commands/aliases and demonstrate zero-effect dry-run. Do not implement provider calls, trusted process checks, durable attempt/effect execution or later milestones in D.
