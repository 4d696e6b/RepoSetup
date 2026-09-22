# Release process

Target: **`0.1.0-alpha.1`**. This is not `1.0.0`.

Public packages (`@reposetup/core`, `@reposetup/registry`, `@reposetup/integrations`, `@reposetup/cli`) use that version and `publishConfig.access: public`. The root workspace stays private.

Do not publish, push release tags, or merge `main` unless every Release Qualification gate in `docs/ACCEPTANCE_TESTS.md` passes **and** the owner requests publication.

## Qualification

1. `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm registry:validate`
2. `pnpm test:e2e` (packed CLI, dry-run, failures)
3. `pnpm test:golden` on a machine/CI with disk and network (`CI=true` includes Next.js)
4. Inspect tarballs from `pnpm pack:packages`
5. Cut `release/0.1.0-alpha.1` from qualified `dev`

See `docs/RELEASE_CHECKLIST.md` and `docs/RELEASE_HARDENING.md`.

## GitHub Actions

| Workflow | Role |
| --- | --- |
| `ci.yml` | Fast PR/push checks (Ubuntu, Node 22) |
| `platform.yml` | Ubuntu / macOS / Windows, Node 22, plus Ubuntu Node 20 |
| `golden.yml` | Real golden stacks on Ubuntu (Node 22, Python 3.12, uv) |
| `release.yml` | Qualify + pack on `workflow_dispatch` or `v*` tags. Publish only if dispatch `publish=true` |

## npm trusted publishing (owner)

Packages have never been published from this workspace. First publish needs:

1. An npm user/org that will own `@reposetup/*`
2. Create empty packages or use npm's trusted publisher UI to attach this GitHub repository and the `Release` workflow
3. OIDC is already requested on the publish job (`id-token: write`)
4. Dispatch **Release** with `publish=true` only after gates pass

Do not commit npm tokens. Do not invent package ownership.

Until that bootstrap exists, stop at **READY FOR PUBLICATION**.

## Rollback

- Unpublished alpha: drop the unpushed tag; fix `dev`.
- Published alpha: ship a newer prerelease (`0.1.0-alpha.2`). Do not force-push `main`.
