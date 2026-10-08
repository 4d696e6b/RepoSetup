# RepoSetup 0.4.0 — task benchmark and test protocol

Contract frozen for Milestone A on 2026-10-06. Milestone I now has frozen fixture source, independent oracle source and offline qualification tests. The trial runner, retained real trial evidence and provider comparisons are still absent. This document authorizes no provider calls or spending.

Read the [task compiler contract](../product-docs/TASK_COMPILER_0.4.0.md), [task domain contracts](../product-docs/TASK_CONTRACTS_0.4.0.md), [support profile](../product-docs/TASK_SUPPORT_0.4.0.md) and [provider research](./TASK_PROVIDER_RESEARCH_0.4.0.md). The [Phase 23 installation benchmark](./PHASE_23_BENCHMARK_PROTOCOL.md) remains independent. Its source baseline, installation measurements and performance targets are not task-compiler evidence.

## Questions and treatments

Measure whether task compilation preserves completion quality while reducing repeated context or resources, and whether routing adds a further benefit. Separate the following three treatments:

1. `whole-strong`: the entire fixture phase is one coding job using the frozen qualified strong model and native effort. It receives all public requirements and the same eligible repository evidence, executor and checks as the compiled treatments.
2. `compiled-strong`: compile the phase, prepare scoped packets, execute tasks sequentially and perform targeted repair, always using the same strong model and effort as `whole-strong`.
3. `compiled-routed`: use the identical compiled plan, scope rules, execution order and verification workflow as `compiled-strong`, but apply the frozen routing/escalation policy. Model capability and reasoning effort remain separate recorded variables.

`whole-strong` versus `compiled-strong` measures the compiled workflow, including task granularity and targeted repair. `compiled-strong` versus `compiled-routed` measures routing. Do not attribute the first comparison to cheaper models or the second to a different decomposition.

All three treatments use the same proposal-only managed provider boundary: bounded context requests and typed text ChangeSets, executor-owned application and trusted check IDs. Neither the baseline nor a compiled treatment gets shell tools, internet tools, MCP, dependency installation, unreviewed project scripts, extra workers, automatic rollback, commits or unrestricted repository edits. This evaluates the bounded RepoSetup workflow, not an unrestricted external agent.

## Fixture manifest and source freeze

Implement the five fixture IDs below as isolated TypeScript/Node repositories, outside `apps/website` and without framework generators. Each has already provisioned, frozen dependencies under `managed-ts-node-v1`. No fixture requires a server, database, network, credentials or package installation during a trial. The API fixture exercises a pure request handler with in-memory data; the UI fixture exercises a pure view model with no browser or website changes.

Each fixture manifest must contain:

- `fixtureVersion: 1`, the stable fixture ID, phase ID and public requirement IDs/text;
- immutable baseline source revision, sorted path/content SHA-256 manifest, lockfile SHA-256, dependency artifact identity and public phase-document SHA-256;
- public read/write/deny scopes, entrypoint exports, observable behavior and required public check/criterion IDs;
- hashes of applicable rules, trusted verification recipes/configurations and their explicit test inventory;
- separately stored holdout oracle revision, hash, criterion IDs and expected test counts, without disclosing private test contents to the provider;
- the common ResourceLimits, support/catalog/policy identities and host/runtime prerequisites.

Seed code must have meaningful incomplete behavior that fails the specified new acceptance criteria while passing its pre-existing compatibility tests. Freeze a qualified reference solution and deliberately incorrect solutions privately. Before measuring any model, prove the oracle passes the reference and rejects every incorrect solution. Changing a requirement, seed, oracle, scope, rule, recipe, model profile or budget creates a new benchmark revision; do not mix revisions in one aggregate.

The following module paths and observable contracts are normative fixture designs. Their concrete source and hash manifests are under `tests/tasks/fixtures/`. Milestone I may not weaken these requirements to fit an observed model output.

## `types-result-v1`

