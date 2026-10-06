# RepoSetup 0.4.0 implementation status

Last updated: 2026-10-06.

## Current position

**Implementation preparation only. Feature implementation has not started.** Next authorized development slice to propose is Milestone A in the [roadmap](./ROADMAP_0.4.0.md). This setup request does not implement the complete release.

- Development branch: `codex/0.4.0-task-compiler`.
- Worktree: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.4.0-task-compiler`.
- Base branch: `codex/0.3.0-candidate-integration`.
- Base source: `bfeab2f66806d42fa7d32ac4c144d1464bd88a48`.
- CLI package version: inherited `0.3.0-alpha.1`; no release bump or tag.
- Prior release qualification stays in its own records; this branch does not close those gates.

## Preparation

- [x] Inspect branch/worktree history and select the newer integrated candidate as the development baseline.
- [x] Create and attach an isolated worktree and named development branch.
- [x] Save the [task compiler product/technical contract](../product-docs/TASK_COMPILER_0.4.0.md).
- [x] Save milestones, dependency order, required tests and acceptance gates.
- [x] Preserve the original checkout's existing branch and untracked user files.
- [x] Relocate the checkout into the owner's Project directory on 2026-10-06, retaining the same branch and a compatibility symlink at its original Codex attachment path.
- [ ] Qualify a Node 24+ development environment for this new worktree.
- [ ] Install development dependencies from the frozen lockfile under the supported runtime.

## Implementation milestones

- [ ] A — Freeze contracts, supported profile, provider research and evaluation fixtures.
- [ ] B — Strict schemas and graph validation.
- [ ] C — Safe context selection.
- [ ] D — Portable compilation/handoff CLI.
- [ ] E — Trusted verification.
- [ ] F — Durable state and bounded text changes.
- [ ] G — Single managed provider adapter.
- [ ] H — Model/effort routing and targeted escalation.
- [ ] I — Packed/platform qualification and held-out benchmark.
- [ ] J — Experimental candidate qualification.

## Verification record

Preparation verification:

- Prettier check passed for the three new documents and specification index, using the existing candidate worktree's formatter.
- Git whitespace validation passed for the preparation changes.
- Repository-local Markdown links in the new documents resolve.
- No runtime code or package metadata changed; feature tests, typecheck and build were not run for this documentation-only preparation. Full lint and supported-runtime checks remain unverified.
- No provider calls, release tags or publication occurred. Historical checks from the parent branch do not establish correctness for future 0.4.0 code.

The default shell currently resolves Node `v22.12.0` and pnpm `12.5.1`; Node is below the repository's `>=24` floor. No Node runtime or system software was installed automatically. Dependency installation and supported-runtime qualification remain open until an existing qualified runtime is selected or the owner provisions one.

## Next implementation handoff

Work in the attached 0.4.0 directory, inspect its AGENTS.md and existing source, then implement Milestone A only when requested. Resolve research rather than guessing provider flags or verification commands. Keep core free of provider/UI dependencies and coding TaskPlans separate from curated InstallationPlans. Update this tracker with actual commands/results, source identity, unresolved blockers and the next slice; do not mark failing work complete.
