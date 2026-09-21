# Contributing

RepoSetup is a TypeScript pnpm monorepo. Domain logic belongs in `@reposetup/core`. Integrations generate typed operations and must not spawn processes.

## Setup

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
```

The default suite is dry-run and unit tests. To run the network-heavy Next.js execute path:

```bash
REPOSETUP_GOLDEN_EXECUTE=1 pnpm --filter @reposetup/integrations test -- src/golden-stack.execute.test.ts
```

That path is skipped on Windows and is not part of default CI.

Node.js 20+ and pnpm 12.5.1 are required (`packageManager` in the root `package.json`).

## Workflow

1. Inspect existing code and `docs/` before editing.
2. Implement one concerned change; do not mix unrelated phases.
3. Add or update tests.
4. Run targeted tests, then `pnpm typecheck`, `pnpm lint`, and `pnpm build` when packages change.
5. Update `docs/IMPLEMENTATION_STATUS.md` when a planned phase finishes.

Do not claim work is complete if tests or typecheck fail.

## Integrations

- Keep IDs stable once v1 is released. They are still experimental.
- Do not mark an integration `stable` unless it meets the Definition of Done in `docs/INTEGRATION_SYSTEM.md`.
- Do not hardcode package-manager argv inside an integration. Use adapters.
- Do not reverse `plan()` to implement `remove()`. Write an explicit recipe.
- When a flag or generator option comes from another project, verify it from current official docs. Use `docs/EXTERNAL_COMMAND_RESEARCH_TEMPLATE.md`. Do not guess.

## Safety

- Never interpolate untrusted input into a shell string.
- Prefer `spawn(command, args, { shell: false })`.
- Config files must stay declarative. No scripts, callbacks, or remote plugin URLs.
- Generate `.env.example` placeholders. Never persist real secrets.
- Do not silently overwrite user files or install system software.

## Out of scope for v1

Do not add a website, Firebase, user accounts, payments, a hosted registry, remote executable plugins, or AI-generated installation plans.

## Releases

See `docs/RELEASE.md`. Keep `CHANGELOG.md` current when behavior changes.
