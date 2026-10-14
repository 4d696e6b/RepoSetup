# RepoSetup 0.4.0 release preparation

Prepared 2026-10-09. **Implementation and qualification are in progress. This
branch is prepared for eventual integration; it is not a qualified release or an
authorization to publish, deploy, tag, run providers or spend money.**

## Output-repair artifact update — 2026-10-15

The shared process output security repair is committed as CLI byte-source
`9758e84074f9a862f1b8ed91340a277c2ca3e1ce`. The new 0.4.0 tarball has SHA-256
`55d9af9243a376de92104e98b6a23f75ebcdfa744d31032b2b451f68e2a9e97e`; the website
now pins it and the regenerated 16-command reference, SHA-256 `fc85952da9afae3dba19f4c23cd0558f4518a6cb80542956e8727b45c6f08e7f`.
The version and frozen lockfile are unchanged. The earlier `cfdb6c7` identity and
`5f3250b` hosted results below are historical evidence for the superseded artifact.
They cannot qualify this repair. Three manual old-source release waves were
cancelled; new joint-source release repeats and website/selection acceptance are
required. Independent scoped source review covers the initial buffer repair; the
subsequent timeout optimization passes local core/CLI and differential regressions.
Its independent follow-up was unavailable after service/usage errors. Live model
qualification remains deferred and production routing stays closed.


## Current preparation checkpoint — 2026-10-14

The owner requested publication preparation after the 0.3.1 release, retaining
**offline-only** validation. Canonical branch `codex/release-0.4.0` now integrates
reviewed task source `e66d35f` and published-main ancestry through merge `4a46ea2`.
CLI byte-source `cfdb6c710706d8a280cdd8d81195aae371a1fa74` intentionally identifies
0.4.0; all three private libraries match. Its first packed artifact is
`sha256:a4a95e7f1cb6e95bb1bc2fa73650c1ebc6626c1be0fb6777d9ca28fa782f7345`.
The lockfile remains `sha256:19cf5e782ce2f4364aaf253ff61727a3b76a8c006f656eb8168f6db5da4cd824`.

The website is being coupled to these reviewed bytes and all 16 actual CLI
commands. Published 0.3.1 history and its immutable reference are preserved;
candidate instructions remain distinct from registry-verified publication.
The mandatory 20-job workflow uses `offline-tasks` (120 minutes) and
`full-task-verifier` (180 minutes), including ordinary contracts, eight concrete
CLI cases and eleven full real-tool fixture cases on Linux/macOS. Retained
source/runtime/lockfile and failure evidence accompany each cell.

The integrated 1,753 unit cases, build, workspace/task types, lint, 69 release
policy cases and three tool-inventory tests passed. Metadata preparation, actual
0.4.0 version/task help, frozen offline install and 38 context/preparation cases
passed. Exact versioned joint artifact/platform/browser qualification is pending;
previous development runs do not count as release repeats. Current acceptance
still requires three consecutive successful first-attempt 20-job runs at the
unchanged final joint source, installed acceptance and matching website evidence.

Live provider/profile, real-model comparative benchmark and routing quality/cost
gates remain deferred. Managed functionality stays experimental and production
live routing stays blocked; no paid calls are authorized by this preparation.
Earlier I/J completion statements refer to their recorded offline scope. The
2026-10-09 sections below are historical preparation records, not current package
identity or claims that their old open checks have passed. Follow current status,
workflow validation and exact candidate receipts for the remaining release gates.

## Branch and source identities

- Canonical release preparation branch: `codex/release-0.4.0`.
- Initial implementation source: `c2cbb149be419ef385e283ae8aa672409d490856`
  from `codex/0.4.0-task-compiler`.
- Latest integrated implementation source: `ceb1acf96bc885363908c71f02887508d823eaf0`,
  including the serial offline benchmark coordinator and private journal/replay
  auditor; integrated as `7b86977d6bdb852815b319e8cdbcfebfbac92781`.
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
current main contains shipped installer fixes and newer publication controls.
Those fixes were reconciled in the 0.3.0 release baseline
`8d49a0e8ee8654d66c699fcbd9be77c6fa32fb8a` and merged forward here as `9c809ea`.
Shared version-derived publisher controls from `39f6785` were then carried here as
`93974c5`. This integration does not qualify the new merged source or complete the
0.3.0 release. Final reviewed 0.3.0 preparation `08f0dcc` was merged forward as
`e5cbb9a`, retaining unconditional artifact policy checks and the task qualification
matrices. Implementation can continue independently; future reviewed source commits
need explicit integration before finalization.

