# Implementation Status

Cursor/maintainers should update this file as phases are completed.

## Current phase

**Phase 14 — Python ecosystem** (complete)

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
- [x] Phase 9 — First complete golden stack
- [x] Phase 10 — Project detection
- [x] Phase 11 — Add
- [x] Phase 12 — Doctor
- [x] Phase 13 — JS ecosystem expansion
- [x] Phase 14 — Python ecosystem
- [ ] Phase 15 — Export/config stability
- [ ] Phase 16 — Safe remove support
- [ ] Phase 17 — v1 hardening

## Last completed work

Phase 14 adds experimental Python-ecosystem integrations with plan, detect, and verify coverage. RepoSetup still does not install Python, uv, Docker, PostgreSQL, or a PostgreSQL DBAPI.

New IDs: `python`, `uv`, `pip`, `fastapi`, `flask`, `pydantic`, `sqlalchemy`, `alembic`, `pytest`, `ruff`. PostgreSQL, Docker, and Docker Compose now support Python as well as Node.js. FastAPI uses official `uv init --bare` then `uv add "fastapi[standard]"` with first-steps `main.py`. Flask uses official `Flask` plus `app.py` so `flask run` works without `--app`. PATH doctor checks python, uv, and pip. `pydantic`, `pytest`, and `ruff` are addable.

Example dry-run configs: `examples/reposetup.fastapi.json`, `examples/reposetup.flask.json`.

Acceptance gate passed locally:

- Built-in registry validates with 33 integrations
- FastAPI and Flask golden dry-run plans are valid
- Next.js/SQLite and JS ecosystem dry-runs are unchanged
- Conflicts reject FastAPI + Flask
- Doctor still does not mutate fixtures
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

## Known blockers

None for Phase 14. Integrations remain experimental. `export` and `remove` still need later phases. RepoSetup will not silently install Python, uv, Docker, or PostgreSQL. `uv add` may create `.venv`; pip paths require an already-activated environment.

## Notes

Do not mark a phase complete unless its acceptance gate in `docs/IMPLEMENTATION_PLAN.md` passes.

Do not mark Phase 7, Phase 13, or Phase 14 integrations stable. DoD-stable requires detection/verify tests in later phases plus a tested compatible execute path.

`.cursor/rules/` is listed in `PACK_MANIFEST.json` but is not present in this repository.

Work is on `feat/phase-14-python`, extracted from `dev`. `main` remains the pre-Phase 0 baseline.
