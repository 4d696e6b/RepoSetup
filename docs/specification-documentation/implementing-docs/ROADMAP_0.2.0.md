# RepoSetup roadmap to 0.2.0

Planning baseline: 2026-09-22, commit `a0e48a1`, CLI package `rsetup@0.1.1`.
Status: proposed implementation sequence; no phase below is implemented by this planning task.

## Release outcome

0.2.0 should be a dependable terminal installer for a deliberately bounded set of stacks. A new user must be able to install the published CLI, preview a recipe, create a runnable project, run its tests, add a supported integration, and diagnose a failure on Windows, macOS, and Linux without repairing generated files manually.

The order is **correctness → safe execution → platform qualification → reproducibility → measured speed → usability → integration expansion → release**. Cross-platform execution and performance work must pass before the release candidate; they are not follow-up work for 0.2.1.

“Highest stability” means enforceable release gates, not a promise of zero bugs. A supported combination is an explicit tuple of integration, operation, framework, package manager, runtime range, OS, and architecture. A green unit suite does not qualify every tuple.

Preserve the terminal-first TypeScript/Node/pnpm monorepo, declarative configuration, typed operations, offline registry, and existing integration IDs. All AGENTS.md non-goals remain in force, including website, Firebase, accounts, payments, hosted registry, remote executable plugins, and arbitrary scripts from config.

## What the project inspection established

These are source observations, not a completed security audit or observed remote CI results.

- **Substantial foundation:** 33 registry entries, resolver/planner, create/add/remove, detection, doctor, export, package-manager adapters, packed-artifact tests, and five golden recipes exist. See `packages/integrations/src/catalog.ts`, `packages/core/src/`, and `tests/e2e/`.
- **Local quality baseline:** `pnpm test` passed 335 tests with one skipped; `pnpm typecheck`, `pnpm lint`, `pnpm build`, and the built CLI's `registry validate` passed. Node was 22.12.0 and pnpm 12.5.1 on macOS. Packed e2e results are recorded in IMPLEMENTATION_STATUS.md. Full golden execution and Linux/Windows execution were not rerun for this planning task.
- **Release records disagree:** package.json, README, and 0.1.1 notes describe 0.1.1; older status/checklist sections still describe unpublished 0.1.0. No ID is stable. Reconcile evidence before promotion.
- **Platform CI is insufficient:** `.github/workflows/platform.yml` builds and runs package tests, but not `test:e2e` or full golden tests. `golden.yml` is Linux-only. `tests/e2e/pack.test.ts` explicitly skips the installed binary shim on Windows and hardcodes 0.1.1 artifact expectations.
- **Publish gates are disconnected:** `publish-npm.yml` does not depend on the separate platform/golden workflows. Its local quality checks do not establish release-wide qualification. A tag can enter publication without that evidence.
- **Process portability needs qualification:** `packages/core/src/executor/process.ts` directly spawns names such as npm/pnpm, ignores stdin, buffers all output, and exposes no cancellation or timeout API. Windows command shims need explicit handling; `windowsHide` is not a compatibility layer. Node documents the special treatment of `.cmd`/`.bat` files in its [child-process reference](https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows).
- **Architecture cleanup is needed:** concrete process/filesystem execution currently lives in core, despite AGENTS.md assigning execution to CLI. Package-manager selection also appears in integration helpers and Next.js. Preserve pure domain orchestration while moving concrete I/O and command construction to the correct adapters.
- **Speed work needs semantic operations first:** `integrations/src/operations.ts:addPackages` converts requests into `run_command` immediately. The existing `install_package` type lacks `exact` and `allowBuild` fields present on adapter requests. The planner concatenates plans and the executor runs them sequentially. Do not optimize by parsing command strings or dropping install policy.
- **Repeatability is incomplete:** Next.js uses `create-next-app@latest`; other recipes contain unversioned dependencies. A deterministic list of commands is not a reproducible dependency graph.
- **Preflight is shallow:** prerequisites mostly test `--version` exit status rather than supported versions; Python is hardcoded as `python`. The pip prerequisite checks Python, not pip availability. Lexical path containment does not establish symlink/junction containment; file writes use ordinary writeFile. These require targeted tests before safety claims.
- **Generated-project tests are weak in places:** JS goldens allow no tests, Python goldens accept pytest exit 5, and Express is typechecked without a server response test. Database generation is correctly distinguished from connectivity, but usable recipes need stronger evidence.

