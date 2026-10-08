# Integration support report (`0.2.0`)

This is the published 0.2.0 catalog classification. The guaranteed support scope is the five required recipes in [the 0.2.0 roadmap](./ROADMAP_0.2.0.md), with final platform and artifact evidence in [stable qualification](../release-docs/STABLE_QUALIFICATION_0.2.0.md). No individual integration ID was promoted to `stable`; qualification applies to the tested recipe tuples, not every possible combination.

## Unpublished 0.2.x execution follow-up — 2026-10-08

The published catalog table below retains its 0.2.0 classification. On patch
product source `448beb4`, [full qualification](https://github.com/4d696e6b/RepoSetup/actions/runs/37703591131)
passed twelve jobs with twenty bare solutions and fourteen recipes each.

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
they do not change the published package or promote catalog maturity.

## Published 0.2.0 catalog

Statuses below are **not fabricated as stable**. `candidate` means plan/detect/verify tests exist. `experimental` means implemented but not treated as a qualified path. Real execute evidence is recorded separately in `docs/specification-documentation/implementing-docs/IMPLEMENTATION_STATUS.md`.

| Integration | Status | Proven paths |
| --- | --- | --- |
| node | candidate | create (prerequisite), detect |
| python | candidate | create (prerequisite), detect |
| npm | candidate | plan/detect |
| pnpm | candidate | create/detect |
| uv | candidate | create/detect |
| pip | candidate | plan/detect |
| nextjs | candidate | create dry-run; real execute in golden CI |
| react-vite | candidate | create dry-run; real execute via `pnpm test:golden` |
| express | candidate | create dry-run; generation golden (no live DB) |
| fastify | experimental | plan/detect tests only |
| fastapi | candidate | create dry-run; real execute via `pnpm test:golden` when uv exists |
| flask | candidate | create dry-run; real execute via `pnpm test:golden` when uv exists |
| tailwind | candidate | create (Next.js / Vite goldens) |
| shadcn | experimental | plan tests; not in qualified goldens |
| sqlite | candidate | Next.js golden (file DB) |
| postgresql | experimental | generation/config only; no live connectivity qualification |
| mongodb | experimental | generation/config only |
| prisma | candidate | create/add; generate on SQLite golden |
| drizzle | experimental | add tested; OS/execute incomplete |
| mongoose | experimental | add tested; live MongoDB not qualified |
| sqlalchemy | candidate | FastAPI/Flask goldens (package + Alembic; no live DB) |
| alembic | candidate | FastAPI/Flask goldens |
| zod | candidate | create/add |
| pydantic | candidate | create/add |
| pydantic-settings | candidate | FastAPI create/add with safe `.env.example`; no secret values are requested or stored |
| vitest | candidate | create/add |
| testing-library | candidate | React + Vite create/add with a real accessible interaction test |
| tanstack-query | candidate | React + Vite create/add with a provider and mocked-response query test |
| playwright | experimental | plan/detect only |
| pytest | candidate | create/add; guaranteed Python recipes generate a real endpoint test and require pytest to pass |
| httpx | candidate | FastAPI create/add with an in-process API response test |
| eslint | candidate | plan/detect (React example) |
| prettier | candidate | create/add |
| ruff | candidate | FastAPI/Flask goldens |
| docker | experimental | detection / compose templates |
| docker-compose | experimental | detection / templates |
| github-actions | experimental | template write; not CI-qualified as a product surface |
| bun | — | not in catalog |

No IDs are `stable` or `deprecated` in 0.2.0. The five guaranteed recipe tuples passed Ubuntu 24.04, macOS 15, and Windows Server 2025 CI qualification with Node 24 and the documented Python 3.12/3.13 variants. Windows 11 desktop behavior is not separately claimed by this CI evidence.
