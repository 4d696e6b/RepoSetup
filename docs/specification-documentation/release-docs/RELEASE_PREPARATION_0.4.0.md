# RepoSetup 0.4.0 release preparation

Prepared 2026-10-09. **Implementation and qualification are in progress. This
branch is prepared for eventual integration; it is not a qualified release or an
authorization to publish, deploy, tag, run providers or spend money.**

## Branch and source identities

- Canonical release preparation branch: `codex/release-0.4.0`.
- Initial implementation source: `c2cbb149be419ef385e283ae8aa672409d490856`
  from `codex/0.4.0-task-compiler`.
- Implementation baseline: `codex/0.3.0-candidate-integration` at
  `bfeab2f66806d42fa7d32ac4c144d1464bd88a48`.
- Target release version: `0.4.0`, with experimental task support. The current CLI
  package still identifies as `0.3.0-alpha.1`; preparation does not bump it.
- The implementation worktree and branch remain independent. Continue authorized
  milestone work there, then integrate the reviewed commits into this branch.
- No final source, lockfile, task fixture revision, shipping provider profile,
  candidate tarball or release tag is frozen by this document.

The starting source is 38 commits ahead of its 0.3.0 candidate baseline. It is not
based on current `main` (`1b5b4c2de3ad20cf5ee2366136732e417e3b0603` when inspected).
The main/implementation merge base is `145e167e6b60897da96942545ba6dbd40359ad4a`;
current main contains shipped installer fixes and newer publication controls that
must be retained. Reconcile them first in `codex/release-0.3.0`, then merge that
completed release baseline forward here. Do not duplicate the initial main merge
or treat inherited release evidence as qualification of the merged source.

## Actual implementation position

The [implementation status](../implementing-docs/STATUS_0.4.0.md) records milestones
A–H complete for the reviewed local/offline scope. Compilation, bounded context,
portable handoff, trusted verification, scoped text changes, private durable state,
the simulated managed provider boundary, routing and targeted repair are
implemented. Production capability profiles, effective provider configuration,
remote strict-schema acceptance, account access and actual usage remain
unconfirmed. Live routing stays closed until the required qualification exists.

Milestone I is in progress and J is unstarted. The frozen fixtures, ordinary
offline packed contracts, full local reference-verifier tests, candidate evaluator
prototype and cross-module lifecycle tests establish their recorded bounded
behavior only. Simulated HTTP, verifier ports or reviewers cannot qualify actual
provider/model behavior or a completed managed treatment. Current recorded
runtime/tool evidence is macOS arm64 with Node 24.21.0 and pnpm 12.5.1; Linux and
installed-artifact acceptance remain open.

Follow the [roadmap](../implementing-docs/ROADMAP_0.4.0.md),
[support profile](../product-docs/TASK_SUPPORT_0.4.0.md),
[benchmark protocol](../implementing-docs/TASK_BENCHMARK_0.4.0.md) and
[live provider protocol](../implementing-docs/TASK_PROVIDER_SMOKE_0.4.0.md). Do not
close a gate from predecessor tests or substitute a mocked success for required
live evidence.

## Integration and qualification gates

- [ ] Integrate the reconciled 0.3.0 release baseline and the shared current-main
      publisher controls without losing shipped installer fixes, selection contracts,
      website evidence or task changes. Review conflicts and repeat affected tests.
- [ ] Finish I's independent candidate criterion review joined to actual E
      verification receipts, including managed cross-module predecessor/evidence
      behavior. In-memory lifecycle tests do not qualify operating-system restart.
- [ ] Run the serial whole-phase strong, compiled fixed-strong and compiled routed
      benchmark treatments under the frozen protocol. Retain every failed trial,
      compilation/context/retry/verification overhead, usage provenance, budgets and
      durable authenticated terminal evidence. Report negative or inconclusive savings
      honestly.
- [ ] Pass current-source workspace tests, build, typecheck, lint, registry
      validation, task infrastructure typecheck and the ordinary offline task suite.
      Run the separate serial full task reference-verifier qualification and relevant
      candidate/dependency tests. Ordinary CI has no AI credentials or live provider
      calls.
- [ ] Qualify the actual installed identified tarball, both aliases, portable and
      managed task boundaries, dry-run, state/recovery/scope failures, and complete real
      legacy installation journeys. Extracted tarball tests with workspace dependency
      hydration cannot substitute for npm-installed artifact acceptance.
