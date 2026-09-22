# RepoSetup first version — 0.1.0-alpha.1

**For humans.** This is the first version of RepoSetup. It is an **alpha**. It is not `1.0.0`.

Date of this guide: 22 September 2026.

---

## What this version is

RepoSetup is a terminal program. You describe a project stack (framework, database, tools). RepoSetup turns that into a typed plan, shows it with `--dry-run`, then can create or update a project.

This first version lives in git as `0.1.0-alpha.1`. It is meant to be the first `main` snapshot of the working CLI. It is **not** a promise that every integration is production-ready, and it is **not** published to npm yet.

## What you can do

From a clone of this repository you can:

1. Preview a stack without writing files (`--dry-run`).
2. Create a project from prompts or from a JSON config.
3. Add a supported integration to an existing project.
4. Remove a small set of packages that have an explicit safe recipe.
5. Search and inspect the local catalog (`search`, `info`).
6. Detect the current stack (`stack`) and run read-only health checks (`doctor`).
7. Export a `reposetup.json` with no secrets.

There is no website, no account system, and no hosted registry in this version.

## How to run it

Requires **Node.js 20+** and **pnpm 12.5.1**. Python stacks also need **Python 3.9+** and **uv**.

Packages are not on npm yet. From this repo:

```bash
pnpm install
pnpm build
node packages/cli/dist/bin.js --help
```

The command name is `reposetup`. Version printed by `--version` is `0.1.0-alpha.1`.

Preview a Next.js example without changing anything:

```bash
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --dry-run
```

Create for real (skips the confirmation prompt):

```bash
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --yes
```

Always try `--dry-run` first on a project you care about.

After a future public npm publish (not done for this version):

```bash
npx @reposetup/cli --help
```

## Commands

```text
reposetup create
reposetup add <id>
reposetup remove <id>
reposetup search [query]
reposetup info <id>
reposetup stack
reposetup doctor
reposetup export
reposetup registry validate
```

There is no separate `import` command. Feed an exported file back in with `create --config`.

`reposetup info <id>` shows whether that integration is `experimental`, `candidate`, `stable`, or `deprecated`. In this version **none are stable**.

## Recheck (22 September 2026)

Ran on this development machine (macOS, Node 22.12.0, pnpm 12.5.1, Python 3.13.1). About 400 MiB free on the project disk. `uv` was not installed.

| Check | Result |
| --- | --- |
| `pnpm build` | pass |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test` | pass (150 + 15 + 98 + 68) |
| `pnpm registry:validate` | pass (33 integrations) |
| `reposetup --version` | `0.1.0-alpha.1` |
| `reposetup --help` | pass |
| `pnpm test:e2e` | pass (12 tests, including packed CLI install) |
| Packed tarballs | `dist/`, LICENSE, README; no tests or secrets |
| Golden A — Next.js | skipped (needs more disk or CI) |
| Golden B — React + Vite | pass |
| Golden C — Express (generation, no live Postgres) | pass |
| Golden D — FastAPI | skipped (no `uv`) |
| Golden E — Flask | skipped (no `uv`) |
| Linux / Windows GitHub Actions | workflows exist; this machine did not observe a remote run |
| npm publish | not done; owner npm/OIDC setup is still required |

Public packages are `@reposetup/core`, `@reposetup/registry`, `@reposetup/integrations`, and `@reposetup/cli`, all at `0.1.0-alpha.1`. The root workspace stays private.

## What is ready in this first version

- The CLI pipeline: validate config → resolve → plan → dry-run or execute.
- Safety rules: no shell string interpolation of untrusted input; process spawn uses `shell: false`; configs cannot carry arbitrary scripts; `.env` secrets are not exported; existing user files are not silently overwritten; RepoSetup does not silently install Node, Python, Docker, or a database server.
- Dry-run uses the real planner and does not mutate.
- Packed CLI works outside the monorepo (`--help`, `--version`, `search`, `info`, `create --dry-run`).
- Catalog of 33 integration IDs (see below). Honesty labels: 23 `candidate`, 10 `experimental`, **0 `stable`**.
- React + Vite golden create/build/test on this Mac.
- Express generation + TypeScript check (PostgreSQL is config only; no live database).

## What is not ready

Treat these as open, not as “works everywhere”:

- **Not `1.0.0`.** Do not describe this as a stable product release.
- **Not on npm.** `npx @reposetup/cli` will not work until the owner configures trusted publishing and actually publishes.
- **Next.js full execute** was not proven on this disk-constrained machine. CI (or a machine with more free space) still needs to run it.
- **FastAPI and Flask execute** were not proven here because `uv` is missing.
- **Linux and Windows** have GitHub workflow files, but this workspace has not seen those jobs pass.
- **No integration is `stable`.** `candidate` means tests exist; it does not mean every OS and every real install was proven.
- **PostgreSQL / MongoDB** only write configuration. RepoSetup does not start a database.
- **`remove`** only has safe package recipes for `zod`, `prettier`, `pydantic`, `pytest`, and `ruff`. `pip uninstall` is refused.
- **Bun** is not implemented.
- **No website.**

## Integrations in the catalog

**Candidate (23):** node, python, npm, pnpm, uv, pip, nextjs, react-vite, express, fastapi, flask, tailwind, sqlite, prisma, zod, prettier, vitest, pydantic, pytest, ruff, sqlalchemy, alembic, eslint.

**Experimental (10):** fastify, shadcn, postgresql, mongodb, drizzle, mongoose, playwright, docker, docker-compose, github-actions.

Use `reposetup info <id>` for the current label. Do not treat every ID as equally mature.

## Safety in practice

- Prefer `--dry-run`.
- Do not put real secrets in `reposetup.json`. Use `.env.example` placeholders only.
- Do not run `create --yes` against a directory you cannot afford to change until you have previewed the plan.
- Report security issues privately. See `SECURITY.md` at the repo root.

## Deployment verdict

**Ready to put on `main` as the first alpha version (`0.1.0-alpha.1`).**

**Not ready** to call `1.0.0`, to npm-publish, to tag a public GitHub Release, or to claim Next.js / FastAPI / Flask / Linux / Windows as proven on this machine.

Work still needed before a later `1.0.0`:

1. Run golden CI (or a machine with disk + `uv`) for Next.js, FastAPI, and Flask.
2. Confirm Linux, macOS, and Windows GitHub Actions results.
3. Owner sets npm trusted publishing, then publishes only if those gates pass.
4. Promote integrations to `stable` only with that evidence.

## Where to read more

| If you want… | Open |
| --- | --- |
| Install and commands | `README.md` at the repo root |
| This human folder | `docs/humanOnly/README.md` |
| Product / architecture specs | `docs/specification-documentation/product-docs/` |
| Implementation status | `docs/specification-documentation/implementing-docs/IMPLEMENTATION_STATUS.md` |
| Security rules | `docs/specification-documentation/security-docs/` and `SECURITY.md` |
| Release process | `docs/specification-documentation/release-docs/` |
| Original v1 spec PDF | `docs/humanOnly/RepoSetup_Terminal_First_v1_Implementation_Spec.pdf` |
