# Integration support report (`0.1.0-alpha.1`)

Statuses below are **not fabricated as stable**. `candidate` means plan/detect/verify tests exist. `experimental` means implemented but not treated as a qualified path. Real execute evidence is recorded separately in `docs/IMPLEMENTATION_STATUS.md`.

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
| vitest | candidate | create/add |
| playwright | experimental | plan/detect only |
| pytest | candidate | create/add; `pytest` may exit 5 when no tests exist |
| eslint | candidate | plan/detect (React example) |
| prettier | candidate | create/add |
| ruff | candidate | FastAPI/Flask goldens |
| docker | experimental | detection / compose templates |
| docker-compose | experimental | detection / templates |
| github-actions | experimental | template write; not CI-qualified as a product surface |
| bun | — | not in catalog |

No IDs are `stable` or `deprecated` in this alpha.
