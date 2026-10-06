# RepoSetup 0.4.0 — frozen task-domain contracts

Status: Milestone A specification freeze, 2026-10-06. These are implementation requirements for later milestones, not implemented APIs or commands. Contract versions below are independent of package versions, stack configuration `schemaVersion: 1`, and selection format v1.

Read the [product contract](./TASK_COMPILER_0.4.0.md), [initial support profile](./TASK_SUPPORT_0.4.0.md), [provider research](../implementing-docs/TASK_PROVIDER_RESEARCH_0.4.0.md), [reuse decisions](../implementing-docs/TASK_COMPILER_REUSE_0.4.0.md), and [benchmark protocol](../implementing-docs/TASK_BENCHMARK_0.4.0.md) with this document. Any later contract amendment requires an explicit revision and corresponding fixtures; silently changing a frozen plan is prohibited.

## Authority and compatibility

`InstallationPlan` remains a deterministic result of curated integrations, registry relationships, stack configuration and package-manager adapters. Its current installation operation union is not accepted as task input. Existing installer operations such as `run_command`, `verify.command`, package installation and overwrite behavior do not confer task authority.

`TaskPlan` is a coding decomposition. A caller or the selected provider may supply a candidate `TaskPlanDraft`; core validates it against authoritative selected requirements and repository evidence before freezing it. A model can propose objectives, references and text changes. It cannot authorize processes, broaden scopes, change budgets, accept its own work or alter verification recipes.

Core owns strict validation, graph ordering, coverage, context metadata, routing policy, verification classification and state transitions. CLI owns concrete provider, repository, state and process adapters. The executor is the sole authority that executes trusted checks or mutates project files, plan/run artifacts, locks and journals. Read-only adapters may inspect permitted files. No task contract carries executable commands, hooks, shell strings, installation operations, executable plugin references, arbitrary model endpoints or provider tools.

Normal installation, local draft validation, local context preparation and trusted local verification require no RepoSetup AI credits. An external agent uses its own allowance. Managed model calls require the selected provider's credentials and explicit usage allowance. A preferences file or resource ceiling alone never grants spending authorization.

## Common boundary rules

Every independently serialized task document uses a literal `kind` and `schemaVersion: 1`. The frozen kinds are `task_plan_draft`, `task_plan`, `task_preferences`, `task_context`, `routing_decision`, `task_verification_result`, `execution_attempt`, `change_set`, `task_handoff`, `task_handoff_result`, `task_provider_reply`, and `phase_run`. Nested records are strict objects too. Missing required fields, unknown fields, unknown versions, unknown discriminator values, invalid UTF-8, strings containing unpaired Unicode surrogates, non-finite numbers and duplicate JSON object keys fail closed. Do not coerce strings to numbers, strip unknown keys or downgrade future versions. Optional fields are absent rather than `null`, except the explicitly nullable fields listed below.

External data is validated with strict Zod boundaries before domain use. Provider JSON-schema support is a transport constraint, not a replacement for local validation. Because some provider schemas require every property, a provider wire adapter may use explicitly nullable fields and must convert only its documented wire envelope into the strict domain record; it may not silently drop unexpected properties.

IDs for requirements, tasks, criteria, artifacts, checks and catalog entries are ASCII lower-case names matching `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`, at most 64 characters. IDs are unique within their applicable plan/catalog namespace. A task retains its ID through retries of the same frozen plan; a new plan is a new namespace. References always include the relevant plan/revision identity when crossing records. IDs are identifiers, never paths or execution instructions.

Hashes are `sha256:` followed by 64 lower-case hexadecimal characters. File hashes cover exact bytes, including line endings. Document revision hashes cover canonical JSON of the complete payload excluding its own content-addressed identity field (`planId`, `contextId`, `changeSetId`, `routingId`, `verificationId`, or `handoffId`): lexically sorted object keys, UTF-8 encoding, no insignificant whitespace, integer finite counters and no Unicode rewriting of content. Arrays declared as sets are deduplicated and sorted lexically before hashing; arrays with semantic order retain it. The compiler, not the provider, performs canonicalization. JSON wire order does not change the plan identity.

The normative set-valued scalar arrays are `requirementIds`, `phaseCriterionIds`, `taskIds`, `taskCriterionIds`, `requiredArtifactIds`, `requiredCheckIds`, `checkIds`, `criterionIds`, `modelProfileIds`, `features`, `inclusionReasons`, and exact output/write `paths`. `scope.read`, `scope.write`, `scope.deny`, and preference `exclusions` are selector sets ordered by discriminator then path. `tasks` are ordered by task ID, `dependencies` by predecessor then consumer, `coverage` by requirement ID, task `outputs` by artifact ID, and `providerAvailability` by provider ID. Duplicate identities/edges/selectors in these record sets are validation errors; canonicalization does not erase conflicting declarations. All other arrays are ordered: authoritative `requirements`, `phaseCriteria`, task `criteria`, `constraints`, `sourceRefs`, `evidenceRefs`, context `sources` and `rules`, `predecessorArtifacts`, `unresolvedQuestions`, `unresolvedReferences`, `orderedTaskIds`, `rejectedCandidates`, verification `checks`/`criterionCoverage`, `changes`, `effects`, `attempts`, `events`, and accepted artifact revisions. Context construction produces its source/rule order deterministically; a caller cannot arbitrarily reorder an ordered array and retain its identity.

`planId` equals the frozen plan revision hash; `contextId`, `changeSetId`, `routingId`, `verificationId`, and `handoffId` equal their canonical payload hashes. `runId` is an executor-created UUID, `attemptId` is `runId/taskId/attemptNumber`, and run snapshots carry a positive monotonically increasing `stateRevision`. Wall-clock timestamps are UTC RFC 3339 strings; duration/resource accounting uses a monotonic clock. Timestamps never establish freshness in place of hashes.

