# Prerelease checklist

Use for every candidate, including `0.1.0-alpha.1`.

Rechecked 2026-09-22 on this development Mac unless noted.

## Quality

- [x] `pnpm install`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm registry:validate`
- [x] `pnpm test:e2e`
- [x] `pnpm test:golden` (or blocker documented)

Golden B/C passed. Next.js skipped (disk). FastAPI/Flask skipped (no `uv`).

## Artifact

- [x] Versions are `0.1.0-alpha.1` (or the intended prerelease)
- [x] Public packages are not `private: true`
- [x] `reposetup --version` matches package.json
- [x] Packed CLI works outside the monorepo
- [x] Tarball has `dist/`, types, bin; no tests or secrets

## Safety

- [x] Dry-run does not mutate
- [x] Path traversal rejected
- [x] Failure exit codes are non-zero
- [x] No secrets in export or error details

## Docs

- [x] README, SECURITY.md, CONTRIBUTING, CHANGELOG, LICENSE
- [x] Maturity labels match the registry
- [x] Release notes say this is an alpha
- [x] Human guide in `docs/humanOnly/RepoSetup_0.1.0-alpha.1.md`

## Publish (owner only)

- [ ] Remaining golden/OS evidence still open (do not treat as `1.0.0`)
- [ ] npm trusted publishing configured
- [x] No long-lived npm token in the repo
- [ ] Owner explicitly requested **npm publish** (first-version request was merge to `main` only)
