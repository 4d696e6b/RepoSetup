# Task compiler workflow validation — 14 October 2026

## Environment and reproducibility

The owner requested an isolated environment and complete workflow testing. The
local environment is outside the existing task worktree:

```text
/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.4.0-test-environment
  README.md
  bin/python -> /usr/local/bin/python3
  projects/user-workflow-*/
    project/
    task-review.json
    task-draft.json
    task-compilation.json
    task-packet.json
    evidence/report.json
  evidence/validation-report.json
  evidence/*.log
  evidence/hosted-linux/
  evidence/hosted-macos/
  tmp/
```

Artifacts are synthetic and remain outside source control. The denied `.env`
contains a test marker, not a credential. The portable review's baseline is
synthetic and explicitly unverified; it is not authority for a real managed run.
No paid provider calls or system installation occurred. The `python` alias only
exposes an existing interpreter inside this test folder; no global PATH or shell
configuration changed. Earlier interrupted tool copies were removed without
removing their project/state evidence.

To reproduce the website-guide walkthrough, first build the CLI using existing
Node 24+, pnpm 12.5.1 and frozen dependencies. Supply an existing absolute folder
outside the checkout:

```sh
REPOSETUP_TASK_WORKFLOW_ENV=/absolute/test-environment/projects pnpm exec vitest run --config tests/e2e/vitest.tasks.config.ts tests/e2e/task-user-workflow.test.ts
```

Without that environment variable, the test uses and cleans an ordinary temporary
folder. With it, each run retains a unique project and output artifacts. The test
executes the checked-in guide's six commands through the actual built CLI with a
minimal child environment, without shell evaluation or provider credentials.

## Feature coverage and results

- **Reviewed decomposition and plan compilation:** strict schemas, exact Markdown
  ranges/identities, requirement/criterion coverage, scope/ownership/DAG validation
  and deterministic receipts. Missing drafts return the expected decomposition
  request rather than implementing code. Unit and frozen fixture tests pass.
- **Portable handoff and status:** the new walkthrough executes help, decomposition,
  compile, next dry-run, next packet and status, plus an explicit-root invocation.
  It checks denied-marker exclusion, unchanged project bytes, null routing,
  advisory dispatch identity and unrecorded acceptance. This caught and corrected
  missing `--run-id`/`--attempt` flags in the website/human guide.
- **Bounded context and privacy:** rules, literal read/write/deny scopes, source
  hashes, size limits, drift, symlink/hardlink rejection, UTF-8 and secret boundaries
  remain covered by core/real-filesystem tests. Project bodies stay out of dry-run.
- **Managed compilation and execution:** simulated SDK responses exercise exact
  preview approval, usage allowance, credential refusal, inclusive compilation
  accounting, typed text proposals, scoped executor effects and retained state.
  These are functional tests, not evidence of live provider compatibility.
- **Trusted verification and acceptance:** the complete supported-host task gate
  uses actual tools/files/processes, three fixed checks, task/final-phase acceptance,
  output freshness and dependency unlocking. Each host passed eight concrete CLI
  cases and eleven full frozen fixture cases, including all five reference fixtures.
- **Routing and repair:** capability/native effort separation, quality confidence
  bounds, reference degradation, missing/stale evidence, frozen confirmation,
  budget/resource gates, failed-task repair, escalation and truncation accounting
  are tested. Offline qualification cannot promote production catalog profiles.
- **Interruption and benchmark accounting:** partial edits, unknown usage, reserved
  allowance, non-replay and independent terminal records remain covered. The full
  simulated 75-slot failure campaign passed; it establishes failure accounting,
  not 75 successful model comparisons or measured savings.
- **Existing installer/selection compatibility:** local generic E2E passed 136
  cases with one existing uv/Python skip; packed selection contracts passed 105.
  Real application tests passed 32 cases; four Python cases initially failed to
  launch the absent `python` command and four configured cases skipped. Both pip
  cases passed when rerun against the existing `python3` using a test-folder alias.
  The two uv bare cases remain unavailable locally. Keep the failed original run
  rather than converting these prerequisite gaps into passed qualification.
- **Website guidance and handoff:** 258 browser cases passed on desktop/mobile
  Chrome and Firefox, and six handoff cases passed against the immutable 0.3.1
  package. The new docs remain clearly unreleased; published references are pinned
  to 0.3.1. The full macOS-15 hosted browser gate then passed **430/430** cases across
  all five profiles, with zero skipped, flaky or unexpected cases. This qualifies
  its automated WebKit scope on that host; the local WebKit protocol mismatch is
  retained as unavailable local evidence.

Local workspace tests **1,752/1,752**, build, workspace/task/selection typechecks,
lint, registry validation, license review and workspace advisory audit passed.
Frozen task contracts including the new walkthrough passed **63/63**. The initial
five-second outer repair-test timeout is retained separately; its targeted suite
passed and its four-attempt outer allowance is now 30 seconds. Product limits,
assertions and provider deadlines are unchanged.

## Source and artifact evidence