- [ ] Complete Linux x64 and macOS arm64 managed qualification on Node 24 and the
      established installer platform/recipe/fault matrix. Windows task support remains
      outside the initial managed profile; retain Windows installer/portable support
      evidence and state exact exclusions.
- [ ] Qualify dated production capability/feature profiles and native effort
      behavior on representative tasks before enabling live routing. Official
      transport mappings and synthetic catalogs do not establish model quality.
- [ ] Complete the separately authorized finite live provider/profile smoke with
      actual remote schema acceptance, effective configuration/usage, independent
      current task/final-phase review and durable acceptance. No paid/live action is
      enabled by this preparation; missing authorization or credentials keep this
      gate open.
- [ ] Finish J's help, README, changelog, migration/no-migration notes and exact
      experimental limitations. Review security, dependency licenses, provider
      research, secret/context handling, finite usage allowances and supported scope.
- [ ] Intentionally version the candidate only after the authorized implementation
      is complete, then freeze exact source/lockfile/fixture/profile/artifact identities
      and rerun all required applicable checks on that versioned source.
- [ ] Obtain the established repeated frozen-source/platform qualifications and
      soak evidence. Record exact sources, job results, exclusions, artifact hashes and
      unresolved defects; changes after freeze require renewed applicable evidence.

Required local check entry points are `pnpm build`, `pnpm test`, `pnpm typecheck`,
`pnpm lint`, `pnpm registry:validate`, `pnpm typecheck:task-tests`,
`pnpm test:tasks:fixtures` and the separate `pnpm test:tasks:verifier`. Run expensive
concrete verification serially. These checks alone do not establish the benchmark,
installed/platform, live provider or soak gates.

## Website and publisher boundaries

The inherited website handoff remains pinned to `rsetup@0.3.0-alpha.1` from
`a410c1d39179d41ed14aae2740470a7267a25282`, SHA-256
`442d922754b7798839640d3556e2c1ae60d09b4b80e8ed759a60d36b3e8795ec`. Preserve its
version/source/hash as one coupled identity. A 0.4.0 package bump must not
automatically retarget the website. Any newly coupled CLI/website artifact needs
separate approval, a reviewed pin and renewed joint qualification. The inherited
0.3.0 website/candidate qualification remains independent and open.

Before using release workflows, retain current main's manual, dry-run-first
publication path that checks three consecutive successful exact-source
qualifications and reuses the identified retained tarball without rebuilding it.
Remove inherited release-version hardcodes through the shared declarative release
configuration. The starting task branch's publisher only reacts to `v0.2.0`, and
its release workflow does not include task-specific qualification jobs; those
settings do not qualify or publish 0.4.0.

The 0.3.0 website pin check must continue to apply on its canonical release branch.
It must not impose the old website tarball hash on a separately versioned 0.4.0
CLI. Check workflow branch filters when introducing `codex/release-*` branches:
the inherited platform push filter matches `release/**`, while PR/manual paths
have separate triggers.

## Eventual immutable artifact and publication sequence

1. Complete implementation and all applicable I/J requirements. Integrate the
   reviewed baseline and shared publisher controls; record the final support
   contract and intentional candidate/release version.
2. Freeze one final source commit with its lockfile, fixture and shipping profile
   identities. Qualify its one identified packed artifact, retain source SHA,
   package/version, bytes, SHA-256 and registry integrity, and complete repeated
   qualification plus soak without silently dropping failed or skipped checks.
3. Merge the approved release branch into the intended delivery branch. If this
   changes the source identity used by publication, qualify and record that exact
   final source again. Do not claim predecessor evidence identifies a new merge
   commit.
4. After release approval, create the immutable matching version tag at the exact
   qualified source. Never move an existing release tag or overwrite an npm
   version. Record the tag object/source identity.
5. Dispatch the manual publisher against that tag with publication disabled and
   the retained successful qualification run IDs. Require exact tag/source/version
   and tarball checks. This dry-run must not rebuild or replace the qualified
   artifact.
6. After explicit publication authorization, dispatch the same guarded publisher
   for the same immutable source and retained artifact. Verify npm version and
   integrity, then verify actual registry installation and both launchers outside
   the monorepo on supported installer platforms. Record provenance, distribution
   tags and registry acceptance.

Preparation performs none of these future release actions. Branch creation and
documentation are reviewable setup; implementation completion, candidate
qualification, merge approval and publication remain distinct gates.
