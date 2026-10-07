# Security and Safety Requirements

RepoSetup executes tools on developer machines. Safety is a product requirement.

## 1. Declarative configs only

`reposetup.json` may describe:

- runtime;
- package manager;
- framework;
- known integration IDs;
- validated integration options.

It may not contain:

- raw shell scripts;
- arbitrary commands;
- JavaScript callbacks;
- URLs to executable scripts;
- postinstall hooks supplied by config authors;
- arbitrary absolute write paths.

## 2. Process execution

Prefer:

```ts
execa("pnpm", ["add", "zod"], { cwd });
```

Never:

```ts
exec(`pnpm add ${userValue}`);
```

unless a specifically reviewed shell requirement exists.

## 3. Project paths

All project-scoped file operations must remain inside the normalized target project root.

Block path traversal.

## 4. Overwrites

No silent overwrites.

Operations declare behavior:

- fail if exists;
- create if missing;
- merge;
- overwrite only when explicitly safe and expected.

For existing projects, prefer structured/AST-aware edits when feasible.

## 5. Secrets

Never store real secrets in exported configuration.

Generate:

```env
DATABASE_URL="<DATABASE_CONNECTION_STRING>"
```

rather than a real credential.

## 6. Prerequisites

RepoSetup v1 does not silently install system-level prerequisites.

If Node/Python/Docker/database server is missing, diagnose and explain.

Do not invoke sudo/admin installation automatically.

## 7. Network

Operations should state whether they require network access.

Dry-run must not perform network-dependent installation.

Registry search in v1 uses built-in local metadata.

## 8. Imported configs

All imported configs:

1. parse;
2. schema validate;
3. lookup integration IDs against trusted built-in registry;
4. validate integration options;
5. resolve compatibility;
6. only then generate operations.

## 9. Logs

Avoid logging:

- access tokens;
- environment variable values;
- credentials;
- full secret-bearing URLs.

Redact when necessary.

## 10. Failure behavior

On command failure:

- stop dependent operations;
- show which operation failed;
- preserve logs;
- never falsely report success;
- explain whether partial changes were made.

RepoSetup does not perform automatic rollback. Package installs, framework generators, lifecycle scripts, databases, and user-owned files may have effects that cannot be safely reversed from local information alone.

When execution fails, RepoSetup preserves a content-free temporary failure journal containing hashed operation identities and statuses. It removes journals for successful executions. Recovery is manual: inspect the failed operation, review project changes and package-manager output, then repair or remove only changes the user can verify. A future restore feature may touch only explicitly RepoSetup-owned files after matching their recorded hashes; it must never delete or overwrite a changed user file.

## Experimental 0.4.0 coding TaskPlans

A froze these rules; E/F implement trusted local verification/state/application and G implements managed transport/orchestration. Live provider qualification and H routing/repair remain open. The [task contracts](../product-docs/TASK_CONTRACTS_0.4.0.md), [managed support and verification profile](../product-docs/TASK_SUPPORT_0.4.0.md) and [provider research](../implementing-docs/TASK_PROVIDER_RESEARCH_0.4.0.md) supplement this installation policy.

AI may draft coding decomposition and typed text-change proposals. Treat model outputs, repository text and handoff responses as untrusted data, including instructions embedded in code/comments. Validate strict schemas, versions, requirement coverage, DAG references, write ownership and scopes before accepting a frozen TaskPlan. Configs/plans/model outputs may reference trusted check IDs, never executable commands, scripts, hooks or arbitrary endpoints. Never deserialize coding proposals as command-bearing InstallationOperations. Curated installation planning remains deterministic and built-in.

Core owns policy and domain transitions; concrete provider, repository, state, filesystem and process adapters live in CLI. Only the executor executes subprocesses or mutates project files. Managed changes permit expected-absent UTF-8 text creation and expected-hash unique text replacement only. Reject deletes, renames, binaries, arbitrary patches and dependency/lockfile mutation. Preflight the batch, recheck targets before individual atomic writes, record partial effects and retain failed edits. No automatic rollback, reset, stash, commit, installation or parallel worker behavior is introduced.

Read/write/deny scopes are project-relative, canonically validated and fail closed; deny wins. Reject traversal, absolute paths, special files and escaping symlinks. Exclude secrets, Git internals, dependency trees, binaries and generated output from context. Context is bounded and refreshed against source/rule/predecessor hashes before each attempt. Read inventory metadata locally rather than uploading whole repository contents. Broader context or write authority requires a reviewed plan revision. Portable handoff cannot enforce an external host's filesystem authority; label it advisory unless qualified evidence establishes enforcement.

Task completion requires trusted current-revision check evidence, acceptance-criterion coverage and no forbidden changes. Fixed adapters resolve check IDs; project scripts, README instructions and model suggestions are discovery evidence only. Freeze and audit check definitions and consumed configuration; relevant changes invalidate trust. Missing tools, zero required tests, commandless verification, doctor success or model claims cannot establish acceptance. Verify trusted local projects only. Argument arrays, scope checks and environment filtering do not constitute an OS sandbox; project test code can have side effects. Audit verifier effects and stop on unexpected drift.

Never persist credentials or real secrets in stack/task preferences, plans, run state, packets, change proposals or routine telemetry. Provider credentials stay in the CLI's transient credential boundary and are excluded from verifier environments and model context. Materialized source/context and sensitive recovery content remain separate from content-free operational metadata. Do not claim provider retention guarantees without the account-specific qualification recorded in research.

Task dry-run performs no writes, subprocesses, provider calls or verification; unresolved host checks and decomposition remain labelled. Managed execution requires a clean Git baseline, finite provider-call/token/cost/time limits and a usage allowance. Local validation/context/handoff/verification requires no AI credits. Record requested versus effective capability and effort independently, report unknown usage honestly, stop dependent tasks on failure and reconcile interruption before any new effects. No MCP or website changes are part of this scope.

Milestone G uses the official CLI-only SDK as a tool-free JSON transport; only the
executor dispatches. Private call intent/reservation is durable before dispatch.
Unknown or pending usage cannot replay/refund/reset automatically. The compilation
slot is bound to the independently reviewed phase, so changing request options or
stripping a receipt cannot reset it in the selected private authority. Exact dry-run
summary approval and explicit usage allowance precede credential/host construction.
Raw provider errors/refusals/headers/reasoning/prompts are not persisted. Validated
public plans and usage metadata are retained privately; credentials stay transient.
No paid call is authorized by ordinary tests or continuation instructions.
