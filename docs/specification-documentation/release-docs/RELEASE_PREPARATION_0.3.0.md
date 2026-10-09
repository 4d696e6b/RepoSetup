# 0.3.0 release preparation

Status: **preparing; not frozen, qualified or authorized for publication.**

Canonical release branch: `codex/release-0.3.0`. Target: `0.3.0`; current public CLI and private website development version: `0.3.0-alpha.1`. The private core, registry and integrations libraries retain the merged published baseline versions until final version preparation. They remain private.

The branch reconciles integrated 0.3.0 feature source `bfeab2f66806d42fa7d32ac4c144d1464bd88a48` with published-fix baseline `main` at `1b5b4c2de3ad20cf5ee2366136732e417e3b0603`. This retains selection, previews, intended-stack doctor, bounded repairs and companion website work together with the shipped 0.2.1–0.2.3 fixes. The original candidate/development worktrees and the website's two additional local documentation commits are preserved.

## Preparation validation

The frozen-lockfile install reused the local dependency store without downloading packages. Build, typecheck and lint pass. All 1,159 workspace unit tests pass (core 297, registry 15, integrations 679, CLI 154, website 14). Targeted built-CLI dry-run, selection handoff and failure checks pass 17/17. No tests in these commands failed or were skipped. Merge regression coverage retains installed-dependency failures alongside intended-doctor checks, refuses a repair if installed health changes during confirmation, and scopes the final dependency verification into the selected project directory.

Initial local checks exposed an old selection test expecting no final installed-dependency verification and doctor fixtures returning version text for every subprocess. Their expectations/mocks were updated for the shipped verification probes. No real installation or external platform qualification is claimed by those unit fixtures.

The final shared version preparation and binding checks pass 106 targeted tests,
including actual pin-check subprocesses on stable main/tag/canonical refs and
independent CLI alpha sources. Typecheck and lint pass. These local checks do not
replace the final release qualification below.

## Required before release qualification and delivery

1. Finish the selected 0.3.0 feature work on this canonical branch. Finalize stable metadata only after that work is complete; no stable version bump is part of this preparation.
2. Reconcile the generated catalog and frozen selection matrix with the combined planner. Current catalog revision and previous matrix/artifact identities are predecessor evidence, not qualification of the new implementation.
3. Replace the website's historical handoff source `a410c1d39179d41ed14aae2740470a7267a25282` and digest `442d922754b7798839640d3556e2c1ae60d09b4b80e8ed759a60d36b3e8795ec` with a reviewed identified artifact from the final CLI source. Until then, release/selection artifact guards deliberately reject newly merged CLI bytes. Never bypass them to obtain a green run.
4. Freeze the final CLI and website source identities, lockfile, catalog/matrix and one tarball digest. Renew workspace, real create/add/legacy, native transport, preview/doctor/repair, retained golden, full browser and exact joint handoff evidence on the advertised matrix. The old candidate's passing runs do not cover this baseline merge.
5. Close Phase 9's three consecutive qualifications for the same frozen candidate pair, seven-day soak, release blocker audit and combined safety/security review. The existing recorded soak timer has not started.
6. Complete native desktop screen-reader, physical mobile-device and local CLI handoff sessions in [the manual protocol](MANUAL_ACCESSIBILITY_DEVICE_0.3.0.md). Automated emulation and scripted beginner journeys do not close these gates.
7. Review the qualified-artifact publisher's final version metadata and exact-source checks, then obtain explicit authorization for immutable tag/publication and website deployment. No tag, publication, deployment or external qualification workflow is initiated by this preparation.

Shared release plumbing now derives its stable version/tag from validated manifests, retains the sixteen existing qualification jobs for 0.3.0, publishes the identified retained artifact without rebuilding it, and refuses prerelease or mismatched private-library metadata for stable publication. Local release-context, publication-workflow, qualification-gate and artifact-evidence tests pass; this is preparation validation, not renewed release qualification. The release and selection pack steps now run the binding policy unconditionally. Stable releases from 0.3.0 onward require the website artifact pin on every ref, including main and tags; integrated/canonical alpha candidates also retain it. Independent CLI alpha qualification explicitly reports that website binding is not required. The publication runtime repeats the binding against retained verified bytes before any registry lookup or publication. Selection/browser push qualification includes canonical release branches.

The [candidate record](RELEASE_CANDIDATE_0.3.0.md) preserves the preceding source/evidence and open Phase 9 gates. Selected publication remains Phase 10.
