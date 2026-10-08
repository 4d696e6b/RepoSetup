# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**0.2.x follow-up — automated create-regression qualification complete; patch
publication pending.** The checked current acceptance items are in
[ACCEPTANCE_TESTS.md](./ACCEPTANCE_TESTS.md#current-02x-automated-acceptance--2026-10-08);
release preparation/delivery items remain open in the
[patch release checklist](../release-docs/RELEASE_CHECKLIST.md#current-02x-patch--2026-10-08).
The Phase 27/28 entries below describe the already published 0.2.0 milestone.

**Phase 27 — Release-candidate qualification: complete for the frozen alpha candidate.** Its closure is explicitly recorded on `codex/phase-27-closeout` at `837b20d438d92fb6bcd557cb4e5145230238ee13`.

**Phase 28 — Stable release and delivery verification: complete.** `rsetup@0.2.0` is published with a signed attestation from qualified tag source `04228d5206617355b609f640267c73669880e060`. The registry's `latest` tag and tarball integrity match the retained candidate. [Install-from-registry acceptance 37659541713](https://github.com/4d696e6b/RepoSetup/actions/runs/37659541713) passed on Ubuntu 24.04, macOS 15, and Windows 2025. On October 7 the owner removed the additional stable seven-day wait. Phase 19 through Phase 28 gates are complete.

See [Roadmap to 0.2.0](./ROADMAP_0.2.0.md) for the Phase 19–28 sequence, [the Phase 19 baseline](./PHASE_19_BASELINE.md) for the frozen scope and blockers, and [the Phase 23 benchmark protocol](./PHASE_23_BENCHMARK_PROTOCOL.md) for the required performance evidence.

### Stable preparation and delivery — 2026-10-07

The current [stable qualification record](../release-docs/STABLE_QUALIFICATION_0.2.0.md) gives the final source, failed and superseded attempts, signed provenance, and passing delivery run. The entries below also preserve the earlier preparation sequence.

- [x] Rechecked the frozen alpha source `145e167e6b60897da96942545ba6dbd40359ad4a`: qualification runs [36704254757](https://github.com/4d696e6b/RepoSetup/actions/runs/36704254757), [36705418155](https://github.com/4d696e6b/RepoSetup/actions/runs/36705418155), and [36708257011](https://github.com/4d696e6b/RepoSetup/actions/runs/36708257011) passed; the branch remains frozen. Its soak ended October 7 at 11:30:20 UTC. This qualifies the alpha source, not a newly versioned stable artifact.
- [x] Stable preparation is isolated from that frozen branch. The public manifest now identifies `rsetup@0.2.0`; CLI version tests derive from the manifest.
- [x] Publication is manually dispatched, defaults to a dry-run, requires the existing `v0.2.0` tag, and downloads the immutable artifact ID from a previous qualification run. Publication never builds or packs another artifact.
- [x] The publication gate checks three consecutive successful first-attempt full runs from the exact source, all 16 required jobs and their steps without skips, an unchanged candidate branch, and one unexpired artifact. Missing API data fails closed. The owner removed the additional stable seven-day wait on October 7; prior exact-source evidence remains recorded but cannot qualify a changed release source.
- [x] Artifact size, SHA-256, source, version and installed launcher checks block publication. Registry errors other than 404 block publication. A retry accepts an existing version only when its integrity equals the qualified tarball; published bytes are never replaced.
- [x] Delivery automation checks exact registry integrity and the stable dist-tag, installs outside the monorepo on Ubuntu/macOS/Windows, checks both aliases, and exercises dry-run plus a real TypeScript Express build and HTTP-response test. The same delivery routine is exercised locally using the packed stable artifact.
- [x] Local verification on temporary Node 24.21.0: all 438 unit tests, typecheck, lint and build pass; 36 e2e tests pass. One local Python add test skips because uv is unavailable on this host; required CI installs uv and must pass it. The release validator also accepts the three actual completed alpha API responses at the recorded deadline.
- [x] Initial stable [benchmark 37647160928](https://github.com/4d696e6b/RepoSetup/actions/runs/37647160928), full qualification [37647145314](https://github.com/4d696e6b/RepoSetup/actions/runs/37647145314) and [usability checks 37647167901](https://github.com/4d696e6b/RepoSetup/actions/runs/37647167901) passed at preparation source `3821519511acd79b3263f42f1be14a752149cd4f`. [Run 37647155958](https://github.com/4d696e6b/RepoSetup/actions/runs/37647155958) failed a Windows local-file locked-install fixture's 30-second deadline, so no stable soak was started and the failed run remains recorded.
- [x] Corrected that test fixture to use a second local-file dependency for manifest drift and npm offline mode; it no longer performs an accidental public-registry lookup. Its four real npm subprocesses retain a bounded 90-second test budget for slower Windows runners. Production code and package dependencies are unchanged. The corrected fixture passes locally on Node 24.21.0; typecheck and lint also pass.
- [x] Initial stable source `4a6f49ca139cbd4f0915a3556497f48ae7543ae6` passed full qualification runs [37648824809](https://github.com/4d696e6b/RepoSetup/actions/runs/37648824809), [37648831078](https://github.com/4d696e6b/RepoSetup/actions/runs/37648831078), and [37648836155](https://github.com/4d696e6b/RepoSetup/actions/runs/37648836155), plus exact-source benchmark [37648841040](https://github.com/4d696e6b/RepoSetup/actions/runs/37648841040) and usability checks [37648846715](https://github.com/4d696e6b/RepoSetup/actions/runs/37648846715). Its tarball was 106623 bytes, SHA-256 `3ac07e71812f90b95b60802900bf1fa862e0b9129ed32b13232dd2c1eee8cde8`. The release-gate change creates a new source requiring new runs.
- [x] The earlier source `ee93373c59615a197d0e724353738fd3e695a1a2` passed three full cross-platform qualifications. The final corrected source `04228d5206617355b609f640267c73669880e060` passed [37657135210](https://github.com/4d696e6b/RepoSetup/actions/runs/37657135210), [37657140756](https://github.com/4d696e6b/RepoSetup/actions/runs/37657140756), and [37657146191](https://github.com/4d696e6b/RepoSetup/actions/runs/37657146191), with all 16 required jobs and steps on each run; final artifact ID `11498793067` retains the 106623-byte tarball with SHA-256 `3ac07e71812f90b95b60802900bf1fa862e0b9129ed32b13232dd2c1eee8cde8`.
- [x] Qualification progress is committed on `codex/phase-28-release-evidence` so documentation updates do not move the selected release source. See [the stable qualification record](../release-docs/STABLE_QUALIFICATION_0.2.0.md).
- [x] The owner approved npm's GitHub OIDC trusted publisher for `4d696e6b/RepoSetup` and `publish-npm.yml` with direct `npm publish`; npm reports it as valid after the accepted publish. The owner's October 7 instruction authorized proceeding without the additional calendar wait.
- [x] The former candidate `ee93373c59615a197d0e724353738fd3e695a1a2` passed all three full qualifications [37653362998](https://github.com/4d696e6b/RepoSetup/actions/runs/37653362998), [37653376658](https://github.com/4d696e6b/RepoSetup/actions/runs/37653376658), and [37653392242](https://github.com/4d696e6b/RepoSetup/actions/runs/37653392242), plus benchmark [37653407874](https://github.com/4d696e6b/RepoSetup/actions/runs/37653407874) and usability checks [37653421554](https://github.com/4d696e6b/RepoSetup/actions/runs/37653421554). Artifact ID `11497374204` retained the same 106623-byte tarball with SHA-256 `3ac07e71812f90b95b60802900bf1fa862e0b9129ed32b13232dd2c1eee8cde8`. The tag initially pointed to this source, then the owner authorized replacing it before publication after fresh qualification of the workflow correction.
- [x] Initial publication dry-run [37655329425](https://github.com/4d696e6b/RepoSetup/actions/runs/37655329425) passed the exact-source gate and fetched the retained archive but stopped at a nested download path before npm execution. A default-branch workaround subsequently failed npm provenance (`E422`); the tag-bound correction and fresh qualification are recorded above.
- [x] Tag-bound [dry run 37658608341](https://github.com/4d696e6b/RepoSetup/actions/runs/37658608341) passed. [Publish run 37658713089](https://github.com/4d696e6b/RepoSetup/actions/runs/37658713089) uploaded the exact qualified tarball and signed [Sigstore entry 3133834168](https://search.sigstore.dev/?logIndex=3133834168); its immediate metadata check failed while npm scanned the package. The package is now visible, with matching integrity and `latest: 0.2.0`.
- [x] [Safe delivery retry 37659541713](https://github.com/4d696e6b/RepoSetup/actions/runs/37659541713) passed its integrity-preserving skip-publish step and registry acceptance on Ubuntu 24.04, macOS 15, and Windows 2025. Every step of all four jobs succeeded; no required step was skipped.

### Phase 27 progress — 2026-09-29

- [x] At this Phase 27 checkpoint, the CLI was `0.2.0-alpha.1`. Its package manifest, workspace engine metadata, and executor prerequisite preflight require Node 24 or later. Python recipe prerequisite checks require Python 3.12 or later; qualification remains restricted to 3.12 and 3.13 with uv 0.12.17. The current published version is `0.2.0`, as recorded above.
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
- [x] These alpha gates subsequently passed at `145e167e6b60897da96942545ba6dbd40359ad4a`; see the October 7 transition record above. Stable source qualification remains separate.

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

Phase 22 implementation gates for reproducible recipes are complete. Phase 27 completed the deferred Node 24 product-metadata change and frozen alpha qualification. Stable publication and registry delivery acceptance are complete in Phase 28, as recorded above.

## Current release

The observed npm `latest` dist-tag is `rsetup@0.2.0`. Its registry integrity matches the qualified artifact, and its signed provenance names the `v0.2.0` tag at `04228d5206617355b609f640267c73669880e060`. See [the stable qualification record](../release-docs/STABLE_QUALIFICATION_0.2.0.md). The older `0.1.1` baseline remains in [Phase 19 baseline](./PHASE_19_BASELINE.md).

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
- [ ] At this September 22 checkpoint, Linux/Windows execution and remote workflow results were unobserved. Superseded by the checked Phase 21/27/28 and current 0.2.x matrix evidence; retained as history.
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
- [x] Phase 27 — Release-candidate qualification (frozen alpha candidate)
- [x] Phase 28 — 0.2.0 publication and delivery verification

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

## 0.2.x stability follow-up (2026-10-08)

The sections above preserve earlier milestone evidence. Current create-regression
work is tracked in [STABILITY_0.2.x.md](STABILITY_0.2.x.md), on
`codex/fix-create-project-paths`, based on released 0.2.0 source.
Named-folder Next.js failure is reproduced; planner scoping, destination creation,
bare Vite installation, install ordering, destination lockfile checks and printed
Node server commands have regression coverage. The 495-check plan matrix passes.
Automated qualification is complete on product source `448beb4`: all twelve
full matrix jobs passed 34 tests each (408 successful executions), covering
twenty packed-npx bare solutions and fourteen recipes per job. All fifteen
packaged preset sessions passed 117 checks. Local 959 unit tests, typecheck,
lint, build, 37 registry definitions and 37 packaged E2E tests passed; one
external release-artifact E2E check was skipped. Workflow-only evidence fixes
were separately qualified at `86352e3`; product files are unchanged.

### Documentation reconciliation — 2026-10-08

- [x] Reviewed all specification/product/security/release documentation and their unchecked status entries.
- [x] Checked completed current Next.js/Python/platform, bare-solution, expanded recipe and preset execution gates in the acceptance and support documents.
- [x] Added a current patch release checklist; published 0.2.0 and historical 0.1.x records remain separate.
- [x] Corrected stale roadmap/implementation-plan next-step guidance and linked the current stability work from the documentation index.
- [x] Recorded the completed npm trusted-publisher setup and corrected guidance to match the manually dispatched, artifact-only publication workflow.
- [x] PR-head `8372f59` fast CI, all three platform jobs and all three controlled performance jobs passed ([CI](https://github.com/4d696e6b/RepoSetup/actions/runs/37718942444), [platform](https://github.com/4d696e6b/RepoSetup/actions/runs/37718942315), [performance](https://github.com/4d696e6b/RepoSetup/actions/runs/37718942331)). Product files remain identical to `448beb4`.

The stability plan and linked machine-readable record contain exact run/source
references and the historical Windows JSON trailer issue. Patch publication,
maintainer security review, native Windows 11/Linux arm64, live services and
actual browser journeys remain open. Do not mark the entire 0.2.x roadmap or
all integration permutations complete, and do not promote integrations from
these results alone.