No secrets may occur in preferences, plans, contexts, handoffs, change proposals, attempt artifacts or diagnostic metadata. Credential values remain in the provider adapter's transient credential path and never enter core records. Source/prompt/proposal contents and raw process logs are not routine telemetry. A locally retained recovery proposal is a separate restricted artifact, validated for scope and prohibited material; it is not embedded in ordinary status output. Redaction is a second precaution, not permission to read excluded secrets.

## Selected phase and decomposition input

Compilation takes a trusted `PhaseSelection` in memory, a `TaskPlanDraft`, reviewed support/check catalogs and current repository metadata. `PhaseSelection` contains `phaseId`, `sourcePath`, `sourceFileHash`, a 1-based inclusive `lineRange`, `selectionHash`, and the authoritative ordered `requirements` and `phaseCriteria` lists. Each requirement has `requirementId`, `text`, `sourceRefs`, and one or more independently supplied `phaseCriterionIds`. A source reference is a project-relative path, whole-file hash and optional inclusive line range. All ranges must exist and all hashes must match when selected. Phase/requirement semantics come from the caller's reviewed structured input; selecting Markdown headings alone does not infer semantic requirements.

Line selections split the exact validated UTF-8 file bytes at LF boundaries, retain selected line terminators (including preceding CR), start line 1 at byte zero (including a BOM if present), and retain the final unterminated line. `selectionHash` covers those selected bytes. No newline conversion, BOM removal or text normalization occurs before file/selection hashing. A trailing LF terminates the preceding line rather than creating an extra selectable empty line.

Each phase criterion has `criterionId`, `statement`, `evidenceKind` (`trusted_check` or `reviewer_evidence`), and a trusted check ID. The verifier's catalog binds reviewer evidence to a reviewed fixture or manual acceptance procedure. A model cannot create its own independent phase oracle. Empty selected requirements, uncovered requirements, missing acceptance authority, unresolved architectural decisions that affect implementation, or a selection no longer matching its source prevent compilation.

`TaskPlanDraft` requires `phaseId`, `selectionHash`, `tasks`, `dependencies`, and `unresolvedQuestions`. It contains no plan ID, execution state, usage counters or claimed verification. Its task/dependency records use the shapes below. `unresolvedQuestions` is an array of records containing an ID, question, affected requirement IDs and `blocking: true | false`. Any blocking question prevents freezing. Non-blocking questions remain visible in the frozen plan and cannot weaken acceptance. A missing draft or missing decomposition authority produces `TASK_DECOMPOSITION_REQUIRED`, with an actionable request for reviewed structured input or an explicitly allowed provider; it must not fabricate an implementation phase.

## Frozen TaskPlan

`TaskPlan` requires `planId`, `phase`, `project`, `supportProfileId`, `supportProfileRevision`, `checkCatalogRevision`, `requirements`, `phaseCriteria`, `tasks`, `dependencies`, `orderedTaskIds`, `coverage`, and `unresolvedQuestions`.

- `phase` is the complete selected-phase identity above. `requirements` and `phaseCriteria` equal its authoritative copies; the draft cannot remove or rewrite them.
- `project` contains `rootIdentity`, `baselineCommit`, and `baselineTreeHash`. `rootIdentity` hashes the CLI adapter's canonical root identity; it is not an absolute filesystem path. `baselineCommit` identifies the repository commit, while `baselineTreeHash` covers the relevant actual files and inventory. Git ancestry alone does not prove current bytes.
- `supportProfileId` is `managed-ts-node-v1` for the initial qualified managed profile. A portable packet can declare this requested profile while reporting qualification as `unconfirmed`; that does not assert support for an unqualified project.
- `orderedTaskIds` is core's stable topological order, choosing lexically smallest ready task IDs at each step. Declared independent tasks remain sequential in v1.
- `coverage` is derived by core: one record for every selected requirement, containing its task IDs, task criterion IDs, phase criterion IDs and required artifact IDs. Core recomputes it; draft-supplied coverage is an unknown field and is rejected.

A task requires `taskId`, `objective`, `requirementIds`, `kind`, `constraints`, `scope`, `criteria`, `requiredCheckIds`, `outputs`, and `capabilityRequirements`.

- `kind` is `implementation`, `test`, `documentation`, or `investigation`. Investigation/documentation are not escape hatches from criterion coverage; they must produce their declared evidence/artifacts.
- `constraints` is an array of non-empty declarative strings. It may state requirements but cannot authorize command execution, scope expansion or new dependencies.
- `scope` contains `read`, `write`, and `deny`. A read selector is a strict tagged record, either `file` with one exact path or `subtree` with a literal directory path. Write selectors are exact text file paths only. Deny selectors use the same file/subtree form as reads. No glob, regular expression or shell expansion is defined.
- A criterion has `criterionId`, `statement`, non-empty `requirementIds`, `evidenceKind`, and non-empty `checkIds`. Those IDs must resolve to the frozen catalog. Model prose is a proposed criterion, never proof.
- `requiredCheckIds` includes every criterion's applicable deterministic checks and profile-required checks. It cannot omit a mandatory profile check. `task.acceptance` is required for each task and `phase.acceptance` for the final gate; both refer to reviewer-owned authority rather than executable plan text.
- Each output has `artifactId`, `kind` (`file_snapshot` or `reviewed_evidence`), a non-empty list of exact `paths`, and `criterionIds`. Paths for file snapshots must belong to the task's write scope; reviewed evidence references permitted reads or a verifier-owned evidence artifact. Completion records the accepted hashes, not model-claimed content.
- `capabilityRequirements` has `features`, `minimumCapabilityClass`, and `evidenceRefs`. Features are qualitative tags: `mechanical_edit`, `local_logic`, `interface_change`, `cross_module`, `test_design`, `security_sensitive`, and `ambiguity_resolution`. Evidence references point to task requirements, source references or constraints. The initial floor is `baseline` or `strong` from a reviewed catalog. Core applies conservative deterministic floors and may raise a draft's floor; it cannot lower an evidenced floor to satisfy a cheap candidate. An invented complexity score or success probability is not a contract field.

