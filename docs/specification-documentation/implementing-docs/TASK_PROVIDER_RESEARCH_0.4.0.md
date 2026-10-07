# RepoSetup 0.4.0 — single-provider boundary research

Researched 2026-10-06 from current official OpenAI documentation. This is
Milestone A design evidence, with no provider requests, spending, SDK installation
or runtime qualification. Sources are dated observations; recheck before
Milestones G/H and the candidate freeze.

## Decision and execution boundary

Select `openai-responses-v1` as the single experimental managed adapter candidate:
the official OpenAI TypeScript/JavaScript SDK's foreground Responses API, text
input and strict structured text output. Keep SDK imports, credentials, HTTP,
cancellation and provider error translation in `packages/cli`; core exposes a
provider-neutral request/result port. See the official
[SDK documentation](https://developers.openai.com/api/docs/libraries) and
[Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses).

Use separate requests for a decomposition draft and for a coding reply envelope
containing either a bounded context request or a typed text ChangeSet. Supply no
provider tools. No shell, apply-patch tool, hosted agent/container, filesystem tool,
web/file search, MCP, multi-agent mode, arbitrary endpoints or user tool lists.
This is RepoSetup's deliberate narrower design, not a provider safety guarantee.
Every reply remains untrusted input to deterministic core validation; only the
executor applies approved changes and resolves trusted verification IDs.

Set `store: false`, `background: false`, explicit `model`, separate
`reasoning.effort`, bounded `max_output_tokens`, and strict `text.format` JSON
Schema. Start each request from the reviewed current context rather than provider
conversation state. No `previous_response_id`, remote files, raw reasoning
history or server-side compaction. Transport options are adapter-owned and absent
from plans/configuration. No implementation is enabled by this decision.

## Structured output and response failures

The [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
documents `text.format` with `type: json_schema`, `strict: true`, required fields
and `additionalProperties: false`. It supports a subset of JSON Schema; the root
must be an object rather than a root union. Use a root reply envelope with a
nested discriminated union, and verify the emitted provider schema against the
qualified SDK/API before shipping. Refusals require separate handling and may
not match the requested schema. Schema adherence does not establish valid paths,
coverage, authority, correct code or acceptance.

Reject unexpected output item types, refusals, incomplete/failed responses,
missing payloads, malformed JSON, schema errors and oversized proposals before
application. Never parse an incomplete fragment into executable operations.
Locally validate every field with strict Zod and apply coverage/DAG/scope rules
from [task contracts](../product-docs/TASK_CONTRACTS_0.4.0.md). Test these paths
with fake responses in G; model claims never close verification.

## Model capability, native effort and capacity

The researched API candidates are `gpt-6-luna`, `gpt-6.1-sol` and `gpt-6-astra`.
These are documented API IDs, not aliases for desktop Codex model settings or
qualified RepoSetup profiles. Luna permits `none`, `low`, `medium`, `high`,
`xhigh`, `max`; Sol and Astra permit `low`, `medium`, `high`, `xhigh`, `max`.
Sol explicitly excludes `none` and `minimal`. Do not invent universal effort
levels or silently substitute them. Sources:
[Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[Astra](https://developers.openai.com/api/docs/models/gpt-6-astra).

Model identity/capability and effort are independent routing fields. Capability
floors require local fixture evidence; provider descriptions and prices cannot
establish them. Initial execution uses standard single-agent mode only; pro mode,
dynamic mid-conversation updates and provider workers are outside this release.
The researched model pages list 1050000 context and 128000 maximum output tokens,
but the task profile applies much smaller bounds. Account availability and model
snapshot stability remain unverified.

The dated standard text price observations per million tokens are: Luna input
USD 0.10/output 0.50, Sol 2.00/10.00, Astra 10.00/50.00, from those model pages.
These observations are not a shipping tariff or a savings claim. Before calls,
freeze a qualified price revision covering all applicable billable categories,
including cache writes; estimate reservations conservatively without assuming
cache savings. The benchmark strong baseline is selected only after qualification.

## Usage, limits, retries and cancellation

[Reasoning documentation](https://developers.openai.com/api/docs/guides/reasoning)
explains that `max_output_tokens` includes reasoning and other generated tokens,
and that output exhaustion can produce `incomplete` without visible text while
still incurring usage. Capture reported input/output/total, cached input and
reasoning token counters without double-counting detail subsets. The visible
proposal length is not usage. Requested model/effort and any provider-returned
effective configuration are distinct; absent effective values stay unknown.

The [official TypeScript SDK reference](https://developers.openai.com/api/reference/typescript)
documents two automatic retries and a ten-minute timeout by default. Specify
`maxRetries: 0` and the shorter profile/deadline timeout; RepoSetup controls and
records every retry/reservation. No opaque retry bypasses a run budget. A network
timeout can leave usage unknown. Cancellation stops local waiting and application,
but is not a guarantee that remote work stopped or that usage will be refunded.

Reserve call/input/output/wall/cost allowance before dispatch. Account quotas,
rate limits and permission failures are provider availability failures, not
implementation failures or reasons to escalate capability. Unknown usage retains
the conservative reservation and blocks further calls if a hard ceiling cannot
be upheld. No plan/config can raise a limit after exhaustion. Exact SDK version,
abort plumbing, header/request identifiers and response accounting need G tests;
no undocumented method or flag is assumed.

## Credentials and privacy

Credentials are environment-only, read transiently by the provider adapter; they
never enter preferences, packets, state, source, prompts, logs or check environments.
Use a fixed provider endpoint and reviewed transport; configuration must not
override URLs or authentication headers. Perform path exclusions and content
screening before any context upload. Suspected secrets block upload and require
manual context reduction; redaction heuristics are not proof a repository is safe.

The [official data controls](https://developers.openai.com/api/docs/guides/your-data)
say API data is not used for training unless opted in. Default abuse-monitoring
retention can include content for up to 30 days, with stated exceptions. Responses
storage defaults to a 30-day application-state period unless disabled; disabling
it is not Zero Data Retention. ZDR/modified monitoring need approval and have
limitations. Current caching rules may retain encrypted application state up to
24 hours, and non-ZDR queries use extended caching on supported models.
`store: false` therefore does not promise zero retention. Background, hosted tools
and external services introduce additional retention paths and are excluded.

Show provider/context/retention/allowance facts in the future reviewed run summary.
Routine telemetry stores only metadata, hashes and usage provenance. Source,
proposals and recovery evidence, when explicitly retained locally, live separately
in private executor-owned state; do not upload entire inventories or store prompts
in the default dataset.

## Unresolved questions and blocking milestones

- **G:** Pin SDK version with Node 24 compatibility, dependency/license review,
  complete strict-schema translation and fake-response/cancellation tests. No SDK
  version has been installed or qualified in A.
- **I / J release gate (transferred from G on 2026-10-07):** Qualify account/model access, effective-configuration reporting, uncertain
  usage after disconnect, response IDs and cancellation using separately
  authorized live smoke calls. This request grants no such authorization.
- **G/H:** Reconfirm snapshot IDs or explicitly record mutable API aliases; freeze
  current pricing, cache-write accounting, request limits and retention settings.
  No account-specific ZDR/residency/credit entitlement is assumed.
- **H/I:** Establish capability floors, native effort mappings and useful output
  budgets with fixtures. The 16384-token profile ceiling may cause truncation at
  high effort; classify it as budget/output exhaustion before any justified
  reallocation, never a fabricated successful attempt.
- **I:** Run equal-authority holdout comparisons and publish failures as well as
  savings. Official model claims alone cannot establish RepoSetup quality/cost.

Milestone A freezes the boundary and records these questions. Managed support,
exact model catalog entries, provider spending and release qualification remain
blocked on the listed later evidence. Local functionality needs no AI credits;
managed requests need explicit provider credentials and usage allowance.

## Milestone G transport implementation, 2026-10-07

The CLI now pins the official `openai` SDK at **7.28.0**, with an explicit
`zod` **4.6.5** dependency for wire-schema generation. npm package metadata and
installed SDK declarations confirm Node >=22 support and Apache-2.0 licensing;
RepoSetup validation uses Node **24.21.0**. Lifecycle scripts are disabled. The
newest 7.30.0 was initially inspected, but its publication age failed pnpm's
supply-chain policy; the automatically added exception was removed and the older
7.28.0 selected. No policy exception is retained.

Official documentation was searched and fetched again on 2026-10-07:

- [TypeScript SDK](https://developers.openai.com/api/reference/typescript?lang=typescript): explicit `maxRetries: 0`, deadline and AbortSignal support; SDK defaults must not define the task allowance.
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): object roots, required properties and `additionalProperties: false`. Only the optional source `lineRange` uses explicit nullable wire representation. Strict domain validation remains authoritative; unexpected keys are never discarded.
- [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra): documented API identifiers/efforts remain as previously researched. These are explicit transport choices, not qualified capability/routing entries.
- [Data controls](https://developers.openai.com/api/docs/guides/your-data): `store: false` does not remove abuse-monitoring retention or encrypted prompt-cache state, which may remain up to 24 hours. The adapter leaves cache retention unspecified rather than assuming `in_memory` is accepted by these model families.

Current standard input/output prices per million tokens remain Luna $0.10/$0.50,
Sol $2/$10 and Astra $10/$50. Cache writes cost 1.25 times standard input;
long-context pricing changes above 272K input tokens. Fixed default-tier requests
reserve all input at the cache-write rate plus a conservative 10% regional margin,
with byte-based input bounds below the long-context threshold. This is an estimated
upper allowance, not a reported bill or promise of account-specific pricing.
Cache-write attribution/account controls remain a live qualification question.

The adapter permits only POST to the fixed Responses endpoint, rejects redirects,
disables storage/background/streaming/tools/retries and bounds the entire HTTP
response to 1 MiB. Requests are transient, immutable and single-dispatch. SDK
logging is disabled regardless of environment log settings; endpoint/org/project
settings are not taken from configuration. Raw provider errors, headers, refusal
text and reasoning content are not returned to task state. Cancellation/disconnect
can still incur unreported usage. A model proposes ChangeSet text/identities;
only its canonical digest is derived locally. No command-capable SDK tools are
registered. Fake HTTP tests use the real SDK, with no provider calls.

At the first transport slice, executor reservation/state orchestration, managed CLI
integration and separately authorized account/schema/usage/effective-configuration
smoke evidence were required before G completion. The orchestration follow-up and
owner-approved offline scope amendment below record their current disposition.
H model qualification/routing and I/J benchmark/platform/release gates remain separate.

### G orchestration follow-up

Executor-owned reservation, private compilation/run ledgers, managed decomposition,
bounded coding context requests and reviewed CLI wiring are now implemented. Ordinary
CI uses the real pinned SDK with fake HTTP and real pinned verifier tools, without
credentials or credits. This evidence qualifies local transport/orchestration, not
account/model access or actual provider acceptance of the strict schema. Live smoke
remains separately authorized; see the [concrete smoke protocol](./TASK_PROVIDER_SMOKE_0.4.0.md).
A supported profile completing real provider tasks remains required by I/J's live
qualification gate, not established by this offline evidence.

### Owner-approved offline G completion — 2026-10-07

The owner requested finishing G without API access. G's implementation and no-key
integration acceptance are complete; the original live smoke condition is now
owned by I and required before J's managed candidate qualification. This supersedes
the earlier G gate assignment without claiming it passed. Account/model/schema,
effective-configuration/usage and retention questions remain unresolved. Production
runtime still reports live qualification as unconfirmed and requires credentials
and explicit usage allowance for managed calls. H's model capability qualification
remains separate. No API request, spending authorization or paid call follows from
this milestone amendment.

## Milestone H mapping refresh — 2026-10-07

Searched and fetched current official pages for
[Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) and
[model selection](https://developers.openai.com/api/docs/guides/model-selection).
The existing API identifiers, native effort sets and conservative standard-tier
price inputs remain consistent with these dated pages. Luna admits `none`; Sol and
Astra start at `low`. Effort is independent from model choice. Provider guidance
calls for representative comparisons rather than treating recommendations as
application qualification.

The CLI catalog binds these mappings and SDK request-preparation evidence, with
an explicit review/expiry window. The 512-token minimum output allocation is
RepoSetup's reviewed allocation policy, not a documented provider minimum. All
production capability qualifications remain unconfirmed: official descriptions and
fake HTTP cannot prove RepoSetup task quality or account access. Core's trusted-host
catalog supports separately bound offline/live qualification evidence and rejects
offline evidence for live routing. I must record actual capability fixture evidence
before J can claim managed routed support. No model invocation or paid research occurred.
