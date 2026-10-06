# RepoSetup 0.4.0 — implementation roadmap

Prepared 2026-10-06. Target: experimental task compilation, routing, verification and escalation. Preparation creates no task commands or provider functionality.

Read the [task compiler contract](../product-docs/TASK_COMPILER_0.4.0.md) and [status](./STATUS_0.4.0.md) first. Implement one milestone at a time. Do not waive compatibility, safety or verification to meet a date.

## Development baseline

- Branch: `codex/0.4.0-task-compiler`.
- Base: `codex/0.3.0-candidate-integration` at `bfeab2f66806d42fa7d32ac4c144d1464bd88a48`.
- CLI baseline: `0.3.0-alpha.1`; package version is intentionally unchanged during preparation.
- Runtime contract: Node 24+ and repository-pinned pnpm 12.5.1.
- The prior 0.2.0 checkout and active 0.3.x worktrees are independent. Do not change their files or release evidence.
- Before implementation or eventual integration, inspect changes to the 0.3.x base and reconcile conflicts. Do not assume its release qualification is complete.

## Milestone A — freeze contracts and experimental support

**Objective:** make the architectural and safety decisions concrete before feature code.

- [x] Reinspect the actual base's preview, intended-doctor, repair, selection and executor seams for reuse.
- [x] Reconcile coding TaskPlans versus curated InstallationPlans in product architecture, CLI and security specifications.
- [x] Freeze TaskPlan/run/preference versions, states, error codes, draft input, coverage validation and dry-run semantics.
- [x] Select the bounded managed project profile and trusted verification authority.
- [x] Research the single provider boundary and native effort/usage/privacy behavior using official documentation.
- [x] Freeze benchmark fixture designs, holdout criteria and baseline resource allowances; fixture source and trial implementation remain in I.

**Likely modules:** specifications only; existing core/CLI boundaries inspected. **Dependencies:** preparation and current-base inspection. **Tests:** define meaningful positive/negative fixtures and legacy regressions. **Done:** explicit contracts with unresolved research recorded; no executable commands from AI or configs.

Acceptance evidence is in the [task contracts](../product-docs/TASK_CONTRACTS_0.4.0.md), [support profile](../product-docs/TASK_SUPPORT_0.4.0.md), [source reuse audit](./TASK_COMPILER_REUSE_0.4.0.md), [provider research](./TASK_PROVIDER_RESEARCH_0.4.0.md) and [benchmark protocol](./TASK_BENCHMARK_0.4.0.md), with reconciled architecture/CLI/security specifications. Documentation checks must pass, all unresolved external qualification must have an owning later milestone, and no feature code/command/version/website changes may be introduced. Per AGENTS.md, required failing typecheck/lint cannot be treated as a completed milestone: the design checklist and supported-runtime build/typecheck/lint now pass as recorded in [status](./STATUS_0.4.0.md). A is complete and B is the next authorized feature milestone; it is not implemented by A.

## Milestone B — schemas and graph validation

**Objective:** validate structured drafts without effects.

- [x] Add strict task, context, dependency, routing, attempt, verification and run schemas.
- [x] Validate requirement coverage, identifiers, artifact references, scopes and DAG ordering.
- [x] Add task-domain error codes without changing legacy exit meanings.

**Likely modules:** core task types/schema/compile/graph/errors. **Dependencies:** A. **Tests:** unknown fields/versions, duplicate IDs, uncovered requirements, cycles, unsafe scopes and stable ordering. **Done:** valid drafts compile into frozen TaskPlans; invalid drafts cannot reach execution.

Implemented in `packages/core/src/tasks`; acceptance and actual supported-runtime validation are recorded in [status](./STATUS_0.4.0.md). No execution entry point exists. C is next; structural validation does not establish filesystem facts or trusted verification.

## Milestone C — safe repository context

**Objective:** produce bounded context with provenance.

- [x] Add canonical, bounded repository inventory/read interfaces and a concrete CLI adapter.
- [x] Implement exclusions, seeds, conservative import expansion, applicable rules and predecessor outputs.
- [x] Track context hashes, inclusion reasons, unresolved references and budget overflow.

**Likely modules:** core task context and CLI repository adapter. **Dependencies:** B. **Tests:** relevance, secret exclusions, symlinks, rule applicability, missing references, size limits and stale source. **Done:** fixture tasks receive sufficient permitted context without prohibited material.

