# RepoSetup 0.2.x stability plan

Created 2026-10-08, against released source `origin/main` at `1ddbdc6`.
Regression branch: `codex/fix-create-project-paths` (merged through PR #10).
Release branch: `codex/release-0.2.3`; [release progress](../release-docs/STABLE_RELEASE_0.2.3.md).

0.2.x prioritizes working supported recipes, safe failures, reproducibility and
regression coverage. No new integrations are needed to close these regressions.
A passing plan is not evidence of a working generated application. Never claim
all possible integration combinations or all operating systems were tested.

## Current 0.2.3 qualification — 2026-10-09

Installed-stack repairs are merged through PR #17. The [automated audit](./INSTALLED_STACK_AUDIT.md)
passes 480 full-matrix cases after two Windows/npm retries, 1,043 local unit tests,
38 packed E2E tests and targeted recovery checks. Workspace versions and active
publication gates now target 0.2.3. Preparation merged through
[PR #18](https://github.com/4d696e6b/RepoSetup/pull/18); the candidate branch
`codex/release-0.2.3` is frozen at `a213a6a1edf63771aba8d5b91bfdcf44d665de22`.
The owner authorized publication after health qualification. Current evidence:

- [x] Local version-bound unit/E2E checks, build, typecheck after build, lint and
      all 37 registry definitions pass.
- [x] [Two Linux live-service tests](https://github.com/4d696e6b/RepoSetup/actions/runs/37813979567)
      pass seven checks without failures or skips, verifying disposable-service
      cleanup. Fresh JavaScript Express/Prisma, Express/Drizzle and FastAPI/uv
      SQLAlchemy projects exercise PostgreSQL 18.6, including Compose restart and
      recreation persistence; a fresh Express/Mongoose project performs authenticated
      CRUD against MongoDB 8.0.32. Five retained-helper macOS cases provide separate
      bounded evidence, not cross-platform fresh CLI service qualification.
- [x] [Preset usability](https://github.com/4d696e6b/RepoSetup/actions/runs/37813953485)
      passes fifteen sessions and 117 checks, including eight expected negative exits
      and no unexpected failures.
- [x] [Controlled benchmarks](https://github.com/4d696e6b/RepoSetup/actions/runs/37814000719)
      pass 120 command trials. These compare separate and consolidated installation
      strategies, not every framework download or patch-to-patch performance.
- [ ] Full twelve-job candidate matrix passes. [Attempt 1](https://github.com/4d696e6b/RepoSetup/actions/runs/37813953547)
      completes eleven jobs and 440 passing cases; Windows/Python 3.12/npm records a
      partial Next.js/SQLite failure before reaching its 90-minute job budget and
      cancellation. Attempt 2 retries only that unsuccessful job on unchanged source;
      its partial results cannot qualify the full matrix.
- [ ] Three consecutive first-attempt release runs pass. Initial
      [37813984536](https://github.com/4d696e6b/RepoSetup/actions/runs/37813984536) passes;
      [37813990336](https://github.com/4d696e6b/RepoSetup/actions/runs/37813990336) fails a
      Windows recipe job after a libuv crash (39/40 cases pass), and
      [37813995872](https://github.com/4d696e6b/RepoSetup/actions/runs/37813995872) fails
      after a macOS runner loses communication. Fresh runs
      [37863956517](https://github.com/4d696e6b/RepoSetup/actions/runs/37863956517),
      [37863959982](https://github.com/4d696e6b/RepoSetup/actions/runs/37863959982) and
      [37863963775](https://github.com/4d696e6b/RepoSetup/actions/runs/37863963775) are
      queued/running; prior failures remain recorded.
- [ ] Final artifact, tag-bound dry-run, signed publication and fresh registry
      delivery are accepted. Publication remains pending.

No integration maturity is promoted. Live services on every platform/recipe,
migrations, native Windows 11/Linux arm64 and actual browser journeys remain
outside this bounded evidence. See [the release record](../release-docs/STABLE_RELEASE_0.2.3.md).

## Historical 0.2.2 delivery — 2026-10-08

**rsetup@0.2.2 is published and accepted from npm on all three release targets.**
Dependency-health repairs pass exact-source qualification, including 408 successful
full-matrix executions after a documented Windows install-timeout retry. Signed
provenance and registry bytes match the retained candidate. See the
[0.2.2 release record](../release-docs/STABLE_RELEASE_0.2.2.md). Its manual/service
gaps describe that historical scope; current bounded live evidence is recorded above.

## Historical create-regression qualification — 2026-10-08

The create-regression repairs are delivered in **rsetup@0.2.1**. Exact-source
qualification, signed publication and three-platform registry delivery passed;
see the [release record](../release-docs/STABLE_RELEASE_0.2.1.md). The manual/service
gaps below remain outside qualification. Earlier attempts are retained below as history, not
as the current gate result.

- Product source `448beb43d945dffa81ff403553200c7e04d3cba1` passed all twelve full matrix jobs: 34 tests per job, 408 successful executions, with no skipped golden/bare cases. Each job executes twenty packed-npx bare solutions and fourteen real recipes. [Full matrix](https://github.com/4d696e6b/RepoSetup/actions/runs/37703591131).
- All fifteen packaged preset sessions passed 117 checks, including expected occupied-port refusal on all three operating systems. [Preset sessions](https://github.com/4d696e6b/RepoSetup/actions/runs/37703595169).
- Local checks passed: 959 unit tests (including the 495-check plan matrix), typecheck, lint, build and all 37 registry definitions. Packaged E2E passed 37 tests; one external release-artifact check was skipped.
- Subsequent changes affect workflow evidence formatting and documentation only; product files are unchanged. Fast CI, three-platform checks and controlled installation-pass benchmarks passed at `86352e3`. The benchmark is not a claim that every framework generator became faster. [CI](https://github.com/4d696e6b/RepoSetup/actions/runs/37704216808), [platform](https://github.com/4d696e6b/RepoSetup/actions/runs/37704216810), [performance](https://github.com/4d696e6b/RepoSetup/actions/runs/37704216851).
- The full run's four Windows evidence files contain a literal backslash-n trailer. Original artifacts were retained and all twelve semantic payloads were validated against the full source revision. The corrected writer separately produced twelve valid golden JSON files and three valid platform JSON files. Its `evidence-only` scope does not qualify application execution. [Writer check](https://github.com/4d696e6b/RepoSetup/actions/runs/37704261590).

The [machine-readable qualification record](../release-docs/qualification/0.2.x-create-stability.json)
records source revisions, scopes, counts and exclusions. Native Windows 11,
Linux arm64, live databases/containers, SQLAlchemy DBAPI connections and actual
Playwright browser journeys are not qualified by this historical matrix. The
separate current live evidence does not expand that run's scope. The documented
unpatched development-tool advisory is retained in the bounded release review;
no upstream fix or audit-clean generated stack is claimed.

This completes the automated stability pass and 0.2.1 patch delivery, not every
possible integration permutation or integration promotion. No new seven-day
freeze is required.

## 0.2.1 — Repair published create regressions

Implementation, automated regression validation, publication and delivery: complete.

- [x] Reproduce `npx rsetup@0.2.0 create my-next --framework nextjs --package-manager npm --typescript --yes` in a fresh folder.
- [x] Scope all generated file operations to the selected project directory; preserve generator commands that run from its parent.
- [x] Create the destination before Python initialization and handwritten Node scaffolds.
- [x] Install bare Vite dependencies; apply scaffold dependency pins and native build approval before installing.
- [x] Check conflicting and required lockfiles in each install command's directory.
- [x] Approve the known esbuild build script for bare TypeScript Express/tsx under pnpm.
- [x] Align printed Express/Fastify commands with default TypeScript and explicit JavaScript entries.
- [x] Offer only supported npm/pnpm Node managers in interactive create.
- [x] Qualify the Next.js 16.3.6 security patch before shipping changed generator pins.
- [x] Keep Node 24 as the supported CLI runtime. Node 22.12 fails dependency engine requirements; upgrading Node is required, suppressing npm warnings is not a compatibility fix.
- [x] Commit fixes with focused regression tests; do not replace an already published npm version.

## 0.2.2 — Expand release qualification

New post-release work: [post-create dependency health repair](./POST_CREATE_DEPENDENCY_HEALTH.md).
The pip bare tests previously allowed doctor to select the parent config directory;
the updated suite requires the generated project, framework and installed packages.
Its new exact-source execution qualification passed all twelve jobs and 408
creation/recipe executions, with no skipped test cases, in
[run 37743848281](https://github.com/4d696e6b/RepoSetup/actions/runs/37743848281).
The repair is delivered in published 0.2.2; its new version/artifact qualification and registry delivery are complete in the release record.

The automated matrix and preset sessions below are complete for historical 0.2.2.
Native platforms and live services were outside that qualification; these
historical checks do not include the separate bounded 0.2.3 acceptance above.

- [x] Plan matrix: all six frameworks, npm/pnpm or uv/pip, current/named/nested directories, curated integrations with their required dependencies, JavaScript options, and incompatible runtime/manager rejection.
- [x] Real execution: fourteen qualified recipes in named directories, generated tests/typechecks/builds/lints and stack/doctor checks; repeat JavaScript recipes with npm and pnpm.
- [x] Real npx delivery: pack the patch candidate, then create the sixteen bare JavaScript framework/manager/language combinations and four isolated Python framework/manager combinations in nested directories. Check dry-run leaves no files and successful creation installs/imports/builds.
- [x] Presets: packaged CLI preview, create, displayed run/build/test commands, add, doctor and export. Check all five presets; Docker checks require an existing Docker executable, not automatic installation.
- [x] Failure coverage: invalid config/options, unsupported combinations, missing prerequisites, unwritable paths, symlink escape, existing-file protection, missing/conflicting lockfiles, interrupted/failed installs and safe add/remove repetition.
- [x] CI: Ubuntu x64, macOS arm64, Windows Server x64, Node 24, Python 3.12/3.13 and both JavaScript managers.
- [ ] Historical 0.2.2 scope: native Windows 11 and live PostgreSQL/MongoDB/container connections were not qualified. Configuration generation and compilation do not prove live services; bounded 0.2.3 service checks are recorded separately above.

## 0.2.3 and subsequent patches — Sustain stability

- Preserve qualified direct version pins and record exact toolchain/source revisions for each qualification.
- Review registry availability, transitive engine ranges and security advisories before refreshing pins; regenerate and execute affected recipes.
- Capture actionable errors, remediation and reproducible reports; add a regression for every confirmed create failure.
- Measure peak disk use of real generated stacks and improve prerequisite guidance. The existing 512 MiB preflight is a minimum guard, not a guarantee that a Next.js dependency install will fit.
- Measure warm/cold installs after correctness gates. Do not trade isolation, integrity or reproducibility for speed.
- Expand the bounded automated live PostgreSQL/MongoDB and ORM connection checks against disposable services before promoting those integrations to stable; keep SQLAlchemy's separately required DBAPI explicit.
- Extend qualification to native Windows 11 and Linux arm64 when those environments are available; do not infer these results from Windows Server or Linux x64.
- Expand only combinations that pass real creation and execution; keep unsupported contexts explicit.

## Release gate for each patch

1. Unit tests, typecheck, lint, build, registry validation, packaging and CLI failure tests pass.
2. Affected real recipes, bare npx solutions and preset sessions pass on the exact release candidate.
3. Platform CI passes and evidence links identify that candidate commit.
4. Review unresolved security findings and manual platform/service gaps honestly; do not label a partial result complete.
5. Maintainer reviews the change and approves publishing a new patch version. No additional seven-day freeze is required by this plan.

## Initial evidence and limitations

- Published 0.2.0 named Next.js creation reproduces `FILE_MUTATION_FAILED` on `app/layout.tsx` after scaffolding into the child directory. Existing golden tests used only `.` and missed the regression.
- Patch unit regressions and the 495-check plan matrix pass locally.
- All nine real recipes pass locally with pnpm and uv across separately run groups, including Next.js create/typecheck/tests/build and Python import/pytest/Ruff.
- Packaged React preset preview/create/server/build/test/add/doctor/export passes locally.
- The first npm matrix attempts hit local `ENOSPC`, and later cases failed the executor's disk-space preflight. These are failed qualification attempts, not passes. Tests now keep npm caches per test to avoid accumulation; the complete matrix needs adequate disk space in CI.
- Official Next.js advisory [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) identifies 16.3.6 as patched for the affected 16.3 line. Generator and eslint package versions were verified through npm registry metadata and actual generation.
- The baseline generated Next.js audit also reported [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) through development tooling. Do not claim an audit-clean stack until a reviewed supported fix is available and requalified.
- This branch is a patch candidate. The npm release is unchanged by these tests.

### Bare solution follow-up

The first real packed-npx run passed 15 non-Next solutions and found one failure:
bare TypeScript Express with pnpm lacked the esbuild build approval required by
tsx. Full recipes had supplied that approval via Vitest, hiding the defect.
A dedicated plan-order regression and real npx rerun cover this fix. The four
bare Next cases are included in the CI matrix; local disk pressure limits full
qualification here.

### Preset follow-up

Next/SQLite and React packaged sessions passed. Expanded sessions exposed that
Docker detection recognized only Dockerfile, while generated presets wrote only
Compose files. Adding an integration to FastAPI/Flask consequently lost Docker
context and failed resolution. Detection now retains that declarative context
from all supported Compose filenames without claiming Docker is installed.
Express/Fastify generated servers now print their listening URL for usable
startup feedback and an actual HTTP probe in qualification.

The Express PostgreSQL preset built successfully but `start` pointed to
`dist/app.js`, while TypeScript inferred a broader root after Prisma added
`lib/` and `generated/`. Both TypeScript server scaffolds now explicitly use
`rootDir: "."` and `dist/src/` startup entries, independent of integrations.
Real bare/golden tests check that the start-script entry actually exists after
building; the Express preset session also probes its production server.
Generated README commands now follow npm/pnpm or uv/pip and do not advertise
pytest unless it was selected.

### Execution boundary and expanded coverage

Packed npx qualification exposed outer npm exec launch settings leaking into
nested framework generators. The initial fix discarded npm's package/call launch settings, preserving
registry, cache, PATH and other user configuration. Later npm recipe tests
required isolating package-manager identity too, as recorded below.
A regression checks this environment boundary. All twenty bare npx solutions
passed on Linux/macOS before the final formatting follow-up; complete reruns
must qualify the final candidate rather than reuse those results as its gate.

All fifteen packaged preset sessions passed at `1b05852` across Ubuntu, macOS
and Windows Server ([run 37679024048](https://github.com/4d696e6b/RepoSetup/actions/runs/37679024048)).
Windows readiness checks retry HTTP until the server responds and await process
shutdown before cleanup. Express's occupied-port test matches its actual bind.
The final expanded recipe suite additionally executes shadcn initialization and
builds for both Next.js and Vite, and builds/imports the Express Mongoose helper
with a missing-URI safety check. No live MongoDB connection is claimed.

The final Express callback formatting fix passes its real generated-app build,
endpoint tests and Prettier check locally. The Mongoose build/import/doctor check
also passes locally. These are targeted passes; full final CI remains required.

### Previously silent UI setup failures

The expanded checks found that `shadcn init --yes` may return success without
writing `components.json`: confirmation skipping is not full noninteractive
configuration. The exact pinned 4.21.0 help and [official CLI documentation](https://ui.shadcn.com/docs/cli)
confirm `--defaults`; RepoSetup now supplies it with the explicit template and
verifies that the configuration file exists before reporting success.
Earlier preset passes did not assert that file, so they were insufficient UI
setup evidence. All subsequent React preset sessions must assert it.

Actual initialization then exposed missing Vite prerequisites. Tailwind's
[official Vite setup](https://tailwindcss.com/docs/installation/using-vite)
requires the CSS import and plugin configuration; RepoSetup now applies both
while preserving existing CSS. The [shadcn Vite instructions](https://ui.shadcn.com/docs/installation/vite)
require source aliases in the app/compiler and Vite configuration. The planner
now supplies TypeScript or JavaScript aliases, preserving JSONC comments.
Next.js and Vite shadcn initialization/build checks pass locally for TypeScript;
JavaScript variants are also required by the expanded fourteen-recipe CI suite.

A generated-app formatting failure exposed the executor incorrectly adding CRLF
to inserted lines when a replacement anchor contained no newline. The executor
now uses the source file's line endings for that case; actual LF/CRLF file
regressions cover it. Later local runs again hit the disk preflight as this
machine fell below 512 MiB free; these attempts are failures, not qualification
passes. Final CI must prove the current candidate with adequate space.

### npm-only dependency and environment regressions

The npm qualification found Next.js's generated Node 20 types outside Vitest
5.0.1's `^22.0.0 || >=24.0.0` peer range (verified against the exact npm registry
metadata). The TypeScript Next.js Vitest recipe now installs the qualified Node
22 types with the test dependencies, including when adding Vitest to an existing
project. It does not bypass npm dependency resolution with force flags.

The pinned create-playwright source determines its installer from
`npm_config_user_agent`. An inherited pnpm identity made `npm init playwright`
install using pnpm inside an npm project. Child processes now discard the outer
package-manager identity and executable paths as well as outer npm exec launch
options, letting the invoked manager identify itself. Registry/cache settings
are preserved. The real recipe checks the selected manager's lockfile and the
absence of the other manager's lockfile. Final qualification remains required.

Prisma 7.10.0 initialization was also observed launching `skills add` to fetch
remote coding-agent instructions. Its exact published CLI source and help text
support `--no-skills`; both SQLite/PostgreSQL recipes now use that opt-out.
The real Next/SQLite check asserts no coding-agent directories were created.
The post-fix Playwright npm recipe passes locally; the Next/SQLite npm attempt
ran out of disk during dependency installation and is not a pass.

At `3ae33a7`, ten full matrix jobs passed all 34 tests; the two Windows/npm
jobs each passed 33 and failed the Next/SQLite generated Vitest assertion with
`Cannot find module '/health.test.ts'`. Qualification remains open. The Next
test recipe did not pin Vite, allowing npm to resolve a newer version than the
qualified 8.3.0. The follow-up pins Vite and saves the Next test toolchain exactly;
this must be verified rather than assumed to fix the Windows failure. Failed
creates now report installed test-tool versions in the qualification logs.
The workflow's optional `next-vitest` scope provides a focused diagnostic run;
its evidence is labeled with that scope and cannot qualify the complete matrix.

The focused run exposed a separate doctor false positive after making Vite a
direct test dependency: Next.js plus React plus Vite was detected as a Vite app
even though it had only a Vitest config. Detection now excludes Next.js in that
case unless a Vite application config exists. Regression tests cover both the
test-only dependency and explicit Vite config evidence. Cross-platform execution
must still pass before closing this gate.

The focused Windows/npm run at `f5a49eb` still failed to resolve
`/health.test.ts` with the exact qualified versions installed; the Vite pin alone
does not fix it. Its root uses Windows's `RUNNER~1` short path. The Next.js
Vitest config now supplies a canonical root derived from its own file URL using
Node's native realpath API. This addresses path identity as a hypothesis; the
focused Windows run and full matrix must verify it. Vitest documents the
[root option](https://vitest.dev/config/root.html). Related Windows path identity
failures were fixed in [Angular CLI's Vitest integration](https://github.com/angular/angular-cli/pull/33567);
that is supporting context, not evidence that RepoSetup's failure is fixed.

All twelve focused Next/Vitest cases passed at `448beb4`, including both
Windows/npm cases. Full qualification on that product revision is still required.
Parsing downloaded evidence exposed another Windows-only defect: the inline
workflow command appended a literal backslash-n rather than a JSON newline.
Golden/platform writers now use a shell-independent newline and parse each JSON
file before upload. The `evidence-only` diagnostic scope checks that writer and
is explicitly labeled; it does not execute or qualify generated applications.

## Reproducing the stability checks

Use Node 24, the workspace's pinned pnpm and an available Python/uv toolchain.
These commands test the checkout. The 0.2.3 candidate is not yet published;
see the release record for publication and registry acceptance.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm registry:validate
pnpm test:e2e
```

For the real generators and downloaded dependencies, use a fresh machine or
runner with enough disk space. Each current golden run executes twenty-two packed-npx bare
solutions and eighteen recipes; the Next recipe is enabled locally explicitly:

```sh
REPOSETUP_GOLDEN_NEXT=1 REPOSETUP_GOLDEN_PACKAGE_MANAGER=npm pnpm test:golden
REPOSETUP_GOLDEN_NEXT=1 REPOSETUP_GOLDEN_PACKAGE_MANAGER=pnpm pnpm test:golden
```

The above environment assignment syntax is for POSIX shells. GitHub Actions
sets the variables through `env`, including on Windows. The committed
`golden.yml` and `usability.yml` workflows provide the cross-platform entry
points and retained evidence artifacts.
