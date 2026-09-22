# Release process

Target: **`0.1.0`**. This is not `1.0.0`.

The public npm package is **`reposetup`** (Model A: one bundled CLI). Workspace libraries stay private. The root workspace is `@reposetup/workspace`.

Do not npm-publish unless qualification passes **and** the maintainer is authenticated to npm. Do not move GitHub tag `v0.1.0`.

On 2026-09-22 the owner requested a public GitHub launch of **`0.1.0`**, then a complete npm deployment of the same version. Next.js execute, FastAPI/Flask (`uv`), and observed Linux/Windows CI may still be open locally.

## Qualification

1. `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm registry:validate`
2. `pnpm test:e2e` (packed CLI, dry-run, failures)
3. `pnpm test:golden` on a machine/CI with disk and network (`CI=true` includes Next.js)
4. Inspect `packages/cli/reposetup-0.1.0.tgz` from `pnpm pack:packages`
5. Install that tarball in a directory outside the monorepo and run `--version` / `--help` / `search` / `info` / `create --dry-run`

See `docs/specification-documentation/release-docs/RELEASE_CHECKLIST.md` and `docs/specification-documentation/release-docs/RELEASE_HARDENING.md`.

## GitHub Actions

| Workflow | Role |
| --- | --- |
| `ci.yml` | Fast PR/push checks (Ubuntu, Node 22) |
| `platform.yml` | Ubuntu / macOS / Windows, Node 22, plus Ubuntu Node 20 |
| `golden.yml` | Real golden stacks on Ubuntu (Node 22, Python 3.12, uv) |
| `release.yml` | Qualify + pack on `workflow_dispatch` or `v*` tags (does not publish) |
| `publish-npm.yml` | Tag-only publish of `reposetup` via npm trusted publishing (OIDC) |

Pull requests cannot publish. `publish-npm.yml` is not used for the first bootstrap publish (the package must exist before a trusted publisher can be attached).

## npm trusted publishing (owner)

See `docs/NPM_TRUSTED_PUBLISHING_SETUP.md`.

First publish needs:

1. An npm user that will own unscoped `reposetup`
2. Interactive `npm login` (2FA/OTP as required)
3. `npm publish --access public` from `packages/cli` after gates pass
4. Then attach this GitHub repository and workflow filename `publish-npm.yml` on npmjs.com

Do not commit npm tokens. Do not invent package ownership.

Until `npm whoami` succeeds, stop at **READY FOR NPM AUTHENTICATION**.

## Next-release workflow

1. Develop on `dev`
2. Qualify the release
3. Bump `packages/cli` version (and lockstep workspace versions when they change)
4. Merge to `main`
5. Create annotated tag `vX.Y.Z` (never move an existing tag)
6. Push the tag
7. GitHub Actions validates
8. Trusted publishing sends `reposetup` to npm (after npmjs.com is configured)
9. Verify `npm view reposetup@version version`
10. Publish or update the GitHub Release

## Rollback

- Unpublished GitHub tag: delete the unpushed tag; fix `main`/`dev`.
- After GitHub Release or npm version exists: ship a newer patch (`0.1.1`) rather than rewriting `v0.1.0` or unpublishing.
- Do not force-push `main`.
