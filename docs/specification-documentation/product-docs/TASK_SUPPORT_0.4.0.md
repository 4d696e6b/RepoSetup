# RepoSetup 0.4.0 — experimental task support profile

Milestone A specification frozen 2026-10-06; Milestones E/F implementation updated
2026-10-07. The internal verification executor and concrete fixed-check adapter are
implemented. Qualification evidence covers the reviewed macOS arm64 / Node 24.21.0
single-package fixture, including the TypeScript ESLint parser/plugin. Linux x64,
packed artifacts and broader project configurations retain their I/J gates.
G is complete for offline managed compilation/coding implementation and no-key
SDK/CLI/Git/tool/state qualification under the owner's 2026-10-07 scope amendment.
Real provider/profile completion remains unqualified pending separately authorized
smoke in I, required before J's managed candidate qualification.
F implements the internal private-state and scoped application boundary; local
qualification passed as recorded in status.
Milestone D's portable compile/next/status commands remain advisory; no task
verify/run command or imported evidence acceptance is added by E.
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
Milestone G's fake boundary tests and no-key integration condition passed.
Under the owner's 2026-10-07 amendment, I now owns G's former separately authorized
live smoke condition, which remains required before J's managed candidate
qualification. H needs qualified model/effort/cost catalogs; I also needs the
frozen fixture artifacts and platform evidence. Profile constants, check IDs and
portable envelopes are frozen here; these later gates remain open.

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

## Executor continuation (2026-10-07)

Core now sequences trusted checks and audits, with executor-only process invocation,
zero-effect dry-run and live in-memory human review requests. Only a result issued by
this executor can serve as an ephemeral task prerequisite for final-phase checking;
serialized results and copied requests cannot authenticate acceptance. Durable state
and application receipt binding are still F. The concrete adapter is now connected through internal executor ports, with its qualification scope below.