Each dependency requires `predecessorTaskId`, `consumerTaskId`, and non-empty `requiredArtifactIds`. Every required artifact is declared by that exact predecessor. Self-dependencies, duplicate edges, absent tasks/artifacts and cycles fail. Every output artifact has one producer. The consumer cannot run against unaccepted or invalidated artifact revisions.

Coverage validation requires every selected requirement to have at least one task, at least one task criterion and an independent phase criterion. Every task requirement reference and criterion reference must exist; a criterion cannot claim a requirement absent from its owning task. Every declared output must link to at least one criterion. The coverage graph can prove reference completeness, not semantic sufficiency: the reviewed independent criteria remain the authority for whether the intended behavior was achieved.

## Scope and repository validation

Project-relative paths use `/` separators, are non-empty and Unicode NFC, and contain no absolute root, drive prefix, UNC prefix, colon, backslash, NUL, control character, empty segment, `.` segment or `..` segment. Trailing/leading whitespace is rejected. These stricter task rules are additive; they do not change accepted legacy installer/configuration paths. Check path membership by complete segments, so `src/a` does not include `src/ab`.

Write scope must be inside read scope, allowing read metadata for an expected-absent exact target. Deny selectors win over reads and writes. The reviewed support profile's immutable exclusions win over caller/model scopes; user preferences may only narrow them. Reject writable Git internals, secrets, credentials, dependency trees, binaries, generated output, manifests, lockfiles, task preference/state artifacts, trusted verifier definitions and holdout files in the initial profile. A placeholder-only `.env.example` is not permission to read a real `.env` or credential file.

One task owns each exact write path for the entire frozen plan. Overlapping writers, case-folded aliases on the host, and paths whose canonical identity aliases another target are rejected. Multiple attempts of the same task retain ownership. Shared interface changes belong to one task with downstream artifact dependencies; implicit ownership transfer is deferred. No profile claim permits parallel workers.

Before including source or applying a proposal, the repository adapter resolves the canonical project root and the actual path or nearest existing ancestor. Every resolved component must remain inside the permitted root and selector. Reject symlink escapes and ambiguous path/case identities. Managed write targets and their parent chain must not rely on symbolic links; reject multiply linked targets where filesystem metadata reveals a hard link. Recheck canonical identity and content hashes immediately before use. Inventory only eligible paths; do not send inventory contents or file bodies wholesale to a provider.

A clean Git baseline is mandatory for managed execution: no tracked or untracked project changes at run start. External state storage is outside the project tree. Handoff may inspect an existing working tree, but records the actual baseline and advisory enforcement. During managed execution, any project change not attributable to the executor's recorded batch or approved trusted check effect is drift and stops further mutation. Unknown changes are preserved for review.

## Preferences and finite resources

`TaskPreferences` is the optional `reposetup.tasks.json` document. It requires `executionMode` (`handoff` or `managed`), `qualityPreference` (`conservative` or `balanced`), `supportProfileId`, `providerAvailability`, `effortPreference`, `resourceLimits`, and `exclusions`. The default when no preferences file exists is local handoff with no provider-call authority. This file is separate from `reposetup.json`; it neither changes stack selection nor adds task fields to schemaVersion 1 stack configuration.

`providerAvailability` is an array of strict records containing a reviewed `providerId`, `enabled`, and an allowed set of `modelProfileIds`. In the initial experiment only the reviewed OpenAI Responses adapter is eligible. Logical catalog IDs resolve to qualified mappings owned by the CLI adapter/catalog, not arbitrary endpoint or model-name strings. Availability is a preference; credential/model/runtime checks may still block execution. The file carries no credentials, custom base URLs, command strings, hooks, provider tool declarations or executable verification recipes.

`effortPreference` is a strict union: `minimum_supported`, or `explicit` with a reviewed native effort ID. Native effort eligibility is checked for each model profile. There is no universal numeric effort ladder, no conversion of effort into model capability, and no silent replacement of unsupported effort. `qualityPreference` selects a reviewed policy revision; it cannot lower a task's capability floor or required checks.

`ResourceLimits` requires positive finite integers: `maxImplementationAttemptsPerTask` (1 through 3), `maxProviderCalls`, `maxInputTokens`, `maxOutputTokens`, `maxWallTimeMs`, and `maxCostMicrousd` (one millionth of a US dollar). Local/handoff runs retain the requested ceilings as metadata but have managed call authority `none`; the managed usage ledger stays zero/unknown and external-agent usage is separately reported. No provider is enabled by omission. A managed run requires an explicit allowed provider and reviewed allowance in addition to these ceilings.

Compilation, context expansion, proposal generation, retries, refusals and charged failed requests all count toward phase limits. Before each call reserve its conservative maximum call/token/cost allocation against the remaining phase allowance; reconcile from returned usage afterward. A positive token or cost allowance is a ceiling, not an optimization target. If usage or current qualified pricing cannot support a conservative reservation, stop with a blocker rather than assume zero cost. Provider-internal cached/reasoning/output counters remain provenance-bearing components; never count the same total twice.

