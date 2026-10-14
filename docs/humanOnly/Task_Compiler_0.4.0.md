# Experimental task compiler guide

Updated 2026-10-14. Applies to `codex/0.4.0-task-compiler`, not a published 0.4.0 release. The integrated development tree inherits 0.3.1 metadata; the immutable published 0.3.1 package does not contain task commands.

This guide follows the companion website preview pages. Its easiest path uses an existing coding agent without RepoSetup model calls. Production routing remains unqualified.

<a id="task-compiler"></a>

## Use an AI-written coding plan

Preview: turn your plan document into reviewed tasks for an existing coding agent.

### Check availability first

The task compiler is an unreleased 0.4.0 preview. Published rsetup 0.3.1 contains the stack installer and selection builder, but does not contain task commands. This development branch inherits 0.3.1 metadata; --version alone cannot distinguish its extended CLI from the published package. Check task --help on the exact artifact you intend to use.

Use the local task-compiler build below today. Once a release explicitly includes these commands, its installed rsetup or reposetup alias can replace the long node path. Do not paste task commands into npx rsetup@0.3.1 expecting this preview.

```text
node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js task --help
```

[Published CLI reference](../specification-documentation/product-docs/CLI_SPEC.md)

[Task compiler source guide](https://github.com/4d696e6b/RepoSetup/blob/codex/0.4.0-task-compiler/docs/humanOnly/Task_Compiler_0.4.0.md)

### Easiest path: keep using your coding agent

Keep your AI-written plan as PLAN.md in the project. Ask Codex or another existing coding agent to prepare the reviewed inputs, validate them with RepoSetup, then give the agent one independent task packet. RepoSetup calls no model in this path and needs no API key. Your agent's own subscription or usage allowance is separate.

The website is a guide, not a runner. It does not read your project, upload your plan, store preferences or accept credentials. Installation plans remain curated; coding TaskPlans describe bounded source changes.

- Prepare inputs → review paths and checks → validate → obtain a packet → implement → test and review.
- Automatic provider/model routing belongs to managed execution. The portable packet does not switch Codex's model or reasoning setting.

[How the managed router works](#task-router)

### Prepare the preview CLI once

Have Git, Node 24+ and the repository-pinned pnpm 12.5.1 available first. These commands clone into a new folder, install RepoSetup's development dependencies and build the CLI and its workspace dependencies. They do not install dependencies into the project you want to edit. If a prerequisite is missing, arrange it explicitly before continuing.

The branch is moving development source. Record git rev-parse HEAD if you need to reproduce the exact preview. After building, change to your own project directory and replace /absolute/path/to/RepoSetup with this checkout's full path in every example.

```text
git clone --branch codex/0.4.0-task-compiler https://github.com/4d696e6b/RepoSetup.git RepoSetup-task-preview
cd RepoSetup-task-preview
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm --filter 'rsetup...' build
node packages/cli/dist/bin.js task --help
git rev-parse HEAD
```

[Official pnpm installation options](https://pnpm.io/cli/install)

[Official pnpm dependency filtering](https://pnpm.io/filtering)

### 1. Give your plan to the agent

Open your project in the coding agent, attach or point it to PLAN.md, and supply the source guide above. Copy this prompt and replace PLAN.md with your document's actual path. Start with a small task whose work does not depend on another task's unverified output.

A Markdown document is the requirement source, not a TaskPlan. task-review.json records independently reviewed project/phase identities, requirements, criteria, checks and scope. task-draft.json proposes task decomposition. The compiler produces task-compilation.json only after validation. All artifacts use their own version 1 contracts; they are separate from reposetup.json stack configuration.

```text
Read PLAN.md and inspect this repository and its AGENTS.md instructions.
Use the RepoSetup task compiler guide and actual version 1 schemas from the task-compiler checkout.
Start with one small independent coding task from the first phase.
Propose clear requirements, acceptance criteria, permitted read/write/deny paths and named checks.
Prepare task-review.json and task-draft.json outside the project; bind the current project, Markdown phase and source hashes.
Explain which paths and checks I must review. Do not treat model-written review JSON as my approval.
Do not edit project files, install dependencies, make provider calls or expand authority until I review the proposal.
```

[Exact review and task contracts](https://github.com/4d696e6b/RepoSetup/blob/codex/0.4.0-task-compiler/docs/specification-documentation/product-docs/TASK_CONTRACTS_0.4.0.md)

### 2. Review before approving

Read the proposed phase, acceptance criteria, required checks and every permitted write path. Confirm that the scope is sufficient and that secrets, generated outputs and unrelated work are excluded. An AI can draft a review document; it cannot approve its own authority. Keep the JSON artifacts in the project's parent folder for the examples below.

The review binds exact current bytes and identities. If you change PLAN.md, requirements, rules, scopes or source files, regenerate and independently review the affected inputs. Never fix a stale-input error by inventing a hash or broadening permission silently.

- Requirement: what observable behavior must change?
- Acceptance: what independent evidence would establish success?
- Scope: which files may be read, changed or created, and which must be denied?
- Checks: which approved checks and test identities must pass?

### Optional: ask RepoSetup for a decomposition request

If the agent has not prepared a structured draft yet, run this after the review document is ready. Missing --draft intentionally returns TASK_DECOMPOSITION_REQUIRED with a nonzero exit and a structured request. Give that request to your agent to obtain version 1 task_plan_draft JSON; it is not a successful compilation or a provider call.

```text
node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js task compile --root . --review ../task-review.json --dry-run --json
```

### 3. Validate the draft

Run this from the reviewed project directory after preparing the two JSON inputs. Validation checks requirement coverage, phase criteria, dependencies, ownership, scopes and supported versions. Compilation does not implement code or prove that the requested work is complete.

The shell redirects output to a file outside the project. Only use that receipt after the command exits successfully; an error response can also be redirected into the file. No provider call, task state or project write occurs in portable compile.

```text
node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js task compile --root . --review ../task-review.json --draft ../task-draft.json --json > ../task-compilation.json
```

### 4. Give the next task packet to your agent

The first command previews context/scope/check metadata without source bodies. The second prepares the bounded task packet; redirect it outside the project if you want to attach it to your agent. --task <id> can select an independent task explicitly. A packet can contain permitted source text, so share it only with your chosen agent.

Copy the implementation prompt below together with that packet. The agent uses its own tools; RepoSetup does not launch or control the agent, enforce its behavior or select its host model. Scope and attempt identities are advisory in this path.

```text
node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js task next --root . --review ../task-review.json --plan ../task-compilation.json --dry-run --json
node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js task next --root . --review ../task-review.json --plan ../task-compilation.json --json > ../task-packet.json
```

### 5. Implement, test and review

After approving the reviewed scope and checks, attach task-packet.json and send this prompt. Inspect the resulting changes and actual check output before accepting the work. Commit a completed reviewed task; retain partial edits for inspection if it fails.

```text
Use the validated task packet I supplied and the reviewed scope and checks.
Implement only this independent task using your own coding tools. Follow applicable AGENTS.md instructions.
Run the agreed checks, inspect the diff and report their actual results. Stop for scope changes or missing prerequisites.
Do not install dependencies, make separate RepoSetup provider calls, merge or publish.
Commit the reviewed completed change. Your completion message is advisory; do not fabricate RepoSetup acceptance receipts or unlock dependent tasks.
```

### 6. Inspect status and prepare the next task

Status inspects the plan; it does not observe that your external agent finished the implementation. An optional --state snapshot remains unverified and cannot unlock dependent tasks. The agent's 'done' message also cannot establish managed acceptance.

For the easiest portable workflow, review and commit one independent change, then prepare a fresh reviewed task against the current project baseline. Dependent work inside the existing plan remains blocked without trusted predecessor acceptance. Do not reuse stale compilation/handoff packets after source changes. There is no public task verify or general resume command.

```text
node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js task status --root . --review ../task-review.json --plan ../task-compilation.json --json
```

[Recover from task errors](#task-troubleshooting)

<a id="task-router"></a>

## Model routing and managed execution

Preview: understand model selection, quality evidence, spending limits and current availability.

### Automatic routing is not qualified yet

The router is implemented in the unreleased task compiler. Production model capability profiles are unconfirmed, so live --routing execution stops with TASK_CAPABILITY_UNAVAILABLE before provider construction or calls. Offline tests establish routing behavior; they do not establish real model quality, billing or savings.

There is no public benchmark-import command or flag that promotes a model. Plans, preferences and AI responses cannot provide trusted qualification. Use the existing-agent workflow now; publishing the CLI alone would not qualify production routing.

[Use your existing coding agent](#task-compiler)

### How selection works

The router considers model capability and reasoning effort separately. Each model/native-effort configuration must support the task, fit its context and output/deadline limits, have fresh trusted qualification, and fit the remaining calls, tokens, time and spending allowance.

With trusted evaluation evidence, configurations must meet a minimum completion-quality confidence bound and the permitted quality loss relative to the reference configuration. Among eligible configurations, the router minimizes expected total cost across the reviewed horizon, including attempts and overhead. A separate upper cost bound enforces the budget. Resource ratios and configuration IDs break ties deterministically.

Missing, stale, mismatched, inconclusive or failed held-out evidence blocks selection. If no configuration qualifies, execution stops with rejection reasons. The router cannot promise a universally best model or reduce cost without measured evidence.

[Evidence method, assumptions and limitations](https://github.com/4d696e6b/RepoSetup/blob/codex/0.4.0-task-compiler/docs/specification-documentation/implementing-docs/TASK_ROUTER_EVIDENCE_0.4.0.md)

### What managed execution needs

Managed execution is for the reviewed TypeScript/Node profile on qualified Linux/macOS hosts with Node 24+, clean canonical Git inputs, preinstalled dependencies and trusted fixed check definitions. It executes tasks serially. Windows managed execution remains unsupported.

Prepare an independently reviewed task plan, managed task_preferences, task_execution_authority and preexisting private state/scratch directories outside the project. The authority binds the exact TypeScript, ESLint and unit-check tools, configuration, required tests and independent acceptance policy. A package.json script is not arbitrary execution authority.

Preferences contain finite quality/resource limits and a native effort preference; they contain no secrets or commands. Model capability is not the same variable as reasoning effort, and effort IDs are not automatically translated between models.

[Managed support and trusted-check contract](https://github.com/4d696e6b/RepoSetup/blob/codex/0.4.0-task-compiler/docs/specification-documentation/product-docs/TASK_SUPPORT_0.4.0.md)

### Preview the managed run

This is an advanced command template after all reviewed inputs and directories exist. Replace each path with its actual reviewed location. minimum_supported requires --routing and a matching preference; an explicit preference requires its exact supported native effort ID instead. The current production catalog will reject routed selection rather than choose an unqualified model.

Dry-run reads permitted metadata and prints a summaryId, scopes, checks, identities, limits and rejection reasons. It performs no provider call, credential read, subprocess, project/state write or attempt advancement. There is no guarantee that a dry-run alone proves executable tools or live acceptance.

```text
node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js task run --root . --review ../task-review.json --plan ../task-compilation.json --preferences ../task-preferences.json --authority ../task-authority.json --state-root /absolute/private/state --scratch-root /absolute/private/scratch --effort minimum_supported --routing --dry-run --json
```

### Approve only an eligible, reviewed run

Once live support is independently qualified and the preview is eligible, execution requires the same reviewed arguments, removal of --dry-run, the exact --approve-run <summaryId>, and --allow-provider-usage. Changing scope, preferences, authority, routing or repair changes the approval. Do not reuse another preview's hash.

Real managed calls use the direct provider's OPENAI_API_KEY environment credential and usage allowance. Never paste a credential into the website, plan, review, preferences, configuration, source or state artifacts. Azure credits are not interchangeable: this implementation has no Azure runtime adapter. Provider usage is separate from your coding agent subscription.

Estimated cost is an admission limit, not a payment collected by RepoSetup or a guarantee about the final bill. Reservations occur before dispatch. Unknown usage remains reserved and blocks unsafe replay; deleting state or changing options cannot reset allowance.

### What happens after approval

For each task, RepoSetup prepares bounded context, selects an eligible configuration, and requests a typed text proposal. Only the executor applies permitted hash-guarded replacements or expected-absent text files. Models, plans and configuration cannot supply executable commands.

Fresh trusted checks and independent task acceptance determine success. Accepted predecessor output revisions unlock dependent tasks; final-phase verification and acceptance determine overall completion. A model's success claim does not substitute for those checks. Partial changes remain visible on failure.

### Optional bounded repair

--repair is an explicit option included in the reviewed preview. It can repair an eligible implementation failure within the original limits, up to three total attempts per task or the smaller configured allowance. The first implementation repair preserves model and native effort; after two implementation failures, routing may escalate only to an eligible qualified configuration.

Known truncation can increase the output allocation within its ceiling. Infrastructure failures, uncertain usage, scope violations, drift and review failures stop for inspection. There is no automatic rollback, dependency installation, parallel worker or automatic allowance reset.

[Task recovery and blockers](#task-troubleshooting)

### Managed decomposition is a separate call

task compile --managed can request one structured draft instead of importing --draft. It needs reviewed managed preferences, private state, explicit native effort and its own dry-run approval. Real dispatch additionally requires --approve-compilation <summaryId> and --allow-provider-usage. Preserve the full compilation receipt so its usage counts toward the phase allowance.

This fixed-provider path does not turn the Markdown document into executable authority. Its draft still passes the same coverage, scope, ownership and dependency validation. It is experimental and live provider/profile qualification remains deferred; it is not the easiest supported no-key path.

[Exact command flags and managed compilation contract](https://github.com/4d696e6b/RepoSetup/blob/codex/0.4.0-task-compiler/docs/specification-documentation/product-docs/CLI_SPEC.md)

<a id="task-troubleshooting"></a>

## Task errors and recovery

Preview: understand blockers, stale inputs, retained changes and unverified status.

### The CLI does not recognize task

Published 0.3.1 does not have task commands. Use the exact local task-compiler build and inspect task --help. Do not reinstall the same published package repeatedly or infer feature availability from its version alone.

[Prepare the preview and start a task](#task-compiler)

### Compilation cannot proceed

TASK_DECOMPOSITION_REQUIRED means no structured draft was supplied. TASK_DRAFT_INVALID or TASK_PLAN_INVALID means the draft or plan failed validation. Read the returned details and correct the requirement coverage, criteria, dependency references or ownership; do not edit a compilation receipt to pretend it passed.

### Scope or source identities changed

TASK_SCOPE_INVALID and stale context/reference errors require review of paths and actual current source. Regenerate the affected review, draft and receipt against the current baseline. Keep secrets outside the permitted context. Expanding scope requires independent approval, not a model's decision.

### A task is blocked or unverified

TASK_CHECK_BLOCKED can mean a portable dependent task lacks trusted predecessor acceptance or a required check cannot run. TASK_PROFILE_UNSUPPORTED indicates an unsupported host/profile. Missing tools or dependencies need explicit preparation; RepoSetup does not install them. Keep the blocker visible instead of removing the required check.

task status --state reports an imported snapshot as unverified. Agent-written pass flags do not prove completion. There is no public task verify command to authenticate a portable result.

### No model can be selected

TASK_CAPABILITY_UNAVAILABLE includes candidate rejection reasons. Current production profiles are unconfirmed. A larger budget, a key, a renamed model or hand-edited benchmark JSON cannot qualify them. Reviewed limits can only be changed deliberately; missing quality evidence requires trusted qualification.

[Router availability and evidence](#task-router)

### Execution stopped after a call or file change

Preserve project changes and private state. Inspect the reported run ID, error, current diff and remaining reservations. Unknown usage or interrupted writes require manual reconciliation; do not delete state or rerun an approved call to reclaim budget. No automatic rollback or general resume command is provided.

Never force a success flag or commit a failed task as complete. Review retained partial edits, resolve the concrete blocker and prepare a newly reviewed action when appropriate.

## Offline completion and release gates

The owner selected offline-only I/J scope on 2026-10-10. Functional tests with simulated providers and actual executor/check effects do not qualify live models, billed cost or savings. Live provider/profile smoke, comparative trials and versioned-candidate qualification remain separate release prerequisites. The released 0.3.1 baseline is integrated, but the new tree still needs hosted platform qualification; retain historical evidence at its exact source. No automatic publication or deployment is implied.

[Current implementation status](../specification-documentation/implementing-docs/STATUS_0.4.0.md)
[Candidate preparation and open gates](../specification-documentation/release-docs/RELEASE_CANDIDATE_0.4.0.md)
