# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 24 — Daily CLI usability: in progress.** Phase 22 recipe gates are complete (Node 24 engines floor deferred). Phase 20 and Phase 21 are complete. Phase 18's historical qualification gaps remain open until their replacement gates have evidence.

See [Roadmap to 0.2.0](./ROADMAP_0.2.0.md) for the Phase 19–28 sequence, [the Phase 19 baseline](./PHASE_19_BASELINE.md) for the frozen scope and blockers, and [the Phase 23 benchmark protocol](./PHASE_23_BENCHMARK_PROTOCOL.md) for the required performance evidence.

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
- [ ] The current cross-platform Golden rerun is in progress at [run 36273558659](https://github.com/4d696e6b/RepoSetup/actions/runs/36273558659). Phase 25 remains open until it passes and generated GitHub Actions execution has its own evidence.

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
- [ ] Five observed sessions across Ubuntu, macOS, and Windows remain required. `.github/workflows/usability.yml` runs that flow twice on Ubuntu, twice on macOS, and once on Windows. Phase 24 stays open until those runs are recorded.

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
- [x] Prerequisite preflight verifies the current documented Node 20.9 and Python 3.9 minimums before mutation. The Node 24/Python 3.12–3.13 matrix and Windows-native process handling are Phase 21 qualification requirements.

### Phase 21 progress — 2026-09-23

- [x] The CLI resolves the `python` operation command through a platform adapter: `python3` then `python` on POSIX, and `py`, `python`, then `python3` on Windows. The first working candidate is cached and reused for prerequisite version checks and subsequent planned commands.
- [x] Windows process execution resolves trusted `PATH` entries. Native `.exe`/`.com` files execute directly; `.cmd`/`.bat` shims use an explicit `cmd.exe` invocation with `shell: false`, and shim paths or arguments containing command metacharacters are rejected before execution.
- [x] Packed-artifact e2e coverage uses a parent path containing spaces and Unicode, executes both aliases on POSIX native shims, and executes both Windows `.cmd` aliases through npm's native launcher.
- [x] Executor tests cover Unicode project-file paths below a parent directory containing spaces and Unicode; `.env.example` additions preserve an existing CRLF line-ending convention.
- [x] Platform CI uses explicit Ubuntu 24.04/x64, macOS 15/arm64, and Windows Server 2025/x64 runners. It runs packed-artifact e2e on Node 22 and 24 across all targets, with Node 20 retained on Ubuntu for the supported floor.
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
- [ ] Published CLI `engines` stay `>=20`. Raising the floor to Node 24 is deferred to a later release phase after the Phase 19 qualification target is the product claim.

Phase 22 implementation gates for reproducible recipes are complete. The Node 24 engines floor remains an explicit deferred product-metadata change.

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
- [ ] Phase 24 — Daily CLI usability and recovery guidance
- [ ] Phase 25 — Existing integration qualification
- [ ] Phase 26 — Important new integrations
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