Support-profile hard limits include `maxContextBytes`, `maxFileBytes`, `maxChangeSetBytes`, `maxCheckDurationMs`, `maxCapturedOutputBytes`, and `maxProviderOutputTokens`, with reviewed finite values defined in the support document/catalog. Runtime uses the stricter profile, user and remaining allowance. Encoded context bytes, estimated tokens and provider-reported tokens remain different measures. No limit can be increased by a plan/model response. The benchmark's $10 ceiling is not provider-spending authorization.

## Fresh task context

`TaskContext` requires `contextId`, `planId`, `taskId`, `inputRevision`, `sources`, `rules`, `predecessorArtifacts`, `size`, and `unresolvedReferences`.

- `sources` contains exact permitted `path`, `fileHash`, optional `lineRange`, `selectionHash`, `byteLength`, `inclusionReasons`, and `required`. Inclusion reasons are `explicit_reference`, `write_target`, `requirement`, `nearby_test`, `local_import`, `interface`, `applicable_rule`, or `predecessor_output`. Duplicate selected ranges are merged deterministically, with all reasons retained.
- `rules` contains applicable rule paths, hashes and applicability scope. Include applicable ancestor rules inside the approved boundary; a required rule that cannot be safely read blocks the attempt. A rule may constrain behavior, not override executor authority, exclusions, budgets or fixed checks.
- `predecessorArtifacts` contains producer task ID, artifact ID, acceptance revision, per-path hashes and verification ID. All records must refer to the currently accepted predecessor output, not an earlier successful attempt after a repair.
- `size` contains encoded `bytes`, `estimatedInputTokens`, and `estimatorId`. Token estimates are explicitly estimates; overflow blocks the call rather than silently truncating required source.
- Each unresolved reference identifies the requesting source/task, target, reason and `required`. Required missing references block; optional unresolved references remain visible in the handoff/provider packet.

`inputRevision` hashes selected requirement/source/rule identities, current write-target preimages and accepted predecessor artifacts. The context distinguishes immutable read/rule/predecessor inputs from the task's writable preimages. Before application both groups must still match; after application immutable inputs must remain current while each owned write path must match its recorded postimage. An authorized own-file change does not immediately make its own attempt stale. Contents are read and materialized transiently by the CLI repository adapter only after scope/privacy checks, then sent only to the reviewed selected provider/agent boundary. Persistent context/status records contain metadata, not the whole repository or source bodies. Each new attempt rebuilds/rechecks current hashes, even if an earlier attempt's metadata is reusable. Context expansion requests are exact permitted source references and optional ranges, never filesystem tool calls or commands; requests outside scope need a reviewed new plan.

## Routing decision

`RoutingDecision` requires `routingId`, `planId`, `taskId`, `contextId`, `catalogRevision`, `policyRevision`, `requiredCapabilities`, `selected`, `rejectedCandidates`, and `rationale`.

`selected` contains logical `adapterId`, `providerId`, `modelProfileId`, separate `nativeEffortId`, qualified context/output limits, and `enforcement` (`managed` or `advisory`). A handoff may report these as recommended identities, with `effectiveConfiguration: unknown`; it cannot claim the host used the requested model/effort. For a managed attempt, effective configuration has explicit provenance: provider-reported, adapter-confirmed or unknown. Do not relabel requested values as provider-reported facts.

Each rejected candidate records its profile/effort pair and one or more named reasons: unavailable adapter/model, unsupported effort, missing capabilities, inadequate context/output capacity, absent allowance or budget exhaustion. Candidates are filtered by capability and native effort separately before using reviewed dated price evidence. Equal eligible choices use stable catalog order. No eligible pair yields an actionable blocker, never an automatic switch to an unreviewed provider or weaker model.

## Typed text ChangeSet

`ChangeSet` requires `changeSetId`, `planId`, `taskId`, `attemptId`, `inputRevision`, and a non-empty ordered `changes` array. It carries only text proposals, never installation operations, commands, arbitrary diffs, binary data, URLs to executable code, deletes, moves or renames. A task that legitimately requires no text edits records a separate `no_change` proposal outcome and must still verify declared criteria; an empty ChangeSet is invalid.

Each change is one strict union member:

- `create_text`: exact target `path`, `expectedState: absent`, and UTF-8 `content`.
- `replace_text`: exact target `path`, `expectedFileHash`, non-empty exact `oldText`, and UTF-8 `newText`.

There is at most one change per canonical target in a batch. A replacement's `oldText` must appear exactly once in the expected current file bytes; matching is exact, including line endings. No fuzzy matching, implicit newline conversion or blind whole-file overwrite is permitted. Content/path/profile byte limits and prohibited-material checks apply before effects. Text is source content, never evaluated as an execution instruction.

Executor preflights the entire batch: task ownership, root identity, revision, target absence/hash, unique replacement, file encoding, safety, parent paths and writeability. Failed preflight means zero project effects. Immediately before each effect it rechecks canonical path and preconditions, writes an individual atomic file replacement or exclusive expected-absent creation, records the resulting hash and durably records the effect. Creating necessary in-scope parent directories is executor-owned and recorded too. No multi-file transaction is claimed.

`application` records `not_applied`, `applied`, `partially_applied`, or `rejected`, with ordered effect records, any failure code, and resulting project revision. Each effect has target path, before/after hash or explicit absence, change index and durable sequence number. A later failure preserves all completed effects. There is no reset, stash, rollback, commit, dependency installation or automatic retry over unknown state. State/journal writes must succeed for task work; the installer journal's best-effort behavior is not sufficient here.

## Verification and accepted artifacts

`TaskVerificationResult` is distinct from the existing integration `VerificationResult`. It requires `verificationId`, `planId`, `runId`, `target`, `checkedRevision`, `inputRevision`, `checkCatalogRevision`, `outcome`, `checks`, `criterionCoverage`, `unexpectedChanges`, and timestamps/duration. `target` is a strict union: `task` with `taskId`, or `phase` with `phaseId`; a task named `phase` cannot alias the final gate.

