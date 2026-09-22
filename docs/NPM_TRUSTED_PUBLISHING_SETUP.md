# npm trusted publishing setup

This is a **manual npmjs.com** step. RepoSetup cannot complete it from the repository.

Official docs: [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/).

Requirements verified from that page:

- npm CLI **>= 11.5.1**
- Node.js **>= 22.14.0**
- GitHub-hosted runners (self-hosted is not supported)
- workflow permission `id-token: write`
- provenance is generated automatically for public packages from public GitHub repositories; do not disable it

## Package

| Field | Value |
| --- | --- |
| Public package name | `rsetup` |
| First version | `0.1.0` |
| GitHub repository | `https://github.com/4d696e6b/RepoSetup` |
| Workflow file | `publish-npm.yml` (filename only; must include `.yml`) |
| GitHub owner | `4d696e6b` |
| GitHub repository name | `RepoSetup` |
| GitHub environment | none (leave empty unless you add a protected environment later) |

The npm **username** is whatever account owns `rsetup` after the first publish. Do not assume it equals the GitHub login (`4d696e6b`).

## First publish (bootstrap)

Trusted publishing can only be attached to a package that already exists. The first `0.1.0` publish must be an authenticated maintainer publish:

```bash
npm login
cd packages/cli
npm publish --access public
```

Use the account's 2FA / OTP / granular-token flow. Do not disable 2FA. Do not commit tokens, passwords, or OTP codes.

## After `rsetup` exists on npm

1. Open `https://www.npmjs.com/package/rsetup`.
2. Package **Settings** → **Trusted Publisher**.
3. Choose **GitHub Actions**.
4. Fill in exactly:

```text
Organization or user: 4d696e6b
Repository: RepoSetup
Workflow filename: publish-npm.yml
Environment name: (leave empty)
```

5. Allow **`npm publish`** (not stage-only) for this project's tag-triggered workflow.
6. Save. npm does **not** validate the fields until the next publish.

Optional later hardening (after a successful Actions publish):

- Package Settings → Publishing access → require 2FA and disallow tokens.
- Revoke unused automation tokens.

## Future releases

1. Develop on `dev`.
2. Qualify (`pnpm lint`, `typecheck`, `test`, `build`, `registry:validate`, `test:e2e`, golden when practical).
3. Bump the public CLI version in `packages/cli/package.json` (keep workspace library versions in lockstep when they change).
4. Merge the release to `main`.
5. Create annotated tag `vX.Y.Z` on that commit (do not move an existing tag).
6. Push the tag.
7. `.github/workflows/publish-npm.yml` runs quality gates, then publishes with OIDC.
8. Confirm `npm view rsetup@version version`.
9. Publish or update the GitHub Release for the same tag.

The workflow skips `npm publish` when that exact version already exists. npm versions are immutable; never force-overwrite.

Pull requests do not get `id-token: write` publish jobs.
