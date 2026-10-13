# Stable 0.3.1 release record

Status: preparation and qualification in progress; not yet published. Owner authorized npm, GitHub and existing website delivery on 13 October 2026.

## Scope

The patch corrects repeated no-op `remove --json` returning text. Four regression variants prove the versioned empty plan, unchanged files and no prompt/process execution. The stable package retains the 0.3.0 registry revision, selection-v1 format and supported contexts. No automatic dependency repair or new integration qualification is advertised.

The 0.3.1 documentation expansion is a separate development branch and is not included. The website is repinned to this CLI patch and retains the current theme and existing routes. Active labels, install examples and no-JavaScript fallback follow the pinned version; 0.3.0 publication history is retained.

## Qualification and delivery gates

- [x] Exact stable CLI artifact and website handoff pin: CLI source `f306e1c877887fe9c2861619ea434a26b996fe2c`, tarball SHA-256 `34a8d5f871333f248af45c28b9d2aa2bde466f04cc23f10d4d395856be827135`, 133,641 bytes.
- [x] Local workspace tests (1,226 passed), typecheck, lint and build. Packed-selection tests: 105 passed; release preparation/workflow tests: 29; release context/handoff/publication gates: 71. Targeted Chrome desktop/mobile and Firefox version/fallback/navigation tests: 9 passed.
- [ ] Three consecutive successful first-attempt full release qualification runs at one unchanged SHA.
- [ ] Packed selections and real bounded create/add/legacy checks.
- [ ] Full five-profile website qualification and published-byte verification.
- [ ] npm trusted publication and three-platform registry acceptance.
- [ ] GitHub immutable tag/release and matching artifact assets.
- [ ] Existing Vercel production deployment from retained qualified static files, verified live.

No formal freeze, soak or calendar wait is required by the owner. Native screen-reader qualification remains explicitly deferred; phone checks are browser emulation and scripted beginner checks do not measure participant comprehension. Existing integration maturity and the inherited generated Next development-tool advisory remain unchanged.

The original 0.2.0 checkout, published 0.3.0 package/tag, owner's 0.3.1 local preview and other development worktrees are preserved.

## Preparation findings

The initial website gate at `771967df0afc3443918e650a81f386a6d5411be7` passed build, unit, typecheck, lint and exact-artifact handoff but reported 394/405 browser cases. Ten failures exposed stale integration labels and no-JavaScript fallback identity. One WebKit case read an old heading link before the new page rendered. Active labels/examples now follow the shared handoff; build-only HTML regression tests guard the actual previous and current published fallback; the heading-link test waits for the target page and URL.

The three in-progress full release runs at that earlier SHA (`38379546722`, `38379551008`, `38379556068`) were cancelled because the website corrections require a new exact-source qualification. They are not publication evidence. No test expectations, safety limits or required jobs were removed.
