# Preparing 0.3.0 and 0.4.0

Status: release preparation, not release approval. Published 0.2.3 and its
immutable evidence remain unchanged. Neither future version is published or fully
qualified by this preparation work.

## Branch ownership

- Develop 0.3.0 on `codex/0.3.0-candidate-integration` (combined CLI/website
  candidate). Prepare and qualify its final release on `codex/release-0.3.0`.
- Develop 0.4.0 on `codex/0.4.0-task-compiler`. Prepare and qualify its final
  release on `codex/release-0.4.0`.
- Shared publication tooling is isolated on `codex/release-version-preparation`.
  Both release branches receive that tooling. Existing implementation checkouts
  remain available for continued work.

The release branches reconcile the published 0.2.1–0.2.3 installer fixes with
ongoing features. The 0.4.0 branch also inherits the reconciled 0.3.0 baseline.
Continue to merge new implementation commits into the matching release branch;
preparation does not automatically track future commits. Release 0.3.0 before
0.4.0, and merge the resulting current `origin/main` into 0.4.0 before its final
qualification. Use ordinary reviewed merges, preserving the original branches.

## Finalizing a version

Keep development candidate versions until the feature scope and manual gates in
that branch's `RELEASE_PREPARATION_0.3.0.md` or `RELEASE_PREPARATION_0.4.0.md` are
complete. A passing version command does not inspect or approve those gates.

1. Fetch origin, inspect the implementation branch and current main, and merge
   both into the matching release branch. Resolve conflicts and run the branch's
   tests, typecheck, lint and build. Do not discard installed-health fixes or
   substitute old qualification results for the reconciled source.
2. Preview the exact four manifest changes:

   ```sh
   pnpm release:prepare --version 0.3.0
   ```

   For 0.4.0, substitute `0.4.0`. Preview is read-only. The command does not fetch,
   merge, commit, tag, invoke workflows, update documentation or publish.
3. Once scope and manual gates are approved, use the same command with `--write`.
   It requires a clean `codex/release-<version>` checkout containing the current
   local implementation branch and fetched `origin/main`. It rejects unexpected
   package identities, public workspace libraries and linked manifests. It
   aligns `rsetup` and the three private bundled libraries, preserving their
   private status and other manifest fields. Review and commit the diff.
4. Update current CLI/product/release documentation and changelog for the final
   behavior. Preserve historical release records. The website's separate package
   version and pinned CLI artifact are not automatically rewritten: regenerate
   catalog/matrix material and explicitly repin after qualifying the new CLI
   artifact, then recheck the website/CLI handoff. For 0.4.0, intentionally refresh
   sealed task fixtures after dependency changes and retain old evidence as
   evidence of its old revision.

If an interrupted write leaves partially changed manifests, review the diff and
restore or finish it explicitly. Dirty trees and inconsistent library versions
block finalization/publication. No force-write option bypasses these checks.

## Qualification and merge

Run feature-specific gates before proposing the final merge. 0.3.0 retains its
website, handoff, accessibility and final candidate/manual criteria. 0.4.0 also
requires the remaining task compiler milestones and retained qualification
evidence; offline fixtures do not establish provider or production readiness.
Preparation does not waive an existing soak or manual signoff requirement.

After review, merge the completed release into main and synchronize the release
branch to that exact merged source. If main or the source changes during this
process, qualify the new source. Keep the canonical release branch at that source
until publication and delivery acceptance complete. Tagging a different merge
commit from the qualified source is not permitted.

The manual `release.yml` workflow qualifies and packs one identified candidate;
it does not publish. For stable publication, retain three consecutive successful
first-attempt full runs from the identical source and branch, with every required
job and step successful and no skips. Their final candidate artifact must remain
available. Existing alpha/earlier-branch runs cannot qualify the stable version.

The publication gate requires sixteen jobs through 0.3.x. From 0.4.0 onward it
also requires Ubuntu and macOS offline task qualification and full task verifier
qualification, for twenty required jobs. The 0.4.0 release workflow includes those
jobs before candidate packing. A newer release line without those jobs is
blocked by the shared gate rather than silently receiving weaker qualification.
Use each branch's final qualification record for the complete additional gates
and the exact run IDs, source and archive hash.

Keep evidence updates on a separate documentation branch once the source is
frozen. Changing evidence files on the frozen branch also changes its Git source
and invalidates the exact-source publication gate.

## Publication after approval

1. Confirm all version-specific criteria, owner decisions and final exact-source
   evidence. Create a new immutable annotated `v<version>` tag at the qualified
   source; do not move existing published tags.
2. Dispatch `publish-npm.yml` at that exact tag with the three qualification run
   IDs and `publish: false`. Inspect the dry-run. Branch dispatches and alpha
   versions are rejected; all four workspace versions must agree.
3. After release approval, dispatch the same tagged workflow with `publish: true`.
   It downloads the retained qualified archive and publishes through the existing
   npm trusted publisher. It does not rebuild or repack. A package-wide concurrency
   group serializes publications so simultaneous versions do not race `latest`.
4. Verify exact npm version, `latest`, archive integrity, provenance/signatures
   and fresh registry delivery on Linux, macOS and Windows. The workflow derives
   the expected version from the tagged manifests. If an identical version is
   already published, only matching archive integrity permits a delivery retry;
   different published bytes fail closed.
5. Publish the GitHub release and update current installation/status/website
   documentation with the accepted version. Record evidence without rewriting
   historical releases or claiming untested platforms/services are qualified.

No tags, new qualification runs, npm publications or website deployments were
started as part of this branch preparation. Local preparation checks verify the
tooling and reconciled source; final external qualification remains required.