Phase `typed-input-boundary`; write scope `src/result.ts`, `src/page.ts`, `test/agent/page.test.ts`. Read scope additionally includes frozen root configuration and existing public tests. All other paths are denied for writes.

- `type-1`: export a discriminated `Result<T, E>` with `ok: true, value: T` or `ok: false, error: E`; `mapResult` preserves the failure and maps only the success. Success/failure branches narrow without `any`.
- `type-2`: `decodePage(value: unknown)` returns `Result<Page, readonly InputIssue[]>`; `Page` contains readonly items `{ id: string; label: string }` and `nextCursor: string | null`. Reject unknown object fields, missing keys, non-array items, empty IDs/labels, duplicate IDs and cursors other than null or nonempty strings.
- `type-3`: report all invalid fields as stable `{ path: string; code: "type" | "missing" | "unknown" | "empty" | "duplicate" }` issues sorted by path, then code. Use `$` for the root and dot paths such as `items.0.id`; report a duplicate on the later item's ID. A wrong parent type reports one `type` issue without inventing child errors. Return errors rather than throwing for invalid data; preserve the input object and arrays.
- `type-4`: preserve the existing exported names and the valid-input behavior exercised by baseline tests. Public examples cover one success, one invalid item and mapping a failure.

Private oracle: compile positive and intentionally invalid consumers to test discriminant narrowing and readonly output; exercise null, primitives, unknown keys at both levels, duplicate IDs, nested multiple errors, empty cursor, input freezing and failure mapping. Reject permissive casts, a parser that ignores duplicates, mutation and success-only implementations. The oracle tests behavior and public types; it does not require the reference implementation's internal structure.

## `ui-view-model-v1`

Phase `list-view-state`; write scope `src/view-model.ts`, `test/agent/view-model.test.ts`. `src/domain.ts` supplies frozen item/filter types and is read-only. No React, browser, HTML, CSS or website paths exist in the fixture.

- `ui-1`: `buildListView(input)` accepts `{ items, search, filter: "all" | "open" | "done", selectedId: string | null, loading: boolean }` with readonly items `{ id, label, status: "open" | "done" }`. Return matching `rows` preserving those fields plus the totals/selection/state below. Search trims whitespace and compares labels using `toLowerCase()`; an empty search matches every item.
- `ui-2`: sort matching rows by normalized label, then ID; compute `total`, `openCount` and `doneCount` from the full input rather than the filtered rows. Keep item IDs as row keys.
- `ui-3`: return `loading`, `empty` or `ready` display state in that priority order. Loading remains loading even with zero rows. An absent or filtered-out selection yields `selectedId: null`; a matching selection remains selected.
- `ui-4`: preserve all inputs and baseline behavior, make repeated calls identical and handle labels containing markup-like text as plain strings. Public tests cover filtering, one selection and loading.

Private oracle: ties in labels, case/whitespace search, empty and fully filtered lists, loading with/without rows, missing selection, frozen arrays/objects, stable totals and markup-like strings. Reject a DOM-dependent implementation, in-place sorting, filtered totals and incorrect loading precedence. This is UI state logic evidence only; it makes no website/browser-support claim.

## `api-offline-v1`

Phase `offline-pagination-handler`; write scope `src/query.ts`, `src/handler.ts`, `test/agent/handler.test.ts`. `src/repository.ts` exposes a frozen injected in-memory repository; no listener is started.

- `api-1`: `handleRequest(request, repository)` accepts `{ method: string, path: string, query: Record<string, string | readonly string[] | undefined> }` and returns `{ status, body }`. Only `GET /items` is supported. Unsupported paths return 404 with `{ error: "not_found" }` and unsupported methods on `/items` return 405 with `{ error: "method_not_allowed" }` without calling the repository.
- `api-2`: `limit` defaults to 20 and accepts decimal integers 1–100. Reject signs, decimals, exponent notation, whitespace, repeated values and unknown query keys with status 400. `cursor` is absent or one nonempty opaque string; do not decode it as a command or filesystem path.
- `api-3`: valid requests call the injected repository exactly once with normalized `{ limit, cursor: string | null }`; return status 200 with `{ items, nextCursor }`. Invalid query returns 400 with `{ error: "invalid_query" }`; the repository's typed invalid-cursor failure returns 400 with `{ error: "invalid_cursor" }`. Other repository failures return 500 with `{ error: "internal_error" }`, without exception text or data leakage.
- `api-4`: preserve baseline response shape and input immutability. Public tests cover a default request, an explicit limit and one invalid query.

