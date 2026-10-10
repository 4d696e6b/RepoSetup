# Prepare 0.4.0 integration after 0.3.0 publication

Owner instruction, 2026-10-10: prepare integration now and wait until 0.3.0 is
published. This record authorizes preparation, not merging or publishing 0.4.0.
Keep [PR #20](https://github.com/4d696e6b/RepoSetup/pull/20) draft until the
publication dependency and integration validation are satisfied.

## Prepared baseline

- Work branch: `codex/0.4.0-task-compiler`.
- Current PR base: `codex/0.3.0-candidate-integration`.
- Remote base inspected after fetch: `bfeab2f66806d42fa7d32ac4c144d1464bd88a48`,
  identical to the task compiler's original baseline. No base changes to reconcile
  at this inspection. GitHub reports the current draft mergeable; that is a point
  in time result, not future merge approval.
- Offline milestones A–J complete; full qualification passed at implementation
  branch source `69a2467`, tested PR merge source
  `14bd3ab5bb6d2c831ed6d47ca7e55a494aa03f2f`.
- Diagnostic package version remains `0.3.0-alpha.1`; installed artifact hash
  `sha256:7a4942e2e93d21cde4325be6b6aeb9e532307f3da50fc05c2b5e51e0fcbbf735`.
- GitHub release listing currently has latest `v0.2.3`; no published 0.3.0 release
  was observed. A draft candidate or branch name is not publication evidence.

## Resume after actual publication

1. Verify 0.3.0 publication from its release record and package publication receipt.
   Record the released commit/tag, actual version and immutable artifact identity;
   do not infer these from a development package file or an unpublished tag.
2. Refresh the final released/default branch and inspect changes since the prepared
   baseline. Inventory overlapping files before merging/rebasing. Preserve 0.3.0
   installer/selection behavior and release evidence, unrelated work and the
   separate offline task boundaries. Resolve documentation/version/lockfile
   conflicts deliberately; retain the published dependency versions unless an
   independently reviewed change is necessary.
3. Select the integration target from the actual published branch state. Retarget
   PR #20 if appropriate only after the 0.3.0 changes are integrated there, then
   review the resulting diff to ensure already released changes are not duplicated.
   Do not merge into an unfinished 0.3.0 candidate branch.
4. Reconcile the task implementation with that baseline and repeat affected source
   safety/dependency review. Run Node 24+, frozen dependency validation, workspace
   tests/build/typecheck/lint, packed aliases/selection/legacy contracts, supported
   Linux/macOS concrete and full task suites, Windows unsupported-profile checks,
   licenses/advisories and installation performance. Record exact new source,
   runtime, lockfile and packed artifact. Existing passing results do not qualify
   a changed integration tree automatically.
5. Update implementation status and this record with publication and integration
   evidence. Remove draft status only when the integration is reviewable and all
   applicable checks pass. Present the concrete final PR for merge authorization;
   this preparation does not enable automatic merge.

## Boundaries retained after integration

Offline-only completion does not qualify production models or empirical savings.
Production capability profiles remain unconfirmed and routing closed. Managed
live provider/profile smoke, 75 actual model comparisons, intentional candidate
version/freeze, three same-candidate complete qualifications and the seven-day
stability gate remain deferred prerequisites before their corresponding release
claims. No API credit, version bump, tag, website change or publication is authorized
by this record. Integration of reviewed development code and publishing a versioned
0.4.0 release are distinct actions.

See [offline acceptance](../implementing-docs/OFFLINE_ACCEPTANCE_0.4.0.md),
[status](../implementing-docs/STATUS_0.4.0.md) and
[candidate preparation](./RELEASE_CANDIDATE_0.4.0.md).
