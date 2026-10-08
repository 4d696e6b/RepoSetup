# Release checklists

## Current 0.2.1 patch — 2026-10-08

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
- [ ] Final release source/artifact passes its required publication gates.
- [ ] New immutable tag/version is published with matching provenance and registry integrity.
- [ ] Fresh install-from-registry acceptance passes for the patch on all release targets.

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