The later 0.3.0 preparation snapshot `a3f4b31` was integrated as `fdace20`,
including canonical branch push checks and candidate/library version guidance.
The reviewed journal snapshot above was then integrated without changing the
frozen reference fixtures or their verifier implementation. Uncommitted work in
the original development worktree is outside this preparation snapshot.

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

On clean preparation source `789be77f4209986d1519c3ae2169061665e42459`, the
serial full reference-verifier suite passed all seven cases in 812.48 seconds:
five frozen references completed actual task/final-phase tool verification, and
two negative cases rejected oracle/dependency drift. This is local frozen
reference behavior, not managed trials or release acceptance. After the journal
integration, source `7b86977` passed 561 core cases, ten real-filesystem journal
cases and 106 release-policy cases, plus workspace build, workspace/task
typechecks and lint. The earlier ordinary offline suite passed 33 cases on its
recorded predecessor; the expensive reference verifier was not rerun after
unchanged verifier/fixture inputs. The initial broad workspace attempt timed out
in managed repair and lost its final CLI output; a serial managed-repair rerun
passed all 12 cases, but no full workspace/full CLI pass is claimed. Exact scopes
and retained log locations are in the implementation status.

Follow the [roadmap](../implementing-docs/ROADMAP_0.4.0.md),
[support profile](../product-docs/TASK_SUPPORT_0.4.0.md),
[benchmark protocol](../implementing-docs/TASK_BENCHMARK_0.4.0.md) and
[live provider protocol](../implementing-docs/TASK_PROVIDER_SMOKE_0.4.0.md). Do not
close a gate from predecessor tests or substitute a mocked success for required
live evidence.

## Integration and qualification gates

- [x] Integrate the reconciled 0.3.0 release baseline and the shared current-main
      publisher controls without losing shipped installer fixes, selection contracts,
      website evidence or task changes. Conflicts were reviewed; affected serial
      checks and their limits are recorded in the implementation status. This
      completes baseline preparation, not implementation or release qualification.
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

The integrated shared publisher retains current main's manual, dry-run-first
publication path, checks three consecutive successful exact-source qualifications
and reuses the identified retained tarball without rebuilding it. It derives the
stable release version from checked-out package metadata, rejects the current
prerelease and refuses publication unless private library versions agree with the
stable CLI. It requires 20 successful exact job identities for stable 0.4.0 and
later versions: the established 16 installer/recipe/fault/artifact jobs plus four
offline/full-verifier task cells on Linux and macOS. All required jobs and steps
must pass without skips.

The 0.4.0 release workflow now includes required `task-offline` and `task-verifier`
matrices on `ubuntu-24.04` and `macos-15`; packing depends on both. They use Node 24,
the repository-pinned pnpm and frozen dependencies. Offline qualification runs
the standalone infrastructure typecheck and serial ordinary task suite. The
separate serial full reference-verifier command has a 60-minute job allowance.
Neither job receives AI credentials, runs providers or closes live/model/campaign
gates. Generic installer e2e excludes the task suites because these dedicated jobs
own their required execution; no full-verifier test is silently dropped.

Runner labels and architecture, job dependency behavior, Node setup and pinned
pnpm setup were checked against current official
[GitHub runner documentation](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
[workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
[setup-node v4 instructions](https://raw.githubusercontent.com/actions/setup-node/v4/README.md)
and [pnpm setup v4 instructions](https://raw.githubusercontent.com/pnpm/action-setup/v4/README.md)
on 2026-10-09. Configuration review is not a passing GitHub run.

The artifact checker runs on every ref in the release and selection qualification
workflows. Its shared runtime policy requires website binding for every stable
release from 0.3.0 onward, including version tags, and for the established coupled
alpha branches. It verifies retained package bytes before loading website state;
the publisher independently repeats the same binding check. There is no workflow
branch-name condition that lets a stable candidate bypass the website pin.

The 0.4.0 implementation changes the CLI bytes while the website retains its old
pin, so this preparation deliberately fails that consistency gate. Before
qualification, review and qualify a newly coupled website pin or explicitly
approve and implement a separately versioned CLI artifact policy. The current
controls require coupling and do not authorize an independent stable CLI path.
Retargeting the website requires renewed joint evidence; the old website artifact
cannot qualify a new package. Ordinary CI and platform push checks now explicitly
include `codex/release-0.3.0` and `codex/release-0.4.0`; canonical selection and
website push filters also remain configured. These automatic branch checks do
not establish the separate repeated release-workflow qualification.

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
