# Task compiler 0.4.0 — current-source reuse audit

Milestone A source inspection, 2026-10-06. This is a design and compatibility record, not implemented task support or passing test evidence. Read the [product contract](../product-docs/TASK_COMPILER_0.4.0.md), [versioned contracts](../product-docs/TASK_CONTRACTS_0.4.0.md) and [support profile](../product-docs/TASK_SUPPORT_0.4.0.md) with this audit.

## Source identity

- Inspected worktree: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.4.0-task-compiler`.
- Branch: `codex/0.4.0-task-compiler`; initial Git status was clean.
- Inspected HEAD: `9fa2389176cb822ebae89d7edd301c0a3dbb6cb4`.
- Integrated source base: `bfeab2f66806d42fa7d32ac4c144d1464bd88a48` on `codex/0.3.0-candidate-integration`. HEAD differs from that base only in the four preparation documentation files; runtime source is the integrated 0.3.0 baseline, not the previously inspected 0.2.0 checkout.
- [CLI metadata](../../../packages/cli/package.json) identifies `rsetup` `0.3.0-alpha.1`, exports both `rsetup` and `reposetup`, and requires Node `>=24`. The [workspace](../../../package.json) requires Node `>=24` and pnpm `12.5.1`. No versions change in Milestone A; baseline release qualification remains separate.

Links name the inspected source file and relevant symbol below. Future implementation must inspect the then-current source and preserve these contracts rather than copy assumptions from an older checkout.

## Configuration, errors and installation planning

**Reuse:** [repoSetupConfigSchema](../../../packages/core/src/config/schema.ts) uses strict Zod objects and literal schemaVersion 1; [parseRepoSetupConfig](../../../packages/core/src/config/parse.ts) returns structured errors. [selectionSchema and transport parsing](../../../packages/core/src/selection/format.ts) add separate selectionVersion 1, bounded bytes/depth, canonical base64url and known input shapes. Apply their strict-boundary patterns to new task preferences/drafts/plans/run state, without adding fields to either existing contract.

**Extend separately:** task versions and schemas belong in a task-domain namespace. Current integration options permit `Record<string, unknown>` before integration-specific validation; task boundaries must not inherit this open shape for commands, provider endpoints or execution authority. [loadRepoSetupConfigFile](../../../packages/cli/src/load-config.ts) is an unbounded legacy read; new task file loading needs bounded UTF-8/depth handling analogous to [loadSelection](../../../packages/cli/src/selection.ts). Reuse [error construction](../../../packages/core/src/errors/model.ts), but extend [error codes](../../../packages/core/src/errors/codes.ts) and the exhaustive [exit mapping](../../../packages/cli/src/exit-codes.ts) only when task behavior is implemented, retaining current meanings 0–5.

**Reuse:** [planInstallation](../../../packages/core/src/planning/plan.ts) resolves curated definitions, validates operation schemas, batches installs, consolidates manifests and ensures scaffold dependency installation. [validateInstallationPlan](../../../packages/core/src/planning/validate-plan.ts) accepts only the current discriminated union. [recipe records](../../../packages/core/src/planning/recipe.ts) demonstrate separate versioning, declarative reproduction input and stable content hashing.

**Keep separate:** TaskPlans cannot use [InstallationOperation](../../../packages/core/src/operations/types.ts): it includes `run_command`, package installation and command-bearing verification. A schema-valid operation is not model execution authority. Do not route AI proposals through `planInstallation`, registry integration definitions, package-manager adapters or recipe replay. Reuse stable identity/hash principles, not installation execution semantics.

**Extend separately:** [sortSelectedIntegrations](../../../packages/core/src/resolution/graph.ts) provides stable topological ordering with deterministic ID tie-breaking. Its prerequisites are integration/category requirements, not explicit task/artifact dependencies. Task graph validation needs complete references, duplicate/self/cycle detection, requirement-to-criterion coverage, output ownership and accepted artifact revisions. Do not modify the legacy graph's semantics to add task concepts.

Existing tests to preserve: [config boundaries](../../../packages/core/src/config/schema.test.ts), [selection transport](../../../packages/core/src/selection/format.test.ts), [installation plans](../../../packages/core/src/planning/plan.test.ts), [recipe records](../../../packages/core/src/planning/recipe.test.ts) and [resolution](../../../packages/core/src/resolution/resolve.test.ts). New task schema/coverage/scope/DAG fixtures are required in Milestone B; none exist now.

## Detection and context preparation

**Reuse as evidence:** [detectProject](../../../packages/core/src/detection/detect-project.ts), [createDetectionContext](../../../packages/core/src/detection/context.ts) and [detection models](../../../packages/core/src/detection/types.ts) give runtime, manager, framework and language evidence with confidence. [findProjectRoot](../../../packages/core/src/detection/project-root.ts) searches ancestor markers. Task preparation must bind an explicit canonical Git project/baseline and single package target; marker discovery alone cannot establish managed scope or qualified dependencies.

**Extend with a new CLI repository adapter:** [createNodeDetectionFs](../../../packages/core/src/detection/filesystem.ts) already rejects unsafe relative paths and symlink components. It is not a task privacy boundary: reads are unbounded UTF-8, exclusions are absent, there is no inventory/content provenance, and validation/read steps do not eliminate filesystem races. Task context needs bounded inventory/reads, canonical targets, secret/generated/dependency/Git exclusions, rule hashes, source ranges/hashes, conservative import expansion, budget accounting and stale-source checks.

**Inherited boundary debt:** concrete Node filesystem reading currently lives in core detection and is called by core doctor. Milestone A does not refactor that working installer path. New task domain ports/policies belong in core; new concrete filesystem/provider/process/state adapters belong in CLI, preserving public legacy exports.

Existing tests to preserve: [detection filesystem](../../../packages/core/src/detection/filesystem.test.ts), [project root](../../../packages/core/src/detection/project-root.test.ts) and [project detection](../../../packages/core/src/detection/detect-project.test.ts). Milestone C needs secret exclusions, denied paths, binary/large/special files, symlink/race rejection, bounded imports/rules and predecessor/source drift tests.

## Preview and reviewed mutation

**Reuse:** [previewOperations](../../../packages/core/src/preview/preview.ts) is a pure, content-suppressed projection. [capturePreview and recheckPreview](../../../packages/cli/src/preview.ts) read target snapshots, refuse symlink components and fingerprint before review/execution. [handleCreate](../../../packages/cli/src/create.ts), [handleAdd](../../../packages/cli/src/add.ts) and doctor repair demonstrate review/recheck/executor invocation. Preserve their existing behavior and JSON shapes.

**Extend separately:** ChangePreview version 1 is installation-operation-specific and models external generator effects as unknown. Task text proposals need their own expected-absence/hash validation, scope/ownership summary, check authority and revisioned proposal preview; a legacy preview is not a task trust or completion certificate. Existing preview reads are capped at 64 KiB; large files use size/mtime fingerprints rather than full content hashes. Task proposal checks must use bounded content hashes and fail closed, not accept mtime as sufficient.

Existing tests to preserve: [pure preview](../../../packages/core/src/preview/preview.test.ts), [snapshot/recheck adapter](../../../packages/cli/src/preview.test.ts) and [selection execution review](../../../packages/cli/src/selection.test.ts). Task dry-run tests in Milestone D must spy on all write/provider/process/state/verification effects and require zero calls; existing doctor repair dry-run performs prerequisite probes and is not the stronger task dry-run contract.

## Executor filesystem, process and state ports

**Reuse:** [ExecutorFileSystem, ProcessRunner, lock and journal ports](../../../packages/core/src/executor/types.ts) keep effects injectable. [executeInstallation](../../../packages/core/src/executor/execute.ts) performs preflight, locks, checks prerequisites before mutations, respects cancellation, reports operation timing and stops on failure. [resolveInsideRoot/assertRealPathInsideRoot](../../../packages/core/src/executor/resolve-path.ts) and [preflightInstallation](../../../packages/core/src/executor/preflight.ts) enforce lexical/canonical containment, writable roots and disk/lockfile checks. Task execution should preserve these patterns without gaining installer operations.

**Reuse with task-specific guards:** [file operations](../../../packages/core/src/executor/file-operations.ts) use exclusive creation, unique text matching and individual atomic replacement. The concrete [CLI executor adapters](../../../packages/cli/src/execution-adapters.ts) provide exclusive files, temporary-file/rename writes, canonical-root locks and bounded process capture. They do not implement expected input hashes, whole ChangeSet preflight, durable task-state CAS/revision locking, partial batch receipts or interrupted-attempt reconciliation. Atomic individual replacement does not make a multi-file batch atomic or close all parent-path races.

**Extend before task verification:** [ProcessRunRequest](../../../packages/core/src/executor/types.ts) has no environment allowlist; [createDefaultProcessRunner](../../../packages/cli/src/execution-adapters.ts) passes `process.env`. Reuse argument-array launch, cancellation, timeout/output bounds and redaction concepts, but add a task verifier boundary with explicit filtered environment and fixed trusted definitions. Windows `.cmd`/`.bat` launch is a reviewed `cmd.exe` adapter branch with constrained tokens, not permission to execute model/config shell text. No arbitrary command, npx/dlx download or package-manager install may enter the task runner.

**Extend durable state:** [journalEntryForOperation](../../../packages/core/src/executor/journal.ts) records hashed operation identity/status; default journals are temporary JSONL, failures are retained and success journals are removed. Executor journal errors are caught and ignored. This useful content-free failure log is not durable PhaseRun state or safe resume authority. Task state must be separately versioned outside the tracked project, atomically saved with failure surfaced before dependent effects, validated after interruption and locked/revisioned. All project mutations and subprocesses still enter through the executor; new CLI state adapters do not gain arbitrary project-write authority.

Existing tests to preserve: [executor safety](../../../packages/core/src/executor/execute.test.ts), [real local execution](../../../packages/core/src/executor/execute.real.test.ts), [path containment](../../../packages/core/src/executor/resolve-path.test.ts) and [CLI adapters](../../../packages/cli/src/execution-adapters.test.ts). Milestone F needs expected-absent/hash races, duplicate/overlapping proposals, forbidden scopes, partial writes, corrupt/dropped state saves, stale locks, crash boundaries and resume reconciliation tests. OS/process containment remains a documented limitation; injected ports are not a sandbox.

## Doctor, repair and verification

**Reuse as diagnostic evidence:** [runDoctor](../../../packages/core/src/doctor/run-doctor.ts) distinguishes observed detection from intended-stack checks and uses injected runtime/version probes. [collectIntendedChecks](../../../packages/core/src/doctor/intended-checks.ts) compares expected package declarations/files, framework/language/manager evidence and informational version differences. [IntegrationDefinition.VerificationResult](../../../packages/core/src/integrations/definition.ts) and [integration verification helpers](../../../packages/integrations/src/verify.ts) remain the legacy installation health API.

**Keep repair bounded:** [planDoctorRepair](../../../packages/core/src/doctor/plan-repair.ts) allows absent known Prettier recipe files or verified placeholder environment examples; it treats existing files as user-owned, blocks unsafe recipe/version findings and supplies manual guidance. [handleDoctor/handleRepair](../../../packages/cli/src/doctor.ts) validates, previews, confirms, reloads intended configuration and rechecks the plan before invoking the executor. This is implemented baseline behavior, not AI repair or rollback. Coding repair must be a new bounded attempt scoped to a failed task, retaining failed edits and blocking dependents.

**Extend separately for acceptance:** [executeVerify](../../../packages/core/src/executor/process-operations.ts) treats commandless `verify` as a successful no-op; successful process exit alone has no criterion/test-count provenance. Doctor checks mostly inspect metadata/files and do not establish coding behavior. Add `TaskVerificationResult` without renaming or widening existing `VerificationResult`. Trusted IDs `ts.typecheck`, `ts.lint`, `ts.unit`, `task.acceptance` and `phase.acceptance` resolve only through reviewed adapters. Check definitions, consumed configuration and checked project revision must be frozen; zero required tests, missing tools, modified verifier code or unexpected verifier effects cannot pass acceptance.

Existing tests to preserve: [intended-stack checks](../../../packages/core/src/doctor/intended-checks.test.ts), [doctor](../../../packages/core/src/doctor/run-doctor.test.ts), [CLI intended doctor](../../../packages/cli/src/doctor-intended.test.ts), [repair](../../../packages/cli/src/doctor-repair.test.ts) and [integration verification](../../../packages/integrations/src/verify.test.ts). Milestone E needs trusted-ID resolution, check tampering/transitive configuration invalidation, zero tests, independent criterion coverage, timeout/truncation, secret environment exclusion and verifier effect auditing tests.

## CLI and compatibility guard

**Reuse:** [CliDeps/ResolvedCliDeps](../../../packages/cli/src/types.ts) support injected IO, reads, executor filesystem, process, locking, journal and cancellation. [runCli](../../../packages/cli/src/run-cli.ts) owns Commander and wires those ports. [machine output](../../../packages/cli/src/machine-output.ts) owns version 1 `plan`/`error` envelopes, [error formatting](../../../packages/cli/src/format-error.ts) owns terminal error rendering, and [exit mapping](../../../packages/cli/src/exit-codes.ts) preserves 0–5. New task output kinds are additive; task commands remain unimplemented until their milestones.

**Preserve:** existing create config/preset/flag paths; create/add selection v1 modes and confirmation restrictions; remove safe allowlists; presets/search/info/stack/export; doctor intended/repair semantics; registry validation; binary aliases, help, non-TTY behavior, stderr progress and partial-execution reporting. Task preference loading is opt-in and cannot change normal setup costs or require provider credentials for local functions. Python installer functionality stays compatible; managed Python coding, Bun and workspace-wide changes are not qualified by this profile.

Existing tests to retain in later compatibility runs: [CLI commands](../../../packages/cli/src/run-cli.test.ts), [failure handling](../../../packages/cli/src/run-cli.failures.test.ts), [exit codes](../../../packages/cli/src/exit-codes.test.ts), [selection](../../../packages/cli/src/selection.test.ts), [packed legacy selection](../../../tests/e2e/vitest.selection-legacy.config.ts) and [packed maintenance](../../../tests/e2e/vitest.maintenance.config.ts). Add help/unknown-task-command regressions only when task command implementation changes the parser; Milestone A adds no placeholder behavior or mirrored feature tests.

## Extension order and validation responsibility

Milestone B adds strict task contracts and deterministic validation; C adds context ports and the CLI repository adapter; D adds portable CLI/handoff; E adds executor-owned trusted verification; F adds durable run state and scoped text application; G adds the [researched single-provider adapter](./TASK_PROVIDER_RESEARCH_0.4.0.md); H adds routing/repair policy. The [benchmark contract](./TASK_BENCHMARK_0.4.0.md) defines independent fixtures, allowances and later qualification. This document authorizes none of those feature implementations during Milestone A.

The listed tests were inspected, not executed by this audit. Actual documentation validation and supported-runtime/tool availability belong in [STATUS_0.4.0.md](./STATUS_0.4.0.md); historical or ancestor checks cannot qualify new task support. No provider call, install, package version bump, merge, publish or website change occurred in this audit.

## Milestone E implementation follow-up

The historical process gap above is now partly closed: `ProcessRunRequest.env`
optionally replaces environment inheritance, while omission preserves installer
behavior. Current task recipe/report and verifier file adapters live under
`packages/cli/src/tasks`; core holds pure evidence/snapshot/definition validation.
They reuse canonical task hashes, strict Zod/path rules and the existing process
port without widening installation operations. New read-only streamed file guards
serve binary runtime/tool hashes and fresh private report reads; C's source reader
keeps its separate exclusion/context bounds. Neither adapter creates scratch
state or executes a check. Executor orchestration, complete definition/inventory
qualification and durable F acceptance remain open; see the actual evidence in
[STATUS_0.4.0.md](./STATUS_0.4.0.md).

## Milestone E executor and adapter completion

The separate [task verification executor](../../../packages/core/src/executor/task-verification.ts)
reuses the process port, canonical task schemas/identity, pure evidence evaluator
and verifier snapshot comparison. It never replays installer `run_command`, repair
operations or configuration scripts. The default CLI process adapter gains only an
opt-in task termination grace; existing installer behavior stays compatible.

The [qualified CLI adapter](../../../packages/cli/src/tasks/verification-adapter.ts)
connects fixed recipes, bounded report parsing, fresh report reads, streamed file
identity and project snapshots. New [closure inventories](../../../packages/cli/src/tasks/verifier-closure.ts)
and [private scratch](../../../packages/cli/src/tasks/verifier-scratch.ts) extend
those boundaries. Domain qualification schemas/hash/config policy stay in core;
actual path, process version, package metadata and filesystem checks stay in CLI.
Live reviewer callbacks and in-memory issued receipts replace imported provenance
as ephemeral acceptance authority. F still needs cross-process locking, original
input/application/owned-postimage binding, durable acceptance and interrupted-state
reconciliation. No task verify/run command or state mutation is introduced by E.

## Milestone F implementation follow-up

The [durable task executor](../../../packages/core/src/executor/task-run.ts) reuses
B's frozen plans/errors/strict schemas, C's context reader and byte/privacy policy,
and E's snapshots, qualified definitions and live verification/review receipts.
Separate application, recovery and acceptance modules orchestrate typed host ports;
no installation operation or installer repair command is accepted as a ChangeSet.
The [pure application policy](../../../packages/core/src/tasks/application.ts) and
[checkpoint validator](../../../packages/core/src/tasks/checkpoint.ts) live in core.

CLI's new [application adapter](../../../packages/cli/src/tasks/application-adapter.ts)
reuses canonical POSIX verifier root guards, C's bounded text reader and E's complete
project inventories. The [state adapter](../../../packages/cli/src/tasks/run-state-adapter.ts)
extends individual writes with mandatory sync, private external stages/snapshots,
CAS revisions and exclusive project leases. It deliberately does not reuse the
installer's best-effort journal as task acceptance storage. Port construction is
read-only; only core executor entry points invoke mutation/process capabilities.
Qualified E adapters now expose frozen project definition/oracle paths to prevent
F application authority from overlapping verification authority.

G still needs provider/usage/allowance and real CLI run wiring; H owns automated
routing/targeted repair; I/J own broader platform/packed/benchmark qualification.
F preserves D's advisory stateless commands and all legacy configuration/selection
paths. No package/version/website changes, provider calls, installation or rollback
are part of F. Exact validation is recorded in [status](./STATUS_0.4.0.md).