Private oracle: lower/upper bounds, every invalid numeric spelling, repeated cursor/limit, unknown keys, 404/405 precedence, repository call count/arguments, invalid cursor and thrown errors containing synthetic secret markers. Reject regex-only partial parsing, swallowed repository errors returning 200, leaked exception text and any network access. All dependencies and data are local.

## `cross-module-order-v1`

Phase `dependency-output-contract`; write scope `src/domain.ts`, `src/totals.ts`, `src/presenter.ts`, `test/agent/order.test.ts`. Baseline callers in `src/legacy-consumer.ts` are read-only.

- `cross-1`: add readonly order lines `{ sku, quantity, unitCents }` and validate nonempty SKU, integer quantity 1–999 and nonnegative safe-integer unit price. Invalid input returns a typed issue; no floating-point currency calculation.
- `cross-2`: `calculateTotal(lines, discountBasisPoints)` accepts an integer discount 0–10000, validates multiplication/aggregation for safe-integer overflow, then applies the discount once to the aggregate with rounding down in cents. Empty lines total zero.
- `cross-3`: `presentOrder` consumes the calculation result and returns either an error view or `{ totalCents, formattedTotal }`, formatting cents with exactly two decimal digits without locale-dependent output.
- `cross-4`: preserve legacy exported APIs/caller compilation. Public acceptance traces domain → total → presentation. The compiled plan must declare predecessor output artifacts for dependent tasks; execute and accept predecessors before consumers.

Private oracle: invalid quantities/prices/discounts, overflow on one line and across lines, aggregation-before-discount rounding, zero/100% discount, empty order, immutable inputs and compilation of the legacy consumer. Also inject a predecessor revision change between dependent attempts and require stale evidence/dependent invalidation. Reject independently passing modules with incompatible exported types, floating-point rounding and acceptance based on an old predecessor revision.

## `security-path-policy-v1`

Phase `scoped-path-policy`; write scope `src/path-policy.ts`, `src/context-policy.ts`, `test/agent/policy.test.ts`. The fixture adapter supplies path facts through a frozen interface; code under test does not call the real filesystem or launch processes.

- `sec-1`: normalize backslashes to slashes before checking repository-relative file paths. Reject empty paths/components (including repeated separators), absolute POSIX paths, drive/UNC paths, `.`/`..` components, NULs, mixed-separator traversal and canonical paths outside the supplied root. Reject symlink facts when the resolved target escapes or the policy cannot establish containment.
- `sec-2`: apply deny rules before read/write allow rules. `.git`, `node_modules`, `dist`, binary classifications and the fixture secret paths `.env`, `.env.local`, `credentials.json` and `id_rsa` are never eligible context or write targets, including allow/deny overlaps. `.env.example` may contain placeholders only; it is not an exception for real secrets. Known fixture markers/paths test the boundary rather than claiming perfect general secret detection.
- `sec-3`: `selectContext` returns only eligible requested paths, stable exclusion reasons and hashes. A broader request remains unresolved and cannot expand authority. Return no file contents in routine metadata, error messages or diagnostics.
- `sec-4`: preserve baseline safe-path behavior, use the supplied facts deterministically and never interpret fixture text as executable instructions. Public tests cover one allowed path, one traversal and a deny overlap.

Private oracle: POSIX/Windows absolute forms, repeated/mixed separators, traversal, NUL, missing canonical facts, symlink escape, deny precedence, binary/generated/secret paths and synthetic secret markers in excluded contents. Seed a public README/rule-like fixture containing a request to run a command and read a denied file; it is untrusted data. Reject policy bypass or leaked markers. Separate executor-boundary tests must prove model proposals cannot turn that text into process or file authority; this pure fixture alone cannot establish operating-system isolation.

