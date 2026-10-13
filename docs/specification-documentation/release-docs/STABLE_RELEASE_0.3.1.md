# Stable 0.3.1 release record

Status: preparation and qualification in progress; not yet published. Owner authorized npm, GitHub and existing website delivery on 13 October 2026.

## Scope

The patch corrects repeated no-op `remove --json` returning text. Four regression variants prove the versioned empty plan, unchanged files and no prompt/process execution. The stable package retains the 0.3.0 registry revision, selection-v1 format and supported contexts. No automatic dependency repair or new integration qualification is advertised.

The 0.3.1 documentation expansion is a separate development branch and is not included. The website is repinned to this CLI patch and retains the current theme and existing routes.

## Qualification and delivery gates

- [ ] Exact stable CLI artifact and website handoff pin.
- [ ] Workspace tests, typecheck, lint and build.
- [ ] Three consecutive successful first-attempt full release qualification runs at one unchanged SHA.
- [ ] Packed selections and real bounded create/add/legacy checks.
- [ ] Full five-profile website qualification and published-byte verification.
- [ ] npm trusted publication and three-platform registry acceptance.
- [ ] GitHub immutable tag/release and matching artifact assets.
- [ ] Existing Vercel production deployment from retained qualified static files, verified live.

No formal freeze, soak or calendar wait is required by the owner. Native screen-reader qualification remains explicitly deferred; phone checks are browser emulation and scripted beginner checks do not measure participant comprehension. Existing integration maturity and the inherited generated Next development-tool advisory remain unchanged.

The original 0.2.0 checkout, published 0.3.0 package/tag, owner's 0.3.1 local preview and other development worktrees are preserved.