Fixed task recipes bind a 1000 ms termination grace after timeout/cancellation;
the process adapter then signals the POSIX process group with SIGKILL if it has not
closed. This opt-in path leaves installer behavior unchanged. Runtime filesystem
semantics were checked against [Node 24 filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html)
and process-group/signalling behavior against [Node child-process documentation](https://nodejs.org/api/child_process.html).
Signals do not guarantee termination of processes that detach into another group.
[Vitest pool documentation](https://vitest.dev/config/pool) confirms its default forks
use child processes; checks remain single-worker, without parallel RepoSetup workers.

## Milestone E qualified execution boundary

[Core executor](../../../packages/core/src/executor/task-verification.ts) owns serial
process invocation and scratch allocation/disposal through CLI ports. It validates
the plan against independent compilation authority, checks current root/revision
and catalog identity before effects, checks definitions and project inventories
around every tool, and requests live independent acceptance only after all mandatory
tools and reviewed test identities pass. A pending reviewer produces `needs_review`;
an explicit rejection fails. Missing/unsafe tools, reports or scratch block. All
non-pass results clear criterion satisfaction. Final-phase verification requires
same-plan/run/current-revision task records actually issued by this executor, plus
separate phase review. A JSON copy cannot serve as a receipt. The in-memory overlap
guard prevents concurrent verification in one executor; F owns cross-process locks,
application receipts, durable acceptance and recovery.

[Qualified check authority](../../../packages/core/src/tasks/check-qualification.ts)
is an internal strict version 1 record, outside plan/config/import document kinds.
Its composite revision binds the reviewed file definition, fixed recipe, canonical
root mapping, entire immutable dependency inventory, actual running Node 24 version
and executable, fixed published package entry, package metadata, config, lint targets and required-test identity/file/name bindings. The concrete qualifier compares every binding to actual files and pinned
TypeScript 5.9.3, ESLint 10.11.0 and Vitest 5.0.1 metadata. TypeScript configs are
JSON-only here and reject `extends`, project references, composite and incremental
builds. The runtime executable is hashed as an exact reviewed file; unused npm and
Corepack shims are not runtime implementation dependencies and are not invoked.

[Closure inventory](../../../packages/cli/src/tasks/verifier-closure.ts) hashes
all files and metadata under each independently admitted immutable tool/dependency
root, including additions and removals. Dependency links must resolve inside a
bound root; their link text and canonical target are recorded. Private paths,
unknown/special files, aliases, unsafe links, changing roots and exceeded bounds
block. Complete project `node_modules` must be one of those roots. Sharing an
inventory read is allowed only within one audit; no hash cache survives a launch
or audit. These roots reuse the 16384-entry/depth-32 and 256 MiB individual / 512 MiB
aggregate closure limits. Every config/plugin import must have been independently
reviewed into the admitted closure; the product does not infer that fact from a
label or run arbitrary unreviewed JavaScript to discover it. The qualified fixture
has frozen configs with a reviewed typescript-eslint 8.70.0 parser/plugin import,
whose complete installed tree is inventoried. Every required unit identity maps to
a reviewed oracle source file frozen in the file definition; the adapter compares
the binding set to the independent catalog. Keeping a name while replacing its
assertions therefore fails definition freshness before process launch. Additional configs/plugins need their
own review and qualification; this is not a universal static import analyzer.

[Scratch adapter](../../../packages/cli/src/tasks/verifier-scratch.ts) allocates a
fresh same-owner 0700 directory outside project/definition roots, with separate
0700 `home` and `tmp` subdirectories. The frozen scratch policy is shared with, and included in, the fixed recipe identity.
Temporary files are bounded to 4096 entries, depth 32 and 8 MiB total. `tmp` permits transient check reports/SSR/Vite files;
HOME permits only the pinned Vitest user-data hierarchy. Vitest 5 creates an
internal local API token there even for this CLI run. The adapter never reads that
token or copies it into configuration, reports, context or task metadata. Permitted
scratch is deleted after the check; unsafe/replaced/linked/oversized scratch is
retained privately and verification blocks for manual inspection. Cleanup never
removes project files or restores project effects. Root/descriptor checks remain
point-in-time observations with the trusted-project race/isolation limitations above.

Recipes now force `--cache=false`, `--fsModuleCache=false` and fixed
`NODE_DISABLE_COMPILE_CACHE=1`, in addition to prior argv/environment limits.
[Node module documentation](https://nodejs.org/api/module.html#module-compile-cache)
documents disabling compile-cache writes; the actual Node 24/tool fixture verifies
it. [Vitest cache documentation](https://vitest.dev/config/cache),
[fsModuleCache documentation](https://main.vitest.dev/config/fsmodulecache) and
[Vite cacheDir documentation](https://vite.dev/config/shared-options#cachedir)
explain the persistent cache switches and location. The reviewed config directs
Vite cache to the executor's TMPDIR. Temporary SSR files and the user-data token
were confirmed by inspecting the installed pinned Vitest 5.0.1 implementation and
its actual filesystem effects; cache flags alone do not disable every temporary
file. [typescript-eslint package documentation](https://typescript-eslint.io/packages/typescript-eslint/)
identifies its parser/plugin exports used by the fixture. Installed 8.70.0 peer
metadata permits ESLint 10 and TypeScript 5.9; actual executions establish the local
compatibility evidence. No new dependency installation or paid provider call is
required for local verification.

## Milestone F local state and application boundary

The [durable executor](../../../packages/core/src/executor/task-run.ts) coordinates
separate [application](../../../packages/core/src/executor/task-run-application.ts),
[recovery](../../../packages/core/src/executor/task-run-recovery.ts) and
[acceptance](../../../packages/core/src/executor/task-run-acceptance.ts) modules.
Domain preflight/checkpoint validation stays core. CLI supplies canonical guarded
[application ports](../../../packages/cli/src/tasks/application-adapter.ts) and
[private state/leases](../../../packages/cli/src/tasks/run-state-adapter.ts).
The initial internal F profile needs one preexisting canonical same-owner 0700
state directory outside the project on its POSIX filesystem; the host must use one
consistent authority. The factory performs reads only. Executor dry-run calls no
adapter and cannot create a run, lease, stage, snapshot or project effect.

Runs also bind physical root identity across newly constructed adapters and the
complete initial inventory; unrelated later edits and unrecorded changes to formerly
owned failed outputs block new work. State reads/snapshots are capped at 1 MiB. Version/checksum/duplicate-key and
relationship failures block. Source bodies and check reports remain transient;
private stages contain only preflight-screened proposed text and are addressed by
recorded UUIDs. Scoped replacements preserve exact UTF-8/line endings and require a
single exact match under the expected hash; creation requires absence. Parent paths,
case aliases, special files and links are checked before any batch effect and again
per effect. Each individual effect and necessary parent is recorded; state-save
failure leaves a pending intent rather than accepted work. Complete staged bytes
are published with individual rename or exclusive link, with file/directory sync.
A link-window crash, stale/replaced root, unexpected write or unknown private stage
requires review and remains retained. No automatic rollback or replay occurs.

Acceptance checks original immutable inputs and owned postimages against current
bytes, requires qualified definitions/oracles and fresh E evidence, and saves
revision-bound artifacts. Qualification's project definition/oracle paths are
immutable even if a draft asks for them. A restarted process needs fresh task
checks to authenticate predecessor acceptance; separate final review is mandatory.
Manual reviewed reconciliation can resume a fully recorded application, but cannot
adopt matching pending bytes or restore unknown interrupted verification allowance.
Observed wall/check time and finite attempt ceilings remain enforced. These are
internal host capabilities; portable D commands stay advisory and no provider/task
run command is introduced. Managed calls and allowance reservations remain G.

Evidence covers macOS arm64 / Node 24.21.0: real filesystem fault injection,
cancellation, corrupted/CAS state, live and dead local leases, a real restarted
process, retained partial edits, independent phase review, and a real qualified
TypeScript replacement followed by the pinned checks and independently required
unit test. Linux/packed/full managed-project qualification remains I/J. Owner-private
state, checksums, point-in-time inventories and Node path guards do not authenticate
against hostile same-UID rewrites, provide OS isolation, or defeat arbitrary
concurrent rename/symlink races. File sync is OS/device specific; the
[official Node 24 filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html#filehandlesync)
is the researched boundary, not a universal durability guarantee. Retention and
stale/unknown recovery remain explicit user-owned lifecycle work.

## Milestone G transport and managed command boundary

The initial command profile requires a canonical single-package TypeScript project
on the reviewed Node 24 POSIX host, consistent npm/pnpm metadata and preinstalled
dependencies. Managed run rechecks clean Git root/commit and complete reviewed
snapshot under the lease; manifest-qualified fixed checks remain independent of
model output, project scripts and preferences. Decomposition is read-only with
respect to the project and carries its retained usage into coding. Private ledger
identity is bound to the reviewed phase; changing effort/budgets or removing a
receipt cannot reset an existing phase allowance in the selected state authority.

The fixed strong transport and explicit native effort are unqualified for capability
routing until H. Fake HTTP with the actual SDK verifies local orchestration; actual
TypeScript/ESLint/Vitest fixtures verify application/acceptance. Neither establishes
account access or live provider schema/usage/effective-configuration behavior.
The [smoke protocol](../implementing-docs/TASK_PROVIDER_SMOKE_0.4.0.md) defines the
remaining I/J live gate and its separately authorized allowance. G's offline
completion does not qualify remote provider support or remove production credential
and usage-allowance requirements. Linux/packed/benchmark
and release remain I/J. Host-private state and filesystem audits are not an OS
sandbox or protection against hostile same-UID rewrites/concurrent renames.