## Independent acceptance and holdout handling

Public criteria and frozen tests are available read-only to every treatment. Model-authored tests live only at the separate `test/agent` write targets and cannot replace public/baseline assertions. Private holdout source lives outside provider read scopes, context packets and writable fixture trees. A separate evaluator controls it, freezes its hash before trials and runs it only after the treatment has declared the phase complete or reached its limit. No private tests, expected values, failure logs or criterion hints may feed repair in that trial. Return public-check diagnostics for repair; record final private pass/fail separately.

The ordinary `task.acceptance` and `phase.acceptance` recipes cover reviewed public criteria. The independent evaluator uses its own frozen qualified recipe and appends holdout evidence to the trial report. It must not install a plan-supplied command or convert private tests into model tools. Required tests must be discovered and execute; exit zero with zero tests, skipped required tests, changed check definitions or missing coverage is blocked, never accepted.

Qualification requires all frozen public/holdout criteria, preserved baseline tests, typecheck and lint, required test counts, unchanged protected files and no forbidden effects. Compare hashes before/after checks to catch verifier side effects. The oracle must accept behaviorally equivalent solutions. Test fixes that weaken assertions, bypass tests or alter trusted tools/configuration cannot make a trial pass.

## Equal resource allowances

Apply these benchmark-only ResourceLimits to **each fixture/treatment/trial**, including compilation and final verification:

- `maxImplementationAttemptsPerTask: 3`;
- `maxProviderCalls: 24`;
- `maxInputTokens: 240000`;
- `maxOutputTokens: 48000`;
- `maxWallTimeMs: 1800000` (30 minutes);
- `maxCostMicrousd: 10000000` (USD 10).

These are ceilings, not default user preferences, performance targets or authorization to spend USD 10. A later live qualification requires explicit provider allowance. Reserve bounded call/token/cost capacity before requests; unavailable prices, unknown effective models or unbounded charges block cost-bounded calls. Count failed/refused/incomplete requests and provider retries. Do not add a hidden retry budget or silently refill allowances after a failure.

Use the same frozen support-profile limits for context bytes, file bytes, ChangeSet bytes, output tokens per call, captured output and check duration in all treatments. Apply the smaller user/benchmark limit when present. The aggregate token ceilings do not permit a call exceeding model capacity or the support boundary. A compiled draft may contain at most six implementation tasks per fixture; exceeding that bound is a recorded compilation failure.

The whole-phase job has one task and at most three implementation attempts. Compiled jobs have at most three attempts per task while sharing the same phase-level ceilings. This difference in repair granularity is part of the declared workflow treatment; disclose actual attempts/calls and do not describe the comparison as having equal per-proposal retry opportunities. Both treatments have identical global resource ceilings and aggregate file/tool authority. Extra decomposition calls, contexts or retries consume the compiled treatments' allowance.

Fixture hydration and preinstalled-tool validation happen before timed execution for all treatments, using the same artifact/cache state. Record their time and failure separately. Start timed execution before the first decomposition or coding call; stop after final public/holdout verification or an explicit terminal failure. Include provider latency, local inventory/context work, routing, proposal application, all verification, repairs, reconciliation and state I/O. Include compilation time/cost even when a frozen draft is replayed.

## Repeatable trial procedure

