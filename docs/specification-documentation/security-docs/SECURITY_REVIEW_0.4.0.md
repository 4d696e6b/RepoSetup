# Task compiler 0.4.0 source safety review

Reviewed 2026-10-10 on `codex/0.4.0-task-compiler`, source **536a090**.
This closes the available source/dependency/provider/support review preparation.
It does not qualify a release, remotely hosted model, installed artifact or hostile
code execution environment. Any later runtime, transport, dependency, verifier or
packaging change requires the affected review and tests to be repeated.

## Inputs and execution authority

Strict versioned task envelopes remain separate from stack configuration and
selection inputs. Core compilation checks requirement coverage, graph ordering,
criterion/check references and exact write ownership. Models propose text or
bounded context references; they cannot introduce command recipes, tool authority,
provider endpoints, installation operations or completion evidence.

Inspected `packages/core/src/tasks/{compile,scope,application}.ts`,
`packages/core/src/executor/{task-compilation,task-run,task-run-provider,task-verification}.ts`
and CLI `tasks/{managed-authority,managed-command,application-adapter}.ts`.
CLI authority binds independent frozen checks; exact preview approval and explicit
usage allowance precede managed execution. Executor dispatch owns reservations,
state transitions, project writes, tool launches and verification scratch effects.
Dry-run returns before acquiring mutating ports or dispatching processes/providers.
The production model catalog retains unconfirmed qualification, blocking routing.

Concrete filesystem/process/provider imports stay in CLI adapters. Core exposes
ports and owns domain execution logic. The existing installer remains curated
and declarative. No task command, schema or configuration extension delegates
arbitrary shell execution to a model or user command string.

## Context and guarded changes

Inspected context materialization, repository reader, path exclusions, application
preflight and postimage audits. Context has reviewed read/deny scopes and finite
UTF-8/text/file/aggregate limits. Credential-bearing paths, generated outputs and
holdouts are excluded. Package/lockfiles, rules, scripts, workflow files and frozen
verification configuration are protected writes. Secret-pattern screening and
exact current-credential echo checks are additional defenses, not universal
secret discovery or prompt-injection prevention.

Changes require fresh identities and preimages, unique exact replacement matches,
reviewed exact targets and finite text batches. Concrete adapter checks canonical
roots, component symlinks, case aliases, ownership, file type/link count and
pre/postimages. Whole-project snapshots detect unrecorded effects. Partial effects
remain journaled; there is no automatic rollback or silent file/state adoption.

These guards do not provide protection against every concurrent host-level race.
Use an exclusively controlled project and state root on the reviewed POSIX host.
Node filesystem checks and rename operations are not a kernel-enforced sandbox.

## Durable state, interruption and resources

Inspected private-state acquire/read/write/staging, executor recovery and provider
request paths. State lives outside the project on the same filesystem, with
owner-private directories/files, no-follow opens, identity guards, leases and
compare-and-swap transitions. A prior unknown provider call retains its reservation
and blocks replay; raw requests, response bodies, credentials and arbitrary error
headers are not saved. Safe numeric HTTP diagnostics do not reconstruct billing.

Model capability and native effort remain separate. Hard call/token/output/cost
bounds and finite context/repair rounds are executor-owned; unknown accounting
cannot be interpreted as zero. Failed trials and compilation overhead remain in
benchmark evidence. Interrupted edits are retained for review. No parallel task
workers, automatic dependency installation or allowance reset was introduced.

## Trusted verification and process limitations

Inspected fixed check recipes, closure qualification, report parsing, filtered
environment and the shared process adapter. Named checks bind exact installed
versions, entrypoints, runtime and immutable config/tool inventories. The process
adapter uses argument arrays with `shell:false`, bounded capture/deadlines and
termination. Check environments exclude inherited credentials and Node options;
private scratch HOME/temp paths are outside the project. Required test identities
and fresh executor-issued task/phase review evidence prevent an imported pass
record, missing test or zero-test run from establishing acceptance.

Verification runs authored code. Environment filtering, timeouts, tool freezing
and project snapshots do not block arbitrary network access or reads/writes
elsewhere on the host. Managed projects must run on a separately isolated, trusted
host without accessible secrets. This initial support profile is one preinstalled
TypeScript/Node package, Node 24, POSIX only; Windows managed execution remains
unsupported. No sandbox or wider language support is claimed.

## Provider and dependency review

The CLI provider is fixed-origin foreground Responses, no redirects, bounded
response allocation, no tools/background/streamed execution/conversation storage,
disabled SDK logging and retries, and transient environment credentials. Each
adapter-minted request can dispatch once. Strict replies receive deterministic
local parsing/privacy/scope checks. Tagged unions are mapped to documented
`anyOf` only with provably distinct required literal discriminators.

The [provider research recheck](../implementing-docs/TASK_PROVIDER_RESEARCH_0.4.0.md#candidate-source-recheck--2026-10-10)
records current official schema, model/effort, pricing, retention and SDK sources.
`store:false` is not zero retention. Cost remains a conservative estimate rather
than a reported bill. Remote schema/account/usage acceptance and model capability
remain unverified; Azure has no runtime adapter. No provider calls were made for
this review and no unqualified production profile was enabled.

Version-specific workspace overrides remediate the previously recorded
[source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
with 1.2.2 and [esbuild advisory](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)
with 0.28.1. Both production and full-workspace audits pass with zero known
advisories on 2026-10-10. Dependency-license metadata review passes: 197 packages,
seven allowlisted families, no unreviewed licenses. These are dated dependency
checks, not legal approval or a guarantee of no vulnerabilities.

## Evidence and conclusion

Applicable source regression tests cover invalid scope/commands, credential echo,
provider failures, context drift, filesystem links, interrupted effects, private
state conflicts, uncertain reservations, invalid/missing reports, tool drift,
forged acceptance and final-phase evidence. The wire correction's 30 provider and
managed-compilation tests pass with simulated HTTP. Build/typechecks/lint pass.
The dependency refresh's complete workspace and frozen-fixture reruns are recorded
in [status](../implementing-docs/STATUS_0.4.0.md); pending runs cannot establish
candidate qualification.

No new blocking source-level defect remains from this review after dependency
remediation and the wire correction. The explicit host isolation, empirical live
provider/routing, exact installed/platform artifact and repeated qualification/soak
limits remain release blockers. Do not infer independent external security
certification, a penetration test or completion of I/J from this source review.

## Offline acceptance provenance recheck — 2026-10-10

For the owner-selected offline I/J scope, compared production core/CLI source at
reviewed `536a090` against tested `5565463`, excluding test modules and fixture
helpers: no production source differences. Compared `1d2638e` and `5565463` likewise;
no production source differences. Later portability/deadline fixes are in test,
fixture, workflow or documentation files. Installed diagnostic CLI bytes match
across Linux/macOS/Windows at
`sha256:7a4942e2e93d21cde4325be6b6aeb9e532307f3da50fc05c2b5e51e0fcbbf735`.

The catalog regression passed again, retaining unconfirmed production capability
profiles. Existing environment credentials, process/write ownership, strict
proposal validation and scope limits are unchanged. This provenance check is not
an external security audit, hostile-host isolation claim or release freeze.
See the [offline acceptance amendment](../implementing-docs/OFFLINE_ACCEPTANCE_0.4.0.md).
