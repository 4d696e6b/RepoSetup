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
- **G:** Qualify account/model access, effective-configuration reporting, uncertain
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