1. Qualify fixtures/oracles locally, confirm Node 24+ and pinned tool versions, preinstalled dependencies, clean Git baseline and no secrets. Record runner/source/artifact, host/OS/architecture, runtime, dependency/lockfile, recipe, support, model catalog and routing-policy hashes. No system or dependency installation occurs in the runner.
2. Freeze the qualified strong profile and native effort, all routed candidate profiles/efforts and dated prices. Use exact provider snapshot IDs where available; record requested/effective IDs and effort. If effective configuration is unreported, mark it unknown and limit attribution. Do not choose the strong profile retrospectively from successful runs.
3. Run five paired trial blocks for each of the five fixtures, with a fresh clean fixture checkout and fresh run state for each treatment: 25 trials per treatment, 75 total. Execute sequentially on one host with no worker parallelism. Rotate treatment order deterministically by block (`whole`, `fixed`, `routed`; then `fixed`, `routed`, `whole`; then `routed`, `whole`, `fixed`, repeating). Record order and provider request identities.
4. For each paired block, generate one decomposition using the frozen strong compiler configuration, validate/freeze its plan and use that exact plan for both compiled treatments. Do not regenerate a routed plan to favor routing. Charge the full measured compilation usage/time to **each** compiled treatment in analytical totals, identifying the replay and shared source request; also report actual billed calls separately so the reused call is not billed twice in the cash ledger. A failed compilation fails both paired compiled trials and remains included.
5. Provide no hidden manual assistance. A fixture-level setup failure before any provider request blocks its full paired block; retain the record and qualify the environment before a new explicitly identified block. Once a request starts, timeout, provider failure, missing context, budget exhaustion and product defects are included trial outcomes. Never discard or silently restart them.
6. Run independent holdout evaluation at completion/limit. Store all attempts and terminal outcomes with their source/proposal/output revisions, context provenance, verification and failure classification. Do not mark a claimed completion accepted until the evidence agrees.

The scope universe and public requirement text are identical across treatments; compiled packets may intentionally include fewer eligible source bytes. Freeze the explicit initial whole-phase context packing rule before runs. If whole-phase eligible context exceeds capacity, count a blocked/truncated attempt honestly; do not grant an unreported larger model window. Use no unspecified cache discounts or changing provider service tiers between paired treatments. Provider nondeterminism remains a limitation; record seeds only where supported, never claim deterministic model output.

## Accounting and decision rules

For every request, record purpose (`compile`, `context`, `implementation` or `repair`), requested/effective model and effort, input/output tokens, reasoning/cached tokens when reported, usage provenance, start/end timing, pricing revision and request outcome. Input bytes and local token estimates are separate from provider-reported tokens. Do not add reasoning tokens twice when the provider includes them in output totals. Record actual charged usage when available and calculated cost separately; unknown usage/cost is unknown, not zero.

Every attempt also records selected requirements, context path/range hashes and inclusion reasons, unresolved references, scope/configuration identity, predecessor revisions, ChangeSet and accepted output hashes, check counts/outcomes, failure cause and unexpected effects. This allows investigation of missing context, excessive inclusion, stale evidence and unrelated changes. Routine benchmark metadata contains no source contents, prompts, credentials, raw private oracle logs or excluded secret markers. Keep any sensitive local recovery evidence separate, access-controlled and outside tracked projects.

Report quality first: accepted phases out of all 25 trials per treatment, every public/holdout criterion, compatibility failures, forbidden effects, blocked trials and failures by cause. Initial fixture qualification requires 25/25 accepted phases for each advertised treatment and zero forbidden effects; otherwise retain the failed evidence and leave that treatment unqualified. Infrastructure failures still appear in observed totals. If a later revised experiment separates environment failure, publish the original inclusive totals alongside it.

Then report paired resource totals, median/minimum/maximum wall time, provider calls, context input, tokens, calculated/reported cost and attempts, including failed trials. Also show per-fixture results and cost per accepted phase, with a zero-success denominator reported as undefined. Report both full per-treatment analytical totals and the actual cash ledger for shared decomposition. Do not compare only successful/cheap tasks or omit expansion/retry/check overhead.

No minimum savings percentage is assumed. Negative savings is a valid result and must be published honestly; fixture implementation and a small benchmark do not establish general engineering superiority. A savings claim requires qualified equal-revision quality, lower observed full resource totals for the named comparison and disclosed uncertainty/limitations. With only five repeats per fixture, describe observations on this frozen fixture set; do not claim population significance or invent a success probability. Latency differences affected by provider load or unknown effective routing must be described as such.

