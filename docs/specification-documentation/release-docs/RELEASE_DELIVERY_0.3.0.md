# RepoSetup 0.3.0 delivery procedure

Status: delivered on 13 October 2026; actual source/artifact/registry/website evidence and accepted limits are in [the stable record](./STABLE_RELEASE_0.3.0.md). The owner explicitly authorized publication on the existing delivery surfaces. The procedure below is retained for reproducibility; the immutable tag and published bytes must not be replaced. No freeze, soak or calendar waiting period applies.

## Identify the release

Use the canonical worktree `/Volumes/Developer/zeaek_/.codex/worktrees/release-030-staging/RepoSetup`. The original 0.2.0 release candidate and its untracked planning documents remain untouched. Review [PR #21](https://github.com/4d696e6b/RepoSetup/pull/21), its exact final source SHA and evidence before any external delivery.

The reviewed CLI version is 0.3.0; its byte-matched source pin is `ae4b9011c47d23d176770a749cde2560c64775c8`. Expected tarball SHA-256 is `cf458b036cf78e25445416dc1ba9e73ab2d40c3591828afac576cbd1a406d7e4`. Lockfile SHA-256 is `3273e9f1aa3024f00aef2d661f88feafcb1f8a708093b4c83745d0c0a791ec08`. Catalog/matrix are `0.3.0-cli.5` / `0.3.0-selection.5`. Website/test-only commits may retain those CLI bytes; their own final source still needs qualification. Do not substitute an older source's green runs for a changed release commit.

## Close readiness

1. Retain all required clean-source CI, platform, full golden, six-cell real selection/legacy, packed transport/maintenance and five-profile website reports. Obtain three complete, first-attempt, consecutive `release.yml` successes on that same final branch SHA and retain the last candidate artifact.
2. Validate those runs using the publication guard's actual rules, including unchanged branch, all required jobs/steps, no hidden skips or reruns, one unexpired artifact, exact version/source, tarball bytes and actual launchers. Recheck issues/security evidence independently of green CI. Keep the known inherited generated Next development-tool advisory visible; the workspace audit is a separate scope.
3. Record native desktop screen-reader results or an explicit owner deferral. Chrome phone-extension evidence is emulation at the owner's request; no physical-device, native mobile-reader or observed-person pass is claimed. The real local CLI cancellation, dry-run, confirmed creation and repeat-preservation evidence is separate.
4. Ask for publication and production promotion authorization only after the concrete source, retained artifact, reports and remaining accepted limitations can be reviewed. Updating docs or merging through a new commit changes source and requires renewed exact-source qualification; preserve the approved SHA rather than silently substituting a merge/squash result.

## Publish the retained CLI after authorization

Create the immutable `v0.3.0` tag only at the approved, fully qualified source. Run `publish-npm.yml` on that tag with `publish=false` and the three final ordered qualification run IDs first. The workflow validates the source/tag/version and downloads the retained artifact; it does not rebuild the package. Resolve any refusal before continuing.

After the successful dry-run and owner publication authorization, run the same workflow/tag/run IDs with `publish=true`. Existing trusted publishing and provenance settings apply; never bypass the guard or introduce a new long-lived npm credential. Require all three OS registry-acceptance jobs to pass: exact npm version/integrity, both aliases, read-only dry-run, real Express build and HTTP-response test outside the monorepo. If publication succeeded but acceptance failed, stop website promotion and report the delivery failure. Never attempt to overwrite an existing npm version.

## Verify and promote the companion website

Keep https://reposetupcli.com/ on the published 0.2.3 site until CLI registry acceptance succeeds. Then run from the same reviewed website source:

```sh
REPOSETUP_WEBSITE_RELEASE=published pnpm --filter @reposetup/website qualify
```

The published-mode build checks official npm metadata, exact version/latest, registry publication time, canonical tarball URL and actual downloaded bytes. SHA-256 must equal the committed handoff and SHA-512 must match registry integrity. Metadata is bounded to 1 MiB, tarball bytes to 16 MiB; redirects/outages/malformed records fail closed. Downloads are hashed, never executed by this build-time verifier. Candidate builds remain offline. There is no unchecked force-publication mode.

The website switches version-pinned installation instructions, candidate notices, builder/how-to guidance, documentation labels, npm links and release history together. The actual registry publication date supplies the new history entry. Earlier history, immutable 0.2.3 facts, artwork, legacy routes/configs, lazy beginner loading and production privacy remain preserved. Exact-version global installation syntax was verified against [official npm installation documentation](https://docs.npmjs.com/cli/v11/commands/npm-install/).

Require the full five-profile website and pinned CLI handoff reports to pass in published mode. Review that built output and its source/asset hashes; do not deploy a previously prepared candidate-label snapshot. Package only public static assets with the existing reviewed production HTTP policy: CSP including `frame-ancestors 'none'`, nosniff, referrer policy, frame denial, immutable hashed-asset caching and revalidated HTML. Exclude source maps, private artwork prompts/provenance, credentials, repository source, `.local-cli`, test reports and build evidence from the public upload.

Production deployment remains an explicitly authorized action using the existing project/domain. After deployment, verify live routes, displayed version, copied commands/downloads, actual deployed asset hashes, HTTP headers and bounded production analytics behavior. Keep the preceding 0.2.3 deployment as a rollback target. A Vercel status marked ignored/skipped is not deployment evidence.

## Record actual delivery

Record the immutable release/tag SHA, final run IDs/artifact identity, npm publication and registry-acceptance evidence, verified website source/build/deployment/domain, observed live checks and any explicitly accepted accessibility limits. Only then mark delivery complete. Do not invent a publication date, native accessibility result or absence of all defects. The three private library packages and website remain private workspace packages; only `rsetup` is the public CLI.