Integrated supported-host full task qualification:
[run 38512801135](https://github.com/4d696e6b/RepoSetup/actions/runs/38512801135).
Branch source `8dbcaaa5022ae7846118f008ebf6466f47f509cd`, tested clean PR merge
source `8bda5e3a08b1e621b6e434abe7486e581c39ad1d`. Linux x64 Node 24.21.0 and macOS
arm64 Node 24.20.0 each passed 62 contracts, eight concrete CLI cases and eleven
full fixture cases. Downloaded artifact IDs are `11875963008` and `11883728101`.

New test/documentation source `f8f9c27c6af6b6f66fe96b4f86cb2b367fc80d1c` passes
[CI 38586399185](https://github.com/4d696e6b/RepoSetup/actions/runs/38586399185),
[Platform 38586399127](https://github.com/4d696e6b/RepoSetup/actions/runs/38586399127)
on Linux/macOS/Windows, and
[installation performance 38586399125](https://github.com/4d696e6b/RepoSetup/actions/runs/38586399125).
Windows passed 136 generic E2E cases and 105 packed selection cases. Its 119 skipped
POSIX-specific task unit cases remain unsupported; a green Windows installer gate
does not qualify managed tasks on Windows. The revised generic 180-second packed
hook and 600-second combined artifact scenario retain the dedicated suites' cold
installation semantics without weakening checks.

The actual CLI bytes remain unchanged across these test/doc fixes:
`sha256:626aba31d3042c74a203263dfffd212c9ea5c8488bd4eaa8eac9f3b98d971b45`.
Lockfile:
`sha256:19cf5e782ce2f4364aaf253ff61727a3b76a8c006f656eb8168f6db5da4cd824`.
The local packed receipt identifies clean source `f8f9c27`; the full local invocation
started before the commit, so it is not a clean same-source candidate qualification.
Do not combine different source runs into a versioned-release repeat count.

The website's installed handoff is separately immutable 0.3.1 source
`f306e1c877887fe9c2861619ea434a26b996fe2c`, tarball
`34a8d5f871333f248af45c28b9d2aa2bde466f04cc23f10d4d395856be827135`.
Registry-verified published-mode website build and exact packed handoff passed.
This does not publish the development task commands under 0.3.1.

## What cannot be claimed

Production routing profiles remain unconfirmed, and live routing is closed.
Without independently authorized real provider/model/profile qualification,
offline tests cannot establish live account access, billed usage, model quality,
held-out comparative savings or a fully operational paid router. Dry-run and
credential/qualification refusal are expected successful safety behavior.

Full website gate
[38586419569](https://github.com/4d696e6b/RepoSetup/actions/runs/38586419569) passed
at clean source `f8f9c27`, macOS arm64 Node 24.20.0. Downloaded artifact
`11905449596` records build, 1,752 unit tests, types, lint, six pinned handoff cases
and 430 browser cases passing, `automatedScopePassed: true` and
`wholeReleaseQualified: false`. Its working-tree identity is
`f112888a4c7665872b5b2271170fb7ab92737d628e1a708d32fc3d2b0edcb99a`.
No deployment followed. Native readers/devices and live database services are separate.
The fresh full task rerun
[38586399191](https://github.com/4d696e6b/RepoSetup/actions/runs/38586399191) remains
in progress. It repeats the earlier passing complete task gate on the new
test/documentation source; the CLI artifact bytes are unchanged. No result from
that rerun is claimed until it completes.
Versioned release qualification/publication also remains open. Keep PR #20 draft;
no model call, main merge, tag, package publication or production deployment is
implied by this validation. See [implementation status](./STATUS_0.4.0.md).


## Versioned candidate preparation — 14 October 2026

Canonical release checkout: `codex/release-0.4.0`. CLI byte-source
`cfdb6c710706d8a280cdd8d81195aae371a1fa74`, version 0.4.0, tarball SHA-256
`a4a95e7f1cb6e95bb1bc2fa73650c1ebc6626c1be0fb6777d9ca28fa782f7345`.
The source-archive rebuild and temporary npm installation reproduce those bytes.
The active website reference contains all 16 commands; prior published snapshots
and history remain immutable. Candidate builds do not advertise 0.4.0 as published.

New walkthrough coverage executes every portable guide command through both the
workspace CLI and a real npm-installed tarball, checks both aliases and preserves
project/context/advisory boundaries. Both walkthroughs pass without provider keys.
The ordinary task suite previously passed 65 cases; the added installed mode is
an additional case, not a live-model acceptance. Generic e2e passes 137 with one
missing-uv skip; real Express installation/build/HTTP-response acceptance passes.

The coupled candidate working tree passes 1,758 units, build, workspace/task/
selection types, lint, 101 release guards, 105 packed selections, six installed
website handoffs and 258 local browser cases. The source-specific status record
retains initial stale browser assertions, artifact-allowlist failure and concurrent
unit timing failures together with their complete passing reruns. License review
covers 201 packages and both dependency audits have zero known advisories.

Exact clean-source 20-job repeated release qualification and renewed five-profile
hosted website acceptance remain pending. Existing hosted development runs above
are not substituted for those gates. Local uv/WebKit limitations remain explicit.
No paid model calls, production routing qualification, publication or deployment
is established by these local results.

## Renewed output-repair artifact — 2026-10-15

The security buffer and deadline fixes are committed in CLI byte-source
`9758e84074f9a862f1b8ed91340a277c2ca3e1ce`. Its actual 0.4.0 tarball and independent
archive rebuild match SHA-256
`55d9af9243a376de92104e98b6a23f75ebcdfa744d31032b2b451f68e2a9e97e`.
Website and source guide pins now target these bytes. The final local joint checks
pass 1,783 unit cases, build/types/lint, 66 ordinary task contracts, six installed
website handoffs, 105 packed selections, 137 generic e2e cases with one existing uv
skip, and 258 local Chrome/Firefox browser cases. Actual npm-installed portable
guide commands, both aliases, unchanged inventory/privacy and a real Express
build/HTTP-response check pass. License review and both dependency audits pass.

Local artifacts and logs are retained in the external test environment under
`evidence/candidate-9758e84/`. Intermediate `19ec733`/`5f3250b` evidence is historical,
not final qualification. Live usage/model comparisons remain unverified. The
independent reviewer covered the initial repair; its final optimization follow-up
was unavailable after service/usage errors. Final exact joint-source hosted
qualifications, full WebKit matrix and all documented release conditions remain
required; these working-tree checks do not publish or qualify a frozen release.
