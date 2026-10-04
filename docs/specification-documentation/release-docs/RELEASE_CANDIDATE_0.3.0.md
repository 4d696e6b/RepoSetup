# RepoSetup 0.3.0 candidate qualification record

Status: **Phase 9 in progress; not frozen or release-qualified.** No tag, npm publication, or website deployment is authorized by this record.

## Candidate pair and scope

- Integration branch/worktree: `codex/0.3.0-candidate-integration` at `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.3.0-candidate`. Merge base is the untouched 0.2.0 candidate `145e167e6b60897da96942545ba6dbd40359ad4a`; the two 0.3.0 development branches were merged here, not into the 0.2.0 branch.
- CLI artifact source: merge commit `a410c1d39179d41ed14aae2740470a7267a25282`. Package `rsetup@0.3.0-alpha.1`, tarball `rsetup-0.3.0-alpha.1.tgz`, 123,994 bytes, SHA-256 `442d922754b7798839640d3556e2c1ae60d09b4b80e8ed759a60d36b3e8795ec`. The local pack and a second clean `git archive` pack produced this digest. This is a provisional candidate artifact, not a release.
- Website source: this integration branch after the pinned handoff change; record its exact SHA after the source and qualification workflow are committed. The website displays the CLI source/version and rejects tarball bytes outside the digest above. The selection envelope remains `selection-v1`, catalog `0.3.0-cli.4`, matrix `0.3.0-selection.4`, recipe revision `2026-09-23`.
- Workspace lockfile SHA-256: `151f9debba7276917140cf3b395e66e5883dd2dfba242f8334d89bfca71fc3e4`.
- Selected 0.3.0 contexts: React/Vite + TypeScript + pnpm, Express + TypeScript + pnpm, and FastAPI + uv. The finite matrix has 24 create and 21 nonempty add variants. Only the reviewed optional libraries and existing CLI flags are advertised. Optional experimental integration, frozen-reinstall export, and new workspace-package scope were not selected.
- Retained compatibility: schemaVersion 1 configs, the supported JSON plan/error envelopes, existing preset IDs, positional add, and both CLI aliases. No remote executable plugins, scripts from selections, real secrets, system-software installation, accounts, or publication are included.

## Evidence recorded so far

- Before integration, the CLI source `b212d35` passed the six-cell real create/add/legacy matrix, three-runner packed contract/transport/maintenance checks, and six-cell golden stacks. The website source `f96f28e` passed 70/70 browser cases, including 25/25 owner-approved simulated beginner/profile journeys. These are predecessor evidence, not qualification of the integrated candidate pair.
- The merged worktree installed from its frozen lockfile and passed the full workspace build, 550 unit tests, typecheck and lint. After pinning the provisional artifact, website unit tests passed 13/13 and exact-artifact handoff tests passed 6/6 locally on macOS arm64 with Node 24.21.0. The pin change still needs a clean-source browser rerun.
- The documented `pack:contract` flow archives `a410c1d`, rebuilds and installs it in a disposable directory, then verifies the expected SHA-256 before handoff tests. No candidate branch or user project is mutated by the packer.

## Open Phase 9 gates

- [ ] **9.1 Scope/docs:** reconcile root quick start, CLI contract, website setup and support limitations against the integrated source; record the optional-scope decision above in current status documents.
- [ ] **9.2 Identity/freeze:** commit website pin and qualification tooling, record exact website source SHA, then freeze both source identities, lockfile, catalog and one tarball hash. Any CLI or website source change after freeze needs renewed applicable evidence.
- [ ] **9.3 Candidate qualification:** pass retained golden, real create/add/legacy, packed selection/transport/maintenance, preview/doctor/repair, and full website/browser/joint handoff checks on the advertised runners with artifact identity and no hidden skips. Local unit or predecessor runs do not close this gate.
- [ ] **9.4 Repeat/soak:** obtain three consecutive full qualifications for the same frozen candidate pair and seven calendar days without an open P0/P1, data-loss or security defect. The timer has not started.
- [ ] **9.5 Blocker audit:** review failures and support claims, then record no open release-blocking issues with exact evidence. Do not infer this from green unit tests.
- [ ] **9.6 Manual and combined safety:** run screen-reader and physical-device checks and review the integrated CLI/website candidate for secrets, malformed records, traversal/symlinks, conflicting files, concurrent changes, interruption and repeated repair. Browser emulation and scripted beginner journeys do not replace these checks; observed people remain 0/5 by the owner's Phase 8 substitution.

Phase 10 publication and deployment remain separate and require later explicit authorization after all selected Phase 9 gates pass.
