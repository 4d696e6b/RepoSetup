# Phase 18 — Release Hardening

## Objective

Qualify RepoSetup as a public **prerelease**, not as `1.0.0`.

Users should be able to install a packed artifact and run the CLI outside this monorepo. Advertised golden stacks need real execution evidence. Integration maturity must stay honest.

## Release target

```text
0.1.0-alpha.1
```

## Branch strategy

| Branch | Role |
| --- | --- |
| `main` | Pre-Phase 0 baseline. Do not modify during Phase 18. |
| `dev` | Finished Phases 0–17, then Phase 18 work after merge. |
| `feat/phase-18-hardening` | Phase 18 implementation. |
| `release/0.1.0-alpha.1` | Release candidate cut from qualified `dev`. |

Do not tag, npm-publish, or merge `main` until every blocking gate passes **and** the owner requests publication.

## Release gates

See `docs/specification-documentation/implementing-docs/ACCEPTANCE_TESTS.md` (Release Qualification) and `docs/specification-documentation/release-docs/RELEASE_CHECKLIST.md`.

## Golden stacks

| ID | Stack | Live database in CI |
| --- | --- | --- |
| A | Next.js + TS + Tailwind + SQLite + Prisma + Zod + Vitest + Prettier | No (SQLite file) |
| B | React + Vite + TS + Tailwind + Zod + Vitest + Prettier | No |
| C | Express + TS + PostgreSQL **config** + Prisma + Zod + Vitest + Prettier | Generation only; no hosted Postgres |
| D | FastAPI + uv + Pydantic + SQLAlchemy + Alembic + pytest + Ruff | Prefer isolated env; Postgres not required for generation |
| E | Flask + uv + SQLAlchemy + Alembic + pytest + Ruff | Same as D |

`pnpm test:golden` runs real `create --yes` in a temp directory. `pnpm test:e2e` covers packed-CLI smoke, dry-run, and failure paths.

## Supported platforms

Advertised for this alpha:

```text
Node.js >=20 (tested locally on 22)
pnpm 12.5.1
Python >=3.9 when using Python stacks (uv)
Linux, macOS, Windows (workflow matrix; first GitHub run is pending)
```

Do not claim untested runtime minors.

## Package publishing model

**Option A — four public packages** at the same version:

```text
@reposetup/core
@reposetup/registry
@reposetup/integrations
@reposetup/cli
```

`@reposetup/cli` exposes the `reposetup` binary. Install with:

```bash
npx @reposetup/cli --help
pnpm dlx @reposetup/cli --help
```

Workspace `workspace:*` dependencies are rewritten to the published version on `pnpm publish`. Internal packages stay implementation modules; the CLI is the user-facing entry.

The root workspace remains private.

Repository / homepage / bugs URLs are omitted until the owner sets a public git remote. That is a manual publication prerequisite.

## Safety audit

Reviewed in Phase 17 (`docs/specification-documentation/security-docs/SECURITY_REVIEW.md`) and re-checked in Phase 18.4.

| Check | Result |
| --- | --- |
| `exec(` / `execSync(` / `execa` | None in packages |
| `spawn(` | `packages/core/src/executor/process.ts` only; `shell: false` |
| Config commands | Schema has no command/script fields |
| Path traversal | `isSafeProjectRelativePath` + `resolveInsideRoot` |
| Secrets in errors | COMMAND_FAILED omits stdout/stderr |
| Export | IDs and options only; no `.env` values |

## Failure tests

Covered by unit tests plus `pnpm test:e2e`: invalid config, unknown integration, unsafe name/path, missing project, dry-run non-mutation, add no-op, doctor/stack on fixtures.

## Integration maturity rules

| Status | Meaning |
| --- | --- |
| `experimental` | Implemented; not release-qualified |
| `candidate` | Commands verified and automated plan/detect/doctor tests exist; real OS/execute evidence incomplete |
| `stable` | Official command verification, metadata, plan + detect + doctor, real execute path, platform CI evidence, known failures |
| `deprecated` | Recognized, not recommended for new setups |

Do not mark `stable` without evidence. This alpha does not claim `1.0.0` stability.

## Release procedure

1. `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm registry:validate`
2. `pnpm test:e2e`
3. `pnpm test:golden` when disk/network allow
4. Inspect packed tarballs (`pnpm pack:packages`)
5. Cut `release/0.1.0-alpha.1` from `dev`
6. Owner configures npm trusted publishing (OIDC), then may publish

## Rollback procedure

- Unpublished alpha: delete the unpushed tag and fix `dev`.
- Published alpha: publish a newer prerelease; do not unpublish unless npm policy requires it.
- Do not force-push `main`.

## Known limitations

- Disk on this workspace is nearly full (~475 MiB). Next.js golden execute is skipped locally (`CI` or `REPOSETUP_GOLDEN_NEXT=1`).
- `uv` was not installed here; FastAPI/Flask goldens skip without it.
- No GitHub Actions run of the new matrix has been observed in this workspace.
- Bun is unimplemented.
- `remove` is package-only for zod, prettier, pydantic, pytest, ruff.
- PostgreSQL/MongoDB integrations do not install or start a server.
- pip uninstall is refused.
- Packages have not been published.
- No website.