## Support contract to freeze in Phase 19

- **Required OS targets:** Windows 11 x64, a supported macOS release on Apple Silicon, and Ubuntu 24.04 x64. Record actual versions and architectures in evidence. GitHub's Windows server runners do not replace a Windows 11 acceptance run. Add macOS Intel to the supported list only with runner/device evidence. Windows ARM, Alpine/musl, other Linux distributions, and WSL are compatibility candidates until tested.
- **Node:** target Node 24 LTS only, with exact qualification pins recorded in the Phase 19 baseline. Node 20 is EOL and Node 22 is an older LTS line in the current [official release list](https://nodejs.org/en/about/previous-releases), so do not extend the published `>=20` support claim into 0.2.0. Recheck lifecycle status when releasing.
- **Python:** propose 3.12 and 3.13 with uv as the primary qualified path. Confirm dependency support and lifecycle against the [Python version status](https://devguide.python.org/versions/). Do not carry forward the README's Python 3.9+ claim without qualification. pip remains explicitly limited until isolated-environment and dependency-recording behavior is proven.
- **Package managers:** qualify explicit npm and pnpm version ranges, plus an explicit uv range. Distinguish the repository's development pnpm pin from package managers supported by generated projects. Bun/Yarn expansion is deferred.
- **Required golden recipes:** Next.js + SQLite/Prisma; React/Vite; Express; FastAPI/uv; Flask/uv. Each needs create, real tests, build/typecheck or import as applicable, server/HTTP smoke, stack, doctor, and export/recreate. JS recipes require npm and pnpm evidence. Python requires uv evidence.
- **Mutation paths:** qualify add/remove only where a recipe exists. Unsupported contexts fail before mutation. A database config generator is not advertised as a working database service.

This is the proposed minimum release scope. Any reduction must be an explicit documented scope decision, never a skipped test counted as success.

## Sequence and version policy

Complete the open Phase 18 evidence through the phases below; do not retroactively mark Phase 18 complete. Phases 19–28 extend the existing 0–18 plan.

Use 0.1.x patches only for compatible fixes. Develop new features toward `0.2.0-alpha.N`, then `0.2.0-beta.N`, `0.2.0-rc.N`, and finally `0.2.0`. These are milestones, not instructions to publish during implementation. No release or tag is created by this plan.

### Phase 19 — Reconcile the baseline and freeze acceptance scope

**Depends on:** current tree. **Deliverable:** one trustworthy release baseline.

- Reconcile README, status, support report, release checklist, package versions, and release notes. Verify npm/GitHub state read-only and link observed evidence; retain historical release records.
- Freeze the support contract above, exact runtime/package-manager ranges, required recipe variants, and stable versus experimental paths. Remove unsupported suggestions such as Bun from CLI guidance where appropriate.
- Inventory failures, flaky tests, skipped tests, vulnerable dependencies, external command research, and all floating generator versions. Assign each a release blocker or explicit deferred scope.
- Add an evidence record containing source SHA, artifact hash, recipe/config hash, tool versions, OS/architecture, checks, timestamps, and CI run links. Missing evidence is not a pass.
- Record pre-optimization timing and subprocess counts for the existing recipes before changing execution behavior.

**Gate:** fresh baseline commands pass; support scope and known blockers are documented; each old Phase 18 gap has an owner and a later gate. Existing failures must be fixed or accurately recorded before dependent work begins.

### Phase 20 — Safe executor and adapter boundaries

**Depends on:** 19. **Deliverable:** a bounded, interruptible execution engine.

- Keep planning, validation, errors, and executor interfaces pure in core. Put concrete process/filesystem adapters in CLI; only the executor invokes mutation/process capabilities. Integrations emit typed intents; package-manager adapters own argv construction, including generator/local-tool invocation.
- Add a read-only preflight that checks runtime versions, required tools, target path, writable locations, existing-file conflicts, and relevant environment constraints before project mutation. Preserve a process-free, write-free dry-run with explicit unverified host checks.
- Add live redacted output, bounded capture, operation timing/events, timeout classification, Ctrl+C cancellation, process-tree cleanup, and stable errors. Handle errors/close exactly once and preserve useful exit/signal context.
- Reject unsafe real paths, symlinks/junction escapes, ambiguous file replacement, and conflicting concurrent RepoSetup runs. Use exclusive creation/atomic replacement where applicable; test race windows rather than relying only on exists-then-write.
- Add a minimal failure journal of operation IDs/status and hashes, excluding secrets and raw environment values. Restore only RepoSetup-owned changes whose hashes still match. Do not promise rollback of external installers, lifecycle scripts, or databases.
- Define package lifecycle/build-script policy for curated dependencies. No arbitrary executable instructions from config, no elevated software installation, and no bypass of integrity checks.

**Tests/gate:** injected permission/disk/write failures, traversal and symlink fixtures, conflicting edits, signal/timeout cleanup, bounded output, chunk-split secret redaction, dry-run zero mutation, and add/remove preservation all pass. Baseline behavior remains intact after moving adapters.

### Phase 21 — Prove cross-platform execution

**Depends on:** 20. **Deliverable:** working packed CLI on the required OS targets.

- Implement trusted executable resolution behind the platform adapter. Resolve supported Node CLI entry points/native executables without shell interpolation; do not solve Windows by enabling `shell: true`. Qualify supported installation layouts and reject unknown unsafe shim layouts with actionable guidance.
- Detect Python via platform-appropriate interpreter candidates, including python3/python/Windows launcher where available; use that same selected interpreter for checks and execution. Detect pip and active environments separately.
- Cover spaces and Unicode in parent directories, CRLF, drive letters, reserved names, path case, PATH/PATHEXT, executable permissions, long-path policy, and temporary directory cleanup. Keep project-name validation distinct from parent-path handling.
- Add packed CLI tests and representative real create/add runs to each OS workflow. Test both installed aliases through native launchers, including Windows; fix the e2e harness too.
- Use explicit supported runner labels and record architecture. PR checks cover platform-sensitive changes; full recipe/manager coverage runs nightly and on candidates.
- Run the complete required recipe set on all target OSes before closing this phase, using source and packed artifacts as appropriate. Provision prerequisites in CI; product execution must never install system prerequisites silently.

**Gate:** required matrix passes with no hidden skips; Windows 11 manual/VM transcript and macOS/Linux evidence exist; missing prerequisites fail before mutation. Cross-platform functionality is complete before performance or catalog expansion is accepted.

### Phase 22 — Reproducible recipes and compatibility enforcement

**Depends on:** 21. **Deliverable:** qualified versions and repeatable installs.

- Replace floating generators on guaranteed paths with researched, tested versions. Record qualified direct dependency versions/ranges, peer constraints, generator version, registry revision, and expected runtime versions.
- Introduce a separately versioned declarative recipe-resolution record if needed. It may contain IDs/options/versions/hashes, never commands to execute. Validate it with Zod and reconstruct plans from the built-in registry.
- Preserve package-manager lockfiles as the source of transitive dependency resolution. Reusing the same config alone is not enough; define which recipe record and lockfiles must accompany reproduction.
- Preserve schemaVersion 1 configs where possible; test 0.1.1 examples and export round trips. Unknown schema versions and incompatible lockfiles fail clearly instead of being silently rewritten.
- Enforce version compatibility before installation and detect conflicting package-manager lockfiles. Do not overwrite user registry/proxy settings or export credentials.

**Tests/gate:** identical inputs yield identical semantic plans; locked repeat installs do not drift; unsupported versions fail before mutation; old supported configs still parse; tampered records cannot inject commands. Cross-platform native dependency differences are documented rather than claiming byte-identical node_modules.

### Phase 23 — Make package installation measurably faster

**Depends on:** 22 and the Phase 19 performance baseline. **Deliverable:** fewer install passes with preserved semantics.

Implement in this order:

1. Preserve package requests as typed operations through planning. Carry dependency group, exactness, build approvals, package manager, project root, and execution barriers explicitly.
2. Deduplicate compatible requests and batch within the same manager/root/policy. Reject conflicting versions. Never move installation across a generator, migration, codegen, or verification step that needs the dependency installed.
3. Separate scaffold generation from dependency installation where the qualified upstream generator supports it. Next.js documents `--skip-install`; verify it against the chosen version before using it. See the [official generator reference](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
4. Assemble manifests before a consolidated install where safe. Existing-project add may still need separate dependency groups; optimize for the minimum correct number, not a universal “one command” target.
5. Reuse native npm/pnpm/uv caches. Expose an explicit cache preference only where supported; preserve registry/auth/proxy configuration. pnpm documents that prefer-offline can still fetch missing data, while offline fails on cache misses. See [pnpm install](https://pnpm.io/cli/install). uv already maintains a native cache; see [uv caching](https://docs.astral.sh/uv/concepts/cache/).
6. Let the package manager own download concurrency. Do not run competing installers against the same manifest/lockfile, write a custom downloader, disable TLS/integrity, or blindly increase network concurrency.
7. Use bounded retry/backoff only for classified transient download failures where retry is safe. Avoid multiplying native package-manager retries and never automatically replay a partially mutating generator.

Strict offline project creation is deferred unless every required generator and package is available locally and network silence can be proven. Never label cache preference as offline support.

**Benchmark protocol:** use fixed recipe/tool versions and a fixed reference host per OS; isolate benchmark caches without deleting the user's cache. Run at least five cold-cache and five warm-cache trials per required recipe/manager before and after; alternate baseline/candidate order. Record median, min/max, install-process count, total/setup/verification time, peak process memory, and failures. Record download bytes/cache hits only when reliable manager reports exist. Pin registry endpoint and record network conditions. Use a controlled registry/cache fixture to distinguish planner overhead from public-network variance; real registry trials remain necessary for usability evidence.

**Proposed acceptance targets, not measured claims:** at least 25% lower warm-cache median total setup time for two representative multi-integration recipes; at least 50% fewer install subprocesses where the baseline has redundant batches; no repeatable regression above 10% on other required recipes in controlled comparisons. Cold-cache results must be reported separately. Do not claim faster network bandwidth. Gate changes require a written scope decision before release, not an unexplained benchmark waiver.

**Correctness gate:** optimized and reference plans generate equivalent dependency groups, approved builds, configuration, and passing runnable projects. Failure attribution identifies affected integrations. These tests and all platform tests must pass alongside the benchmark targets.

### Phase 24 — Make daily CLI use clear and recoverable

**Depends on:** 23. **Deliverable:** a beginner can finish the supported workflow.

- Add bundled declarative presets for the five guaranteed recipes, with discoverable descriptions and support status. No remote scripts or opaque executable plans.
- Add multi-integration add planning with one compatibility check and one reviewed delta before any write. Show why packages are selected, which files change, and what requires the network.
- Provide consistent progress, elapsed time, concise errors, and exact post-create commands/working directory. Generated projects need working dev/build/test scripts where applicable and a short generated README; research commands per framework.
- Define versioned JSON output for plan, stack, doctor, and errors; keep progress on stderr. Test non-TTY, quiet, no-color, cancellation, and no-prompt CI behavior.
- Extend doctor with runtime mismatch, missing dependencies, conflicting lockfiles, missing generated clients, and placeholder environment guidance. Read-only remains the default; no automatic repair command in this release.
- Surface a partial-run report and safe next action after failure. Automatic resume is deferred; manual retry is offered only after re-detection and conflict checks.
- Publish an explicit policy for add/remove in workspaces. Qualify a specific package target or refuse ambiguous workspace roots before writes; broad monorepo composition is deferred.

All new CLI spellings are design proposals until CLI_SPEC.md and help tests are updated; this roadmap does not present them as existing commands.

**Gate:** a fresh user can complete published-install → preview → create → run → test → add → doctor → export using documented instructions on each OS. Five observed usability sessions across the three OS families have no unrecorded manual repair; any blocker becomes a regression test.

### Phase 25 — Qualify the existing high-value catalog

**Depends on:** 24. **Deliverable:** useful existing integrations have real acceptance evidence.

Priority order:

1. Required five recipes and their dependencies: Next.js, React/Vite, Express, FastAPI, Flask, Tailwind, Prisma/SQLite, Zod, Vitest, Prettier, Pydantic, SQLAlchemy/Alembic, pytest, Ruff, and their runtimes/managers. Add real sample assertions and HTTP readiness/response tests; accepting “no tests” is not sufficient.
2. Finish ESLint, Playwright, and GitHub Actions for those recipes. Generated CI must execute successfully; browser binary downloads must be explicit, and missing OS browser prerequisites must produce instructions. Never silently install system browser dependencies.
3. Qualify Fastify and one Drizzle/database path only if they meet the same gates. PostgreSQL/MongoDB live-service tests are separate from config generation and run against isolated test services. Docker/Compose output needs validation but must not start services without an explicit product action.

shadcn, Mongoose, additional databases, and unqualified infrastructure paths may remain experimental. Prefer finishing a complete tested stack over promoting every ID.

**Per-integration gate:** current official-command research, options/schema tests, supported-context/conflict tests, deterministic plans, detect/doctor fixtures, packed real create or add, idempotency, user-file preservation, version bounds, and OS evidence for every advertised operation. Remove is advertised only with an explicit safe recipe and tests. Publish capability details in info/docs so a stable create path does not imply a stable remove path.

### Phase 26 — Add a small set of important integrations

**Depends on:** 25. **Deliverable:** four new curated capabilities that complete common workflows.

These are recommendations based on gaps in the current catalog, not popularity rankings. IDs are proposed and must be checked before freezing. Exact versions, install argv, peer dependencies, initialization, and removal behavior remain **research-required** using EXTERNAL_COMMAND_RESEARCH_TEMPLATE.md.

- **`testing-library`: required.** React Testing Library plus the appropriate DOM environment/user-event support for Vitest. First qualify React/Vite. Provide one accessible interaction test that really runs. Next.js support must state client-component/SSR limitations separately. [Official introduction](https://testing-library.com/docs/react-testing-library/intro/).
- **`tanstack-query`: required.** Typed server-state fetching/caching for React/Vite, with a provider and a small request example. Validate existing provider/file conflicts; Next.js support is separate research. Prove an actual query test and production build. [Official overview](https://tanstack.com/query/latest/docs/framework/react/overview).
- **`httpx`: required.** Python HTTP client and API-test support, beginning with a passing FastAPI endpoint test. Prove its compatibility with the selected framework/testing versions and sync/async model. [Official documentation](https://www.python-httpx.org/).
- **`pydantic-settings`: required.** Typed Python environment settings with safe `.env.example` placeholders and explicit missing-value diagnostics. Never request/export real secrets. Prove settings parsing and error behavior. [Official settings documentation](https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/).
- **`react-hook-form`: stretch.** Forms with a researched Zod resolver recipe, input/error example, and actual interaction test. Official documentation could not be fetched during planning (HTTP 403), so this remains research-required; do not guess its API or compatibility.

Install only selected integrations; no blanket “recommended everything” default. If a required new capability cannot qualify, delay 0.2.0 or explicitly revise release scope. Stretch packages never block release.

Defer auth services, payments, queues/Redis, additional frameworks, Bun/Yarn, deployment automation, and a larger package catalog until after 0.2.0. These add substantial compatibility/support work without fixing the current reliability gaps.

**Gate:** each required addition meets Phase 25's complete integration gate, including a runnable example and cross-platform evidence on its advertised contexts. At least one combined frontend and one combined Python recipe cover interaction between new integrations.

### Phase 27 — Freeze, beta-test, and qualify the release candidate

**Depends on:** 26. **Deliverable:** one evidence-backed candidate artifact.

- Freeze features; finish docs, migration notes, known limitations, dependency/license review, targeted security review, and release checklist. Review process/path boundaries, lifecycle scripts, output redaction, config injection, and existing-file preservation.
- Pack once; identify the artifact by SHA-256 and test that same artifact outside the monorepo on each OS. Remove hardcoded version assertions and test actual launchers, not just `node dist/bin.js`.
- Run the full required recipe matrix on the primary LTS; test minimum runtime patches and alternate supported runtimes with declared coverage. Run every advertised recipe/manager combination somewhere and OS-sensitive paths everywhere. Store results as structured artifacts.
- Make qualification a blocking dependency of publication for the exact source SHA/artifact. Required jobs cannot use continue-on-error or silently skip missing tools. Test that a failed/missing gate prevents publication.
- Repeat cold/warm benchmarks on the candidate. Exercise offline/cache misses, registry timeout, permission errors, interruption, occupied ports, changed user files, and failure cleanup without deleting user-owned data.
- Complete at least seven calendar days of candidate soak, three consecutive passing full qualification runs, and the cross-platform usability sessions. External outage reruns remain recorded; reproducible product failures restart affected qualification.

**Gate:** no open P0/P1 defects, data-loss/security defects, or broken guaranteed workflows; lower-priority limitations are documented outside the guaranteed scope. No required skipped tests. All evidence matches the candidate SHA/artifact and current support contract.

### Phase 28 — Release 0.2.0 and verify delivery

**Depends on:** 27. **Deliverable:** the qualified artifact is available and usable.

- Confirm maintainer publishing access, trusted publisher/provenance configuration, tag/version match, and prerelease versus stable dist-tag handling. Research current npm publication requirements before changing release commands.
- Obtain the owner's release authorization when publication is actually requested. Publish the qualified artifact, not a separately rebuilt tree. Preserve existing tags; never move an old release tag.
- Verify registry metadata/integrity and a fresh install of the exact published version on each supported OS. Check both CLI aliases, help/version, a dry-run, and a representative real recipe without monorepo dependencies.
- Publish concise upgrade instructions, supported matrix, benchmark method/results, limitations, and evidence links. Describe the breaking runtime/support changes from 0.1.x explicitly.
- Prepare a patch/recovery playbook: preserve diagnostic evidence, reproduce failure, ship a versioned fix, and adjust dist-tags only through an authorized release action. Never silently replace published bytes.

**Gate:** install-from-registry acceptance passes, docs match delivered behavior, all earlier gates remain green, and implementation/release status links the final evidence. Cross-platform and stability promises must be true at publication time.

## Definition of done for every implementation phase

1. Inspect current code and the relevant requirement; implement only the requested phase.
2. Update meaningful tests, run targeted tests, typecheck, lint, and build when affected.
3. Run relevant packed e2e, golden, security, platform, or benchmark checks listed above.
4. Update IMPLEMENTATION_STATUS.md with commands/results, commit, evidence links, failures, skips, and remaining blockers.
5. Keep failing phases incomplete. Do not merge support claims based only on mocked command tests.

For downstream changes, rerun earlier safety/platform gates when the relevant code or dependencies change. A phase passing once is not a permanent exemption.

## Scheduling and scope control

Plan in ten gated milestones, not a fixed release date. For one experienced maintainer, a rough initial budget is 10–16 focused engineering weeks plus beta/CI access delays; this is a low-confidence planning allowance, not an estimate derived from measured team velocity. Re-estimate after Phase 21 exposes actual platform failures.

The critical path is 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28. Research/docs can overlap, but implementation acceptance follows the gates. Cut stretch integrations before safety, platform evidence, real tests, or performance validation. Do not reduce qualification to meet a date.

Phase 19 is complete. The next implementation task is **Phase 20 only**: establish safe executor and adapter boundaries. This roadmap authorizes no external publication, system installation, or runtime-support claim by itself.
