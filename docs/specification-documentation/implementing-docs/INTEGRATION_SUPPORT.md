# Integration support report (`0.2.3` preparation)

The 0.2.3 candidate preserves the published 0.2.0 catalog classification. Version-specific qualification and publication are pending in [the patch release record](../release-docs/STABLE_RELEASE_0.2.3.md). The guaranteed support scope is the five required recipes in [the 0.2.0 roadmap](./ROADMAP_0.2.0.md), with final platform and artifact evidence in [stable qualification](../release-docs/STABLE_QUALIFICATION_0.2.0.md). No individual integration ID was promoted to `stable`; qualification applies to the tested recipe tuples, not every possible combination.

## 0.2.3 installed-stack audit

The [installed-stack audit](./INSTALLED_STACK_AUDIT.md) passes all 480 full-matrix
cases after two same-source Windows/npm retries, plus scoped recovery checks.
These repairs were merged through PR #17. New version-specific release and live
service qualification are recorded separately below; artifact qualification and
publication remain pending. No integration maturity is promoted.

## Bounded 0.2.3 live-service acceptance

Frozen candidate `a213a6a1edf63771aba8d5b91bfdcf44d665de22` passed
[live-service run 37813979567](https://github.com/4d696e6b/RepoSetup/actions/runs/37813979567):
two Linux tests, no failures or skips, with five PostgreSQL checks and two MongoDB
checks. Evidence records version 0.2.3, Node 24, the exact source, service versions,
image digests and successful cleanup.

The PostgreSQL case creates fresh JavaScript Express/Prisma and Express/Drizzle
projects and a FastAPI/uv SQLAlchemy project through the CLI, then checks their
generated helpers against PostgreSQL 18.6. It verifies CRUD and data persistence
through both a Compose restart and container recreation using the generated
named volume. The MongoDB case creates a fresh JavaScript Express/Mongoose
project and verifies authenticated CRUD against MongoDB 8.0.32. Both cases run
doctor and remove their owned services and storage.

Five earlier local cases use retained generated helpers on macOS with PostgreSQL
14.20 and MongoDB 8.2.3, including compiled Express/Prisma and Fastify/Drizzle,
FastAPI/Flask SQLAlchemy and Express/Mongoose. These are separate evidence from
the two fresh-creation Linux tests, not additional cross-platform service cases.
See [the audit](./INSTALLED_STACK_AUDIT.md) and [the release record](../release-docs/STABLE_RELEASE_0.2.3.md).
No catalog maturity, arbitrary permutation, migration, browser or native platform
guarantee is added by these checks.

## Historical 0.2.x execution qualification — 2026-10-08

The published catalog table below retains its 0.2.0 classification. On patch
product source `448beb4`, [full qualification](https://github.com/4d696e6b/RepoSetup/actions/runs/37703591131)
passed twelve jobs with twenty bare solutions and fourteen recipes each. The
following no-live statements describe that historical run's scope; the separate
0.2.3 acceptance above does not retroactively expand it.

- [x] npm and pnpm execute all four Node frameworks in TypeScript and JavaScript.
- [x] uv and isolated pip execute both Python frameworks.
- [x] Fastify/Drizzle generated code is built and tested without a live database.
- [x] shadcn initializes and builds on Next.js/Vite in TypeScript and JavaScript.
- [x] Express/Mongoose helper builds/imports and refuses a missing URI; live MongoDB remains untested.
- [x] Playwright initialization and test discovery pass; browser journeys remain untested.
- [x] React Testing Library/TanStack Query and FastAPI HTTPX/settings execution and repeated add checks pass.
- [x] All five presets pass packaged create/run/build/test/add/doctor/export sessions across the three CI platforms.

See [the stability plan](./STABILITY_0.2.x.md) for exact scopes and exclusions.
These completed checks expand observed execution coverage on the patch branch;
they are retained in published 0.2.2 and do not promote catalog maturity.
Final publication, dependency-health qualification and delivery evidence are in the release record.

## Catalog classification and historical paths retained in 0.2.3

Statuses below are **not fabricated as stable**. `candidate` means plan/detect/verify tests exist. `experimental` means implemented but not treated as a qualified path. The table preserves the earlier catalog and its historical proven-path scopes, including its no-live boundaries. The new bounded 0.2.3 service evidence is recorded above, separately from catalog maturity. Real execute evidence is recorded separately in `docs/specification-documentation/implementing-docs/IMPLEMENTATION_STATUS.md`.

| Integration | Status | Proven paths |
| --- | --- | --- |
| node | candidate | create (prerequisite), detect |
| python | candidate | create (prerequisite), detect |
| npm | candidate | create, plan/detect; bare solutions and real npm recipes |
| pnpm | candidate | create/detect |
| uv | candidate | create/detect |
| pip | candidate | isolated FastAPI/Flask bare creation; no locked-repeat guarantee |
| nextjs | candidate | create dry-run; real execute in golden CI |
| react-vite | candidate | create dry-run; real execute via `pnpm test:golden` |
| express | candidate | create dry-run; generation golden (no live DB) |
| fastify | experimental | TS/JS bare creation; Drizzle/Vitest generation, build and test |
| fastapi | candidate | create dry-run; real execute via `pnpm test:golden` when uv exists |
| flask | candidate | create dry-run; real execute via `pnpm test:golden` when uv exists |
| tailwind | candidate | create (Next.js / Vite goldens) |
| shadcn | experimental | Next.js/Vite TS/JS initialization and build; asserts components.json |
| sqlite | candidate | Next.js golden (file DB) |
| postgresql | experimental | generation/config only; no live connectivity qualification |
| mongodb | experimental | generation/config only |
| prisma | candidate | create/add; generate on SQLite golden |
| drizzle | experimental | Fastify PostgreSQL config/build/test; no live connectivity |
| mongoose | experimental | Express helper build/import and missing-URI refusal; no live MongoDB |
| sqlalchemy | candidate | FastAPI/Flask goldens (package + Alembic; no live DB) |
| alembic | candidate | FastAPI/Flask goldens |
| zod | candidate | create/add |
| pydantic | candidate | create/add |
| pydantic-settings | candidate | FastAPI create/add with safe `.env.example`; no secret values are requested or stored |
| vitest | candidate | create/add |
| testing-library | candidate | React + Vite create/add with a real accessible interaction test |
| tanstack-query | candidate | React + Vite create/add with a provider and mocked-response query test |
| playwright | experimental | npm/pnpm initialization and test discovery; no browser journeys |
| pytest | candidate | create/add; guaranteed Python recipes generate a real endpoint test and require pytest to pass |
| httpx | candidate | FastAPI create/add with an in-process API response test |
| eslint | candidate | plan/detect (React example) |
| prettier | candidate | create/add |
| ruff | candidate | FastAPI/Flask goldens |
| docker | experimental | detection / compose templates |
| docker-compose | experimental | detection / templates |
| github-actions | experimental | template write; not CI-qualified as a product surface |
| bun | — | not in catalog |

No IDs are `stable` or `deprecated` in 0.2.3. The five guaranteed recipe tuples passed Ubuntu 24.04, macOS 15, and Windows Server 2025 CI qualification with Node 24 and the documented Python 3.12/3.13 variants. Windows 11 desktop behavior is not separately claimed by this CI evidence.
