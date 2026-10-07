# Stable 0.2.0 delivery runbook

Status: implementation prepared; stable cross-platform evidence, soak, owner authorization, publication, and registry acceptance are still required. The alpha soak completed on October 7, 2026 for `145e167e6b60897da96942545ba6dbd40359ad4a`, whose tarball reports `0.2.0-alpha.1`. It is not the stable artifact.

## Freeze and qualify

1. Freeze `codex/phase-28-stable-release` after the stable manifest, release tooling, tests, and documentation pass. Retain its exact Git SHA. Keep subsequent progress records outside this frozen candidate branch.
2. Manually dispatch `release.yml` three times from that same frozen source. Each run must pass every platform, recipe, failure-path, pack, and packed-artifact acceptance job with no skipped required step. Keep all evidence and any failed/outage runs visible. A failure requires investigation, not selective omission from the three consecutive passes.
3. Preserve the final run's `candidate-artifact` archive, especially `candidate-artifact.json`, the `.tgz`, and dependency-license report. Record source SHA, tarball SHA-256, byte count, and all three run URLs. Download an additional evidence backup before Actions retention expires; never reconstruct an expired artifact and treat it as qualified.
4. Monitor the unchanged source for seven calendar days after the latest required job completes. A product/source change requires fresh qualification. Do not transfer the alpha's elapsed time to the newly versioned artifact.
5. Recheck open P0/P1, security, data-loss, and guaranteed-recipe failures. The automated gate checks CI/source/time evidence; the owner still reviews defect reports, security and benchmark records, usability evidence, and documented limitations.

## Owner release decision

Present the source SHA, three passing run URLs, soak deadline, exact artifact hash, support matrix, license/security/benchmark evidence, and known limitations for review. Obtain explicit authorization to create `v0.2.0` and publish `rsetup@0.2.0` to npm's `latest` dist-tag. Preparing this branch is not publication authorization.

Confirm the existing npm trusted publisher permits `npm publish` for owner `4d696e6b`, repository `RepoSetup`, workflow `publish-npm.yml`. Do not request or store a token in RepoSetup configuration. Trusted publishing requires npm 11.5.1+ and Node 22.14+; this workflow uses Node 24 and upgrades npm to a compatible 11.x version. Trusted publishers can have staging-only permissions; the owner must verify direct publish is allowed. [npm trusted publisher documentation](https://docs.npmjs.com/trusted-publishers/)

Only after approval, create the tag at the exact frozen candidate SHA. If `v0.2.0` already exists, inspect it and stop on any mismatch; never move or replace an existing release tag.

## Publication

The `publish-npm.yml` manual workflow must already exist on the default branch, and the selected tag must contain this updated workflow. GitHub supports dispatching a manual workflow against a branch or tag. [GitHub manual workflow documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)

Select the existing `v0.2.0` tag and provide the three qualification run IDs as a comma-separated list, oldest first. Leave `publish` false for a dry-run. After review and explicit authorization, dispatch it with `publish` true. Inputs are validated and passed through environment variables, never interpolated into shell commands.

The workflow checks the repository, tag/version/source, unchanged candidate branch, latest three successful first-attempt full runs, required jobs and steps, completed soak, and retained artifact. It downloads the immutable artifact ID from the final qualifying run using Actions read permission. It verifies size, source SHA, SHA-256, version and both launchers, then publishes that same tarball. There is no build or pack step in publication. [Official download-artifact inputs](https://github.com/actions/download-artifact/tree/v4)

Only an HTTP 404 means the version does not exist. Authentication, rate-limit and registry errors fail closed. If the version already exists, a retry succeeds only when registry integrity matches the qualified bytes. The three delivery jobs subsequently require `latest` to identify those same bytes. Trusted publishing automatically supplies provenance; retain the publishing run and verify its source/provenance links. [npm provenance documentation](https://docs.npmjs.com/generating-provenance-statements/)

## Delivery acceptance

Publication triggers Ubuntu 24.04, macOS 15, and Windows 2025 delivery jobs. Each checks the registry version/integrity and `latest`, installs `rsetup@0.2.0` into an isolated temporary directory, launches `rsetup` and `reposetup`, exercises a dry-run in an empty project, and creates a real TypeScript Express/Vitest project that builds and passes its HTTP-response test. No workspace library is used by that installed CLI.

Phase 28 becomes complete only when publication/provenance and all three delivery jobs pass, upgrade notes match delivered behavior, and the final evidence is linked. A successful publish followed by failed delivery is an incomplete release, not permission to overwrite the published package.

## Upgrade and support notes

Once released, use `npm install -g rsetup@0.2.0` or `npx rsetup@0.2.0 --help`. Both global aliases are available. Node.js 24+ is required; Node 20/22 support from older records is not promised. Python recipes require Python 3.12+ and uv; qualification covers CPython 3.12/3.13 with uv 0.12.17. Keep lockfiles and preview operations with `--dry-run` before modifying existing projects.

The guaranteed recipe matrix and integration maturity are listed in [Integration support](../implementing-docs/INTEGRATION_SUPPORT.md). Experimental integrations are outside that guarantee. Database configuration generation does not install or provision a database. Playwright browser/system-library installation remains an explicit user step. RepoSetup does not install system runtimes, persist real secrets, or silently overwrite existing user files.

## Recovery

Preserve the publishing/acceptance logs, candidate artifact and integrity, affected runtime/platform, diagnostic report with secrets redacted, and minimal reproduction. Reproduce the failure on a separate fix branch. Do not unpublish, replace package bytes, or move the release tag. Ship a separately versioned patch through its qualification and owner approval. Any change to dist-tags is a separate authorized release action; never automatically point `latest` at an unqualified build. If registry visibility or delivery fails after publishing, inspect the existing version and hash before retrying.
