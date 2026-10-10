# Experimental task compiler guide

Applies to `codex/0.4.0-task-compiler`, not a published 0.4.0 release. The built
package still identifies as `0.3.0-alpha.1`. Use Node 24+ and the repository-pinned
pnpm. Run the local build before using `node packages/cli/dist/bin.js task --help`.
The installed aliases `reposetup` and `rsetup` share the same entry point, but
an older npm artifact may not include these commands.

## Use an existing coding agent without API credits

Prepare a separate version 1 `task_review` document. It binds the project
identity, exact Markdown phase bytes/range, requirements, phase criteria, named
checks and permitted read/write/deny scope. Review it independently of the agent's
draft. A model cannot grant itself authority by adding paths, checks or commands.
See the [review and plan contracts](../specification-documentation/product-docs/TASK_CONTRACTS_0.4.0.md)
and [core review schema](../../packages/core/src/tasks/review-schema.ts).

The following examples assume the reviewed project is the current directory and
the reviewed JSON files are in its parent directory. Supply your actual paths.

1. Request decomposition locally:

   ```bash
   node /path/to/RepoSetup/packages/cli/dist/bin.js task compile \
     --root . --review ../task-review.json --dry-run --json
   ```

   Without `--draft`, this deliberately returns `TASK_DECOMPOSITION_REQUIRED`
   and a structured request with a nonzero exit. Give the request to your existing
   coding agent and obtain version 1 `task_plan_draft` JSON. RepoSetup calls no
   provider and opens no state. Your agent's own subscription or billing is separate.

2. Validate the reviewed draft and save a compilation receipt outside the project:

   ```bash
   node /path/to/RepoSetup/packages/cli/dist/bin.js task compile \
     --root . --review ../task-review.json --draft ../task-draft.json \
     --json > ../task-compilation.json
   ```

   Check the exit status before using the receipt. The shell creates the output
   file; RepoSetup itself does not write a project or state file. Validation
   rejects missing coverage, unsafe scopes, cycles and unsupported input versions.

3. Prepare an independent task packet for your agent:

   ```bash
   node /path/to/RepoSetup/packages/cli/dist/bin.js task next \
     --root . --review ../task-review.json --plan ../task-compilation.json --json
   ```

   `--task <id>` selects an independent task explicitly. The packet includes
   permitted bounded context and freshness identities. Host model selection,
   scope enforcement and attempt counters are advisory, not managed acceptance.
   Dependent work is blocked without trusted current predecessor acceptance.

4. Inspect the plan with `task status` using the same `--root`, `--review` and
   `--plan` inputs. An optional `--state` reports an unverified snapshot; importing
   pass flags cannot authenticate completion or unlock work.

## Managed execution and its present limits

`task compile --managed` and `task run` are implemented for the reviewed single
TypeScript/Node profile. A real call uses the direct OpenAI environment credential
and provider usage allowance. Never put credentials in review, preference, plan,
config, source or state artifacts. Azure credits cannot be substituted for the
direct-provider credential: there is no Azure runtime adapter.

Managed compile needs separate managed preferences, private state, explicit native
effort and finite limits. Managed run additionally requires a separately reviewed
fixed-check `task_execution_authority`, preexisting private state/scratch directories
outside the project, preinstalled tools/dependencies and clean canonical Git inputs.
Use the command's actual `--help` and the
[managed CLI contract](../specification-documentation/product-docs/CLI_SPEC.md).
Run `--dry-run --json`, review the complete summary, and supply its exact
`--approve-compilation` or `--approve-run` hash plus `--allow-provider-usage` only
for a separately authorized call. Dry-run performs no provider calls, subprocesses,
project writes, state writes or attempt advancement.

Live provider/profile qualification remains deferred. Production routing profiles
are unconfirmed and cannot authorize live routing; `--routing` is not a way around
that gate. `--repair` allows only eligible bounded repair under reviewed limits.
Local tests use fake responses with real checks and do not establish model quality,
actual token usage, billing or savings. There is no public `task verify` command.

## Changes, verification and recovery

Only the executor applies hash-guarded unique text replacements or creates an
expected-absent text file in reviewed scope. Deletes, renames, binary changes and
arbitrary shell commands are unsupported. Installation plans remain curated.
Qualified named tools and independent task/final-phase acceptance determine
managed completion. Model assertions or serialized pass flags cannot do so.

Failed and partial edits remain visible for review. Unexpected writes, stale
inputs, unknown call usage or interruption can require manual reconciliation.
Do not delete state or repeat a call to reset allowance; uncertain reservations
remain retained. There is no automatic rollback, dependency installation, system
software installation, parallel worker or OS sandbox. Hostile same-user processes
and arbitrary concurrent filesystem races are outside the reviewed boundary.

Existing stack configs, selection inputs and installer commands need no migration.
Task artifacts have independent versions. Keep private state outside the project;
do not automatically adopt old or manually edited task evidence. See the
[support boundary](../specification-documentation/product-docs/TASK_SUPPORT_0.4.0.md)
and [candidate preparation/open gates](../specification-documentation/release-docs/RELEASE_CANDIDATE_0.4.0.md).

## Offline development completion and release status

The owner selected offline-only I/J scope on 2026-10-10. The
[acceptance record](../specification-documentation/implementing-docs/OFFLINE_ACCEPTANCE_0.4.0.md)
defines functional verification and delivery preparation without paid model calls.
Completion under that scope does not release version 0.4.0 or qualify production
models. Existing package versions remain unchanged; production routing stays
unconfirmed. Live comparisons and versioned-candidate stability gates remain
separate prerequisites before those release claims.