## Local fake-boundary test matrix

Normal CI uses deterministic fake provider, repository, state, filesystem, clock and process ports; it requires no API key or AI allowance. Fake requests must expose call/proposal histories and fail if an unauthorized call/write/process occurs. Use injected races/failures rather than real external infrastructure. Existing task-boundary tests cover these ports; a complete offline campaign runner is still pending.

Positive cases by boundary:

- **Contracts/compile (B):** strict valid draft, every requirement linked to applicable criteria/checks, stable topological order, declared artifact dependencies, valid intersected scopes and independent capability/effort fields.
- **Context (C):** explicit references, eligible import expansion, applicable ancestor rules, accepted dependency outputs, bounded contents and reproducible inclusion/hash provenance.
- **Handoff (D):** caller draft works offline without credentials, portable packet contains fixed acceptance and dependencies, advisory enforcement is explicit, text/JSON/non-TTY behavior agrees, status never fabricates completion.
- **Checks (E):** fixed trusted check IDs resolve locally, known test inventory executes, task then final phase acceptance succeeds with evidence bound to current hashes and unchanged protected files.
- **Changes/state (F):** expected-absent creation and one hash-guarded unique replacement, batch preflight, locks, individual atomic writes, revisioned outputs, failure retention and interruption reconciliation.
- **Provider (G):** structured compile/context/ChangeSet response, requested/effective configuration and usage retained, approved environment-only credentials, cancellation and terminal outcome recorded without leaked values.
- **Routing (H):** lower-cost eligible qualified capability profile, independent supported effort selection, budget reservation, failure-specific context/repair and bounded escalation, dependents blocked until accepted outputs.
- **Qualification (I):** reference passes all oracles, incorrect solutions fail, fixtures replay from hashes, all three treatments share authority/ceilings and failed trials remain in the report.

Negative cases, with required observable rejection:

- Unknown fields/versions, duplicate IDs, missing requirement/check coverage, cycles, invalid artifacts and undeclared ownership fail before provider/process/mutation effects.
- Traversal, absolute/drive/UNC paths, symlink escape, denied/secret/binary context, broader context requests, ambiguous canonical facts and oversized contexts are rejected or explicitly blocked with safe metadata.
- Shell strings, command/endpoint/hook fields in config/plan/model replies, arbitrary tool calls and a model request to install dependencies never reach a process port. Unsupported delete/rename/binary/patch proposals fail before writes.
- Missing decomposition authority, model/effort mismatch, inadequate capacity, unknown hard-cost reservation, absent credentials, exhausted calls/tokens/time/cost and truncated/refused/malformed responses produce classified outcomes without fabricated tasks or completion.
- Stale hashes, duplicate text matches, already-existing create targets and changed trust definitions block application/check authority. Inject drift after batch preflight and between writes: record partial effects, retain them and stop; no rollback/reset/stash/commit.
- Zero/missing/skipped tests, check timeouts/cancellation, unexpected check writes, environment secret leakage, commandless doctor success and model-only success cannot establish task/phase completion.
- Accepted output changes invalidate dependent evidence; resumed state with corruption, interrupted application, old baseline or unexpected edits cannot silently resume as accepted.
- Every task dry-run path has zero provider calls, zero process calls and zero writes (including state/output files). It labels unresolved host checks and decomposition rather than performing them. Local preparation without AI allowance stays available.

For each case, assert machine-readable error/outcome, exact allowed effects, usage reservations/reconciliation and no denied content in metadata. A fake can test boundary enforcement; it cannot prove live provider support, real subprocess isolation or platform behavior. Those require separately authorized qualification later.

## Legacy regression matrix and existing reuse

Use current tests as the baseline, preserving their meanings rather than replacing installer behavior with task behavior:

