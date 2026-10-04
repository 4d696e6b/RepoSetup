# 0.3.0 companion website — first local slice

Date: 2026-10-04. Status: reviewable local website slice implemented and checked; not a website deployment or a completed 0.3.0 release.

## Phase position

This slice implements release **Phase 6 (information website)** and **Phase 7 (selection builder)** locally. Work is now in **Phase 8 (beginner usability and broader safety/accessibility validation)**. Across both branches, Phases 1–7 are implemented locally or qualified for their bounded scope; **3 phases remain**. See [combined phase progress](./STATUS_0.3.0.md) for the phase list, count definitions and CLI dependencies.

## Source isolation

- Worktree: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.3.0-website`.
- Branch: `codex/0.3.0-website`, created from recorded 0.2.0 candidate `145e167e6b60897da96942545ba6dbd40359ad4a`.
- The original candidate checkout remains at that commit; its three untracked planning files remain present and unchanged. Their copies here were checked byte-for-byte against the originals.
- CLI track: the current exact committed target is `aab82881bd8e4752b99041176cdc6df00a939718` on `codex/0.3.0-cli`. Neither sibling branch was merged; only reviewed committed shared files were copied.
- Shared selection schemas/tests/planner, registry semantic validation/export/search and delta safety originally came from committed `626fce9`. Curated beginner definitions and shared recipe/plan fixes now match committed `f99f63a`. The retained website-branch CLI parser is still 0.2.0 and is not the handoff target.
- AGENTS.md, product requirements and architecture document the owner’s explicit 0.3.0 website exception on this branch.

## Implemented scope

- Separate `apps/website` pnpm app, static Vite output and TypeScript DOM presentation; no UI or browser dependency in core.
- Goal discovery, name/goal/ecosystem/category/context filtering, nine integration detail pages, three minimal starter explanation pages, create/add builder and local usage guidance.
- Guidance covers purpose, timing, when unnecessary, examples, prerequisites, requirements/conflicts/included capabilities, alternatives, setup impact, official links, review dates, direct recipe versions, context/maturity and limitations. Other registry integrations are explicitly outside this beginner slice.
- React/Vite + TypeScript + pnpm and Express + TypeScript + pnpm offer Zod, Vitest, Prettier; FastAPI + uv offers Pydantic, pytest, Ruff. Optional choices start unselected. Framework/language/manager options remain fixed to the reviewed context; optional integrations expose no configurable option schema yet. Pydantic’s existing inclusion through FastAPI is explained.
- Registry produces the public catalog from curated definitions and checks all 24 create / 21 nonempty add variants with the real planner. No separate browser compatibility registry or resolver. Snapshot contains declarative selections, relationships and plan descriptions, no executable operations/source content/process capability.
- Safe name/relative-folder controls, understandable invalid/disabled choices, context-change resets, explicit starter versus existing-project mode, expected-impact summary, clipboard command and validated JSON download.
- Primary command uses committed `selection-v1`, not a speculative flag. UI labels the required exact **local development** CLI artifact and provides no unpublished/floating bootstrap. Normal command shows decoded choices/local plan and requires confirmation; preview-only is secondary; no `--yes`.
- True 3,072-byte / 4,096-character token and 4,200-character command bounds. File fallback uses the same envelope with `create --selection-file` / `add --config` and a fixed safe filename, bounded to 16 KiB. Current form choices fit tokens; semantic-equivalent whitespace overhead fixtures prove the larger file route without expanding supported choices.
- No publication, project upload, secrets, analytics, browser installation, local file inspection, persistent browser drafts or selection data in URLs.

## Initial slice checks and artifact evidence (historical `626fce9` target)

Environment: macOS arm64; development runtime Node `v24.21.0`; pnpm `12.5.1`. A temporary pnpm-provided Node runtime was used for qualification; system Node was not replaced.

- `pnpm test`: 482 passing unit tests (core 248, registry 15, integrations 121, retained CLI 91, website 7), no skips.
- `pnpm typecheck`: all workspace packages/app pass.
- `pnpm lint`: ESLint and Prettier pass, including regenerated snapshot formatting.
- `pnpm build`: all workspace packages/app pass. Browser bundle guard rejects Node/workspace runtime capabilities. App output: approximately 69 kB JS / 13 kB gzipped plus 6 kB CSS / 2 kB gzipped; only app modules and generated public JSON enter the browser.
- Website catalog tests: reproducible snapshot; committed source agreement; all finite selections; missing/unknown IDs/guidance/links, duplicate presets, incompatible contexts/options, executable/secret fields, stale contracts, hostile names/paths, counts and size bounds.
- `test:browser`: 8 passing Chrome/Playwright tests. Desktop 1440×1000, mobile 390×844; reflow checks at widths 320, 768, 1440. Axe WCAG A/AA scans on eight representative routes per browser profile; keyboard skip link/checkbox/focus, filters, invalid input, disabled choices, context resets, starter mode reset, copy and download equivalence. Screenshots: ignored `apps/website/test-results/{home-desktop,builder-desktop,builder-mobile}.png`.
- `pack:contract`: archived/built/packed exact CLI commit in a disposable directory, installed tarball in ignored `.local-cli`, no sibling working-copy files. Tarball `rsetup-0.3.0-alpha.1.tgz`, SHA-256 `eaa0ded71ce0bb957812229f9c59fec1834527beb614980457d56c61d9fdd098`. Local record: `apps/website/.local-cli/evidence.json`.
- `test:handoff`: 6 passing explicit packed-artifact tests; all 45 website create/add variants yield equivalent token/file JSON plans against detected fixtures, preserving project contents during dry-run; stale/hostile/options/context inputs refuse before mutation; true token boundary and larger-file fallback qualify; Bash/zsh transport requires confirmation. This gate fails rather than silently skipping when the pinned artifact/runtime is absent.
- Manual packed CLI PTY check: a website-generated Express starter command printed decoded selection and 11 local operations, then `Proceed with installation?`; answering `n` returned exit 2 and left the target directory empty. No installation was executed.
- `git diff --check`: pass. Original candidate HEAD/status and exact planning copies verified separately.

Initial checks exposed missing shared delta/error adapter prerequisites, a skip-link routing issue and a test that treated same-document hash navigation as a fresh page. Those were corrected and checks rerun. The initial Chrome-only suite passed; see the Phase 8 section for subsequent expanded coverage and the open WebKit failure.

## Phase 8 local validation slice

The website how-to now explains the shipped structural `--diff --dry-run` preview and narrow `doctor --config --fix` repair path, including the explicit confirmation step. A browser regression checks those instructions and the Prettier detail page; the local browser suite passes 27 cases across Chrome desktop/mobile and Firefox. The beginner-session protocol now includes planned maintenance follow-ups. Observed participants remain **0/5**, and manual accessibility/device and broader safety/platform gates remain open.

The first macOS 15 full-browser [run](https://github.com/4d696e6b/RepoSetup/actions/runs/37171450050) retained its report and passed 43/45 browser cases. Both WebKit keyboard cases failed at the first link-focus assertion: [macOS WebKit uses Option+Tab](https://bugs.webkit.org/show_bug.cgi?id=272584) for link focus when full keyboard navigation is off. The test now uses that native shortcut on macOS WebKit while retaining actual keyboard activation and focus assertions. The [clean-source rerun](https://github.com/4d696e6b/RepoSetup/actions/runs/37171882957) at `3443437` passed all six qualification checks and **45/45 browser cases** across Chrome desktop/mobile, Firefox desktop and WebKit desktop/mobile. Its retained full report records `automatedScopePassed: true` and `wholeReleaseQualified: false` against pinned CLI `84168ce` and tarball SHA-256 `e7bc83beb97e53e3826db0d4fb4d6c9d1a71109f5d146bbfe7d2d02fbcf7b7b5`. Manual screen-reader and physical-device checks, and observed beginner sessions, remain open.

Date: 2026-10-03. **Partial: automated local validation improved; observed sessions 0/5.**

- Invalid project names/folders have individual messages linked by `aria-describedby`, `aria-invalid` and a persistent atomic status region. Focus stays in the edited field; hidden create controls do not block add mode. The invalid review panel stays aligned with the form on desktop. Optional-library group guidance explains empty minimal create versus nonempty add.
- Fixed the main builder navigation link after direct entry/context changes: it now points to the current context rather than resetting the draft to a previous one. Learning pages preserve the in-memory choices without placing project names/tokens in requests, URLs or browser storage.
- Clipboard-denial tests verify the complete command is focused and selected for keyboard copying, with accessible feedback. Successful native command-copy status and JSON download equivalence pass in both tested engines; actual clipboard readback is checked in Chrome.
- Added [five-session protocol and record template](./BEGINNER_SESSIONS_0.3.0.md), including complete apply/preservation evidence, help/misstep reporting and retests. No sessions were fabricated or participants contacted. Real apply tasks depend on Phase 2 recipe qualification; later maintenance tasks depend on Phases 3–5.
- Fresh `pnpm test`: **483 passing unit tests** (core 248, registry 15, integrations 121, CLI 91, website 8), no skips. Workspace typecheck, lint and build pass. Public catalog regenerates unchanged; browser bundle remains app/public JSON only.
- Fresh `test:browser:local`: **21 passing tests**, zero skips/flaky cases, using Playwright 1.63.0, Chrome **154.0.8037.95** desktop 1440×1000 and mobile/touch emulation 390×844, and Playwright Firefox **155.0** desktop. Axe WCAG 2 A/AA and 2.1 AA scans cover **22 routes per profile**: goals, catalog, presets, usage, nine integrations, three preset details and all three create/add contexts. Reflow checks cover 320, 768 and 1440 widths. Browser/version annotations and results are in ignored `test-results/browser-report.json`; screenshots include `invalid-builder-desktop.png` and the existing home/builder views.
- Manual local in-app-browser accessibility-tree/visual review confirmed visible field feedback, preserved edit focus and disabled export in the invalid state, then recovery. This is an agent walkthrough, not VoiceOver testing or a beginner session.
- Fresh `test:handoff`: **6 passing packed-artifact tests**, including all 45 variants, true token/file limits, refusals, no-mutation previews and shell confirmation. The pinned CLI source/artifact identity above is unchanged. No actual installation was performed in this slice.

**Historical local WebKit failure.** `test:browser` attempted the five-profile/35-test matrix on macOS **14.7.2 arm64**. Chrome/Firefox's 21 tests passed; WebKit failed while setting up a page, before any website navigation, with `Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled`. After six setup failures the run was interrupted rather than waiting through every identical failure. Playwright supplied frozen macOS-14 WebKit **r2251** and warned that this platform no longer receives WebKit updates. Those 14 local WebKit cases were not counted; the later macOS 15 full run above supplies independent passing evidence.

`test:browser:local` selects only three profiles; the later macOS 15 `test:browser` run completes the full five-profile automated matrix. Mobile emulation does not qualify physical iOS/Android or Safari. Manual screen-reader, real beginner sessions and wider release/platform qualification remain open.

## Additional Phase 8 safety and repeatability work

2026-10-03: continued after the initial validation commit `d7020347a2a3b210bac5fb39f97f99b0ebf992df`.

- Built static HTML enforces a Content Security Policy that blocks fetch/WebSocket connections and form submissions and restricts executable/resource loading to the site. New browser checks demonstrate blocked network fetch, inert hostile route text and unknown-context refusal. Existing command copying and JSON download still pass. Development HMR is unaffected; this does not qualify production response headers.
- Packed handoff verifies recorded source/version, actual tarball SHA-256 and installed metadata/executable bytes before running the CLI. Four regression cases cover successful identity, stale/substituted artifacts, changed main/chunk bytes and missing chunks. Browser labels and packing share `src/handoff.ts`.
- `qualify:local` runs all six checks and records source commit/dirty flag/working-tree digest, runtime/platform and lockfile/catalog/CLI/asset hashes with per-step results/logs and browser evidence. Source changes during a run refuse a pass. `qualify` retains the full browser matrix. Reports explicitly preserve `wholeReleaseQualified: false` and remaining human/platform/maintenance/freeze gates; they cannot promote local success to release completion.
- Latest local run: **487 workspace unit tests** (website 12), **24 Chrome/Firefox browser tests**, **6 packed handoff tests** and workspace build/typecheck/lint passed. Report/logs under ignored `apps/website/qualification/`; screenshots remain under ignored `test-results/`. The first runner attempt exposed a missing Node URL import in lint; it was fixed and the complete local run passed.
- Committed implementation: `a891faff4a00117a4fdce6be8ea444ea4bfd05b7`. Clean-source verification report: `apps/website/qualification/2026-10-03T11-13-29.930Z-local/report.json`, `source.dirty: false`, all six checks passed, `wholeReleaseQualified: false`. An earlier clean-source rerun failed nine retained CLI unit tests when shared free space fell below the 512 MiB guard; its report/logs were preserved. Removing only this task's unusable downloaded WebKit cache recovered space, then the complete run passed without bypassing the guard. No user files or the CLI chat's fixtures were removed. WebKit binaries need explicit setup again on a compatible test host; the previous protocol failure remains recorded evidence.
- A manual-only macOS-15/Node-24 full qualification workflow is authored and YAML-validated, **not dispatched**. No remote project upload, publication or deployment occurred. The local Docker daemon did not respond, so it provided no alternative WebKit evidence. The existing WebKit page-setup failure and manual screen-reader/physical-device/session gates remain open.
- The CLI track subsequently committed its recipe/catalog changes as `f99f63a`. The new sync and fresh joint qualification are recorded below. Phases 3–5 remain CLI-owned dependencies; no unsupported maintenance flags are displayed.

## Committed catalog and recipe sync

2026-10-03: synchronized the exact shared core/integration files from CLI commit `f99f63a198986c30bba92dc1cd6af2ec68ec87e9`, regenerated public catalog `0.3.0-cli.2`, and changed the website's displayed development CLI identity to that commit. The updated definitions include the CLI track's locally qualified React/Vite, Express and FastAPI create recipes. Its 24/24 real-create result is macOS/Node 24/Python 3.13 evidence; full advertised platform coverage and real add/repeat checks remain Phase 2 work.

- `pack:contract` archived and packed exactly `f99f63a` without using the CLI sibling working tree. The local `rsetup@0.3.0-alpha.1` tarball SHA-256 is `c31f66de784ba49a83637bb4a23b5b81842857405c21df18b8e07203525302ad`; the generated `.local-cli/evidence.json` records this identity.
- Workspace build, **498 unit tests** (core 254, registry 15, integrations 126, retained CLI 91, website 12), typecheck and lint pass. The six packed handoff tests pass across all 45 selections, checking token/file plan equivalence, refusal and confirmation safety. All 24 Chrome desktop/mobile and Firefox browser tests pass with the regenerated catalog and displayed identity. The clean-source qualification report records the final implementation commit separately.
- This sync does not make the website a released support claim. WebKit on this host, manual screen-reader/device checks, five observed beginner sessions and later maintenance/release gates remain open. The phase count stays at seven remaining.

The earlier seven-remaining count was correct for the 2026-10-03 CLI snapshot. With the later committed CLI work, Phase 8 is partial, 0/5 observed sessions, and three release phases remain. There is no claim that every release task has been completed.

## 2026-10-04 catalog and CLI alignment

The website's curated catalog and relevant recipe files now match committed CLI `8950efb3c09d4705576b9ec0802f0c89d841c91d`; the generated public revision is `0.3.0-cli.3`. The displayed local development CLI identity and packer target match that commit. This synchronizes information and handoff claims without bringing the CLI parser/executor into the browser or changing either sibling checkout.

Using Node 24.21.0 and pnpm 12.5.1, the updated tree passed **498 workspace unit tests**, typecheck, lint and build. The local Chrome desktop/mobile and Firefox browser gate passed **24/24** cases; the packed exact-commit handoff gate passed **6/6** cases, covering all 45 create/add variants. The packed tarball SHA-256 is `13484072d64b72ef9e99eae9f1449c836da60e3e96fb2b6e5ac8bb9e49c22080`; its ignored evidence file records the source, runtime and platform. The prior WebKit failure and manual accessibility/participant/platform gates remain open.

The first clean-source `qualify:local` run at `07df584` found a retained CLI idempotency fixture that expected pytest to be complete without the new recipe's `test_main.py`. The fixture was corrected to include that user-owned test file; no product code or assertion was bypassed. The rerun at clean commit `be8b2bc7a7b5778ffb36dce445453c346a5badac` passed all six qualification steps with `automatedScopePassed: true` and `wholeReleaseQualified: false`. Its ignored report is `apps/website/qualification/2026-10-03T17-11-30.239Z-local/report.json` (UTC timestamp; 2026-10-04 in Bangkok). This evidence qualifies only the named local Chrome/Firefox/packed-contract scope.

## 2026-10-04 Phase 8 handoff guidance

The local how-to page now shows the exact `pack:contract`, POSIX PATH and version-check commands needed before pasting the website's selection command. It names the pinned CLI commit, Node 24 prerequisite, artifact evidence path and the published 0.2.0 incompatibility. This removes the previous dependency on finding `apps/website/README.md` from within the static site. A browser regression checks the setup text against the same `handoff.ts` identity used by the packer. The website still does not install or run anything in the browser.

The project recheck found a content correction: shared curated limitations still said Phase 2 minimal and transport qualification was pending, although the CLI status recorded the completed six-cell and native-transport matrix. That wording was corrected in the committed CLI curated definitions and synchronized below; no separate website compatibility registry was added. Observed sessions remain 0/5.

After the on-page setup change, the CLI track committed a symlink-evidence refusal for narrow repairs at `84168ce52e7dee19f7ac598e3f111f75a3b0c962`. The website then pinned that safer committed artifact. Selection definitions and catalog revision `0.3.0-cli.3` were unchanged from `8950efb`; its tarball SHA-256 was `e7bc83beb97e53e3826db0d4fb4d6c9d1a71109f5d146bbfe7d2d02fbcf7b7b5`. All six packed handoff tests passed against it. This website branch still does not copy the CLI's parser or repair executor.

## 2026-10-04 Phase 8 catalog wording correction

The curated limitation text now reflects the retained bounded packed create/add and selection-handoff results, while still stating that 0.3.0 has not been released. The shared definition comes exactly from committed CLI `aab82881bd8e4752b99041176cdc6df00a939718`; the generated website catalog is `0.3.0-cli.4`, and the local packed CLI at that commit has SHA-256 `6db8e0553f4b451293fbef831f8e2f95254c6c28e49ace476b847d96c7542f9a`. The selection envelope remains version 1 and the 45 typed-plan fingerprints are unchanged. The [clean-source full qualification](https://github.com/4d696e6b/RepoSetup/actions/runs/37173720358) at website commit `fa39a12` passed build, unit, typecheck, lint, six packed handoff cases and **45/45 Chrome/Firefox/WebKit browser cases**. The qualification script now names the remaining cross-branch candidate, soak, human-session and delivery gates; the report still leaves whole-release qualification false.

## Working routes / review

Run from this worktree: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm website:dev`. Local default: `http://127.0.0.1:5173/`; built preview can use port 4173.

