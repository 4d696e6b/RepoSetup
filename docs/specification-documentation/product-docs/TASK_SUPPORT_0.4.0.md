# RepoSetup 0.4.0 — experimental task support profile

Milestone A specification, frozen 2026-10-06. Profile selection is a design decision;
no managed execution or concrete task check adapter is qualified yet.
The first E slice implements core evidence evaluation and explicit process environments;
A second E slice adds fixed recipes and bounded report parsing with pinned-tool
smoke tests on macOS. A third slice adds read-only file identity, fresh report
reads and bounded filesystem audits. Complete closure and executor qualification remain open.
Milestone D provides portable compile/next/status commands with advisory host enforcement;
these commands do not qualify the managed profile or establish trusted acceptance.
Use with the [contracts](./TASK_CONTRACTS_0.4.0.md),
[provider research](../implementing-docs/TASK_PROVIDER_RESEARCH_0.4.0.md) and
[benchmark protocol](../implementing-docs/TASK_BENCHMARK_0.4.0.md).

## Initial qualification target

`managed-ts-node-v1`, revision 1, targets a trusted local Git project with a single
TypeScript package, Node 24.x, npm or pnpm recorded by one consistent lockfile, and
already installed dependencies. RepoSetup itself retains its Node >=24 runtime
contract; other Node majors need separate task-profile qualification. Initial task
adapter qualification targets Linux x64 and macOS arm64. Windows, monorepo task
execution, Python, JSX/browser tests and framework generators remain unqualified.
Existing installer platform/framework support is unchanged.

The project must have reviewed TypeScript, ESLint and Vitest configuration, a
finite offline test suite and a pinned local toolchain. The initial fixture
toolchain target follows the inspected lockfile: TypeScript 5.9.3, ESLint 10.11.0,
typescript-eslint 8.70.0 and Vitest 5.0.1. These versions are present in the
development baseline, not evidence that the new adapter works. Milestone E must
qualify exact tool entry points, config dependencies, report parsing and write
effects; changing any of them changes the check-definition revision.

Managed attempts require a clean tracked and untracked Git baseline. Inventory
excluded/ignored paths by metadata without uploading their contents; preinstalled
dependency trees and private task state are not coding outputs. Fingerprint
eligible inputs and audit effects before/after an attempt and every verifier.
Unexpected user drift stops the run. Never reset, stash, commit or automatically
roll back. The user can prepare a worktree. RepoSetup does not create workers or
orchestrate worktrees in this release.

No task may change package manifests, lockfiles, package-manager settings,
verification configs/scripts, applicable agent rules, hooks, dependency trees or
generated output. Task write ownership is a finite list of exact regular text
paths. Private holdout oracles and their verifier dependencies are read/write
denied to coding context and owned by the independent evaluator. Frozen public
tests and public acceptance oracles may be read but never changed by a coding
task. New tests may be written only in separately approved test paths; they
supplement independent checks. Projects that need new
dependencies or changes to trusted checks stop with actionable prerequisites or a
reviewed future profile revision.

## Hard profile bounds

These are validation constants, not permission to spend provider allowance.
Preferences may lower them; raising them requires a reviewed profile revision.
Each attempt uses one worker and one proposal batch. Byte counts use UTF-8 bytes,
including envelope overhead where applicable.

- `maxContextBytes`: 262144 for the complete transient context packet.
- `maxFileBytes`: 65536 for each source read and resulting text file.
- `maxChangeSetBytes`: 131072 for one complete encoded proposal, at most 20 paths.
- `maxCheckDurationMs`: 120000 per trusted check.
- `maxCapturedOutputBytes`: 131072 per check, with overflow explicitly recorded.
- `maxProviderOutputTokens`: 16384 per provider request, including non-visible
  output. Also cap each request at the remaining run allowance.
- Provider timeout: 120000 ms per request, or the remaining phase deadline if
  smaller. No SDK background retries or concurrent calls.
- At most three implementation attempts per task; all decomposition, context
  expansion, failed requests and repairs also consume the run's finite call/token/
  wall/cost limits. A context request does not grant a new implementation attempt.

A file/context/report/proposal overflow is explicit blocked or incomplete
evidence. Never truncate required acceptance evidence and then call it a pass.
Token estimates are recorded separately from reported usage. A context byte bound
does not guarantee token capacity; routing must reserve input/output capacity for
the selected qualified model and enforce both bounds.

## Trusted verification authority

Only the executor invokes the CLI process adapter. Task plans and preferences
select IDs, never executables, shell strings, argument arrays, hooks, tool lists
or scripts. A reviewer freezes a local `CheckDefinitionSet` before any managed
attempt. Its identity binds the profile revision, tool/runtime versions and
entry-point hashes, fixed arguments, working directory, config/import closure,
required test identities, applicable rules, environment policy, time/output
limits, permitted temporary effects and independent oracle hashes. Trusted
import closure means tool/config/oracle implementation dependencies; production
code and newly authored tests under check remain mutable revision-bound inputs,
not frozen verifier definitions. Record both identities in the run and evidence;
relevant verifier drift invalidates trust before execution, while a coding edit
invalidates prior input-revision evidence and requires fresh verification.

