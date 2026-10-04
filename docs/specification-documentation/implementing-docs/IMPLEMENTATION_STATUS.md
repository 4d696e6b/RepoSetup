# Implementation Status

Cursor/maintainers should update this file as phases are completed.

For the current phase-by-phase 0.3.0 tracker, see [0.3.0 implementation status](./STATUS_0.3.0.md). It separates locally implemented sections from pending qualification, website, maintenance and release work.

## 0.3.0 Section 2 cross-platform evidence — 2026-10-03

At source `e41cf82102c4c4f909544aad8a70e1585e9a57c4`, [selection create/add/legacy run 37127717406](https://github.com/4d696e6b/RepoSetup/actions/runs/37127717406) passed all six Linux/macOS/Windows × Python 3.12/3.13 cells. Every inspected report records a clean source, external identified artifact and all 24 create, 21 add and nine packed legacy cases passing. [Historical golden run 37127717415](https://github.com/4d696e6b/RepoSetup/actions/runs/37127717415) passed all six cells. [Contract/transport run 37127717420](https://github.com/4d696e6b/RepoSetup/actions/runs/37127717420) passed all three packed contract and native transport cells; the Windows report has 6/6 cases and `nativeTtyCovered: true`. All Phase 2 sections are checked. Preview, doctor, repair, website, usability and release gates remain open.

## 0.3.0 section 2 qualification dispatch preparation — 2026-10-03

The isolated CLI branch now has branch-scoped push triggers for the packed contract/transport and six-cell real create/add workflows, plus the historical golden workflow. This allows qualification to run without changing the protected 0.2.0 checkout or default branch. The transport suite now requires native terminal confirmation on Windows as well as POSIX, using a Windows pseudo-console test driver; the Windows runner installs the pinned test-only pywinpty wheel. Local macOS transport still passes all six cases. Cross-platform results must be inspected before checking sections 2.2–2.5. No release or publication job was added.

## 0.3.0 section 2.5 implementation — 2026-10-03

The packed legacy suite checks all five established preset IDs as JSON dry-run plans, executes schemaVersion 1 config creation and positional Vitest/pytest add in the three beginner contexts, and executes the existing React/Vite preset with build, test and doctor. It records source/artifact identity, lock hashes, platform/runtime and case results. A real run exposed that an already-satisfied positional `add --json` printed a text message; the CLI now emits the existing version 1 empty plan envelope, with a unit regression. The manual six-cell workflow reuses one identified tarball for this suite alongside create/add. Local macOS/arm64, Node 24 and Python 3.13 pass; cross-platform evidence and the other legacy preset execution paths remain pending. See [phase tracker](./STATUS_0.3.0.md).

## 0.3.0 section 2.4 implementation — 2026-10-03

The packed transport suite now invokes both installed aliases through the platform's native shell for create and add. It sends an exactly 4,096-character token and an exact 16 KiB JSON file path with spaces/Unicode, compares dry-run plans, checks oversized token/file errors and confirms that a non-TTY invocation displays the review then refuses execution without mutation. On local macOS, a real POSIX pseudo-terminal drives the actual CLI prompt to decline and accept create and add; accepted commands execute and declined commands preserve files. The manual contract workflow now has a separate transport job for the three frozen runners, using the same identified tarball. It has not been dispatched; Windows TTY confirmation remains open. See the [phase tracker](./STATUS_0.3.0.md) and [qualification protocol](./SELECTION_QUALIFICATION_0.3.0.md).

## 0.3.0 section 2.3 implementation — 2026-10-03

In the isolated `codex/0.3.0-cli` worktree, all 21 nonempty add selections now have a real packed-artifact execution harness. It creates a minimal React/Vite, Express or FastAPI application, applies each supported option subset, checks incompatible-context refusal and dry-run preservation, executes only after reviewed-plan confirmation, verifies generated locks and selected tools, runs doctor, then confirms two no-op repeats. Existing README, .env, custom files/configuration and dependency declarations are checked for preservation. Generated Express and FastAPI endpoint tests now belong to the Vitest and pytest integrations so they work for both create and add. Catalog `0.3.0-cli.3` and matrix `0.3.0-selection.3` record 16 reviewed changed plans.

Local macOS/arm64, Node 24.21.0, Python 3.13.1, pnpm 12.5.1 and uv 0.12.17 cover 21/21 add variants. The shared manual workflow is prepared for all six platform/Python cells, but it has not been dispatched. Native terminal confirmation and cross-platform evidence remain open; 0.3.0 is not release-qualified. See [phase tracker](./STATUS_0.3.0.md) and [qualification protocol](./SELECTION_QUALIFICATION_0.3.0.md).

## 0.3.0 section 2.2 implementation — 2026-10-03

Implemented in the separate `codex/0.3.0-cli` worktree. Section 2.2 remains partial: local macOS/arm64 with Node 24.21.0, pnpm 12.5.1, Python 3.13.1 and uv 0.12.17 covers all 24 create variants; the full platform/Python matrix is still pending. See the [phase tracker](./STATUS_0.3.0.md) and [qualification protocol](./SELECTION_QUALIFICATION_0.3.0.md).

- Packed-artifact real installation, generated locks and version declarations, React builds, compiled Express/FastAPI endpoint responses, selected test/validation/format/lint tools, doctor, and confirmed repeated-create refusal with file preservation. Token/file transports alternate; native terminal prompting is an independent pending gate.
- Fixed missing dependency installation for minimal React, known esbuild approval for Express/tsx, and Express's unstable compiled start path when additional TypeScript files are present. Doctor now shares installation's Python launcher lookup. FastAPI's README includes pytest only when selected.
- Catalog `0.3.0-cli.2` distinguished the pinned create-vite generator from generated React/Vite dependency ranges. Matrix `0.3.0-selection.2` recorded 20 reviewed create-plan changes and preserved all 21 add-plan fingerprints at that checkpoint. Revision 3 changes 16 plans as recorded above. Existing schemaVersion 1/legacy input modes remain supported; prior catalog exports receive the stale-selection error.
- A manual workflow packs one artifact for six platform/Python cells and retains reports/logs/locks on failure. It is authored and YAML-parsed, not dispatched. No support-status promotion, publication or deployment.
- Local checks pass: 24 real create cases, 105 packed matrix/contract cases, 502 workspace tests, 11 legacy/selection dry-run fixtures, workspace/selection-test typechecks, lint and build. Test-owned dependency trees and uv caches are cleaned per case unless explicitly retained. Reports distinguish dirty development runs from clean exact-source external-artifact acceptance.

The protected candidate remains at `145e167e6b60897da96942545ba6dbd40359ad4a`; its originals were not edited. The whole release, native transports, add qualification, previews, intended-stack doctor/repair, companion website/handoff, observed usability and release gates remain unfinished.

## 0.3.0 section 2.1 — 2026-10-03

Implemented locally on `codex/0.3.0-cli` in the separate 0.3.0 worktree. The [phase tracker](./STATUS_0.3.0.md) now marks section 2.1 complete and section 2.2 as the next task. Original 0.2.0 candidate source and planning documents remain preserved.

- Frozen [selection matrix](../../../tests/e2e/fixtures/selection-v1.matrix.json): three bounded contexts, every allowed optional subset (24 create/21 nonempty add journeys), full typed-plan fingerprints, version/limit metadata and runtime/platform targets.
- Installed-tarball token/file equivalence, new-directory scoping, existing-file/version preservation, satisfied-add repeats, compatibility/input/confirmation refusals and both alias version checks. Project dry-runs work with project tools removed from PATH.
- Verified artifact source/version/byte/hash identity and content-free reports recording matrix/catalog/source/artifact/lock/runtime evidence, passed cases and dirty source status. External artifact acceptance requires a clean matching source checkout. Reports use `qualification: false`.
- A manually dispatched [contract workflow](../../../.github/workflows/selection-contract.yml) passes one identified tarball unchanged to the three frozen runner targets and retains success/failure reports. It has not been dispatched and does not publish. See the [qualification protocol](./SELECTION_QUALIFICATION_0.3.0.md).

Validation: 105 new matrix/packed-contract tests and 491 workspace tests passed; workspace plus selection-test typechecks, lint and build passed; workflow YAML and documentation links checked. Local host remains macOS arm64 / Node 22.12.0 (below Node 24), npm 10.9.0 / pnpm 12.5.1. Initial error-output assertions and random Python fixture-name fingerprints were corrected. Real packed create/add and native/platform qualification remain open; no stable support claim or complete-release claim is made.

## 0.3.0 first CLI slice — 2026-10-03

Implemented on `codex/0.3.0-cli`, forked from the exact recorded candidate HEAD `145e167e6b60897da96942545ba6dbd40359ad4a` on `codex/phase-27-release-candidate`. All work uses a separate worktree. The candidate checkout/branch and its three original untracked planning documents remain untouched; planning copies are byte-identical. The 0.2.0 qualification history below is retained, not marked complete or promoted by this slice.

- Shared strict Zod selection/catalog contracts in core; curated guidance and reusable legacy/minimal starter presets in integrations; registry lookup/option/context validation and safe public snapshot export; local review/confirmation/execution in CLI.
- React/Vite and Express with TypeScript/pnpm, FastAPI with uv. Optional Zod/Vitest/Prettier or Pydantic/pytest/Ruff subsets are validated with the actual planner. Parent golden evidence is linked in the catalog; no new platform/stable-support claim. New minimal preset IDs do not replace legacy contents.
- Versioned canonical base64url `--selection` for create/add, `create --selection-file` and additive `add --config` file fallback. Limits, conflicts, errors, safe command rendering and public-only input are frozen in [selection v1](../product-docs/SELECTION_V1.md). Selection execution requires confirmation, with dry-run available and JSON version 1 plan/error output preserved.
- New selection starters reserve a new directory and scope all files/processes there. Existing-target creation is refused. Add checks actual context and revalidates its delta after confirmation. Existing files/scripts and declared dependency pins survive; grouped package deltas only install missing packages. Repeated satisfied add is a no-op.
- Owner-approved companion website exception reconciled in AGENTS.md, product requirements and architecture. Website implementation/deployment is not part of this slice. CLI development version is `0.3.0-alpha.1`, unpublished.

Validation on macOS arm64 / Node 22.12.0 / pnpm 12.5.1: workspace tests, targeted selection/delta/preservation tests, built-CLI selection plus legacy dry-run tests, typecheck, lint and build pass. The final full workspace suite passed 491 tests; the targeted core selection/delta suite passed 41 tests, including Windows device-name cases. Built-CLI targeted e2e passed 11 tests. An initial declaration-build optional-type mismatch, a readonly test-fixture type error, and test expectations for README version/consolidated installation were corrected. No failing required local check remains. This host is below the supported Node 24 execution floor; these results do not qualify real external installations.

Remaining 0.3.0 work: packed Node 24 cross-platform create/add execution for minimal/optional variants; native launchers/shell transport and size-bound qualification; companion website public snapshot consumption/builder/accessibility and joint handoff tests; deterministic file diff previews; intended-stack doctor; allowlisted repair; beginner sessions; release gates and any separately chosen optional roadmap item. No tag, merge, push or publication is authorized by this slice. The 0.3.0 release is **not complete**.

## Historical 0.2.0 phase record

**Phase 27 — Release-candidate qualification: in progress.** Phase 24's five observed manual usability sessions, the candidate soak, repeated exact-SHA qualification, and release evidence remain blocking gates. Phase 20 through Phase 26 implementation gates are complete.

See [Roadmap to 0.2.0](./ROADMAP_0.2.0.md) for the Phase 19–28 sequence, [the Phase 19 baseline](./PHASE_19_BASELINE.md) for the frozen scope and blockers, and [the Phase 23 benchmark protocol](./PHASE_23_BENCHMARK_PROTOCOL.md) for the required performance evidence.

### Phase 27 progress — 2026-09-29

- [x] The public CLI is now `0.2.0-alpha.1`. Its package manifest, workspace engine metadata, and executor prerequisite preflight require Node 24 or later. Python recipe prerequisite checks require Python 3.12 or later; qualification remains restricted to 3.12 and 3.13 with uv 0.12.17.
- [x] Packed-artifact tests derive the tarball and manifest version from `packages/cli/package.json`, record the SHA-256, and install the tarball in a temporary directory outside the monorepo. Both `rsetup` and `reposetup` launch through npm's actual platform launcher.
- [x] `write-artifact-evidence.mjs` writes a source-SHA and SHA-256 identity record once for each packed candidate. `verify-packed-artifact.mjs` verifies that record before installing and launching the same artifact.
- [x] The manually dispatched candidate workflow and the `v0.2.0` publish workflow make Node 24 platform qualification, Python 3.12/3.13 golden qualification, exact-SHA failure-path qualification, a one-time candidate pack, and cross-platform artifact acceptance blocking dependencies. The publishing path uses the downloaded qualifying tarball only after its source SHA and tag/version agree.
- [x] `pnpm review:licenses` produces a path-free dependency license record and rejects unreviewed license categories. The current lockfile review contains Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, ISC, MIT, and MPL-2.0 only.
- [x] Local targeted candidate artifact, launcher, workflow, and dependency-license tests pass; workspace unit tests, typecheck, and lint pass. The local host is Node 22.12.0, below the candidate floor, so full create/add e2e qualification correctly stops at preflight and must be run by the required Node 24 CI matrix.
- [x] A targeted current-source review covers process/path boundaries, lifecycle scripts, redaction, config injection, and existing-file preservation; it found no P0/P1 security or data-loss defect. See [the 0.2.0 security review](../security-docs/SECURITY_REVIEW_0.2.0.md).
- [x] [Candidate qualification run 36563444045](https://github.com/4d696e6b/RepoSetup/actions/runs/36563444045) passed the complete Ubuntu 24.04, macOS 15, and Windows 2025 Node 24 platform suite; every Python 3.12/3.13 golden recipe; and same-tarball artifact acceptance on all three systems. Its `7aa910e24dfd57be59e41c9b831c7f0d5656ecb4` artifact is `rsetup-0.2.0-alpha.1.tgz` (SHA-256 `789840214ed8a9f3c778ad197ef00f52890d698a51b8c223c55aaea958e89141`).
- [x] The candidate benchmark report records its exact `GITHUB_SHA` when run in Actions, in addition to the existing platform/runtime and per-trial results. This makes final benchmark evidence auditable against the frozen candidate source.
- [x] [Candidate benchmark run 36569048133](https://github.com/4d696e6b/RepoSetup/actions/runs/36569048133) completed five cold and five warm trials for fixed React and Express package profiles on Ubuntu, macOS, and Windows with Node 24. All measurements passed; consolidated installs use one subprocess versus five baseline passes.
- [x] Candidate failure qualification is implemented at `33354279088970dd3d1dfcf8e5cfbc73a741c20c`: each supported OS runs the real timeout/interruption, permission, existing-user-file, invalid-input, cleanup, and packed usability checks. The React/Vite usability command is additionally exercised while its default Vite port is deliberately occupied; the temporary listener is always closed. The fault job blocks both packing and publication and retains its per-OS usability evidence. Cache-miss behavior is separately measured by the candidate benchmark's fresh, benchmark-owned caches.
- [ ] Exact-SHA CI evidence, three consecutive full candidate passes, seven-day soak, and observed failure-path evidence remain release blockers. See [the candidate record](../release-docs/RELEASE_CANDIDATE_0.2.0.md).

### Phase 25 progress — 2026-09-24

- [x] Guaranteed FastAPI and Flask recipes now create pytest endpoint-response tests whenever pytest is selected. The golden suite requires pytest to pass instead of accepting exit code 5 from an empty suite.
- [x] The TypeScript Express recipe now has working development, build, and start scripts, plus a Vitest HTTP-response test when Vitest is selected. The golden suite requires the generated TypeScript project to typecheck, build, and pass that test.
- [x] [Golden stacks run 36019495472](https://github.com/4d696e6b/RepoSetup/actions/runs/36019495472) passed these five real generated recipes on Ubuntu, macOS, and Windows with Python 3.12 and 3.13. [Platform run 36018768420](https://github.com/4d696e6b/RepoSetup/actions/runs/36018768420) also passed for the preceding Phase 25 commit.
- [x] React/Vite and Next.js Vitest plans now create a sample assertion. React checks a generated module. Next.js checks a generated health route response. The plan runs `vitest run` and no longer accepts an empty suite.
- [x] ESLint plans add a `lint` script, ignore build output, and run `eslint .` after writing the flat config when one does not already exist.
- [x] Playwright keeps `--no-browsers` and tells the user to run the selected package manager's browser install. It does not install browsers or operating-system libraries.
- [x] Generated Node CI uses Node 24. It runs `test` when Vitest is selected and `build` otherwise, so an Express preset without Vitest does not call a missing test script.
- [x] The TypeScript Fastify plan adds development, build, and start scripts. When Vitest is selected it adds an inject-based hello-world response test and does not require a listening port.
- [x] The PostgreSQL Drizzle plan refuses a missing `DATABASE_URL` before constructing the client. When Vitest is selected it asserts the generated table name without opening a database connection.
- [x] Local golden create on macOS passed for Fastify + PostgreSQL config + Drizzle + Vitest: typecheck, build, and `vitest run` succeeded with no live database.
- [x] Local golden checks now exercise Prettier against generated Next.js, React/Vite, and Express source files. The React/Vite Prettier config preserves the upstream template style; the other qualified recipes use the default config.
- [x] The Playwright golden runs `playwright test --list` without downloading a browser, so generated configuration and test discovery are validated separately from browser execution.
- [x] [Golden stacks run 36273558659](https://github.com/4d696e6b/RepoSetup/actions/runs/36273558659) passed all six Ubuntu, macOS, and Windows / Python matrix jobs for the Playwright list check and the qualified generated recipes. [Platform run 36273525741](https://github.com/4d696e6b/RepoSetup/actions/runs/36273525741) passed for the preceding source commit.
- [x] The generated Fastify / Drizzle / ESLint / Vitest pnpm workflow executed successfully in its own fresh private GitHub repository: [Node.js CI run 36288959163](https://github.com/4d696e6b/reposetup-phase25-ci-validation-1790476392/actions/runs/36288959163). It installed from the generated lockfile and ran `lint`, `test`, and `build` on Node 24.
- [x] Phase 25 implementation qualification is complete. Phase 24's observed usability-session gate remains the release-order blocker before Phase 26.

### Phase 26 progress — 2026-09-27

- [x] Added four curated candidate integrations on narrow, tested contexts: `testing-library` and `tanstack-query` for React + Vite, plus `httpx` and `pydantic-settings` for FastAPI under uv. Each pins its direct dependency and has detect, verify, safe package-only remove, plan, supported-context, and generated-artifact tests.
- [x] The React recipe creates an accessible Testing Library/user-event interaction test and a TanStack Query provider plus mocked-response query test. It includes jsdom explicitly so its Vitest browser tests run without relying on a transitive dependency.
- [x] The FastAPI recipe creates an in-process HTTPX ASGI response test and typed Pydantic Settings code. Pydantic Settings appends only the non-secret `APP_NAME` placeholder to `.env.example`; it reports a missing required value and never requests or stores a secret.
- [x] Existing-project add coverage creates each combined React and Python selection, runs the generated tests, and verifies that repeating `add` makes no changes. Generated source, test, and environment-example files remain preserved on remove.
- [x] [Golden stacks run 36290413867](https://github.com/4d696e6b/RepoSetup/actions/runs/36290413867) passed every Ubuntu 24.04, macOS 15, and Windows 2025 job with Python 3.12 and 3.13. It executed the React interaction/query and FastAPI HTTPX/settings fixtures, their existing-project add/idempotency checks, and the established golden recipes.
- [x] Phase 26 implementation qualification is complete. Phase 24's five observed manual usability sessions remain required before release-candidate closure.

### Phase 24 progress — 2026-09-24

- [x] Five bundled declarative guaranteed presets are discoverable with `reposetup presets`: Next.js/SQLite, React/Vite, Express/PostgreSQL, FastAPI, and Flask. `reposetup create --preset <id>` sends the selected config through the normal validation, plan review, confirmation, and executor path; it does not download or execute remote preset content. A positional project name overrides only the preset’s safe project-name default.
- [x] Bundled presets, multi-integration `add` planning, versioned JSON for plan/stack/doctor/errors, stderr progress in JSON mode, elapsed execution summaries, and partial-run recovery guidance are implemented and covered by automated tests.
- [x] Doctor remains read-only and now flags conflicting Node lockfiles and a missing `.env.example` when a local `.env` exists. Existing integration verification continues to diagnose missing dependencies and generated/configuration artifacts.
- [x] Add/remove refuse ambiguous `pnpm-workspace.yaml` roots; the CLI specification directs users to a single workspace package directory.
- [x] Doctor detects supported runtime-version mismatches. Successful creates print the exact working directory and framework-specific development, build, and available test commands. Express, FastAPI, and Flask plans create a short run guide without overwriting user files.
- [x] Automated cross-platform qualification passed for commit `1d51e40`: [Platform run 36016190941](https://github.com/4d696e6b/RepoSetup/actions/runs/36016190941) and [Golden stacks run 36016186247](https://github.com/4d696e6b/RepoSetup/actions/runs/36016186247). The golden suite created and verified all five recipes on Ubuntu, macOS, and Windows; the Windows CRLF generated-file path is covered by an executor regression test.
- [x] Express post-create commands match the generated `dev`, `build`, `start`, and Vitest scripts.
- [x] The React/Vite pnpm preset allows the esbuild dependency build without treating that approval file as an ambiguous workspace root, so `add` still runs in the generated app.
- [x] `pnpm test:usability` runs the documented non-TTY flow from a packed install: preview, create, the printed Next commands, add, doctor, and export. One local macOS session passed for `react-vite` plus `zod` on 2026-09-25.
- [x] [Usability sessions run 36699625878](https://github.com/4d696e6b/RepoSetup/actions/runs/36699625878) recorded two Ubuntu 24.04/x64 sessions, two macOS 15/arm64 sessions, and one Windows 2025/x64 session. Each Node 24 session completed preview, create, dev server, build, test, add, doctor, and export without manual repair. Phase 24 is complete.

### Phase 23 progress — 2026-09-23

- [x] Package adds stay typed `install_package` through planning. `exact` and `allowBuild` are on the operation schema and forwarded into adapter argv at execute time. Plans no longer expand adds to `run_command` early.
- [x] Compatible `install_package` ops batch within the same manager/root/dev/exact policy. Soft ops (files, messages, checks) do not block merging. `run_command` and `verify` stay barriers so generators, migrations, codegen, and verification still see dependencies installed first. Conflicting version specs in one policy fail the plan. Add plans filter satisfied packages before the batch pass.
- [x] Next.js scaffolding uses verified `create-next-app@16.3.5 --skip-install` (official CLI docs and `--help`). When later `install_package` ops share the soft segment, they install scaffold deps; otherwise the planner inserts a project `install`. create-vite@8.3.0 already scaffolds without installing unless `--immediate` is set, so no Vite flag change.
- [x] Soft segments with two or more npm/pnpm `install_package` ops assemble `package.json` via `modify_json` and run one project install (pnpm forwards `--allow-build`). Single adds and uv/pip segments stay as typed adds. Existing-project add still filters before batching/consolidation.
- [x] npm/pnpm generated-project installs use documented `--prefer-offline`, which permits registry fallback on cache misses. One 250 ms retry is limited to locked installs after classified transient network errors; generators and package additions are never replayed.
- [x] Repeatable five-recipe dry-run planner benchmark (`pnpm benchmark:plans`) records input hashes, elapsed-time distribution, and rendered process-operation counts. It is explicitly separate from real-install performance evidence.
- [x] Controlled real-create smoke: React/Vite completed once with a benchmark-owned cold cache (11.31 s) and warm cache (10.77 s) on macOS arm64 / Node 22.12.0 / pnpm 12.5.1. This is collector validation, not a baseline comparison or speed claim.
- [x] Controlled fixed-package evidence (run `35968357317`, five cold and five warm trials per profile/strategy) passed on Ubuntu 24.04/x64, macOS 15/arm64, and Windows Server 2025/x64 with Node 24.20.0 and pnpm 12.5.1. The Phase 19 reference model used five separate package-install passes; the Phase 23 model assembled one manifest and used one install pass. Warm-cache median reductions: React toolchain 58.7% Ubuntu, 56.1% macOS, 21.9% Windows; Express toolchain 68.3% Ubuntu, 67.0% macOS, 40.3% Windows. Each profile’s cross-platform median exceeds 25%; no profile regressed. Both profiles reduce install subprocesses from five to one (80%).

Phase 23 implementation and performance gates are complete. The next phase is Phase 24 — daily CLI usability.

### Phase 20 progress — 2026-09-22

- [x] Core executor accepts injected filesystem and process adapters; Node implementations live in the CLI package.
- [x] Subprocesses have bounded capture, regular/long-running timeouts, and `SIGINT` cancellation propagation.
- [x] Paths are checked against their canonical location before filesystem mutation or command execution; escaping symlinks are rejected.
- [x] `fail_if_exists` writes are exclusive, and JSON/text/env updates use temporary-file replacement.
- [x] Read-only executor preflight validates the root and canonical operation paths; all prerequisite checks run before project mutation.
- [x] Verbose subprocess output is line-buffered and redacted, including a secret assignment split across output chunks.
- [x] A per-root temporary lock rejects concurrent RepoSetup executions without creating files in the user project; operation events expose safe timing/status data.
- [x] Read-only writable-location preflight rejects injected permission failures before mutations; failed runs retain a hashed, content-free temporary journal.
- [x] Disk-space preflight requires 512 MiB free before CLI execution; recovery policy forbids automatic rollback and limits any future restore to verified RepoSetup-owned files.
- [x] Full workspace tests (355), packed-CLI e2e tests (12), and available golden recipes (2) pass after the executor changes; 3 golden recipes remain environment-gated skips.
- [x] POSIX cancellation terminates spawned descendant processes; the regression fixture proves the descendant cannot continue and mutate the project after cancellation.
- [x] Phase 20 introduced prerequisite preflight before mutation. Phase 27 updates the product contract from its historical Node 20.9/Python 3.9 floors to Node 24/Python 3.12 and uses the Phase 21 matrix for qualification.

### Phase 21 progress — 2026-09-23

- [x] The CLI resolves the `python` operation command through a platform adapter: `python3` then `python` on POSIX, and `py`, `python`, then `python3` on Windows. The first working candidate is cached and reused for prerequisite version checks and subsequent planned commands.
- [x] Windows process execution resolves trusted `PATH` entries. Native `.exe`/`.com` files execute directly; `.cmd`/`.bat` shims use an explicit `cmd.exe` invocation with `shell: false`, and shim paths or arguments containing command metacharacters are rejected before execution.
- [x] Packed-artifact e2e coverage uses a parent path containing spaces and Unicode, executes both aliases on POSIX native shims, and executes both Windows `.cmd` aliases through npm's native launcher.
- [x] Executor tests cover Unicode project-file paths below a parent directory containing spaces and Unicode; `.env.example` additions preserve an existing CRLF line-ending convention.
- [x] Platform CI uses explicit Ubuntu 24.04/x64, macOS 15/arm64, and Windows Server 2025/x64 runners. Phase 27 narrows its active matrix to the Node 24 product floor on every target; its prior Node 20/22 matrix is historical evidence only.
- [x] The platform matrix runs for pull requests as well as the protected development and release branches.
- [x] Platform and golden workflow runs retain uniquely named JSON evidence artifacts with their runtime and architecture details for later qualification review.
- [x] Golden CI now provisions uv and runs the complete recipe suite on every supported runner with Python 3.12 and 3.13.
- [x] Remote CI and golden qualification passed on Ubuntu 24.04/x64, macOS 15/arm64, and Windows Server 2025/x64. Windows-native package-manager execution, all representative recipe creates, and evidence artifacts were observed in the qualification matrix.

### Phase 22 progress — 2026-09-23

Researched versions are the registry releases observed on this date. Direct specs are exact. Transitive versions stay in the package-manager lockfile named by the recipe record. `node_modules` is not claimed to be byte-identical across operating systems or CPU architectures because `better-sqlite3` and Prisma engines are native.

- [x] Guaranteed recipes and the previously floating generators pin researched versions: `create-next-app@16.3.5`, `vite@8.3.0`, ESLint `9.39.5` with `@eslint/js@9.39.5`, `shadcn@4.21.0`, `create-playwright@1.17.139` plus `@playwright/test@1.63.0`, and the direct npm/PyPI packages those five recipes install.
- [x] ESLint 10.11.0, jsdom 30.1.1, TypeScript 7.0.2, `@types/node@26`, and Prisma 8 RC were not qualified. Their published engines or major-line status do not match the Node 22.12 and Node 24 hosts this line still runs.
- [x] Recipe records stay declarative (`recipeVersion` 1). They carry the config, registry revision `2026-09-23`, direct version specs, one lockfile name, and a plan hash. Plans are rebuilt from the built-in registry. Extra command fields and shell-looking specs are rejected. A hash mismatch returns no operations.
- [x] Identical configs produce identical plan hashes. schemaVersion 1 examples still parse and round-trip. schemaVersion 2 is rejected.
- [x] Conflicting lockfiles are rejected before a scaffold command runs, including `npx` against an existing `pnpm-lock.yaml`. Plans do not write `.npmrc`, `.pnpmrc`, or `.env`.
- [x] Qualified Node ranges fail before mutation. Vite 8 requires `^20.19.0 || >=22.12.0`. Vitest 5 requires `^22.12.0 || ^24.0.0 || >=26.0.0`. A version check is omitted from an add plan once that integration's work is already present.
- [x] A locked repeat install is `npm ci`, `pnpm install --frozen-lockfile`, or `uv sync --locked`. It does not re-run generators. A missing lockfile or a lockfile for a different package manager fails before `npm ci` can delete `node_modules`. pip has no lockfile and is refused.
- [x] Hermetic evidence: a local `file:` package is installed twice with `npm ci` through the executor. The lockfile SHA-256 stays identical, the user `.npmrc` is unchanged, and a drifted `package.json` fails before the lockfile can change. This does not claim a public-registry cold install.
- [x] Experimental catalog IDs that still installed unversioned packages (`fastify`, `mongoose`, `drizzle`) now pin researched direct versions so they cannot quietly float while remaining experimental.
- [x] Phase 27 moves the public CLI and all workspace package engine metadata to Node 24 or later, matching the 0.2.0 candidate support contract.

Phase 22 implementation gates for reproducible recipes are complete. Phase 27 closes the deferred Node 24 product-metadata change; its release qualification gates remain open.

## Current release

The observed npm dist-tag is `rsetup@0.1.1`; the source, tag, integrity, and remaining unobserved GitHub evidence are recorded in [Phase 19 baseline](./PHASE_19_BASELINE.md).

## Planning checkpoint — 2026-09-22

Inspected baseline: `a0e48a1` on `main`, macOS, Node 22.12.0, pnpm 12.5.1.

- [x] Inspect architecture, executor, planner, integration helpers, golden/pack tests, CI, and release workflows.
- [x] Write the phased 0.2.0 roadmap, including researched platform/cache guidance and explicit research-required integration details.
- [x] `pnpm test`: 335 passed, 1 skipped.
- [x] `pnpm typecheck`: passed.
- [x] `pnpm lint`: passed on the inspected baseline.
- [x] `pnpm build`: passed.
- [x] `node packages/cli/dist/bin.js registry validate`: passed, 33 integrations.
- [x] `pnpm test:e2e`: 12 passed, including isolated packed CLI installation.
- [x] Sequential golden baseline: 2 passed, 3 conditionally skipped; details in Phase 19 baseline.
- [ ] Linux/Windows execution and remote workflow results: unobserved; Phase 21/27 release blockers.
- [x] Planning/process-count baseline recorded; no speed improvement claimed.

Phase 19 changed planning and evidence documentation only. No product code, package versions, integration maturity labels, releases, or external publication changed.

### 0.2.0 implementation

- [x] Phase 19 — Baseline and acceptance scope
- [x] Phase 20 — Safe executor and adapter boundaries
- [x] Phase 21 — Cross-platform execution
- [x] Phase 22 — Reproducible recipes and compatibility
- [x] Phase 23 — Measured installation performance
- [x] Phase 24 — Daily CLI usability and recovery guidance
- [x] Phase 25 — Existing integration qualification
- [x] Phase 26 — Important new integrations
- [ ] Phase 27 — Release-candidate qualification
- [ ] Phase 28 — 0.2.0 publication and delivery verification

## Historical Phase 18 checkpoint

The remaining sections preserve the earlier 0.1.0 launch record. Their publication, CI, and local-environment entries are historical, not current verified status. Phase 19 must reconcile them against observed evidence; do not use their checked boxes to qualify 0.2.0.

## Phase status

- [x] Phase 0 — Repository foundation
- [x] Phase 1 — Domain model and schemas
- [x] Phase 2 — Registry
- [x] Phase 3 — Resolver
- [x] Phase 4 — Planner
- [x] Phase 5 — CLI skeleton + dry-run
- [x] Phase 6 — Package-manager adapters
- [x] Phase 7 — First framework/integrations
- [x] Phase 8 — Executor
- [x] Phase 9 — First complete golden stack
- [x] Phase 10 — Project detection
- [x] Phase 11 — Add
- [x] Phase 12 — Doctor
- [x] Phase 13 — JS ecosystem expansion
- [x] Phase 14 — Python ecosystem
- [x] Phase 15 — Export/config stability
- [x] Phase 16 — Safe remove support
- [x] Phase 17 — v1 hardening
- [ ] Phase 18 — Release Hardening and Prerelease Qualification
  - [x] 18.0 Documentation and baseline
  - [x] 18.1 Golden-stack real execution tests (harness + B/C local; A/D/E blocked here)
  - [x] 18.2 Cross-platform CI qualification (workflows added; remote run pending)
  - [x] 18.3 npm package/artifact qualification
  - [x] 18.4 Failure-path and safety qualification
  - [x] 18.5 Integration maturity classification (candidates; none stable)
  - [x] 18.6 Release documentation
  - [x] 18.7 Release automation (publish-npm.yml prepared; trusted publisher requires manual npmjs.com settings after first publish)
  - [ ] 18.8 Alpha/release-candidate validation (Next.js, FastAPI, Flask, OS matrix still open locally)

## Last completed work

Public GitHub launch plus Model A npm packaging (2026-09-22): public package name `rsetup`; workspace libraries private and bundled into the CLI.

## Known blockers

- Next.js execute skipped locally when disk is tight.
- `uv` may be missing locally, so FastAPI/Flask goldens skip.
- First GitHub Actions run happens after origin exists.
- No npm trusted-publisher config until `rsetup` exists on the registry. First publish needs maintainer `npm login` + OTP from `packages/cli`.
- Unscoped `reposetup` and `reposetup-cli` are blocked by npm as too similar to `repo-setup` and `repo-setup-cli`.
- GitHub tag `v0.1.0` points at pre-bundle `@reposetup/cli` source. Do not move that tag.
- No integration is `stable`.

## Golden stacks proven

| Stack | Dry-run plan | Real execute |
| --- | --- | --- |
| Next.js / SQLite | yes | pending CI / `REPOSETUP_GOLDEN_NEXT=1` |
| React + Vite | yes | yes (local `pnpm test:golden`) |
| Express / Postgres config | yes | yes generation + `tsc --noEmit`; no live DB |
| FastAPI | yes | pending `uv` |
| Flask | yes | pending `uv` |

## OS environments proven

| OS | Local | GitHub Actions |
| --- | --- | --- |
| macOS | unit/lint/build/e2e/golden B+C | platform workflow on `main`/`dev` |
| Linux | not run here | ci + platform + golden workflows |
| Windows | not run here | platform workflow |

## Integrations promoted to stable

None.

## npm publishing status

| Item | Status |
| --- | --- |
| GitHub source release | complete (`v0.1.0` tag remains at `78ef16c`; do not move it) |
| Public package name | `rsetup` (unscoped `reposetup` / `reposetup-cli` blocked by similarity) |
| Model | A — single bundled CLI |
| Local quality suite | passed (`lint`, `typecheck`, `test`, `build`, `registry:validate`, `test:e2e`, `test:golden` with A/D/E skipped) |
| Tarball | `rsetup-0.1.0.tgz`; isolated install covered by `pnpm test:e2e` |
| Packed golden | React + Vite create + `stack` + `doctor` + `tsc -b` passed from an earlier tarball; re-verify after rename |
| npm v0.1.0 | not published |
| npx verification | not run against the registry |
| global install verification | not run against the registry |
| Trusted publishing workflow | prepared (`.github/workflows/publish-npm.yml`) |
| OIDC / provenance | workflow requests `id-token: write`; provenance not disabled |
| Trusted publisher on npmjs.com | requires manual settings after first publish |

See `docs/NPM_TRUSTED_PUBLISHING_SETUP.md`.

## Notes

Do not mark Phase 18 complete unless remaining Release Qualification gates in `ACCEPTANCE_TESTS.md` pass. GitHub `v0.1.0` is a source launch, not `1.0.0`.

## 0.3.0 companion website slice — 2026-10-03

Owner-approved local website work is isolated on `codex/0.3.0-website` from recorded candidate `145e167`. The separate workspace app implements goal discovery, nine reviewed integration pages, three minimal preset explanations, bounded create/add selection and exact local packed CLI handoff against committed `626fce9` (`selection-v1`). All 45 offered variants have equivalent packed token/file plans; command confirmation and validated size fallback are checked. Workspace unit tests/typecheck/lint/build and desktop/mobile accessibility/browser checks pass. The 0.2.0 candidate checkout and original planning documents remain unchanged.

See [website status and evidence](./STATUS_WEBSITE_0.3.0.md) for source/artifact identities, working routes, qualification results and open release/platform/usability gates. This is a reviewable local slice, not a published site or complete 0.3.0 release.

## 0.3.0 phase progress summary — 2026-10-03

See [combined phase progress](./STATUS_0.3.0.md): Phases 1, 6 and 7 are implemented locally; 7 of the 10 release phases remain, counting partial phases. Website work is now in Phase 8; CLI checkpoint: Phase 2 qualification, with real create journeys in section 2.2 next. Local implementation is not a completed or published release.

## 0.3.0 website Phase 8 validation slice — 2026-10-03

Linked project-field errors, persistent status feedback and a stable invalid review-panel layout are implemented. Main builder navigation now preserves the current context/draft. The expanded suite covers all 22 routes and clipboard denial, hidden-field recovery, privacy and keyboard/reflow behavior. Fresh checks pass: 483 workspace unit tests, 21 Chrome desktop/mobile and Firefox browser tests, 6 exact packed CLI handoff tests, workspace typecheck/lint/build. The full five-profile browser gate does not pass on this host: Playwright WebKit r2251 cannot create a page on macOS 14.7.2 (`Unknown setting: PushAPIEnabled`). Its tests remain present as an explicit gate for a compatible host.

The [beginner-session protocol](./BEGINNER_SESSIONS_0.3.0.md) is ready; actual observed sessions remain 0/5. Manual screen-reader, physical-device, later maintenance and release qualification gates remain open. No installation, publication or sibling-checkout edits occurred during this validation slice. See [website evidence](./STATUS_WEBSITE_0.3.0.md) for exact versions and limitations.

Further Phase 8 work added a built browser policy, artifact hash/executable-byte verification and a repeatable qualification report with source/catalog/build identities. That historical local scope passed 487 workspace unit, 24 Chrome/Firefox browser and 6 packed handoff tests, plus typecheck/lint/build. A manual-only full browser workflow is authored but not dispatched. Full WebKit and actual participant/screen-reader/device evidence remain open; the phase count stays seven remaining.

## 0.3.0 website catalog sync — 2026-10-03

The CLI track committed local 24/24 real-create qualification and shared recipe/catalog corrections at `f99f63a`. The website now derives catalog revision `0.3.0-cli.2` from those committed curated definitions and targets the exact packed `rsetup@0.3.0-alpha.1` artifact from that SHA. The generated command and file fallback still produce equivalent plans for all 45 supported variants; 498 workspace unit tests, six packed handoff tests, 24 Chrome/Firefox browser tests, build, typecheck and lint pass. Phase 2 remains partial pending real add/repeat and full platform/launcher checks; Phase 8 remains partial pending WebKit and human usability/accessibility evidence. See [current website evidence](./STATUS_WEBSITE_0.3.0.md).

## 0.3.0 website Phase 8 follow-up — 2026-10-04

The current catalog is `0.3.0-cli.3`, and the website's exact packed handoff targets committed CLI `84168ce`. Its selection definitions are unchanged from the previous target, while the newer CLI includes a repair symlink-safety fix. The how-to page now gives local artifact preparation commands directly, with a browser check tied to that target. The project audit also found stale Phase 2 qualification wording in the shared curated catalog and an older website-status gate list; the gate list is corrected, while the curated wording awaits an upstream CLI definition correction and requalification. Seven release phases are implemented locally, Phase 8 is partial, and three phases remain. See [combined progress](./STATUS_0.3.0.md) and [website evidence](./STATUS_WEBSITE_0.3.0.md).
