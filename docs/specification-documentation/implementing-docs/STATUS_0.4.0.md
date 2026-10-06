# RepoSetup 0.4.0 implementation status

Last updated: 2026-10-06.

## Current position

**Milestone A specifications are written; required supported-runtime validation remains blocked.** Feature implementation has not started. Milestone A is deliberately not marked complete while typecheck/lint have failed and Node 24+ is unavailable. No later milestone is implemented. See the [roadmap](./ROADMAP_0.4.0.md).

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
- [ ] Qualify a Node 24+ development environment for this new worktree.
- [ ] Provision development dependencies from the frozen lockfile under the supported runtime, with installation explicitly authorized. No dependency tree is retained by this slice.

## Implementation milestones

- [ ] A — Specifications frozen below; completion pending supported-runtime validation.
- [ ] B — Strict schemas and graph validation.
- [ ] C — Safe context selection.
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
- [x] Freeze [task contracts](../product-docs/TASK_CONTRACTS_0.4.0.md): independent version 1 envelopes, authoritative phase/draft input, requirement/criterion/artifact coverage, stable DAG order, exact ownership/scopes, task/run/attempt states, error codes retaining exits 0–5, revision-bound evidence, durable effect semantics and zero-effect task dry-run. Positive/negative future test vectors are specified; schemas are not implemented.
- [x] Select [managed-ts-node-v1 and handoff](../product-docs/TASK_SUPPORT_0.4.0.md): one trusted TypeScript package, Node 24.x, npm/pnpm metadata, preinstalled dependencies, Linux x64/macOS arm64 qualification targets, fixed trusted check IDs, finite hard limits, public/private oracle separation and advisory external-agent enforcement. Concrete verifier qualification remains in E.
- [x] Record [single-provider research](./TASK_PROVIDER_RESEARCH_0.4.0.md) from current official documentation: tool-free foreground OpenAI Responses candidate, strict JSON replies, model capability separate from native effort, observed API IDs/prices/capacity, reported/unknown usage, disabled opaque retries, timeout/cancellation limits and retention/cache caveats. No authenticated provider calls were made. Exact SDK/model catalog/account qualification remains in G/H.
- [x] Freeze [benchmark designs](./TASK_BENCHMARK_0.4.0.md): five named offline types/UI-state/API/cross-module/security fixtures, immutable public requirements and independent holdouts, three equal-authority treatments, 75-trial protocol, inclusive failure/cost accounting and finite ceilings. Fixture sources/oracles/runner/results are deferred to I; no savings result is claimed.
- [x] Inspect and document [source reuse/extensions](./TASK_COMPILER_REUSE_0.4.0.md) across core, CLI, executor, config/selection, preview, doctor/repair and verification. Reuse injectable ports, error/output conventions, hashing, lock/path/preflight and exclusive/individual atomic writes. Extend bounded private context, filtered process environment, trusted acceptance, durable state and scoped proposals separately from installer operations.
- [x] Update specification index, high-level contract and roadmap links. Integrated review resolved fixture ID casing, handoff naming, public/private oracle scope, check trust versus mutable checked inputs, own-write preimage/postimage freshness, phase/task verification identity and per-attempt context-call accounting.
- [ ] Pass required typecheck/lint on the supported runtime before closing A.

Milestone A validation on 2026-10-06:

- Node availability checked before validation: `/usr/local/bin/node` is `v22.12.0`; pnpm is `12.5.1`. No usable Node 24+ binary was found in the checked Homebrew/nvm/fnm locations. The prior `/tmp/contextnote-node-v24.21.0-darwin-arm64` directory has no Node executable. The desktop dependency-runtime tool reports no configured bundled runtime. No Node/system software was installed.
- `pnpm typecheck` **failed** (root exit 1, registry script exit 2): core typecheck passed, then registry could not resolve the unbuilt `@reposetup/core` declarations and reported consequent implicit-any errors. No build was run to qualify an unsupported runtime. This is not a passing workspace typecheck.
- `pnpm lint` **failed** (exit 1) during dependency bootstrap, before ESLint/Prettier: pnpm could not move an esbuild dependency directory into its staging directory while the two validation invocations were running. Those commands unexpectedly auto-populated 202 packages from the local cache (zero downloads), despite no explicit install command. All six newly created `node_modules` directories were identified by creation time and removed afterward; no tracked source, lockfile or package metadata changed. Future validation must avoid concurrent pnpm bootstrap and explicitly provision dependencies under Node 24+ first.
- Direct whole-workspace ESLint using the existing candidate worktree's ESLint 10.11.0 passed (exit 0) on Node 22.12.0 before dependency cleanup. This is diagnostic evidence only, not supported-runtime `pnpm lint` qualification.
- Targeted Prettier 3.9.8 checks use the existing candidate worktree's formatter with `--ignore-path /dev/null`, because normal lint excludes Markdown. Initial check found formatting issues in the reconciled older docs/index; those were formatted and the final changed-document check passed. The formatter ran on Node 22.12.0 and establishes document formatting only.
- Final `git diff --check`, whitespace checks covering new untracked documents, and repository-local Markdown/source link validation passed. Git scope checks confirm only specification Markdown changed and package versions/lockfile/website/runtime source remain unchanged.
- No runtime feature tests were added/run for this documentation-only slice. Meaningful future positive/negative and legacy regression vectors are defined in the contracts/benchmark; inventing feature tests before B would misrepresent implementation. Build and packed/platform/install checks are unaffected and were not run.
- No later task milestone, placeholder command, package bump, branch merge, publish, release tag or paid provider call occurred. Historical base qualification does not close new task support gates.

## Remaining blockers and next milestone

The immediate completion blocker is a usable Node 24+ development environment and intentionally provisioned frozen-lockfile tooling, followed by passing required typecheck/lint (with local workspace declarations built as needed). Documentation acceptance evidence above is present, but the repository workflow forbids claiming completion with failing typecheck. Keep A open until those results are recorded; no system or dependency installation is authorized implicitly by this tracker.

External questions are assigned to later gates: bounded context/privacy and filesystem races (C/F), trusted exact verifier recipes/report parsing/environment/effects (E), pinned SDK/account access/cancellation/usage/retention qualification (G), model capability/effort/pricing catalogs (H), and concrete independent fixtures/platform/live benchmark evidence (I). These unresolved questions do not authorize broader execution or spending.

## Next implementation handoff

Stay in the existing 0.4.0 worktree and preserve unrelated changes. First close A's environment/validation blocker when the owner supplies or authorizes the required tooling. The next feature milestone is **B — strict task schemas and graph validation**, only after A is closed and B is requested. Use the frozen contracts and future fixture vectors; keep provider/filesystem/process adapters in CLI and domain policy in core. Do not start B or later functionality as part of this Milestone A request.