`outcome` is `pass`, `fail`, `blocked`, or `needs_review`. Each check result has `checkId`, `definitionRevision`, `status` with the same four values, execution/evidence provenance, permitted evidence artifact references, duration, and a machine-readable failure code when non-passing. Deterministic check evidence includes exit status, timeout/truncation status, discovered/executed test counts where applicable, and bounded redacted output digest/snippet metadata. Reviewer evidence identifies its authority and exact checked revision. A model statement has provenance `model_claim` and never satisfies a criterion.

The initial catalog IDs are `ts.typecheck`, `ts.lint`, `ts.unit`, `task.acceptance`, and `phase.acceptance`. Concrete argv/environment/tool identities live in the fixed reviewed CLI verification adapter. Project scripts, README text, model suggestions and plan/config strings are discovery evidence only. Freeze hashes of adapter/check definitions, resolved local tool identities and configuration/fixtures used by the checks. Changes to trusted definitions invalidate trust and block future checks until independently requalified.

`criterionCoverage` lists every applicable criterion, its check/evidence references and whether it is satisfied at `checkedRevision`. A required deterministic check must genuinely execute against that revision. Missing tools block; failing checks fail; zero discovered/executed required tests fail; absent reviewer evidence needs review. Commandless installer verification, doctor success, a provider completion, a previous revision's test output or a supplied `pass` string cannot establish task completion.

Verifier records project snapshot identities before/after its checks. Any unapproved process effect or scope violation is `unexpectedChanges` and prevents acceptance, even if exit status is zero. Initial checks permit no project writes; any cache/output behavior must be redirected to executor-controlled external state and its allowed effects recorded. Environmental isolation and `shell: false` are defense in depth, not an OS sandbox. Only reviewed trusted local projects are eligible.

Acceptance requires all required checks and criteria to pass, current immutable input/rule/predecessor hashes, matching owned-output postimages, no forbidden/unexpected changes, and no unresolved required evidence. The verifier binds the original `inputRevision` to the recorded preimage-to-postimage application receipt; it does not require edited write targets to retain their original bytes. Accepted artifacts contain artifact ID, producer/attempt, acceptance revision, verification ID and per-path current content hashes. The final run succeeds only after every task is accepted and `phase.acceptance` passes against the final current project revision. Historical task passes do not replace the final gate.

## ExecutionAttempt and failure classification

`ExecutionAttempt` requires `attemptId`, `runId`, `planId`, `taskId`, `attemptNumber`, `contextId`, `inputRevision`, `routingId`, `requestedConfiguration`, `effectiveConfiguration`, `startedAt`, `status`, `proposalOutcome`, `application`, `verification`, `failure`, and `usage`. Final-only fields (`finishedAt`, verification/failure evidence) use explicitly nullable values while pending; they must become concrete or remain `unknown` with provenance when the provider cannot report them.

`status` is `prepared`, `requesting`, `proposal_received`, `applying`, `verifying`, `accepted`, `failed`, `blocked`, `needs_review`, `cancelled`, or `interrupted`. `proposalOutcome` is `pending`, `change_set`, `no_change`, `refused`, `incomplete`, or `invalid`. Application and verification are independent: a received proposal is not an applied change; applied text is not accepted work. Opening an implementation attempt and making its initial provider dispatch/external handoff consumes one attempt number, including invalid/refused/incomplete outcomes. Bounded context requests and their continuation calls remain inside that opened implementation attempt, consume provider-call/token/cost/wall allowance, and cannot open an extra attempt or reset its counters. A repair after that attempt fails opens the next attempt with fresh failure-specific context.

`failure` contains a named error code, one primary class, affected evidence/task IDs, and a reviewed suggested action. Classes are `implementation`, `missing_context`, `stale_context`, `output_incomplete`, `infrastructure`, `policy_violation`, `ambiguity`, `budget`, `cancellation`, and `project_drift`. A test/typecheck failure can justify a focused repair and, after evidence, independent capability/effort escalation. Missing context needs bounded context resolution; stale hashes need fresh reconciliation; infrastructure needs an available adapter/tool; ambiguity needs an authoritative decision. These are not automatic reasons to select a more expensive model. A policy violation or unknown drift stops mutation pending review.

`usage` separately records reported/estimated/unknown input/output/reasoning/cache token values, provider-reported call identity, duration, price catalog revision, reported/estimated/unknown cost and reserved allowance. Missing fields are unknown, not zero. External-agent usage is advisory and kept separate from the managed provider ledger. Refused, incomplete and failed charged calls remain in totals. No usage record contains credentials, raw prompts or source bodies.

## PhaseRun and state transitions

`PhaseRun` requires `runId`, `stateRevision`, `planId`, `project`, `executionMode`, `supportQualification`, `status`, `tasks`, `attempts`, `resourceLimits`, `resourceLedger`, `acceptedArtifacts`, `activeAttemptId`, `finalVerification`, and `events`. `activeAttemptId` and `finalVerification` are explicitly nullable. `supportQualification` is `qualified`, `unconfirmed`, or `unsupported` with reasons and profile revision. Managed work requires `qualified`; handoff cannot promote itself to qualified.

`project` binds the canonical root identity, baseline commit/tree, latest executor-observed project revision and last reconciled revision. `resourceLedger` carries reservations and actual/estimated/unknown consumed values for every call/check; counters cannot decrease except release of an unused reservation. `events` is an ordered durable transition/effect ledger with sequence, previous state revision, event identity, monotonic timing and safe metadata. State writes use executor-controlled atomic snapshots with compare-and-swap revision checks; invalid versions, corruption, stale writers or unavailable durable storage stop work. Artifact storage is local and outside the tracked tree with restrictive permissions; retention/deletion is explicit user-owned lifecycle work, not automatic cleanup of failed edits.

