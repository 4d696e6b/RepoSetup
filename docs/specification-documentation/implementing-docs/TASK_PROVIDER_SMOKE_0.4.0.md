# Live provider smoke protocol — deferred managed release gate

**Scope amendment, 2026-10-10:** the owner selected offline-only I/J completion.
This live condition is now a deferred prerequisite before managed production
qualification, outside the amended offline milestones. Historical gate assignments
below remain the record of earlier scope; none represents live success. The
[offline amendment](./OFFLINE_ACCEPTANCE_0.4.0.md) does not renew/enlarge spending.


Status: **bounded smoke attempted; failed; live qualification remains open**. On 2026-10-10 the owner explicitly authorized up to two live API calls within a $1 estimated ceiling. This authorizes only the concrete smoke below; benchmark/routing campaigns and further calls remain unauthorized. Earlier transport tests used fake HTTP. The first actual bounded decomposition dispatch on 2026-10-10 stopped in `needs_review`, with no plan and unknown usage/effective configuration. No second call or retry was made.
This is a finite qualification procedure, not a benchmark, routing qualification
or release endorsement. The owner expressly prohibited paid calls in the initial
request. On 2026-10-07 the owner requested completion of G without API access.
G now closes offline implementation; its original live smoke condition moves to
I and remains mandatory before J's managed candidate qualification. This changes
milestone ownership, not the required evidence or spending boundary. No live
condition has passed. The original G amendment did not authorize provider calls; the later bounded owner authorization above is separate.

## Testing without an API key

The joined offline test in `packages/cli/src/tasks/verification-adapter.test.ts`
uses the installed official SDK with an injected fake HTTP transport. It supplies
a test-only sentinel credential, reads no real API key, and makes no provider call.
The test rejects default `fetch` and asserts that it was never invoked. On Node
24+ with the existing installed development dependencies, run:

```sh
pnpm --filter rsetup exec vitest run --config vitest.verification.config.ts -t 'completes no-key'
```

The fixture starts with subtraction, freezes positive/negative/zero addition tests
and their qualified tool bindings before decomposition, and first demonstrates a
real unit-check failure. Two simulated responses then drive actual SDK decoding,
core compilation, executor-owned replacement, private compilation/run state,
inclusive allowance accounting and real TypeScript/ESLint/Vitest checks through
`task compile --managed` and `task run`. Both commands require their exact CLI
preview approvals and explicit simulated usage allowance. Previews and rejected
approvals enter no host factory, create no state, construct no SDK and launch no
process. A real untracked-file drift fails Git baseline checks before a coding call
or run checkpoint; only the test's deliberately introduced drift is then removed.
An independent test reviewer checks current source, immutable oracle bytes, exact
revision and distinct task/phase criteria. Finalization rechecks the task and phase;
the test requires a durable `succeeded` checkpoint and unchanged oracle.

Provider configuration, request IDs and usage in this test are simulated evidence.
The fixture uses real preinstalled Git, a clean local baseline commit, trusted
profile/check adapters, actual processes and private state. Final Git checks require
the same HEAD, an empty staged diff, only `src/add.ts` changed, and unchanged Git
metadata in the complete snapshot. Test-injected host factories compose the production
adapters with the fake SDK transport; the default credential-backed factory and a
packed binary are not exercised by this test. Lockfile/profile evidence covers the
current metadata checks, not an installed-dependency/lockfile consistency guarantee.
This checks local CLI integration and regression behavior, not model quality, remote
schema acceptance, account access or billing. It satisfies G's amended offline
integration condition, but cannot close I/J's separately authorized live gate
below. There is no charge or requirement to buy credits for
the offline test. Run expensive concrete verifier fixtures serially to avoid the
previously observed overlapping-job timeout.

