# Initial Prompt to Give Cursor

Read `CURSOR_START_HERE.md`, `AGENTS.md`, all applicable `.cursor/rules/*.mdc`, and the documents under `docs/`.

Treat these files as the source of truth for RepoSetup.

Do not attempt to implement the entire product in one pass.

Start with **Phase 0 only** from `docs/IMPLEMENTATION_PLAN.md`.

Tasks:
1. inspect the repository before editing;
2. create the pnpm monorepo foundation required by Phase 0;
3. create the package directories and minimal package manifests;
4. configure TypeScript, Vitest, lint/format tooling, build scripts, and workspace scripts;
5. add a minimal CI workflow if the repo already uses GitHub;
6. do not implement real integrations yet;
7. do not build a website;
8. run install/build/test/typecheck/lint;
9. fix failures;
10. update `docs/IMPLEMENTATION_STATUS.md`;
11. summarize exactly what was created and any unresolved issue.

Stop after the Phase 0 acceptance gate passes. Do not proceed to Phase 1 until I ask.