- `/#/` — goals
- `/#/integrations` and `/#/integrations/{id}` — catalog and all nine library pages
- `/#/presets` and `/#/presets/{id}` — comparisons and three explanations
- `/#/builder/{contextId}` — bounded new-project builder; `?mode=add` — additive journey
- `/#/how-to` — prerequisites, preview, confirmation, stale catalog, doctor and file guidance

See [app development and exact artifact setup](../../../apps/website/README.md). Put the generated `.local-cli/bin` on PATH with Node 24 before pasting selection commands; the website branch’s retained CLI parser is deliberately not advertised as a selection consumer.

## Dependencies and gates still open

The committed CLI selection contract is available and the local website handoff is integrated; there is no remaining schema blocker for this slice. The CLI track has since qualified its bounded create/add and native selection transport matrix on Linux, macOS and Windows. Public advertising still depends on a qualified released CLI/version-pinned launcher. Manual screen-reader/physical-device checks, five observed beginner sessions, and later release qualification remain gates. The automated WebKit matrix and packed/platform repair safety suite have passed; the website's packed dry-run/confirmation evidence does not itself establish installation success or freeze transitive dependencies. None of the human gates is silently marked complete.

The shared curated catalog still says that minimal variants and selection transport need packed cross-platform qualification. That sentence predates the completed Phase 2 matrix and is now stale. It must be corrected in the committed CLI definitions and resynchronized here before release; the website will not maintain a separate compatibility registry to override it.

This task does not implement CLI diff previews, intended-stack doctor, repair, additional integrations/options, system prerequisite installation, production hosting or release publication. Later catalog/contract changes require regeneration and joint packed qualification against a newly committed identity before updating the displayed CLI target.
