# Release process

Target: **`0.1.0`** public GitHub launch. This is not `1.0.0` and is not an npm publish.

Public packages (`@reposetup/core`, `@reposetup/registry`, `@reposetup/integrations`, `@reposetup/cli`) use `0.1.0` and `publishConfig.access: public`. The root workspace stays private.

Do not npm-publish unless the owner requests publication after qualification. GitHub source + `v0.1.0` tag is a separate launch step.

On 2026-09-22 the owner requested a public GitHub launch of **`0.1.0`**. Next.js execute, FastAPI/Flask (`uv`), and observed Linux/Windows CI may still be open locally; GitHub Actions is expected to close OS/golden evidence after the first remote run.

## Qualification

1. `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm registry:validate`
2. `pnpm test:e2e` (packed CLI, dry-run, failures)
3. `pnpm test:golden` on a machine/CI with disk and network (`CI=true` includes Next.js)
4. Inspect tarballs from `pnpm pack:packages`
5. Tag `v0.1.0` on `main` after quality checks (GitHub source launch)

See `docs/specification-documentation/release-docs/RELEASE_CHECKLIST.md` and `docs/specification-documentation/release-docs/RELEASE_HARDENING.md`.

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

- Unpublished GitHub tag: delete the unpushed tag; fix `main`/`dev`.
- After GitHub Release exists: ship a newer patch (`0.1.1`) rather than rewriting `v0.1.0`.
- Do not force-push `main`.
