# Phase 19 — Baseline and acceptance scope

Completed on 2026-09-22 for the `0.2.0` development line. This is an evidence and scope checkpoint. It does not promote integrations, change the published package, or claim cross-platform qualification.

## Source and artifact identity

| Item | Observed value |
| --- | --- |
| Working source baseline | `a0e48a19479dc574c3f2bc3fba4a39608dc33e77` (`v0.1.1`) |
| Remote `main` at inspection | `a0e48a19479dc574c3f2bc3fba4a39608dc33e77` |
| Remote `dev` at inspection | `3eaaada4c63684a02c2d27318b8c364526b7cc0b` |
| npm package / dist-tag | `rsetup@0.1.1` / `latest` |
| npm SHA-1 shasum | `9a10526093070b5b1d65d01b37443fc6de3f1a6f` |
| npm integrity | `sha512-GYc2/UJy2Ew5z/FsYkSvOJ3/rHv7I+OJp8H+P3s6+obRMovxG10qzuuwSMGLZwF3xTb84rNapLL1FzcTm+wKug==` |
| npm publication timestamp | `2026-09-22T03:15:45.109Z` |
| CLI manifest SHA-256 | `b71bee0500e0ecddeb8270da8e6ae6f3548717ec537911fe83d2e6b62404bd29` |
| workspace lockfile SHA-256 | `39b6f900f332f0ec34b2ef0c74f667fa1180e8b4c946d64a6396c8cb894b7377` |

The local annotated `v0.1.1` tag resolves to the same source commit. The historical `v0.1.0` annotated tag resolves to `78ef16c7ee9861df94d24e550d02ddcdbf13e9aa`.

The npm registry data was read with `npm view`. `gh` is installed but no GitHub account is authenticated in this environment, so GitHub Actions and GitHub Release results are deliberately recorded as **unobserved**. Remote tag and branch references were read with `git ls-remote`; that is not workflow evidence.

## Local environment and checks

| Item | Observed value |
| --- | --- |
| Host | macOS 14.7.2, arm64 |
| Node.js | 22.12.0 |
| npm | 10.9.0 |
| pnpm | 12.5.1 |
| Python | 3.13.1 |
| uv | unavailable on PATH |
| `pnpm audit --prod --audit-level=low` | 0 vulnerabilities (44 total dependencies reported) |
| `pnpm outdated` | `@types/node` 22.20.4 → 26.6.2 and TypeScript 5.9.3 → 7.0.2; both dev-only and deferred to a separate compatibility change |

Sequential baseline verification passed:

```text
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm registry:validate
pnpm test:e2e
pnpm test:golden
```

`pnpm test` passed 335 tests with one intentional skipped integration test. `pnpm test:e2e` passed 12 tests. `pnpm test:golden` passed 2 tests and skipped 3: Next.js needs an explicit environment flag, and FastAPI/Flask need `uv`.

Do not run workspace tests or golden tests concurrently: both rebuild workspace `dist/` directories and a concurrent run produced an intermittent missing `packages/integrations/dist/index.js` import. Sequential verification is the valid baseline. Phase 20 owns test-artifact isolation; Phase 27 requires CI proof that concurrent release jobs do not share mutable build outputs.

## Frozen 0.2.0 qualification scope

This table is a **qualification target**, not an existing support claim. The current `0.1.1` artifact continues to advertise the version constraints in its published manifest. Phase 22 changes product metadata only after the required qualification evidence exists.

| Surface | 0.2.0 qualification target | Required evidence owner |
| --- | --- | --- |
| Node CLI and JavaScript recipes | Node `>=24.0.0 <25.0.0`; qualifier uses the current Node 24 LTS patch at each candidate | Phase 21, Phase 22 |
| npm-generated projects | npm `>=11.0.0 <12.0.0` | Phase 21 |
| pnpm-generated projects | pnpm `12.5.1` | Phase 21 |
| Python / uv recipes | Python `>=3.12.0 <3.14.0`; uv `0.12.17` | Phase 21, Phase 25 |
| Required operating systems | Ubuntu 24.04 x64; macOS 14 arm64; Windows 11 x64 | Phase 21 |
| Additional Node checks | latest patch of Node 24 LTS on every required OS | Phase 27 |
| Existing path operations | create, add, remove only for documented recipes | Phase 24, Phase 25 |

