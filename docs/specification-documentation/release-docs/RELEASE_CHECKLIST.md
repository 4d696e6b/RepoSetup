# Prerelease checklist

Use for every candidate, including `0.1.0-alpha.1`.

## Quality

- [ ] `pnpm install`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm registry:validate`
- [ ] `pnpm test:e2e`
- [ ] `pnpm test:golden` (or blocker documented)

## Artifact

- [ ] Versions are `0.1.0-alpha.1` (or the intended prerelease)
- [ ] Public packages are not `private: true`
- [ ] `reposetup --version` matches package.json
- [ ] Packed CLI works outside the monorepo
- [ ] Tarball has `dist/`, types, bin; no tests or secrets

## Safety

- [ ] Dry-run does not mutate
- [ ] Path traversal rejected
- [ ] Failure exit codes are non-zero
- [ ] No secrets in export or error details

## Docs

- [ ] README, SECURITY.md, CONTRIBUTING, CHANGELOG, LICENSE
- [ ] Maturity labels match the registry
- [ ] Release notes say this is an alpha

## Publish (owner only)

- [ ] `main` still untouched until gates pass
- [ ] npm trusted publishing configured
- [ ] No long-lived npm token in the repo
- [ ] Owner explicitly requested publish
