# Contributing

RepoSetup is built in the open. Contributions are welcome — especially integration improvements, platform testing, bug reports, and verified setup recipes.

## Development setup

Requires **Node.js 20+** and **pnpm 12.5.1** (`packageManager` in the root `package.json`).

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Also useful:

```bash
pnpm registry:validate
pnpm test:e2e
pnpm test:golden
```

`pnpm test` is the unit/dry-run suite. `pnpm test:e2e` packs/smokes the CLI and checks failure/dry-run behavior. `pnpm test:golden` creates real projects in `os.tmpdir()` (never against this repo). Next.js full execute is CI-oriented (`CI=true` or `REPOSETUP_GOLDEN_NEXT=1`).

## Architecture

| Package | Role |
| --- | --- |
| `@reposetup/core` | Config, resolve, plan, execute, detection, doctor |
| `@reposetup/registry` | Registry lookup and validation |
| `@reposetup/integrations` | Built-in integration definitions |
| `@reposetup/cli` | Commander CLI, prompts, rendering |

`@reposetup/core` must not depend on Commander, Inquirer, Ink, React, or Firebase. Integrations generate typed operations and must not spawn processes. Only the executor runs commands or writes files.

## Adding an integration

1. Read `docs/specification-documentation/product-docs/INTEGRATION_SYSTEM.md` and `docs/specification-documentation/product-docs/V1_INTEGRATION_REGISTRY.md`.
2. Add a definition under `packages/integrations/src/` using `defineIntegration`.
3. Generate typed `InstallationOperation`s only. Do not call `spawn` from the definition.
4. Use package-manager adapters; do not hardcode `pnpm add` argv in the integration.
5. Register the ID in `packages/integrations/src/catalog.ts`.
6. Add plan, detect, and doctor/verify tests.
7. Start as `experimental`. Do not mark `stable` without real execute + platform evidence.

### Command research

When a flag or generator option comes from another project, verify it from current official docs. Use `docs/specification-documentation/implementing-docs/EXTERNAL_COMMAND_RESEARCH_TEMPLATE.md`. Record `verification.verifiedAt` and `documentationUrl`. Do not guess replacements.

## Definition of done

- Tests, typecheck, and lint pass
- Registry validation passes when the catalog changes
- Errors use explicit machine-readable codes
- `--dry-run` still uses the real planner
- No secrets in fixtures or logs

## Pull requests

- Prefer one concerned change; do not mix unrelated work
- Update `docs/specification-documentation/implementing-docs/IMPLEMENTATION_STATUS.md` when a planned phase finishes
- Keep `CHANGELOG.md` current for user-visible behavior
- Target **`dev`** for feature work. `main` is the public release branch.

## Security restrictions

See `docs/specification-documentation/security-docs/SECURITY_AND_SAFETY.md` and `SECURITY.md`.

- Never interpolate untrusted input into a shell string
- Prefer `spawn(command, args, { shell: false })`
- Config files stay declarative
- Generate `.env.example` placeholders only
- Do not silently overwrite user files or install system software
- Do not add a website, Firebase, accounts, hosted registry, remote executable plugins, or AI-generated plans in v1

## Releases

See `docs/specification-documentation/release-docs/RELEASE.md` and `docs/specification-documentation/release-docs/RELEASE_HARDENING.md`.
