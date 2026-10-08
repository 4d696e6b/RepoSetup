# npm trusted publishing setup

Status — 2026-10-08: the owner configured and authorized the `rsetup` GitHub
trusted publisher, and the 0.2.0 publish validated it. See
[stable qualification](./specification-documentation/release-docs/STABLE_QUALIFICATION_0.2.0.md).
The 0.2.1 and 0.2.2 publishes also succeeded through that approved publisher. No bootstrap/login setup is outstanding for current delivery.

Changing publisher settings is a **manual npmjs.com** step; it is not performed
by editing the repository. The setup instructions below remain a reference.

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

5. Allow **`npm publish`** (not stage-only) for this project's manually dispatched workflow at its qualified tag.
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
6. Push the tag. A tag push does not itself trigger the current publication workflow.
7. Manually dispatch `publish-npm.yml` at the qualified tag with the three exact-source qualification run IDs. First use `publish: false`; after review use `publish: true`. It downloads and verifies the retained qualified tarball and publishes those same bytes with OIDC, without rebuilding.
8. Confirm registry version, integrity, provenance and dist-tag, then complete fresh delivery acceptance.
9. Publish or update the GitHub Release for the same immutable tag.

The current workflow and validation scripts target 0.2.3. Qualify its exact
source/artifact before publication; the previous create-regression matrix alone
is not publication qualification.
See [the patch release record](./specification-documentation/release-docs/STABLE_RELEASE_0.2.3.md).
An existing version is accepted only if its integrity matches the qualified
artifact. npm versions are immutable; never force-overwrite.

Pull requests do not get `id-token: write` publish jobs.
