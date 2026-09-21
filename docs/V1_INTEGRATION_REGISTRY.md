# RepoSetup v1 Integration Registry

This document defines the planned v1 integration set. "Planned" does not mean "stable"; an integration becomes stable only after meeting the integration Definition of Done.

| ID | Name | Category | Initial priority |
|---|---|---|---|
| node | Node.js | runtime | P0 |
| python | Python | runtime | P0 |
| npm | npm | package-manager | P0 |
| pnpm | pnpm | package-manager | P0 |
| bun | Bun | package-manager/runtime | P1 |
| uv | uv | package-manager | P0 |
| pip | pip | package-manager | P0 |
| nextjs | Next.js | framework | P0 |
| react-vite | React + Vite | framework | P0 |
| express | Express | backend-framework | P0 |
| fastify | Fastify | backend-framework | P1 |
| fastapi | FastAPI | backend-framework | P0 |
| flask | Flask | backend-framework | P0 |
| tailwind | Tailwind CSS | styling | P0 |
| shadcn | shadcn/ui | ui | P1 |
| postgresql | PostgreSQL | database | P0 |
| sqlite | SQLite | database | P0 |
| mongodb | MongoDB | database | P1 |
| prisma | Prisma | orm | P0 |
| drizzle | Drizzle ORM | orm | P1 |
| mongoose | Mongoose | orm | P1 |
| sqlalchemy | SQLAlchemy | orm | P0 |
| alembic | Alembic | migration | P0 |
| zod | Zod | validation | P0 |
| pydantic | Pydantic | validation | P0 |
| vitest | Vitest | testing | P0 |
| playwright | Playwright | testing | P1 |
| pytest | pytest | testing | P0 |
| eslint | ESLint | linting | P1 |
| prettier | Prettier | formatting | P0 |
| ruff | Ruff | linting/formatting | P0 |
| docker | Docker | infrastructure | P1 |
| docker-compose | Docker Compose | infrastructure | P1 |
| github-actions | GitHub Actions | ci | P1 |

## P0 implementation order

Do not implement all P0 integrations simultaneously.

Recommended sequence:
1. Node + npm/pnpm
2. Next.js
3. Tailwind
4. SQLite
5. Prisma
6. Zod
7. Vitest
8. Prettier
9. React + Vite
10. Express
11. PostgreSQL
12. Python + uv/pip
13. FastAPI
14. Flask
15. Pydantic
16. SQLAlchemy
17. Alembic
18. pytest
19. Ruff

P1 follows only after the related base ecosystem is stable.