Node 20 is EOL and Node 22 is an older LTS line according to the [official Node release list](https://nodejs.org/en/about/previous-releases). A high-stability 0.2.0 release therefore targets Node 24 rather than extending the published `>=20` claim. uv 0.12.17 is a reproducible qualification pin from the [official uv installation documentation](https://docs.astral.sh/uv/getting-started/installation/); the product must not silently install it.

The five required recipes are Next.js + SQLite/Prisma, React/Vite, Express + PostgreSQL configuration, FastAPI/uv, and Flask/uv. JavaScript recipes require npm and pnpm variants; Python recipes require uv. A recipe passes only after real create, a meaningful application test or HTTP smoke, build/typecheck/import as applicable, `stack`, `doctor`, and export/recreate evidence on every advertised platform.

No integration is stable in this baseline. Existing `candidate` labels mean implementation and limited evidence; existing `experimental` labels remain outside the guaranteed release surface. PostgreSQL/MongoDB output remains configuration generation, not database-service qualification.

## Recipe and planning baseline

The following dry-run measurements use the built CLI, the configuration SHA-256 values below, the host recorded above, and `/usr/bin/time -p`. They measure planning/rendering only: no files, network requests, or package-manager subprocesses were executed.

| Recipe | Configuration SHA-256 | Operations | Planned process operations | Dry-run elapsed |
| --- | --- | ---: | ---: | ---: |
| Next.js + SQLite | `95d5174a36e3c2409a617a636243e506c1ed44a7ef5b4d40a55ebd71000f3f57` | 21 | 10 | 0.09 s |
| React/Vite | `366d3cdb1b3738c8580cba6ea04f55a9100597993f2c3b43c82a1f9795509ea2` | 12 | 5 | 0.10 s |
| Express + PostgreSQL config | `abc02eac8fd585a147b092749d74faa86deeb0d35042118143aeecbfa68ceccc` | 23 | 9 | 0.09 s |
| FastAPI / uv | `6ff562b99422506293e8f3e07d7ed1724c3400eacb985d8ece1ccb1431319cb6` | 16 | 8 | 0.09 s |
| Flask / uv | `97529907842a0b1cfa4eb4442a8f992be84ae8057e7f4d5a44b31cc8acc7a632` | 15 | 7 | 0.09 s |

Phase 23 must repeat this work with cold/warm real-install trials on the target OS matrix. These dry-run results are a process-count baseline, not a speed claim.

## Floating commands and blockers

| ID | Finding | Disposition and owner |
| --- | --- | --- |
| B-19-01 | Golden and workspace test jobs share mutable `dist/` artifacts; concurrent execution raced | Release blocker; Phase 20 isolates build/test outputs and Phase 27 proves release-job isolation |
| B-19-02 | Next.js real execution requires an opt-in environment flag and skips Windows | Release blocker; Phase 21 enables Windows-safe real execution or narrows the advertised surface, Phase 25 qualifies the recipe |
| B-19-03 | FastAPI/Flask real tests skip when uv is absent | Release blocker; Phase 21 provisions the exact qualifier tool and Phase 25 qualifies both recipes |
| B-19-04 | No observed GitHub Actions or GitHub Release result is available locally | Release blocker; Phase 21 captures OS evidence and Phase 27 links the candidate workflow runs |
| B-19-05 | `create-next-app@latest`, `vite@latest`, `eslint@latest`, `@eslint/js@latest`, `shadcn@latest`, and `playwright@latest` are floating | Release blocker for any guaranteed path; Phase 22 researches and pins qualified generators. Experimental paths cannot become stable while floating |
| B-19-06 | Most integration packages are unversioned, so a plan does not recreate an identical dependency graph by itself | Release blocker for reproducible recipes; Phase 22 defines qualified direct ranges and lockfile/recipe-record policy |
| B-19-07 | Publish workflow does not wait for the separate platform/golden workflow evidence | Release blocker; Phase 27 makes exact candidate qualification a publication dependency |
| B-19-08 | Current release/acceptance records mix historical 0.1.0 entries and 0.1.1 facts | Resolved for forward planning by this document; Phase 27 updates candidate records and retains historical files as history |
| B-19-09 | npm production audit is clean; two dev-only packages are behind current latest | Deferred maintenance work; update only with a dedicated compatibility matrix and no release claim until it passes |
| B-19-10 | No integration has full real-execute, add/remove, and OS evidence | Release blocker for any `stable` promotion; Phase 25 owns maturity qualification |

## Phase 19 acceptance record

- [x] Release/package/tag evidence reconciled without changing published state.
- [x] Exact 0.2.0 qualification target and five required recipes frozen.
- [x] Current maturity boundary frozen: no stable IDs.
- [x] Skips, test-artifact race, external-command drift, dependency state, and release-workflow gaps inventoried with later owners.
- [x] Source, package, configuration, environment, check, and planning-performance evidence recorded.
- [x] Fresh sequential baseline suite passed.

Phase 19 is complete. Phase 20 may begin; later phases remain unstarted.