Task states are `queued`, `ready`, `running`, `verifying`, `accepted`, `needs_repair`, `blocked`, `needs_review`, `invalidated`, and `cancelled`.

1. Initially tasks are queued. Core moves a task to ready only when all predecessors' required artifacts are accepted at their current revisions and context/check/support/resource prerequisites are satisfiable. Missing prerequisites produce blocked with a named reason.
2. Ready moves to running after an attempt is durably opened and a managed call or portable handoff is dispatched. Only one task/attempt may be active in a run, protected by the executor's project lock.
3. Running moves to verifying only after a recorded application/no-change outcome and successful revision reconciliation. A malformed/policy-violating proposal blocks or needs review; interruption never implies that no effect occurred.
4. Verifying moves to accepted only with a passing current result. An implementation failure moves to needs_repair while limits remain; infrastructure/context failure moves to blocked; unresolved authoritative evidence or unknown effects move to needs_review.
5. Needs-repair returns to ready with fresh failure-specific context and another recorded attempt; it cannot exceed three implementation attempts or any phase resource ceiling. Blocked returns to queued/ready only after its specific cause is resolved and current evidence is rebuilt.
6. Accepted moves to invalidated if its accepted output postimages, immutable input/requirement/rule/check identities or accepted predecessor revisions change. Its own recorded preimage-to-postimage effect is part of acceptance, not subsequent drift. Transitive consumers are invalidated/blocked and cannot retain stale acceptance. Invalidated returns to queued after reviewed reconciliation, not by restoring an old pass flag.
7. Any non-accepted task may become cancelled by user cancellation; already accepted tasks retain their historical evidence. Cancellation, terminal budget exhaustion and a needs-review state do not mark dependent work complete.

Run states are `prepared`, `active`, `blocked`, `needs_review`, `succeeded`, `failed`, `cancelled`, and `interrupted`. Prepared becomes active after review/prerequisites and a durable start. Active becomes blocked when no ready task can proceed for a resolvable prerequisite, needs-review for unknown effects/ambiguity, failed for exhausted attempts/resources or non-recoverable execution/verification failure, cancelled on cancellation, or succeeded only after final phase acceptance. Resume from blocked/interrupted/needs-review requires executor reconciliation and durable transition evidence. A succeeded run remains immutable historical evidence; later project drift creates invalidation evidence/new reviewed work, never rewrites success into a claim about current bytes.

Interrupted applying/verifying/requesting states must be reconciled against recorded effect hashes and provider call identity before resumption. Do not resend an ambiguous paid call or reapply an ambiguous text batch. Observed partial changes are preserved and reported. The task state becomes needs-review whenever reconciliation cannot prove the exact effects, ownership or remaining allowance. No automatic rollback or new worktree is part of recovery.

## Portable agent handoff

`TaskHandoff` requires `handoffId`, `planId`, `runId`, `taskId`, `attemptId`, `contextId`, `inputRevision`, `objective`, `requirementIds`, `constraints`, `scope`, `criteria`, `requiredCheckIds`, `acceptedPredecessorArtifacts`, `recommendedRouting`, `resourceLimits`, `enforcement`, and `unresolvedReferences`.

`TaskPacket` is the human/protocol name for the `TaskHandoff` envelope, not a separate schema. The content packet is vendor-independent and contains only the approved bounded context, applicable safe rules and task-local metadata. Persistent packet metadata carries hashes; source material is supplied transiently. `enforcement` explicitly reports routing, scope, budgets and verification as `managed`, `advisory`, or `unconfirmed` per dimension. For an ordinary external agent they are advisory/unconfirmed, regardless of the recommendation. A host report may be evidence with host provenance; it does not certify actual effective model/effort or filesystem enforcement without independent adapter qualification.

An agent can return a strict ChangeSet, a structured no-change result, bounded context requests or a non-authoritative completion claim. Only the RepoSetup executor applies managed changes and only the trusted verifier accepts work. If an external agent edits files itself, the adapter must inspect actual effects, revision and scopes as externally produced evidence; it cannot label those writes executor-owned or silently accept unrelated edits. Any plan/check/context drift invalidates the packet. Unsupported project-language handoff remains portable/advisory, not a claim of qualified managed support.

`TaskHandoffResult` requires `handoffId`, `planId`, `taskId`, `attemptId`, `inputRevision`, `reply`, `reportedConfiguration`, and `reportedUsage`. `reply` is a strict nested union: `change_set` with the complete ChangeSet; `no_change` with a declarative rationale; `context_request` with non-empty exact source path/range references and reasons; `externally_applied` with reported path/before/after hashes and completion claims; or `blocked` with a named code and explanation. Reported configuration/usage are either concrete values with `host_reported` provenance or explicit `unknown`. None of these results supplies trusted acceptance or execution recipes. Externally applied effects require independent inspection/manual review and cannot enter the managed effect ledger as executor writes.

`TaskProviderReply` is the reviewed managed coding wire envelope: an object with `kind`, `schemaVersion`, plan/task/attempt/input identities, and nested `reply` limited to `change_set`, `no_change`, or `context_request` using the same strict members. The root is not a union. Provider refusals/incomplete responses are transport outcomes, not fabricated successful envelopes. The decomposition request separately returns a strict `TaskPlanDraft` through its reviewed wire translation. Bounded context requests carry no executable tools; core checks exact paths/ranges and remaining allowance before the adapter reads or sends anything.

