# Stable 0.2.0 delivery runbook

Historical 0.2.0 evidence. The current patch is [0.2.1](./STABLE_RELEASE_0.2.1.md);
its publication and delivery are recorded separately.

Status: `rsetup@0.2.0` was published from qualified tag source `04228d5206617355b609f640267c73669880e060`, and install-from-registry acceptance passed on Ubuntu, macOS, and Windows in [run 37659541713](https://github.com/4d696e6b/RepoSetup/actions/runs/37659541713). The alpha soak completed on October 7, 2026 for `145e167e6b60897da96942545ba6dbd40359ad4a`, whose tarball reports `0.2.0-alpha.1`. On October 7 the owner removed the additional seven-day stable soak requirement.

## Freeze and qualify

1. Select a stable source on `codex/phase-28-stable-release` after the manifest, release tooling, tests, and documentation pass. Retain its exact Git SHA. Any later source change requires new exact-source qualification; the three selected runs and publication must use the same SHA.
2. Manually dispatch `release.yml` three times from that same source. Each run must pass every platform, recipe, failure-path, pack, and packed-artifact acceptance job with no skipped required step. Keep all evidence and any failed/outage runs visible. A failure requires investigation, not selective omission from the three consecutive passes.
3. Preserve the final run's `candidate-artifact` archive, especially `candidate-artifact.json`, the `.tgz`, and dependency-license report. Record source SHA, tarball SHA-256, byte count, and all three run URLs. Download an additional evidence backup before Actions retention expires; never reconstruct an expired artifact and treat it as qualified.
4. Recheck open P0/P1, security, data-loss, and guaranteed-recipe failures. The automated gate checks CI, source and artifact evidence; the owner still reviews defect reports, security and benchmark records, usability evidence, and documented limitations. No additional stable soak is required by the owner's October 7 scope decision.

## Owner release decision

Present the source SHA, three passing run URLs, exact artifact hash, support matrix, license/security/benchmark evidence, and known limitations for review. The owner's request to finish the release now authorizes proceeding to the stable tag and publication once these checks pass; no extra calendar wait is required.

Confirm the existing npm trusted publisher permits `npm publish` for owner `4d696e6b`, repository `RepoSetup`, workflow `publish-npm.yml`. Do not request or store a token in RepoSetup configuration. Trusted publishing requires npm 11.5.1+ and Node 22.14+; this workflow uses Node 24 and upgrades npm to a compatible 11.x version. Trusted publishers can have staging-only permissions; the owner must verify direct publish is allowed. [npm trusted publisher documentation](https://docs.npmjs.com/trusted-publishers/)

After qualification, create the tag at the exact selected candidate SHA. The unpublished `v0.2.0` tag was replaced once with explicit owner authorization after a workflow correction and new exact-source qualification; see [the evidence record](./STABLE_QUALIFICATION_0.2.0.md). The published tag is now immutable. Future releases must use a new version and tag.

## Publication

The `publish-npm.yml` manual workflow must run from the exact qualified `v0.2.0` tag. GitHub uses the workflow file and event source from the selected dispatch ref. A default-branch dispatch against a different source can verify the tarball but makes npm provenance identify that default-branch commit, which npm rejects. Stop if the tag does not already point to the qualified source containing the corrected artifact download steps. [GitHub workflow version rules](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows)

Select `v0.2.0` as the workflow ref and provide the three qualification run IDs as a comma-separated list, oldest first. Leave `publish` false for a dry-run. After its checks pass, dispatch the same workflow with `publish` true. Inputs are validated and passed through environment variables, never interpolated into shell commands.

The workflow checks the repository, tag/version/source, exact candidate branch, latest three successful first-attempt full runs, required jobs and steps, and retained artifact. It downloads the immutable artifact ID from the final qualifying run using Actions read permission. It verifies size, source SHA, SHA-256, version and both launchers, then publishes that same tarball. There is no build or pack step in publication. [Official download-artifact inputs](https://github.com/actions/download-artifact/tree/v4)

The first `v0.2.0` dry-run [37655329425](https://github.com/4d696e6b/RepoSetup/actions/runs/37655329425) passed exact-source qualification and downloaded the correct artifact, then stopped because `download-artifact` nested that archive under its name. A default-branch workaround passed [dry run 37655843186](https://github.com/4d696e6b/RepoSetup/actions/runs/37655843186), but [publication run 37656653901](https://github.com/4d696e6b/RepoSetup/actions/runs/37656653901) failed with npm `E422` because provenance identified the default-branch source instead of the candidate. No npm bytes were published by that attempt. The corrected tag source flattens only the selected immutable artifact and preserves the actual tag context. Its [publish run 37658713089](https://github.com/4d696e6b/RepoSetup/actions/runs/37658713089) was accepted by npm but its immediate registry lookup ran before npm's publish-time scan completed. The safe [retry 37659541713](https://github.com/4d696e6b/RepoSetup/actions/runs/37659541713) verifies the now-visible matching package without re-uploading it and starts delivery acceptance.

Only an HTTP 404 means the version does not exist. Authentication, rate-limit and registry errors fail closed. If the version already exists, a retry succeeds only when registry integrity matches the qualified bytes. The three delivery jobs subsequently require `latest` to identify those same bytes. npm may scan a newly accepted publish for 15 minutes or more before exposing it, so future publication workflows wait for visibility. The signed registry attestation names `refs/tags/v0.2.0`, commit `04228d5`, and [the actual publishing run](https://github.com/4d696e6b/RepoSetup/actions/runs/37658713089). [npm provenance documentation](https://docs.npmjs.com/generating-provenance-statements/), [npm scanning policy](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/)

## Delivery acceptance

Publication triggers Ubuntu 24.04, macOS 15, and Windows 2025 delivery jobs. Each checks the registry version/integrity and `latest`, installs `rsetup@0.2.0` into an isolated temporary directory, launches `rsetup` and `reposetup`, exercises a dry-run in an empty project, and creates a real TypeScript Express/Vitest project that builds and passes its HTTP-response test. No workspace library is used by that installed CLI.

Phase 28 becomes complete only when publication/provenance and all three delivery jobs pass, upgrade notes match delivered behavior, and the final evidence is linked. A successful publish followed by failed delivery is an incomplete release, not permission to overwrite the published package.

## Upgrade and support notes

Once released, use `npm install -g rsetup@0.2.0` or `npx rsetup@0.2.0 --help`. Both global aliases are available. Node.js 24+ is required; Node 20/22 support from older records is not promised. Python recipes require Python 3.12+ and uv; qualification covers CPython 3.12/3.13 with uv 0.12.17. Keep lockfiles and preview operations with `--dry-run` before modifying existing projects.

The guaranteed recipe matrix and integration maturity are listed in [Integration support](../implementing-docs/INTEGRATION_SUPPORT.md). Experimental integrations are outside that guarantee. Database configuration generation does not install or provision a database. Playwright browser/system-library installation remains an explicit user step. RepoSetup does not install system runtimes, persist real secrets, or silently overwrite existing user files.

## Recovery

Preserve the publishing/acceptance logs, candidate artifact and integrity, affected runtime/platform, diagnostic report with secrets redacted, and minimal reproduction. Reproduce the failure on a separate fix branch. Do not unpublish, replace package bytes, or move the release tag. Ship a separately versioned patch through its qualification and owner approval. Any change to dist-tags is a separate authorized release action; never automatically point `latest` at an unqualified build. If registry visibility or delivery fails after publishing, inspect the existing version and hash before retrying.
