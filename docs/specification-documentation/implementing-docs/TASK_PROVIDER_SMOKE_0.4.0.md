# Milestone G live smoke protocol

Status: **not authorized or run**. All existing transport tests use fake HTTP.
This is a finite qualification procedure, not a benchmark, routing qualification
or release endorsement. The owner expressly prohibited paid calls in the initial
request. Roadmap G requires separately authorized live smoke evidence; continuation
instructions do not override that boundary.

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

A successful two-call run plus the existing offline boundary failures can close G's
real task gate. A failed or unapproved run cannot. Cancellation/unknown usage is
covered offline; this budget does not authorize extra failure probes. H routing,
capability and repair, and I/J platform/packed/benchmark/release remain open.