## Named task errors and exit meanings

Later implementation adds task-domain codes to the existing machine-readable error model. Messages may evolve; codes and exit meanings are the contract. Error details are bounded, secret-free metadata. They include relevant IDs, hashes, paths/checks and an actionable suggestion, never raw provider request/credential values. Legacy codes and existing mappings stay unchanged. No additional numeric exit code is introduced.

Exit 2, invalid external input:

- `TASK_SCHEMA_VERSION_UNSUPPORTED` — unknown task-document version.
- `TASK_PREFERENCES_INVALID` — invalid preference shape/value or prohibited field.
- `TASK_DRAFT_INVALID` — malformed draft, unknown fields or invalid task structure.
- `TASK_PLAN_INVALID` — malformed frozen plan or mismatched canonical identity.
- `TASK_RUN_STATE_INVALID` — invalid/corrupt imported run-state contract.
- `TASK_SELECTION_INVALID` — invalid phase selection, source range or required input.
- `TASK_CHANGESET_INVALID` — malformed external ChangeSet shape/discriminator.

Exit 3, resolution, contract consistency or policy:

- `TASK_DECOMPOSITION_REQUIRED` — no authorized structured decomposition source.
- `TASK_ID_DUPLICATE` — duplicate task/requirement/criterion/artifact identity.
- `TASK_REFERENCE_INVALID` — absent or wrong-owner requirement/task/criterion reference.
- `TASK_REQUIREMENT_UNCOVERED` — missing task, task criterion or independent phase coverage.
- `TASK_DEPENDENCY_CYCLE` — cycle or self-dependency.
- `TASK_ARTIFACT_INVALID` — absent/ambiguous producer or invalid artifact dependency.
- `TASK_SCOPE_INVALID` — unsafe or invalid declared selector/path.
- `TASK_SCOPE_VIOLATION` — context/proposal outside approved scope or immutable exclusions.
- `TASK_OWNERSHIP_CONFLICT` — overlapping or aliased write owners.
- `TASK_PROFILE_UNSUPPORTED` — project outside the selected managed profile.
- `TASK_PROVIDER_CONFIGURATION_UNSUPPORTED` — unqualified mapping, endpoint or effort combination.
- `TASK_CONTEXT_UNRESOLVED` — required safe source/rule/artifact missing.
- `TASK_CONTEXT_LIMIT_EXCEEDED` — required context cannot fit qualified limits.
- `TASK_CONTEXT_STALE` — context/predecessor/source hashes no longer match.
- `TASK_PLAN_REVISION_STALE` — changed selected phase/plan/support identity.
- `TASK_CHECK_DEFINITION_CHANGED` — trusted recipe/tool/configuration identity changed.
- `TASK_PROJECT_DRIFT` — unexpected actual repository changes.
- `TASK_AMBIGUOUS_REQUIREMENT` — unresolved authoritative implementation decision.

Exit 4, missing prerequisites or available authority:

- `TASK_PREREQUISITE_MISSING` — runtime/dependencies/trusted tool/profile qualification absent.
- `TASK_PROVIDER_UNAVAILABLE` — configured adapter/model unavailable.
- `TASK_PROVIDER_CREDENTIAL_MISSING` — transient credential unavailable.
- `TASK_PROVIDER_ALLOWANCE_REQUIRED` — no explicit managed usage allowance.
- `TASK_CAPABILITY_UNAVAILABLE` — no available qualified model/effort pair meets the task floor.
- `TASK_CHECK_BLOCKED` — required trusted check cannot safely execute.

Exit 1, execution, infrastructure or exhausted limits:

- `TASK_EXECUTION_LOCKED` — project reservation unavailable or already held.
- `TASK_STATE_CONFLICT` — stale concurrent writer or failed revision comparison.
- `TASK_STATE_WRITE_FAILED` — durable effect/run-state storage unavailable.
- `TASK_EXECUTION_ABORTED` — cancellation before completion.
- `TASK_EXECUTION_INTERRUPTED` — incomplete attempt needs reconciliation.
- `TASK_BUDGET_EXHAUSTED` — finite call/token/cost/time allowance exhausted or cannot be safely reserved.
- `TASK_ATTEMPT_LIMIT_EXCEEDED` — no implementation attempts remain.
- `TASK_PROVIDER_FAILED` — provider transport/infrastructure failure.
- `TASK_PROVIDER_REFUSED` — explicit refusal instead of a proposal.
- `TASK_PROVIDER_OUTPUT_INVALID` — provider result fails the reviewed local boundary.
- `TASK_OUTPUT_INCOMPLETE` — truncated/incomplete result, never a partial accepted proposal.
- `TASK_CHANGE_PRECONDITION_FAILED` — expected absence/hash/unique match no longer holds.
- `TASK_CHANGE_APPLY_FAILED` — application fails before a completed effect.
- `TASK_PARTIAL_APPLY` — batch stops after one or more recorded effects.

Exit 5, verification or required acceptance failure:

- `TASK_CHECK_FAILED` — required deterministic check fails or times out.
- `TASK_CHECK_ZERO_TESTS` — required test check finds/runs zero applicable tests.
- `TASK_ACCEPTANCE_UNCOVERED` — evidence missing for one or more acceptance criteria.
- `TASK_VERIFICATION_STALE` — submitted evidence is for another revision/definition/input.
- `TASK_UNEXPECTED_CHANGES` — verifier/agent changes exceed declared effect authority.
- `TASK_NEEDS_REVIEW` — manual/independent evidence or uncertain effects prevent acceptance.
- `TASK_PHASE_ACCEPTANCE_FAILED` — final independent phase gate does not pass.