Implemented as core context policy with read-only CLI repository ports, byte-exact selection, conservative imports, full applicable rules and pre-application freshness. The [contracts](../product-docs/TASK_CONTRACTS_0.4.0.md#milestone-c-context-policy-revision-1) record finite inventory/source bounds and trusted-project limitations; [status](./STATUS_0.4.0.md) records actual tests. D is next. C adds no task commands, subprocess probes, provider access, persistence or project mutation.

## Milestone D — portable compilation and handoff

**Objective:** support existing coding agents without requiring direct API billing.

- [ ] Select Markdown phases and import caller-supplied structured drafts.
- [ ] Return an actionable compilation request when decomposition is unavailable.
- [ ] Implement task compile/next/status, text/JSON rendering and attempt identities.
- [ ] Label host routing/scope enforcement as advisory when unconfirmed.

**Likely modules:** CLI parser/types/task handlers/output and core compilation. **Dependencies:** B–C. **Tests:** selectors, malformed drafts, non-TTY, aliases, JSON and zero-effect dry-run. **Done:** an agent can consume independently executable packets; no command claims absent managed execution.

## Milestone E — trusted verification

**Objective:** make acceptance depend on checked evidence.

- [ ] Resolve named checks through fixed, qualified adapters; never execute plan/config commands.
- [ ] Add environment allowlisting, check-definition identity and verifier-side-effect auditing.
- [ ] Require applicable tests, acceptance evidence and final phase checks.

**Likely modules:** core task verification, CLI verification adapter and executor process port. **Dependencies:** B–D. **Tests:** pass/fail/blocked, zero tests, tampering, missing tools, timeout, leaked environment and unexpected writes. **Done:** model claims cannot establish completion.

## Milestone F — durable state and scoped text changes

**Objective:** apply proposals through the executor and recover honestly from interruption.

- [ ] Store versioned run state outside the tracked project tree.
- [ ] Support expected-absent text creation and hash-guarded unique replacement only.
- [ ] Add scope/realpath checks, locks, batch preflight, individual atomic writes and partial-effect records.
- [ ] Reconcile interrupted attempts before resume; retain failed edits for manual review/targeted repair.

**Likely modules:** core task executor/change handling and CLI state adapter. **Dependencies:** B–C and E's check contract. **Tests:** stale output, races, escaping paths, partial failure, corrupted state and interruption. **Done:** every effect is recorded; no automatic rollback or atomic multi-file claim.

## Milestone G — one managed provider adapter

**Objective:** automate scoped compilation and coding under an explicit usage allowance.

- [ ] Add the researched provider SDK boundary in CLI, not core.
- [ ] Support structured drafts, bounded context requests and typed ChangeSet proposals.
- [ ] Handle credentials, cancellation, incomplete/refused responses, call/output limits and usage provenance.
- [ ] Add task run with reviewed context/provider/check/budget summary.

**Likely modules:** CLI provider adapter/run handler and dependency packaging. **Dependencies:** C, E, F. **Tests:** fake API boundary failures plus separately authorized live smoke evidence. **Done:** no model command reaches a process runner; one supported profile completes real tasks.

## Milestone H — routing and targeted escalation

**Objective:** select model capability and effort independently and retry the right failure.

- [ ] Add dated, qualified model profiles and explainable capability/effort filtering.
- [ ] Reserve finite budgets and record requested versus effective configuration.
- [ ] Classify failures and build failure-specific repair context with at most three implementation attempts.
- [ ] Block dependents and invalidate evidence after accepted output changes.

**Likely modules:** core routing/escalation/state and provider mapping. **Dependencies:** E–G. **Tests:** unsupported effort, unavailable models, capability floors, budgets, missing context and repeated failures. **Done:** bounded repair/escalation changes only eligible failed tasks.

## Milestone I — qualification and routing evaluation

**Objective:** separate compilation benefits from routing benefits.

- [ ] Add frozen local types/UI/API/cross-module/security fixture phases and holdout checks.
- [ ] Compare whole-phase strong, compiled fixed-strong and compiled routed treatments.
- [ ] Include all compilation, context expansion, retries and verification overhead and every failed trial.
- [ ] Qualify packed aliases, legacy workflows and task boundaries across the advertised platforms.

**Likely modules:** task e2e fixtures, benchmark runner and targeted CI jobs. **Dependencies:** D–H. **Tests:** end-to-end acceptance, failure injection, drift, ownership and compatibility. **Done:** reproducible reports with limited, evidence-backed claims; ordinary CI needs no AI credentials.

## Milestone J — experimental candidate

**Objective:** prepare a qualified 0.4.0 artifact without claiming unshipped support.

- [ ] Update help, README, changelog, migration/no-migration notes and experimental limitations.
- [ ] Review safety, dependency licenses, provider research and exact support scope.
- [ ] Intentionally version a candidate only after implementation; test the same identified packed artifact.
- [ ] Complete required repeated-source/platform qualification and established soak gates.

**Likely modules:** release documentation, package metadata and qualification workflows. **Dependencies:** I. **Tests:** complete required quality checks and artifact acceptance. **Done:** all gates pass; publication remains separately authorized.

## Checks and status discipline

Each implementation slice must record targeted tests, `pnpm typecheck`, `pnpm lint`, `pnpm build` when affected, relevant packed/security/platform checks and failures in [status](./STATUS_0.4.0.md). Use the repository's supported Node runtime and frozen lockfile. Do not manufacture feature tests for documentation preparation or mark missing functionality implemented.

## Release gate summary

- Legacy configs, selection inputs, commands and installer determinism remain compatible.
- Task compilation covers requirements and validates dependencies, ownership and evidence.
- Scoped context and executor-owned changes enforce managed boundaries.
- Verification—not model claims—determines completion, including final acceptance.
- Routing/effort execution and bounded failure-specific escalation are demonstrated.
- Dry-run performs no writes, provider calls or subprocesses.
- State, interruption, partial effects, secrets and budgets have passing regression coverage.
- Packed/platform gates and a held-out benchmark support the documented experimental contract.
- MCP, ML, parallelism, automatic worktrees/rollback, local models and broad provider support remain deferred.