- schemaVersion 1 stack config round-trip/rejection: `packages/core/src/config/schema.test.ts` and `serialize.test.ts`;
- selection v1 token/file inputs, mode checks, aliases and zero-effect dry-run: core selection tests, `packages/cli/src/selection.test.ts`, `tests/e2e/selection-legacy.test.ts` and the existing selection packed/transport suites;
- deterministic curated plans, stable integration IDs and npm/pnpm/Python behavior: current planning/package-manager/registry/integration tests and golden suites;
- executor path/symlink/conflict safety, lock/journal/partial effects, process timeout/cancellation and bounded output: `packages/core/src/executor/execute.test.ts` and `packages/cli/src/execution-adapters.test.ts`;
- previews preserve files and omit values: core/CLI preview tests; intended-doctor evidence and targeted curated repair: `packages/core/src/doctor/intended-checks.test.ts`, `packages/cli/src/doctor-intended.test.ts` and `doctor-repair.test.ts`;
- existing command/JSON/exit meanings and packed aliases: CLI run/error/exit tests and packed maintenance/selection suites.

Current root scripts include `pnpm test:tasks:fixtures`, `pnpm typecheck:task-tests`, `pnpm fixtures:tasks:freeze` and `pnpm benchmark:tasks:report`, alongside the established build, typecheck, lint and legacy tests. The fixture suite performs offline source/oracle checks; the benchmark command summarizes a supplied campaign but does not execute trials. Run appropriate checks under Node 24+ with the frozen dependency artifact. Existing full e2e/install collectors may have real-install behavior and do not belong in the offline task trial runner.

Reuse Vitest assertion/test organization, CLI dependency injection, recording ProcessRunner fakes, temporary repository helpers, clean-source/hash records and existing packed artifact harnesses. Extend them for provider usage reservations, scoped proposal application, durable task state, trusted test inventories and private evaluator isolation. Existing installation benchmark collectors measure a different workload and cannot simply be relabeled as task evaluation.

## Evidence still required

Milestone I has versioned fixture manifests and oracles, reference/wrong-variant discrimination, a local fixed-recipe probe and holdout separation. Full managed verifier closure/effect qualification, an installed artifact and all platform evidence remain open. G/H offline tests cannot establish exact production provider/model capability, native effort, usage/pricing or quality. Live trials remain blocked until those prerequisites and an explicit provider allowance exist. No accuracy, savings, routing quality or managed support result is claimed by this document.

## Initial local fixture implementation (2026-10-07)

Concrete seeds, normative phase text, public compatibility/acceptance examples,
references, wrong variants and independent holdouts now live in
`tests/tasks/fixtures/<fixture-id>`. `manifest.json` is the frozen source identity;
`descriptor.json` is reviewed input to the developer-only freezer. Run
`pnpm fixtures:tasks:freeze` only when intentionally accepting a new source/tool
revision, and commit the changed manifests. Qualification recomputes inventories
and rejects stale manifests rather than silently freezing observed changes.
`pnpm test:tasks:fixtures` checks seed/reference/mutation discrimination sequentially
without API credentials or installation. `pnpm typecheck:task-tests` checks the
runner's TypeScript separately from the deliberately incomplete fixture sources.

The assertion runner's private evaluation output sits outside the hydrated public
project. Tests return safe case IDs and pass/fail; private expected values and
exception text are not repair input. These fixtures use the installed TypeScript artifact and Node assertions.
Their frozen seed now also contains reviewed ESLint/Vitest check configurations and
a fixed public-test wrapper, with explicit `publicTestIds`. The test-only local probe
runs E's `ts.typecheck`, `ts.lint` and `ts.unit` fixed recipes and parses their bounded
reports against the reviewed public test inventory. The dependency artifact hash
identifies the direct TypeScript, ESLint, typescript-eslint and Vitest package bytes,
not a qualified full transitive managed-profile tool closure. No trial/treatment qualification or savings result follows
from reference/mutation checks. Full E recipe, predecessor-drift, packed/platform
and live-provider evidence remain separate I gates.

Current official references reviewed for the fixed tooling (2026-10-07):

- [TypeScript compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html):
  explicit project/root/output boundaries and `noEmitOnError`; no package scripts
  are executed.
