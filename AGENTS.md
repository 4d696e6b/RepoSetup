# RepoSetup Agent Instructions

## Mission

Build RepoSetup as a reliable, terminal-first, open-source stack composer and installer.

Correctness, safety, reproducibility, and maintainability are more important than the number of supported integrations.

## Mandatory architecture boundaries

- TypeScript is the primary implementation language.
- Node.js is the CLI runtime.
- Use a monorepo with pnpm workspaces.
- Business/domain logic belongs in `packages/core`.
- Integration definitions belong in `packages/integrations`.
- Registry lookup/validation belongs in `packages/registry`.
- CLI parsing, prompts, rendering, and execution belong in `packages/cli`.
- Do not put installation business logic in terminal UI code.
- Do not put shell execution inside integration definitions.
- Integrations must generate typed operations.
- Only the executor may execute processes or mutate project files.
- `@reposetup/core` must not depend on Commander, Inquirer, Ink, React, Firebase, or terminal rendering.
- Do not implement a website in v1.

## Safety rules

- Never interpolate untrusted user input into shell command strings.
- Prefer `spawn(command, args, { shell: false })` or Execa argument arrays.
- Validate project names and paths.
- Never execute arbitrary commands from config/preset files.
- Config files are declarative only.
- Never request or persist real secrets in RepoSetup configuration.
- Generate `.env.example` placeholders instead.
- Support `--dry-run` before real execution.
- Fail compatibility checks before mutating the filesystem.
- Do not silently overwrite existing user files.
- Do not silently install Node, Python, Docker, databases, or other system software requiring elevated privileges.
- Detect missing prerequisites and print actionable instructions instead.

## Engineering rules

- Prefer small modules and pure functions.
- Use discriminated unions for installation operations.
- Use Zod for external/config boundaries.
- Use explicit machine-readable error codes.
- Avoid giant switch statements for integrations.
- Avoid hardcoded package-manager commands inside individual integrations.
- Keep package-manager behavior behind adapters.
- Keep runtime/platform-specific behavior behind adapters where practical.
- Keep all supported integration IDs stable once v1 is released.
- Every integration must have tests before it is considered supported.

## Workflow rules

For every implementation task:

1. inspect existing code;
2. identify the relevant requirement;
3. implement only the requested phase;
4. add/update tests;
5. run targeted tests;
6. run typecheck;
7. run lint;
8. run build when affected;
9. report failures clearly;
10. update implementation status.

Do not claim a task is complete if tests/typecheck are failing.

## Version 1 non-goals

Do not implement:
- website;
- Firebase;
- user accounts;
- payments;
- hosted cloud registry;
- remote executable plugins;
- arbitrary third-party scripts;
- AI-generated installation plans;
- package popularity/rating systems;
- mobile UI;
- organization/team features.

## Documentation behavior

Product and implementation specifications live in `docs/specification-documentation/`, grouped as `product-docs`, `implementing-docs`, `security-docs`, and `release-docs`.

When a CLI flag, package command, framework generator flag, or setup behavior depends on an external project, do not guess. Mark it as research-required until verified from current official documentation.