Exit 0 means the requested local validation/compilation/status operation succeeded, or all requested execution acceptance gates passed. It never means an unimplemented provider/check ran. Existing aggregate-error behavior is preserved: `exitCodeForErrors` starts at 2 and takes the maximum mapped code, so an array containing only general errors currently returns 2 while a single general error returns 1. Task handlers must use the appropriate existing singular/aggregate convention and test it; silently changing legacy aggregation is outside this milestone.

## Frozen future validation vectors

Milestone A defines these fixtures; later milestones implement meaningful tests. This document adds no placeholder commands or feature tests.

Positive vectors:

1. A two-task draft covers two selected requirements; the producer owns `src/contracts.ts`, declares a file artifact and passing criteria, and the consumer owns `src/consumer.ts` with an explicit artifact dependency. Compile twice with reordered set-valued references and JSON key order: identical plan ID and stable topological order. Mutating ordered criterion/source content changes the plan ID.
2. Strict v1 preferences use a reviewed logical model profile and separate native effort. A low-effort strong-capability profile remains distinct from a high-effort baseline-capability profile; only pairs satisfying both independent filters are eligible.
3. A permitted expected-absent UTF-8 creation and an exact single-match hash-guarded replacement pass batch preflight. Executor records both before/after hashes; verifier acceptance refers to that exact resulting revision.
4. Context contains applicable rule hashes and an accepted predecessor artifact revision; optional unresolved imports remain visible. Rebuilding unchanged current bytes yields the same context ID; a changed predecessor/rule hash yields a different input/context revision and invalidates consumers.
5. All deterministic checks execute at the current revision, discover applicable tests, produce no project effects, and reviewer-owned task/final criteria pass. Only then may task and phase transition to accepted/succeeded.
6. A portable packet records recommended model/effort but effective configuration unknown and scope advisory. It remains useful without claiming qualified managed execution or zero external-agent cost.

Negative vectors:

1. Every document kind rejects version 0/2, unknown fields at any nesting level, duplicate JSON keys, invalid enums, non-finite limits, zero ceilings, and attempt limit 4. Stack config and selection v1 fixtures remain accepted by their unchanged schemas.
2. Reject duplicate IDs, dangling requirements/criteria, a task criterion referencing an unowned requirement, an uncovered requirement, an output without evidence, a wrong-producer artifact, self-edge and cycle. A Markdown heading without authoritative decomposition produces an actionable blocker.
3. Reject absolute/traversal/drive/UNC/backslash/colon/NUL paths, prefix-confusable membership, case aliases, symlink escapes, hard-linked write aliases and duplicate ownership. Denying `src/private` rejects `src/private/key.ts` even when a broader read selector permits `src`.
4. Reject secrets/Git/dependency/generated/binary/manifest/lockfile/check-definition/holdout writes and secret reads even when a draft explicitly requests them. No model/plan/config `command`, hook, endpoint or installer operation reaches a process adapter.
5. Stale source/target/predecessor hashes, missing required rules/imports and context overflow prevent the provider request or filesystem mutation. Never truncate a required context item silently.
6. Refused/incomplete/invalid provider results produce no accepted ChangeSet, retain usage provenance, and consume finite allowance. Unsupported native effort does not fall back silently. An unknown cost reservation cannot trigger a paid call.
7. The first batch effect succeeds and the second fails: preserve the first, record partial application, stop, and require reconciliation. Journal/state persistence failure cannot be treated as successful acceptance. An interrupted call/batch is not repeated without proof.
8. A zero-test runner, doctor pass, commandless installer verify, model completion claim, stale successful test output, missing manual evidence or tampered check recipe never accepts a task. A check exit 0 with an unexpected write fails acceptance.
9. Changing accepted producer output invalidates consumers and final acceptance. Merely changing run-state status strings or replaying an old verification ID cannot restore acceptance.
10. Instrument every adapter during task dry-run: reads within scope are allowed; provider, process, write, atomic write, append, mkdir, lock, journal, state, temporary-file and verification calls stay at zero. A missing draft/host probe is reported unresolved, not performed covertly.
11. Run compatibility fixtures for existing commands, aliases, machine-readable result kinds, singular/aggregate exit mappings, curated InstallationPlan determinism, stack configuration and selection inputs. No task release version/package metadata changes are part of schema work.

## Dry-run semantics

Task dry-run performs local parsing, strict validation, deterministic compilation when a structured draft exists, permitted bounded reads, context estimation and advisory routing explanation. It performs zero provider calls, process execution, project/state/artifact writes, lock acquisition, journaling, temporary-file creation, dependency installation or verification. Console/JSON output is an output channel, not a persisted artifact.

Missing decomposition is unresolved rather than generated. Host facts requiring subprocess probes, Git commands or tool invocation remain `not_checked`; available read-only metadata may be described with provenance. A dry-run cannot mark task checks passed, open an attempt, consume managed allowance, advance durable state or claim a project is execution-ready. It reports intended scopes/check IDs, known blockers, estimated limits and advisory routing without printing secrets/source bodies. Existing installer dry-run behavior remains compatible.

## Deferred scope and research tracking

Frozen v1 task shapes do not authorize automatic rollback, dependency/system software installation, parallel execution, multiple providers, MCP, arbitrary commands, local models, executable plugins, websites, automatic commits/merges/worktrees or cloud orchestration. Those require separate product decisions and contracts.

Provider-specific model/effort mappings, actual supported SDK/runtime pins, price/retention behavior and exact trusted verification tool recipes remain qualified evidence owned by the linked research/support records. Unqualified managed catalog entries cannot be enabled just because this schema permits their logical IDs. Research questions about future portability, retention or provider behavior do not create optional bypasses: they block the affected later implementation/qualification gate while leaving this contract freeze explicit and complete.
