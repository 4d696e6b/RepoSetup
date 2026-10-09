# Release checklists

## Current 0.2.3 patch — 2026-10-09

The owner authorized publication after health checks. Preparation merged through
[PR #18](https://github.com/4d696e6b/RepoSetup/pull/18). Candidate branch
`codex/release-0.2.3` remains frozen at
`a213a6a1edf63771aba8d5b91bfdcf44d665de22`; publication is pending.
See [the release record](./STABLE_RELEASE_0.2.3.md).

- [x] Merge installed-stack repair PR #17; its automated audit passes.
- [x] Prepare 0.2.3 manifests, publication checks and current guides.
- [x] Local version-bound tests, typecheck after build, lint, build and 37 registry definitions pass; 1,043 unit and 38 packed E2E tests pass.
- [x] Isolated macOS database acceptance passes five retained-helper cases. [Linux Docker/Compose acceptance](https://github.com/4d696e6b/RepoSetup/actions/runs/37813979567) passes two fresh CLI service tests/seven checks with no failures/skips and owned-service cleanup verified. PostgreSQL 18.6 covers generated Prisma/Drizzle/FastAPI-uv SQLAlchemy and restart/recreation persistence; MongoDB 8.0.32 covers authenticated generated Mongoose CRUD. This is bounded service evidence, not every recipe/platform or a maturity promotion.
- [x] [Preset usability](https://github.com/4d696e6b/RepoSetup/actions/runs/37813953485) passes fifteen sessions/117 checks, with eight expected negative exits and no unexpected failures.
- [x] [Controlled benchmarks](https://github.com/4d696e6b/RepoSetup/actions/runs/37814000719) pass 120 command trials on three platforms, comparing separate and consolidated installation strategies; no universal or patch-to-patch speed claim.
- [ ] Three full first-attempt exact-source release runs pass all required jobs and steps.
- [ ] Candidate full twelve-job matrix passes. [Attempt 1](https://github.com/4d696e6b/RepoSetup/actions/runs/37813953547) completes eleven jobs/440 passing cases; Windows/Python 3.12/npm records a partial Next.js/SQLite recipe failure before its 90-minute job budget and cancellation. Attempt 2 retries only the unsuccessful job on unchanged source; partial results do not qualify it.
- [ ] Record final immutable artifact, bytes, hash, source and license review.
- [ ] New immutable v0.2.3 tag identifies the qualified source.
- [ ] Tag-bound publication dry-run passes.
- [ ] Publish the qualified artifact with OIDC; verify integrity and provenance.
- [ ] Fresh registry acceptance passes on Linux/macOS/Windows.
- [ ] Publish GitHub release and close current documentation/status.

The initial release sequence has one successful run
[37813984536](https://github.com/4d696e6b/RepoSetup/actions/runs/37813984536), one
Windows recipe failure after a libuv crash (39/40 cases pass) in
[37813990336](https://github.com/4d696e6b/RepoSetup/actions/runs/37813990336), and a
macOS runner communication failure in
[37813995872](https://github.com/4d696e6b/RepoSetup/actions/runs/37813995872). It does
not satisfy the consecutive-run gate. Fresh first-attempt runs
[37863956517](https://github.com/4d696e6b/RepoSetup/actions/runs/37863956517),
[37863959982](https://github.com/4d696e6b/RepoSetup/actions/runs/37863959982) and
[37863963775](https://github.com/4d696e6b/RepoSetup/actions/runs/37863963775) are
queued/running on unchanged source; initial failures remain retained.

## Historical 0.2.2 patch — 2026-10-08

See [the release record](./STABLE_RELEASE_0.2.2.md) for exact source, artifact,
completed qualification, signed publication and three-platform delivery evidence.
The owner authorized publication; npm latest and the GitHub release are 0.2.2.

- [x] Merge dependency-health repair PR #13; its 408-case matrix passes.
- [x] Prepare 0.2.2 manifests, publication checks and current guides.
- [x] Local 977 unit tests, 38 packed E2E tests, typecheck, lint, build and 37 registry definitions pass.
- [x] Three full first-attempt exact-source release runs pass all required steps.
- [x] Full golden matrix, preset sessions and controlled benchmarks pass on the candidate; the original Windows install timeout and successful same-source retry are retained in the release record.
- [x] Record final immutable artifact, bytes, hash, source and license review.
- [x] Tag-bound publication dry-run passes.
- [x] Publish the qualified artifact with OIDC; verify integrity and provenance.
- [x] Fresh registry acceptance passes on Linux/macOS/Windows.
- [x] Publish GitHub release and close current documentation/status.

## Historical 0.2.1 patch — 2026-10-08

The patch repairs published create regressions. Qualification links, source
revisions and exclusions are in the [stability plan](../implementing-docs/STABILITY_0.2.x.md)
and [acceptance checklist](../implementing-docs/ACCEPTANCE_TESTS.md).

- [x] Confirmed create defects have regression fixes and tests on `codex/fix-create-project-paths`.
- [x] Unit tests, typecheck, lint, build and registry validation pass.
- [x] Packed CLI E2E passes with the external artifact skip disclosed.
- [x] Full twelve-job / 408-execution matrix passes on product source `448beb4`.
- [x] All fifteen packaged preset sessions pass.
- [x] Platform CI, controlled installation benchmarks and corrected JSON evidence writers pass.
- [x] Source revisions, failed attempts and manual/service limitations are documented.
- [x] Existing npm trusted publisher was configured and validated by the 0.2.0 release; this does not qualify or publish the patch.
- [x] Owner authorizes the release; the [bounded patch security review](../security-docs/SECURITY_REVIEW_0.2.1.md) records production audit results and the unresolved generated-tool advisory.
- [x] Patch manifests and active publication checks target 0.2.1; exact-source qualification remains required.
- [x] Owner requests 0.2.1 publication on October 8; [release progress](./STABLE_RELEASE_0.2.1.md) retains the remaining gates.
- [x] Final 0.2.1 source/artifact passes all required exact-source gates.
- [x] New immutable v0.2.1 and npm 0.2.1 are published with matching provenance, registry integrity and latest.
- [x] Fresh install-from-registry acceptance passes on Ubuntu/macOS/Windows; [final evidence](./STABLE_RELEASE_0.2.1.md).

Native/live-service/browser gaps remain documented in the stability plan;
no additional seven-day freeze is required by that plan.

## Historical 0.1.x record

This file preserves the 0.1.x release record. It is not a current qualification checklist for 0.2.0. See [Phase 19 baseline and acceptance scope](../implementing-docs/PHASE_19_BASELINE.md) and the 0.2.0 roadmap for current gates.

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
- [x] Public CLI package is `rsetup`; workspace libraries are private
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