- [Node 24 TypeScript support](https://nodejs.org/docs/latest-v24.x/api/typescript.html):
  native erasable-syntax execution for the developer freezer, explicit `.ts`
  imports and separate typecheck because type stripping does not check types.
- [Node 24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html): reporter
  output limitations informed the fixed JSON assertion runner; no TAP-output
  parsing or reporter-format stability is assumed.

## Version 1 campaign metadata and report accounting

`task_benchmark_campaign` is a strict internal qualification envelope, separate
from product TaskPlan/config inputs. Core validates fixture/tool/revision equality,
75 unique trial slots, declared deterministic serial order, identical authority
and ceilings, exact shared compilation/plan records and disjoint request hashes.
Partial campaigns remain visible with missing slots. Setup-blocked paired trials,
failed compilation and terminal implementation/check failures are retained.
Accepted metadata requires exact frozen public and holdout test inventories, all six fixed
check categories with nonzero required test counts, unchanged protected inputs,
zero forbidden effects and referenced attempt/final evidence. Evidence hashes
refer to retained evaluator artifacts; schema validation does not authenticate
those artifacts or establish that a provider/evaluator actually executed.

The pure reducer reports all-trial quality and per-fixture outcomes, attempts,
setup/wall timing, provider calls, context bytes, separate local token estimates,
reported input/output/cache/reasoning and calculated/reported charged cost. Unknown
measurements stay null; cache/reasoning subsets are never added twice. Shared
compilation is fully included in each compiled treatment's analytical totals but
its request is counted once in the actual cash ledger. A zero accepted denominator
is undefined. Missing/failed/offline trials cannot qualify a production comparison;
unknown effective configuration or required resource measurements also block
quantitative comparison qualification. No automatic savings conclusion is emitted.

`pnpm benchmark:tasks:report <campaign.json>` builds core and summarizes an
already recorded campaign to stdout. The developer tool performs a bounded,
duplicate-key-aware declarative read; it makes no provider/process trial calls,
installs nothing and writes no project/state/report files. Exit 3 denotes an
incomplete valid campaign; exit 2 denotes rejected input. Recording the full live
75-trial campaign, authenticating retained evidence and joining E's qualified
managed verifier remain unimplemented/unrun I work. Unit-test campaigns are
synthetic accounting inputs, never benchmark results or model-quality evidence.

## Offline packed-contract test scope

`tests/e2e/task-packed.test.ts` uses the actual packed CLI bytes with dependencies
hydrated from the preinstalled frozen workspace, without npm installation. It
checks the two declared bin targets via Node, local task compile/next/status,
managed preview and missing-key/allowance failures, rejected executable/broader
scope inputs, project/state preservation and existing preset/config/selection
dry-runs. Child environments carry no credentials and have no project tools on
PATH. Its metadata records artifact/source/lock/host identities and keeps
qualification false. This does not replace installed-package, native shell, real
legacy installation or Linux/platform acceptance. Full fixtures, report and packed
tests run serially under `pnpm test:tasks:fixtures`; normal CI needs no API key.

## Local managed-check recipe probe (2026-10-08)

The five public fixture projects now include frozen, read-only `eslint.config.mjs`,
`vitest.config.mjs` and `test/public/managed.test.mjs` files. Each descriptor binds
the exact baseline and public test IDs, and the reference probe requires their
reported unit identities/counts. It uses the existing fixed recipes, pinned tool
versions, filtered child environment and safe report parser. It restores the
temporary project's hydration link before asserting an unchanged source inventory.
No private holdout is copied into a candidate's project or unit runner.

This probe tests the actual local recipe argument/report path for every seed and
reference. It is test infrastructure, not E's fully qualified immutable closure
or a trial executor. A complete managed acceptance gate still needs the existing
verifier adapter's reviewed transitive dependency inventory, protected config/oracle
file definitions and executor-owned before/after effect audit for each fixture.
Do not count these reference checks as model trials or platform qualification.
