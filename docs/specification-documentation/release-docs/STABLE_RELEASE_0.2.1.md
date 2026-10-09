# Stable 0.2.1 release and delivery record

Historical 0.2.1 delivery evidence. Version/latest observations below describe its
publication checkpoint. The current release is [0.2.3](./STABLE_RELEASE_0.2.3.md).

Status — 2026-10-08: **published and delivery accepted**. npm `latest` is
`rsetup@0.2.1`; the GitHub release is [v0.2.1](https://github.com/4d696e6b/RepoSetup/releases/tag/v0.2.1).
The owner explicitly authorized publication on October 8. Qualified source
`c61b88a88e18ef5d9c92291131f3c938fc0b521a` remains on `codex/release-0.2.1`
and immutable tag `v0.2.1`. Documentation closeout uses
`codex/release-0.2.1-evidence`; it does not change the published bytes.
Published `v0.2.0` and its evidence remain immutable.

## Final source, artifact and delivery evidence

- Three full first-attempt qualifications passed all 16 required jobs and steps each: [37721829998](https://github.com/4d696e6b/RepoSetup/actions/runs/37721829998), [37721833738](https://github.com/4d696e6b/RepoSetup/actions/runs/37721833738), [37721836811](https://github.com/4d696e6b/RepoSetup/actions/runs/37721836811). Actual API responses also pass the committed qualification validator.
- Final immutable artifact ID `11528501250` contains `rsetup-0.2.1.tgz`, **108421 bytes**, SHA-256 `ea15d8bdcdf029833301d14196715259a755112f6392d88c8d5f5e37e90348b9`. The downloaded registry tarball matches these bytes; registry integrity is `sha512-uI34mLBGsXSitbVYiXo6Cm8jW3708JH9FFASFsZNsNqYrCfcQxtmEDJDvuyGKpbS/38NLuw1YviH8P0Sy11gcQ==`.
- The [expanded golden matrix](https://github.com/4d696e6b/RepoSetup/actions/runs/37721839706) passed all twelve jobs, 34 cases each: **408 passing executions and no skipped golden cases**. All twelve JSON files parse and identify this source and full scope; all twelve retained logs confirm the case counts.
- [Preset sessions](https://github.com/4d696e6b/RepoSetup/actions/runs/37721843189) passed all fifteen sessions and 117 checks, including three expected occupied-port refusals. [Controlled benchmarks](https://github.com/4d696e6b/RepoSetup/actions/runs/37721846284), [fast CI](https://github.com/4d696e6b/RepoSetup/actions/runs/37721828876) and [platform checks](https://github.com/4d696e6b/RepoSetup/actions/runs/37721828880) passed on the same source.
- [Tag-bound dry-run](https://github.com/4d696e6b/RepoSetup/actions/runs/37727544749) passed. [Publication and registry acceptance](https://github.com/4d696e6b/RepoSetup/actions/runs/37727624068) passed on its first attempt, including fresh installs, both aliases, help/version, dry-run, real Express build and HTTP-response test on Ubuntu, macOS and Windows. npm version and `latest` both identify 0.2.1 with the qualified integrity.
- [Signed provenance](https://search.sigstore.dev/?logIndex=3140942397) identifies this exact source, `refs/tags/v0.2.1`, publishing workflow and invocation. Its subject digest matches the tarball. A fresh isolated `npm audit signatures` verified all 27 registry package signatures and 20 package attestations. [Official verification command](https://docs.npmjs.com/verifying-registry-signatures/).

The [machine-readable record](./qualification/0.2.1.json) records these results.
Downloaded candidate, license, qualification-response, benchmark, preset,
golden-log and attestation evidence is retained locally at
`/tmp/reposetup-0.2.1-release`; Actions artifacts are subject to retention.

## Scope

Ship the create-regression fixes recorded in [the stability plan](../implementing-docs/STABILITY_0.2.x.md)
and [changelog](../../../CHANGELOG.md). The product changes already passed twelve full
matrix jobs (408 executions) and fifteen packaged preset sessions (117 checks) on
`448beb4`; that earlier artifact/version does not qualify publication of 0.2.1.

All four workspace manifests identify 0.2.1; only the bundled `rsetup` CLI is public.
Node 24+ remains required; Python coverage is 3.12/3.13. Catalog maturity is unchanged.

## Exact-source gates and publication

- [x] Merge tested regression fixes through [PR #10](https://github.com/4d696e6b/RepoSetup/pull/10).
- [x] Owner authorizes publishing a new 0.2.1 patch and updating current documentation.
- [x] Update manifests, package README, changelog and tag/version checks to 0.2.1.
- [x] Local 959 unit tests, 20 targeted release-gate tests, typecheck, lint, build and 37 registry definitions pass. Packed E2E passes all 38 tests with writable uv cache, including local 0.2.1 delivery acceptance.
- [x] Three consecutive first-attempt `release.yml` runs pass on the same source, including every required platform, recipe, fault, pack and artifact-acceptance job and step.
- [x] Expanded npm/pnpm golden matrix, all preset sessions and controlled benchmarks pass on that source.
- [x] Back up the final identified artifact; record exact source, immutable artifact ID, SHA-256, size and license report.
- [x] Publication dry-run passes from `v0.2.1` at the qualified source.
- [x] Publish the same qualified tarball with OIDC and `latest`; verify registry integrity and signed provenance.
- [x] Fresh install-from-registry acceptance passes on Ubuntu 24.04, macOS 15 and Windows Server 2025.
- [x] Publish GitHub release notes and update current status/documentation with final evidence.

For future patches, select the candidate SHA only after local validation. Keep that branch unchanged
while its three qualifications run. Required steps must not skip or ignore errors.
Once qualified, merge the release preparation, create a new annotated `v0.2.1` tag
at the exact candidate SHA, and dispatch `publish-npm.yml` against that tag with
the three ordered qualification run IDs. Use `publish: false` first, then `true`.
The publisher verifies identity and downloads the final retained tarball without
rebuilding. An existing npm version is accepted only if its integrity matches.
No additional calendar soak is required. Never move published tags or replace bytes.

## Local attempts and environment handling

The first concurrent typecheck/build attempt saw declarations being cleaned by
the build; sequential typecheck after the successful build passed. This was a
local check-order error, not a product change. The first uv-enabled E2E attempt
failed because this host's default uv cache is unwritable. The rerun uses an
explicit task-owned `UV_CACHE_DIR`; retain the failed attempt in this record.
CI provisions its own writable toolchain/cache. Do not count those attempts as passes. A local Python urllib pre-publication lookup also failed this host's certificate trust; the Node-based registry check succeeded with TLS verification retained.

## Security and support limitations

The [bounded patch security review](../security-docs/SECURITY_REVIEW_0.2.1.md)
records zero production audit findings and the separate generated-tool advisory.


The release review retains generated development-tool advisory
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): braces through
3.0.3 has recursive-pattern denial-of-service exposure and no published patch as
of October 8. The known occurrence is generated development tooling, not a claim
of a fixed upstream library. Do not process untrusted patterns or describe stacks
as audit-clean. This patch updates Next.js to its qualified 16.3.6 security fix;
it does not hide the separate advisory or force an unqualified transitive override.

Native Windows 11, Linux arm64, live PostgreSQL/MongoDB/container connections,
SQLAlchemy DBAPI connectivity and actual Playwright browser journeys remain
unqualified. Compilation/config generation does not establish live connectivity.
The patch guarantees the recorded recipes and CI targets, not all permutations.

## Installation after publication

```sh
npx rsetup@0.2.1 --help
npm install -g rsetup@0.2.1
rsetup --version
```

Once `latest` is verified as 0.2.1, `npx rsetup` and `npm install -g rsetup` select it.
Existing projects should preserve lockfiles and preview changes using `--dry-run`.
Historical 0.2.0 release evidence stays in [its record](./STABLE_QUALIFICATION_0.2.0.md).