Fixture setup uses an empty template directory, disabled hooks/signing, explicit
fictional commit identities and a filtered environment with global/system Git
configuration excluded. The setup flags were checked against the official
[Git init](https://git-scm.com/docs/git-init),
[Git commit](https://git-scm.com/docs/git-commit) and
[Git environment](https://git-scm.com/docs/git) documentation. These local setup
commits precede the reviewed baseline; no generated-code commit or publication occurs.

## Concrete proposed qualification

Use one isolated single-package addition fixture derived from
`packages/cli/src/tasks/verification-adapter.test.ts`, on the existing Node 24.21.0
macOS arm64 host. Reuse installed pinned tool bytes in the reviewed separate
verifier tree; install no dependencies or system software. Before any call, freeze:

- `docs/phase.md`: implement exported `add(a, b)` returning the sum of finite
  numeric inputs and preserve its API.
- `src/add.ts`: baseline deliberately computes `a - b`. Only this file is writable.
- Independent immutable tests assert positive, negative and zero input sums.
  Freeze their file/test identities, TypeScript/ESLint/Vitest tool closure, public
  task criterion and distinct complete-phase criterion before decomposition.
- One clean fixture Git commit and complete baseline snapshot; private 0700 state
  and verifier scratch outside the project. No user's working tree is a target.
- Independently reviewed phase, authority, preferences and fixed check manifest.
  Keep full managed receipt so decomposition allowance is included in coding.

Use fixed `gpt-6.1-sol` with explicit native effort `low`. Authorize at most **2 calls**
(one decomposition, one coding), **100000 input tokens**, **8192 output tokens total**,
**4096 output tokens per call**, **120000 ms per call**, **900000 ms total wall time**,
and **1000000 micro-USD ($1) conservative estimated allowance**. These are ceilings,
not an expected bill. Reservations may block a call before dispatch. No expansion,
retry, repair, model substitution or new allowance follows failure. No model tools,
generated-code Git commit/publish, dependency install, rollback or third-party service is permitted.

Inspect `task compile --managed --dry-run --json` and the complete scoped source
packet/retention disclosure. Use its exact approval only after separate owner
spending authorization. Capture the managed receipt, then inspect
`task run --dry-run --json`; use that exact approval for the second call. Keep
`OPENAI_API_KEY` transient in the process environment. Never print/copy its value or
raw request/response/headers. Requests retain the researched `store:false`, no tools,
fixed default tier and no SDK retry configuration.

Task and phase reviewer decisions remain live and independent: inspect the actual
file/result and immutable test evidence at each requested revision. No automatic
approval of a model claim. Tests alone do not replace criterion review.

## Required recorded evidence

Record source commit, runtime/SDK versions, fixture/oracle/tool/plan/context hashes,
requested versus effective configuration provenance, sanitized provider request IDs,
reported/unknown counters, estimated cost provenance, retained reservations, exact
check/test results, current task and final-phase review outcomes and final durable
run ID/status. Record incomplete/refused/access/cancellation failures honestly and
retain effects/unknown allowance for manual review. Actual account retention/cache,
model availability and schema behavior remain observations, not inferred guarantees.

A successful two-call run plus the existing offline boundary failures can close I's
live provider/profile smoke condition, required before J's managed candidate
qualification. A failed, unapproved or simulated run cannot. Cancellation/unknown usage is
covered offline; this budget does not authorize extra failure probes. H routing,
capability and repair, and I/J platform/packed/benchmark/release remain open.

## Preparing the approved smoke without credential access

`scripts/prepare-task-provider-smoke.ts` prepares only a fresh private disposable
addition project, copies already installed verifier dependencies, creates the
reviewed pre-model Git baseline, freezes oracle/tool/check authority, and stores
an exact CLI compilation preview. It reads no API key and constructs no provider;
its dry-run dependencies reject host construction and process execution. Fixture
setup Git operations are fixed developer operations with a filtered environment.
Fixture construction never grants task or phase acceptance; the shared helper
requires a caller-supplied reviewer and preparation supplies a rejecting callback.

Using the existing pinned build tool (no install), build the developer preparation
script from the workspace root:

```sh
pnpm exec tsup scripts/prepare-task-provider-smoke.ts --no-config --format esm --target es2022 --out-dir packages/cli/node_modules/.cache/reposetup-smoke --external openai --external commander --external @inquirer/prompts
node packages/cli/node_modules/.cache/reposetup-smoke/prepare-task-provider-smoke.js "$PWD"
```

The output identifies the private parent, `compile-preview.json` and
`preparation.json`. The latter records source SHA/dirty status, SDK/runtime and
runner identities, oracle/review hashes, finite resource limits, CLI argument
arrays, the exact compilation approval, and private receipt destination. These
metadata are evidence, never execution or acceptance authority. Setup failures
retain the reported private parent for inspection. Do not repeat preparation or
renew allowances after a live attempt to bypass the owner's total two-call cap.

Inspect the complete `review.json`, scoped `project/docs/phase.md` and
`project/src/add.ts`, compilation preview and retention disclosure before using
its approval. Execute the existing CLI in the user's terminal holding the transient
key, writing the decoded compilation receipt privately to `plan.json` (umask 077).
The preparation script does not perform this paid step or print its command.
On failure, stop and inspect retained private state; do not rerun or repair.

After the first call, inspect the actual receipt and requirement/scope/check
coverage, then obtain the existing `task run --dry-run --json` preview with that
full receipt, `authority.json` and the same private state/scratch roots. Use its
exact approval without routing or repair only if it fits the remaining one-call
allowance. Independent CLI acceptance prompts require inspection of the actual
resulting source and frozen tests at the requested revision; never answer them
from model claims. No live success is implied by successful preparation.