The adapter catalog contains these initial IDs:

- `ts.typecheck`: the pinned local TypeScript entry point with `--project` naming
  the frozen config, `--noEmit`, `--incremental false` and `--pretty false`.
  Reject composite/build configurations for this profile. No implicit project
  discovery, emitting build or project script execution. TypeScript documents
  these options in its [CLI reference](https://www.typescriptlang.org/docs/handbook/compiler-options.html).
- `ts.lint`: the pinned local ESLint entry point with `--no-config-lookup`, an
  explicit frozen `--config`, `--max-warnings 0`, `--format json` and reviewer
  enumerated targets. No fix, cache, configuration discovery or model-provided
  options. The [official CLI reference](https://eslint.org/docs/latest/use/command-line-interface)
  documents these flags. ESLint configs/plugins execute JavaScript: their complete
  reviewed dependency closure is part of trust, not just a filename/hash.
- `ts.unit`: the pinned local Vitest entry point using `run`, explicit frozen
  `--config`, `--reporter=json`, `--maxWorkers=1` and `--no-file-parallelism`.
  The current E recipe also fixes `--configLoader=runner`, `--allowOnly=false`,
  `--passWithNoTests=false`, `--update=false` and an executor-owned external
  `--outputFile`; the default Vitest 5 JSON location would write inside the project.
  The fixed config excludes watch, network/browser tests, updates and
  `passWithNoTests`. Verify discovered required test identities, nonzero executed
  tests, skipped/todo/only cases, failures and complete report data against the
  manifest. An exit status alone is insufficient. See the official
  [Vitest CLI](https://vitest.dev/guide/cli) and
  [JSON reporter](https://vitest.dev/guide/reporters).
- `task.acceptance`: reviewer-owned deterministic fixture oracle for the named
  task criteria, or explicit current-revision human evidence when no qualified
  automated oracle exists. Evidence still missing means `needs_review`; prose in
  a plan is never run as a check.
- `phase.acceptance`: the same reviewer authority over the full selected
  requirement set and cross-task regression criteria. Required after all task
  outputs are accepted; task passes cannot substitute for this gate.

Resolve tool entry points locally behind a runtime adapter and execute the
qualified Node binary with an argument array and `shell: false`. npm/pnpm are
project identities, not permission for `npm run`, `pnpm run`, `npx`, downloads,
install hooks or package-manager execution in managed verification. Missing local
tools/dependencies/check definitions block with instructions; RepoSetup installs
nothing. Initial launch paths and argv must be tested against the exact pinned
toolchain before Milestone E support is claimed. Official flag documentation is
research evidence, not that qualification.

Allow only the qualified executable search path, fixed locale, `CI=1`, and a
private executor-owned temporary HOME/TMP directory where a tool requires one.
Do not inherit credentials, provider tokens, proxy/auth variables, `NODE_OPTIONS`,
package-manager config or arbitrary user environment values. Freeze any extra
allowlisted variable in the check definition. Store only redacted bounded
evidence, report hashes, test counts and effects in ordinary run metadata. Keep
temporary verifier output outside tracked project paths and audit it.

Argument arrays, environment filtering and path checks are not an OS sandbox.
Tests and plugins can execute arbitrary project code and access host/network
resources. This profile is for trusted projects with reviewed checks only; it
does not promise isolation of hostile repositories. No hosted shell, general
shell worker, MCP, network check, database service or dependency installation is
part of the authority. A future isolation profile needs its own qualification.

## Portable handoff

Use the versioned `TaskPacket` and `TaskHandoffResult` envelopes in the
[contracts](./TASK_CONTRACTS_0.4.0.md). A packet binds the plan/task/context/attempt
revision, objective and requirements, constraints and exact scopes, applicable
rules, accepted predecessor artifact hashes, trusted check IDs, requested
capability and separate effort preference, acceptance criteria and output IDs.
Materialized context is transient. Default stdout is a packet, not an executable
command or a durable source dump. Saving a packet is an explicit executor-owned
artifact operation outside the project and is disabled in dry-run.

A consumer can be an existing coding agent without a provider-specific SDK,
model catalog or direct API billing. If capability/effort cannot be enforced or
reported, label it advisory/unknown. RepoSetup cannot prevent a host agent from
reading or writing outside its packet; a user must review that host's permissions.
The initial portable protocol requests a typed proposal returned for executor
application. Externally applied edits can be recorded for manual review, but
cannot be treated as an enforced managed attempt or auto-accepted merely because
the host reports success. Never invoke a host shell/agent command from a packet.

Local draft validation, context preparation, status and trusted local verification
need no AI credits. They still need the appropriate local prerequisites. Handoff
uses whatever allowance the chosen agent already has. Automatic decomposition
and managed coding need explicitly configured provider credentials and finite
usage allowance; a subscription or handoff does not establish direct API access.
No paid calls are authorized by this specification or by benchmark ceilings.

## Qualification evidence required later

Milestones C/E/F must demonstrate secret exclusions and content screening before
upload, canonical scope enforcement, stale hash rejection, check trust drift,
zero/filtered tests, report overflow, verifier side effects, environment filtering,
missing tools, concurrency locks, cancellation and honest partial-write recovery.
Milestone G needs fake boundary tests plus separately authorized live smoke
evidence; H needs qualified model/effort/cost catalogs; I needs the frozen fixture
artifacts and platform evidence. Profile constants, check IDs and portable
envelopes are frozen here; these later gates remain open.

## Milestone E research refresh — 2026-10-06

Current official [TypeScript CLI options](https://www.typescriptlang.org/docs/handbook/compiler-options.html),
[ESLint CLI reference](https://eslint.org/docs/latest/use/command-line-interface),
[Vitest CLI](https://vitest.dev/guide/cli) and [Vitest reporters](https://vitest.dev/guide/reporters)
were rechecked before the first E implementation slice. They document the planned
explicit config, non-emitting typecheck, lint JSON and single-worker test/report
options above. Current web documentation can describe newer tools than the pinned
baseline. Local pinned entry-point executions and report fixtures are still
required; this refresh supplies no qualification evidence. Open questions remain
complete config/plugin import closure, Vitest report/test-identity mapping and
cache/temp behavior across both target platforms. The explicit environment port
is tested with real Node 24 on macOS; CoreFoundation may add its own
`__CF_USER_TEXT_ENCODING` variable after launch. Environment filtering is not an
OS sandbox and does not prevent trusted project code from accessing host files.

The second E slice exercised these fixed arguments against the installed pinned
entry points on macOS arm64 with Node 24.21.0. The fixture uses a minimal reviewed
ESLint config over JavaScript-compatible TypeScript; it does not qualify arbitrary
TypeScript parser/plugin closures. Vitest's current [JSON reporter documentation](https://vitest.dev/guide/reporters)
and pinned source confirm the default file output. Its [CLI documentation](https://vitest.dev/guide/cli)
documents `allowOnly`, `configLoader` and `passWithNoTests`; the actual local
`.only` fixture confirms a nonzero failure with the fixed recipe. Reporter output
is explicitly redirected outside the project, and the runner config loader avoids
bundled config temporary output. This is entry-point/argument evidence only.
A production executor must additionally verify complete reviewed definitions,
read the fresh private report with bounds and audit all verifier effects before
this evidence can establish acceptance. No task verification command exists yet.

## Milestone E read-only verifier file boundaries

Core owns strict internal snapshot/definition records and identity/comparison
logic. These are in-memory adapter contracts, not additional task artifact kinds
or a config/CLI acceptance input. CLI supplies read-only POSIX adapters. A reviewed
file definition binds the recipe, named canonical roots, runtime/tool/config
roles and explicit dependency/rule/oracle hashes. Verification of that list is
not proof that it covers every dynamic import; complete reviewed closure and
immutable dependency inventories remain an executor qualification requirement.

Project snapshots recursively inventory all reachable project entries without
following symlinks. Eligible public files are bounded UTF-8 text with privacy
screening; default exclusions and independently reviewed metadata-only selectors
retain only metadata. Private/ignored bodies are not hashed or uploaded. Metadata
overrides cannot replace required input, config, oracle or owned-output content
bindings. Directory/root metadata changes prevent an unchanged comparison even
when no surviving file explains an effect. Symlink targets outside the project
are not part of this inventory; trusted definition roots need separate audits.

The new audit allowance is 16384 entries and depth 32, separately from C's
4096-entry context inventory. Project text remains at most 65536 bytes. A
reviewed runtime/tool definition file can be streamed up to 268435456 bytes, with
536870912 total listed bytes and fixed-size read buffers. These local binary
hash allowances do not change task source/context/proposal bounds. Exceeding any
bound blocks the check. Definition readers refuse symlink components, hardlinks,
credential paths and inconsistent descriptor/path metadata.

A report reader is prepared before launch against an existing canonical 0700
same-owner executor scratch directory and an absent `unit-report.json`. The
first read consumes it, including failure. It requires a fresh regular single-link
file, bounded fatal UTF-8 and unchanged root ownership/permissions/identity.
Recipe identity replaces per-check scratch locations with fixed logical slots;
actual scratch creation, launch and cleanup are still executor work. The pinned
Vitest smoke fixture uses this reader now. No production verification orchestration
or task verify command is present.

These audits are point-in-time evidence, not atomic snapshots or an OS sandbox.
They may conservatively block large Git/dependency inventories, and cannot
universally detect a hostile write restored between observations or host effects
outside inventoried roots. F must add current revision/application/acceptance
binding and durable reconciliation; complete closure/profile/platform qualification
cannot be inferred from the current macOS filesystem fixtures.
