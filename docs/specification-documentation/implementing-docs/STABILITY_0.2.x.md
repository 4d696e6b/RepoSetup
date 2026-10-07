# RepoSetup 0.2.x stability plan

Created 2026-10-08, against released source `origin/main` at `1ddbdc6`.
Work branch: `codex/fix-create-project-paths`.

0.2.x prioritizes working supported recipes, safe failures, reproducibility and
regression coverage. No new integrations are needed to close these regressions.
A passing plan is not evidence of a working generated application. Never claim
all possible integration combinations or all operating systems were tested.

## 0.2.1 — Repair published create regressions

- Reproduce `npx rsetup@0.2.0 create my-next --framework nextjs --package-manager npm --typescript --yes` in a fresh folder.
- Scope all generated file operations to the selected project directory; preserve generator commands that run from its parent.
- Create the destination before Python initialization and handwritten Node scaffolds.
- Install bare Vite dependencies; apply scaffold dependency pins and native build approval before installing.
- Check conflicting and required lockfiles in each install command's directory.
- Approve the known esbuild build script for bare TypeScript Express/tsx under pnpm.
- Align printed Express/Fastify commands with default TypeScript and explicit JavaScript entries.
- Offer only supported npm/pnpm Node managers in interactive create.
- Qualify the Next.js 16.3.6 security patch before shipping changed generator pins.
- Keep Node 24 as the supported CLI runtime. Node 22.12 fails dependency engine requirements; upgrading Node is required, suppressing npm warnings is not a compatibility fix.
- Commit fixes with focused regression tests; do not replace an already published npm version.

## 0.2.2 — Expand release qualification

- Plan matrix: all six frameworks, npm/pnpm or uv/pip, current/named/nested directories, curated integrations with their required dependencies, JavaScript options, and incompatible runtime/manager rejection.
- Real execution: nine qualified recipes in named directories, generated tests/typechecks/builds/lints and stack/doctor checks; repeat JavaScript recipes with npm and pnpm.
- Real npx delivery: pack the patch candidate, then create the sixteen bare JavaScript framework/manager/language combinations and four isolated Python framework/manager combinations in nested directories. Check dry-run leaves no files and successful creation installs/imports/builds.
- Presets: packaged CLI preview, create, displayed run/build/test commands, add, doctor and export. Check all five presets; Docker checks require an existing Docker executable, not automatic installation.
- Failure coverage: invalid config/options, unsupported combinations, missing prerequisites, unwritable paths, symlink escape, existing-file protection, missing/conflicting lockfiles, interrupted/failed installs and safe add/remove repetition.
- CI: Ubuntu x64, macOS arm64, Windows Server x64, Node 24, Python 3.12/3.13 and both JavaScript managers.
- Native Windows 11 and live PostgreSQL/MongoDB/container connections remain separate manual qualification. Configuration generation and compilation do not prove live services.

## 0.2.3 and subsequent patches — Sustain stability

- Preserve qualified direct version pins and record exact toolchain/source revisions for each qualification.
- Review registry availability, transitive engine ranges and security advisories before refreshing pins; regenerate and execute affected recipes.
- Capture actionable errors, remediation and reproducible reports; add a regression for every confirmed create failure.
- Measure warm/cold installs after correctness gates. Do not trade isolation, integrity or reproducibility for speed.
- Expand only combinations that pass real creation and execution; keep unsupported contexts explicit.

## Release gate for each patch

1. Unit tests, typecheck, lint, build, registry validation, packaging and CLI failure tests pass.
2. Affected real recipes, bare npx solutions and preset sessions pass on the exact release candidate.
3. Platform CI passes and evidence links identify that candidate commit.
4. Review unresolved security findings and manual platform/service gaps honestly; do not label a partial result complete.
5. Maintainer reviews the change and approves publishing a new patch version. No additional seven-day freeze is required by this plan.

## Initial evidence and limitations

- Published 0.2.0 named Next.js creation reproduces `FILE_MUTATION_FAILED` on `app/layout.tsx` after scaffolding into the child directory. Existing golden tests used only `.` and missed the regression.
- Patch unit regressions and the 494-case plan matrix pass locally.
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
