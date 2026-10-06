# RepoSetup 0.4.0 — task compiler contract

Status: Milestones A–D validated, 2026-10-06. Core exports strict task schemas, pure draft compilation and bounded context preparation. Portable `task compile`, `task next` and `task status` are implemented; trusted verification, durable task effects and managed execution are not.

## Product outcome

Compile one implementation phase into focused coding tasks with dependencies, bounded context, ownership, capability requirements and acceptance evidence. Verify attempts before accepting outputs; repair only the failed task and escalate model capability or reasoning effort when the failure warrants it.

The target is an experimental 0.4.0 release, not a general autonomous engineering platform. The hypothesis is that compilation and routing can preserve quality while reducing repeated context, expensive model use and unrelated changes. Savings require benchmark evidence.

## Baseline and compatibility

The development branch starts from `codex/0.3.0-candidate-integration` at `bfeab2f66806d42fa7d32ac4c144d1464bd88a48`, whose CLI identifies as `0.3.0-alpha.1`. Earlier planning inspected the older 0.2.0 checkout; implementation must use this newer source as its baseline. Its 0.3.0 qualification and delivery gates remain independent and open; ancestry is not proof of a released version.

Preserve schemaVersion 1 stack configuration, selection v1 inputs, existing commands, JSON output meanings, exit codes, integration IDs and curated installation planning. Keep the inherited package version until an implemented candidate is intentionally versioned. Do not change publication workflows or create release tags during preparation.

## Architecture decision

Use a hybrid weighted toward portable compilation:

1. A vendor-independent core validates TaskPlans, prepares context, routes configurations, classifies verification and advances local run state.
2. Existing agents can supply structured decomposition drafts and consume task packets. Their model/effort and filesystem behavior are advisory unless a qualified adapter reports enforcement.
3. One experimental managed provider adapter proves actual routing. Its model-facing actions are bounded context requests and typed text-change proposals. The executor alone applies changes and runs trusted checks.

Initially qualify `managed-ts-node-v1`, a narrow single-package TypeScript/Node 24.x profile with npm or pnpm metadata and preinstalled dependencies. Python stack functionality stays compatible; file-level Python handoff does not imply qualified managed Python execution.

Business logic belongs in core. Concrete repository/state/provider/process adapters belong in CLI. Integration definitions still generate curated typed installation operations, never execute processes. Keep models out of the integration registry; model profiles are a small task-domain catalog.

## Compilation pipeline

Selected phase and repository evidence → candidate decomposition → deterministic schema/coverage/DAG/scope validation → frozen TaskPlan → ready task → fresh context → routing → handoff or managed proposal → executor → verification → accepted outputs or failure-specific repair.

Markdown phase selection is not semantic decomposition. Accept a structured draft from the caller or generate one with a configured provider. Missing decomposition authority must return an actionable blocker, not fabricated tasks. Record unresolved architectural decisions before implementation begins.

The compiler must map each selected requirement to tasks and acceptance evidence, reject cycles and invalid references, and keep dependency outputs revisioned. Sequential execution is the MVP; represent independence without shipping parallel workers.

## Domain contracts to implement

Use strict Zod boundaries and separate versions for task preferences, compiled plans and run state. Preserve the existing integration `VerificationResult`; name task evidence `TaskVerificationResult`.

The normative [versioned contracts](./TASK_CONTRACTS_0.4.0.md) freeze version 1 draft, plan, preference, run and handoff envelopes, identifiers, fields, validation order, states, error codes and dry-run semantics. The initial [support profile](./TASK_SUPPORT_0.4.0.md) freezes managed scope, hard bounds and trusted verification IDs. Milestone B implements strict core schemas, pure compilation and graph/coverage/scope validation; C adds bounded read-only context with source/rule/preimage identities. State transitions, trusted checks, CLI commands and execution remain in later milestones.

- **Task:** stable ID, objective, requirement references, kind, constraints, read/write/deny scopes, acceptance criteria, trusted check IDs, output artifact IDs and evidenced qualitative capability features.
- **TaskDependency:** predecessor, consumer and required artifact IDs.
- **TaskContext:** source paths/ranges/hashes, inclusion reasons, applicable rule hashes, accepted predecessor revisions, estimated size and unresolved references. Materialize contents transiently.
- **RoutingDecision:** catalog/policy revision, required capabilities, selected adapter/model/native effort, rationale, rejected candidates and managed/advisory enforcement.
- **TaskVerificationResult:** checked revision, pass/fail/blocked/needs-review outcome, per-check evidence, criterion coverage and unexpected file changes.
- **ExecutionAttempt:** identity, attempt number, input/context revision, requested/effective configuration, timestamps, proposal/application outcome, verification, failure classification and reported/estimated usage.
- **PhaseRun:** plan/project/baseline identity, execution mode, task states, attempts, finite resource limits, accepted output revisions and final verification.

