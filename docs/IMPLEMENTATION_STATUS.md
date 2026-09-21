# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 8 — Executor** (complete)

## Phase status

- [x] Phase 0 — Repository foundation
- [x] Phase 1 — Domain model and schemas
- [x] Phase 2 — Registry
- [x] Phase 3 — Resolver
- [x] Phase 4 — Planner
- [x] Phase 5 — CLI skeleton + dry-run
- [x] Phase 6 — Package-manager adapters
- [x] Phase 7 — First framework/integrations
- [x] Phase 8 — Executor
- [ ] Phase 9 — First complete golden stack
- [ ] Phase 10 — Project detection
- [ ] Phase 11 — Add
- [ ] Phase 12 — Doctor
- [ ] Phase 13 — JS ecosystem expansion
- [ ] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 8 executor lives in `@reposetup/core`. Only the executor mutates files or spawns processes. Commands use `spawn(command, args, { shell: false })`. Project-relative paths are resolved inside the workspace root. Existing files are not overwritten unless the operation says so.

Supported operations: `check_prerequisite`, `install_package`, `run_command`, `create_directory`, `create_file`, `modify_json`, `modify_text`, `add_env_example`, `show_message`, `verify`.

`install_package` expands through package-manager adapters into argv arrays. Missing `node`/`npm`/`pnpm` fail with `PREREQUISITE_MISSING` and install instructions. RepoSetup does not install system software.

`reposetup create` executes the plan after confirmation. `--yes` skips the prompt. `--dry-run` still mutates nothing.

Acceptance gate passed locally:

- Fixture tests with a fake process runner
- Controlled real test: files + local `node -e` (no network, no create-next-app)
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 8. The golden Next.js/SQLite *install* is Phase 9.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7 integrations stable. DoD-stable requires detection/verify tests in later phases.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-8-executor`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
