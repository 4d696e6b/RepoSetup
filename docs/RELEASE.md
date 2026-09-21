# Release process

RepoSetup is pre-v1. Workspace packages are version `0.0.0` and `"private": true`. Do not `npm publish` until those fields change in a dedicated release.

## Before a tag

1. Golden dry-run stacks still pass (`pnpm test`).
2. `CHANGELOG.md` describes the user-visible change.
3. Integration `verifiedAt` dates are still accurate for commands that depend on upstream CLIs.
4. `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test` pass.

## Cut a tag

```bash
git tag v0.0.0
git push origin v0.0.0
```

`.github/workflows/release.yml` runs checks and `pnpm pack:packages`, then uploads `packages/*/*.tgz`. It does **not** publish to npm.

## Future public publish

When v1 is actually released:

1. Set matching semver on `packages/*/package.json`.
2. Flip `"private"` to `false` only on packages that should be public.
3. Add registry authentication in CI (do not store tokens in the repo).
4. Publish with `pnpm publish -r --access public` from a clean tag, after packing succeeds.

Until then, install from a git clone as described in `README.md`.