Managed changes initially support text creation with expected absence and unique text replacement with an expected file hash. Reject deletes, renames, binary files and arbitrary patch languages. Preflight the whole batch, recheck each target before its atomic individual write and report partial effects; do not claim atomic multi-file transactions.

## Context and routing

Inventory eligible paths locally; do not upload the repository inventory's contents wholesale. Seed from explicit references, write targets, requirements, nearby tests and detected project evidence. Expand bounded local imports and interfaces; include applicable ancestor rules and accepted predecessor outputs. Rebuild against current hashes immediately before each attempt.

Always exclude secrets, Git internals, dependency trees, binaries and generated output. Resolve canonical paths and reject symlink escapes. The inherited detection reader is not sufficient unchanged as a privacy boundary. Context requests remain inside approved read scope; broader access requires a reviewed revision.

Use qualitative task features and conservative capability floors, not a single complexity score or invented success probabilities. Filter available qualified profiles by capability, context/output capacity and native effort support. Select the lower-cost eligible configuration using dated evidence. Capability and effort are independent. Record missing effective configuration or usage as unknown.

## Verification and recovery

Task completion requires current-revision acceptance evidence, all required deterministic checks and no forbidden changes. A model response, doctor success, commandless verification or a test command discovering zero required tests cannot establish completion.

Plans/configuration contain trusted check IDs, never executable commands. Fixed adapter recipes resolve them. Project scripts, README instructions and model-proposed commands are discovery evidence, not execution authority. Freeze check definitions and invalidate trust after relevant changes. Verify only trusted local projects; argument arrays and environment filtering are not an OS sandbox.

Start with at most three implementation attempts per task plus finite provider-call, token and cost limits. Distinguish implementation failures from missing context, stale hashes, output truncation, infrastructure failure, policy violations and ambiguity. Increase effort/model capability only when justified. Block dependents until outputs pass; invalidate affected evidence when accepted outputs change. Require a final phase acceptance gate.

Keep failed changes for targeted repair and manual review. No automatic rollback, reset, stash or commit. Managed execution starts from a clean Git baseline, records effects and stops on unexpected drift. Users may supply their own worktree; automatic worktree orchestration is deferred.

## CLI and configuration proposal

Portable `reposetup task compile`, `next` and `status` use independently reviewed inputs and explicit artifact paths with text/JSON output and zero-effect dry-run. See the [CLI contract](./CLI_SPEC.md#experimental-040-portable-task-cli--milestone-d). `run` and `verify` remain absent until their behavior is implemented. Reuse existing dependency injection and error/output conventions; no provider call, acceptance or state advancement is implied by a portable packet.

Dry-run performs no writes, provider calls, process execution or verification; unresolved decomposition and host checks are labelled. New JSON kinds are additive. Keep stack configuration untouched; optional `reposetup.tasks.json` holds execution preference, provider availability, quality preference, budget, verification profile and exclusions. It contains no secrets, command strings, hooks or arbitrary endpoints.

Normal setup, local draft validation/context preparation and local verification do not require RepoSetup AI credits. Handoff uses the existing agent's allowance. Managed calls require provider credentials and usage allowance; paid-credit-free local models are deferred. Never advertise automatic decomposition/coding as universally free.

## Evaluation and release boundary

Compare whole-phase strong-model execution, compiled/scoped execution with the same strong configuration, and the identical compiled workflow with routing. Freeze tasks, repositories, holdout acceptance, tool authority and allowances; include compilation, expansion, retries and verification in totals. Preserve failures and report quality before cost/latency.

Store metadata locally by default: feature categories, version identities, requested/effective configuration, context size, usage provenance, timing, verification and failure causes. Do not require source, prompts, raw logs or cloud telemetry in the future dataset. Separate sensitive recovery artifacts from routine telemetry.

Required release evidence includes compatibility regressions, deterministic safety tests, packed CLI/platform checks, one qualified managed adapter and a held-out benchmark. A negative savings result must be reported honestly.

## Deferred scope and research

Defer MCP, public task SDK, editor extension, multiple providers, local models, embeddings, ML, parallel execution, automatic merges/worktrees, general shell workers, dependency installation and cloud orchestration. No website feature is required for this release.

The [provider research](../implementing-docs/TASK_PROVIDER_RESEARCH_0.4.0.md) selects a tool-free OpenAI Responses boundary and records dated official API model IDs, native efforts, observed prices, usage and privacy limits. Exact SDK/runtime pins, account access, effective-configuration reporting and shipping catalog/verification recipes still require qualification before managed implementation/support. The [reuse audit](../implementing-docs/TASK_COMPILER_REUSE_0.4.0.md) records current-source seams and required extensions; the [benchmark protocol](../implementing-docs/TASK_BENCHMARK_0.4.0.md) freezes fixture designs, independent criteria and resource ceilings. None authorizes provider spending or claims implemented support.

See [implementation roadmap](../implementing-docs/ROADMAP_0.4.0.md) and [status](../implementing-docs/STATUS_0.4.0.md).
