# Release checklist

Use for `0.1.0` GitHub source + npm CLI packaging.

## Quality

- [x] `pnpm install` (workspace already installed)
- [x] `pnpm lint` (re-run at launch)
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm registry:validate`
- [x] `pnpm test:e2e`
- [x] `pnpm test:golden` (or blocker documented)

## Artifact

- [x] Versions are `0.1.0`
- [x] Public CLI package is `reposetup`; workspace libraries are private
- [x] `reposetup --version` matches package.json (`0.1.0`)
- [x] Packed CLI works outside the monorepo (`pnpm test:e2e`)
- [x] Tarball layout: `dist/`, types, bin; no tests or secrets (covered by e2e pack test)

## Safety

- [x] Dry-run does not mutate
- [x] Path traversal rejected
- [x] Failure exit codes are non-zero
- [x] No secrets in export or error details

## Docs

- [x] README, SECURITY.md, CONTRIBUTING, CHANGELOG, LICENSE
- [x] Maturity labels match the registry
- [x] Release notes say this is early-stage `0.1.0`, not `1.0.0`
- [x] Human guide in `docs/humanOnly/RepoSetup_0.1.0.md`

## Publish (owner only)

- [x] No long-lived npm token in the repo
- [x] Publish workflow prepared (`.github/workflows/publish-npm.yml`)
- [ ] npm trusted publishing configured on npmjs.com (after first publish)
- [ ] Maintainer `npm login` + first `npm publish`
