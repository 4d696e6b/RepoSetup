# RepoSetup 0.2.3 website implementation status

Updated: 2026-10-09. Branch: `codex/0.2.3-website`.

## Scope and source

The owner requested a separate modern website for the already-published CLI
0.2.3, before publishing the next CLI release. This branch starts at published
`v0.2.3`, commit `a213a6a1edf63771aba8d5b91bfdcf44d665de22`.
The existing candidate and later-release worktrees were preserved.

The website is a separate private pnpm application at `apps/website`. No core,
integration, registry, or CLI release implementation was changed. Public IDs,
schemas, relationships, flags, capability labels, and preset contents are
generated from the pinned source. The build refuses drift from those definitions.

## Milestones

1. **Release foundation — implemented.** Verified the published npm delivery and
   GitHub release; generated references for all 37 integrations, five presets,
   and 11 public command entries. Kept exact version-pinned install commands.
2. **Visual renovation — implemented.** Warm ivory and charcoal design, large
   typography, supplied logo and stack artwork, accessible navigation, mobile
   layouts, integration discovery, recipe explanations, and release notes.
   Assets came from the chat “Create RepoSetup logo” and are copied unchanged.
3. **Documentation and local handoff — implemented.** 72 documentation pages:
   14 authored guides, five reference indexes, 11 command references, 37
   integration references, and five preset references. Sidebar, breadcrumbs,
   heading links, table of contents, previous/next links, and local search work
   with direct hash links. The bounded builder downloads exact preset configs
   with an explicit child-directory destination. Its preview and create commands
   use the published `--config` behavior and retain execution confirmation.
4. **Local validation and review — complete.** Unit, Chrome/mobile/Firefox browser,
   published npm handoff, workspace checks, and visual inspection passed. A full
   WebKit run and manual publication review remain in the release-readiness work.
5. **Motion renovation — implemented.** Sequenced headline entrances, floating
   supplied artwork, pointer-responsive depth on desktop, rotating orbit rings,
   decorative beacons, scroll reveals, illustration hover effects, and brief
   search-dialog motion. Click targets stay fixed and text retains full contrast.
   Docs reading text stays static. At the owner's request, the Motion toggle and
   saved pause choice have been removed; effects stay active by default and live
   system reduced-motion preferences take precedence. Decorative loops pause offscreen
   or in hidden tabs; route cleanup removes observers, animations, and pending
   pointer frames. No animation dependency or release behavior was added.

6. **Vercel publication — deployed.** The owner
   explicitly authorized Vercel publication after the final release audit.
   The static Build Output API artifact has ten public files, release-specific
   CSP/security/cache headers, and no functions or runtime environment variables.
   Preparation rejects unexpected files and symbolic links; asset provenance and
   prompts stay local. The new `reposetup` project is linked in `mink2551s-projects`.
   The original publication disconnected Git; the follow-up below reconnects it
   with exact branch and build guards to protect the website's 0.2.3 scope.

7. **Custom domain and production checklist — in progress.** The owner added
   `reposetupcli.com` and requested all Vercel checklist items. Apex and `www`
   are attached to the project; `www` redirects to the apex with HTTP 308.
   Hostinger DNS still points at its parking service, awaiting browser sign-in.
   Web Analytics is enabled in the project. App-only SDKs count canonical public
   pages and performance, excluding project/config/search data; local and unknown
   preview hosts do not initialize them. Git build configuration and the
   project-level ignored-build gate reject all branches except
   `codex/0.2.3-website`. GitHub is now connected to `4d696e6b/RepoSetup` and
   that branch is pushed. The Git preview passed its cloud build and was promoted
   to production; public HTTP and browser checks passed. Dashboard access is needed to select the
   production branch. Standard Speed Insights is free; Plus requires Pro and
   a separately approved subscription. No paid upgrade has been performed.

The original six implementation/publication milestones are finished. Public HTTP and
browser smoke checks verify the deployed site. Compatible WebKit/Safari and manual
assistive-technology review remain open qualification work. The website uses
published 0.2.3 and does not wait for another CLI release.

## Working pages

Local review: `http://127.0.0.1:4182/` while the preview process is running.
Public website: [reposetup.vercel.app](https://reposetup.vercel.app/).

- Home: `#/`; documentation/search: `#/docs`.
- Getting started: `#/docs/getting-started`; all public commands: `#/docs/cli`.
- Integration discovery: `#/integrations`; details: `#/integrations/<id>`.
- Preset explanations: `#/presets`; config handoff: `#/builder/<preset-id>`.
- Release notes: `#/release`.

Worktree:
`/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/RepoSetup-0.2.3-website`.

## Production deployment

- Project: `reposetup`, account/team: `mink2551s-projects`.
- Current source commit: `56317054e2897c02eb651b8c8b9578b7ac8dbae9` on `codex/0.2.3-website`.
- Current deployment: `dpl_5ofxVpQpuu7Sp1q1gBQwi7xZWtGd`, production, `READY`.
- Public alias: `https://reposetup.vercel.app/`.
- Immutable deployment URL:
  `https://reposetup-o1piu56rn-mink2551s-projects.vercel.app`.
- The public alias returns HTTP 200 without authentication. CLI login protection
  may apply to deployment-specific URLs; it does not block the public alias.
- GitHub is connected. Project and checked-in guards allow builds only from
  `codex/0.2.3-website`. Production branch tracking still reads `main`; the ignored
  build gate refuses that branch. Until dashboard access sets the website branch,
  its pushes create previews and promotion is explicit. The website artifact has
  ten static files and no app functions or runtime secrets; Vercel provides the
  observability collection endpoints.
- Original production deployment: `dpl_3SNVo8qpCaz56Dv5cyqHf1Sx4WHt`, source
  `3fdb1f52984af914caf491f6d06160cad0e9df5d`. Earlier checks below describe that
  deployment; the follow-up checks describe the current update.
- Production verification report stays local in ignored
  `.vercel/production-verification.json`.

## Validation

- Published-package verification: 46 checks passed against the pinned npm
  archive, verified with SHA-256 and npm SHA-512 integrity. Both aliases, public
  help and flags, read-only commands, every preset and downloaded-config preview,
  confirmation abort, and invalid/unshipped inputs were checked. No project
  installation ran.
- Baseline `pnpm test`: 1,062 tests passed. The publication follow-up reran
  website unit/integrity checks with six new deployment boundary cases:
  **25 tests passed**. CLI/core/integration source is unchanged from the release.
- `pnpm --filter @reposetup/website test:browser:local`: 48 tests passed in
  desktop Chrome, mobile Chrome emulation, and Firefox. There were zero reported
  WCAG A/AA violations in 63 automated Axe page/viewport scans.
- `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
  The final browser test type annotation was corrected before the passing
  typecheck; earlier failed test assertions and tooling issues are resolved.
- Home, docs, builder, and mobile layout were visually inspected. All rendered
  artwork decodes successfully; original image and prompt bytes are unchanged.
- Browser cases cover 119 direct routes at 320px, responsive reflow, downloads,
  search and keyboard navigation, heading/history links, copy feedback, hostile
  text, connection-blocking CSP, and the no-JavaScript guide link. Axe checks
  seven representative pages at 390, 768, and 1440px.
- Motion coverage adds 18 browser cases across the same three profiles: initial
  and live reduced-motion preferences, always-active defaults through navigation
  and reload (including obsolete saved pause state), keyboard use, early pointer
  exits, workflow-anchor focus, 320/390/768/
  1440px overflow checks, route cleanup, direct docs entry, search, and preset
  downloads. The publication follow-up reruns the 25 website unit checks and
  46 published-package handoff checks. The supplied artwork bytes remain intact.
  Early-click regression testing caught moving link containers; entrance motion
  now targets surrounding text and artwork while interactive targets stay fixed.
  Desktop and mobile visuals were inspected in the local browser after the fix.
- A validation-only macOS 15 workflow includes Chromium, Firefox, and WebKit.
  It has not been run remotely. The earlier WebKit launch failed on this local
  macOS 14.7.2 host; Safari/WebKit qualification remains open. Use a compatible
  runner rather than treating the Chrome/Firefox results as Safari evidence.
- Production HTTP verification: **25 checks passed**. All ten public files match
  local build bytes with SHA-256 comparisons; homepage access is anonymous;
  CSP, framing/MIME/referrer headers and cache behavior match the artifact.
  Source, local environment files, prompts, provenance notes, and missing assets
  return 404. Live docs heading focus, keyboard search, builder commands, mobile
  layout, and the header without the Motion toggle were checked in the browser.
- `pnpm --filter @reposetup/website test:production`: **six browser tests passed**
  against the public alias in Chrome, mobile Chrome emulation, and Firefox.
  All five preset downloads were captured in each browser (15 downloads) and
  compared exactly to the released recipe with only the chosen name/path changed.
  Public 0.2.3 commands, confirmation, docs links, keyboard search, decoded images,
  no toggle, and no JavaScript errors were verified. The production smoke tests
  are included in a follow-up validation/status commit; the deployed browser
  artifact remains the source build at `3fdb1f5`.

## Remaining qualification work and limits

- Review the finished appearance and run the full compatible WebKit/Safari
  check. Automated accessibility checks supplement manual assistive-technology
  review; they do not establish complete accessibility conformance.
- The added production-checklist milestone is still in progress, including DNS,
  production branch selection and review of the paid Plus upgrade. No user project upload,
  installer execution, or secret request occurred.
- The site intentionally has a preset-only download builder. Arbitrary optional
  library selection uses the shipped CLI's interactive flow or reviewed config;
  later-release selection flags are not presented.
- Preset labels do not promote their experimental integrations. Representative
  live database evidence does not qualify arbitrary combinations, deployments,
  migrations, native Windows 11, Linux arm64, or generated-app browser journeys.
- Hash routes need JavaScript; a version-pinned GitHub user guide is available
  when JavaScript is disabled. No server search, accounts, or browser installer
  is needed.

## Production checklist follow-up checks

- Website tests: **37 passed**, including exact branch gates, shallow-history
  baseline recovery, bounded analytics routes, URL redaction, suppressed custom
  events and local/preview host exclusion.
- Local browser matrix: **48 passed** after the analytics/privacy changes;
  desktop Chrome, mobile Chrome and Firefox retain working docs and builder.
- Workspace typecheck, lint, build and the exact declared Vercel build command
  passed. An empty manifest and truncated executable in the local npx pnpm cache
  initially prevented that command; the cache was repaired using the existing
  working pinned pnpm executable. Generated handoff sandboxes were cleared to
  recover disk space, preserving the verification report.
- The project API rejected an overlong inline build command. Build logic now
  lives in `scripts/build-vercel.ts`; the short command and pinned install were
  accepted in project settings. Length checks prevent regression. The updated
  command passed a real local build and artifact preparation.
- Published-package handoff: **46 checks passed** again after the follow-up,
  with no installer execution or changes to user projects.
- A Git preview of `5631705` reached READY, with all 37 tests passing in Vercel's
  cloud build. A preceding preview failed schema validation because `public` is
  not a supported `vercel.json` field; it was removed and a schema-subset check
  added. The corrected preview was promoted to the current production deployment.
- Current public HTTP checks: **25 passed**. All ten static files match local
  bytes, security/cache headers match, private/source/missing files return 404,
  and both Vercel SDK scripts return 200. Report:
  `.vercel/checklist-verification.json` (ignored).
- Current production browser suite: **nine passed** across Chrome, mobile Chrome
  and Firefox. It checks docs/search, all 15 preset downloads, real hosted SDK
  scripts, canonical page-view and performance payloads, and absence of private
  URL/config/project/search values. Vercel's scripts skip automated browsers by
  design. The SDK test emulates a regular browser and intercepts collection so
  it does not inflate production statistics. This verifies payload construction
  and CSP, not the dashboard's reception of actual visitor data. Initial timeout
  and CSS-selector assertions were corrected before the passing suite.
- Native in-app browser review verified the published footer privacy link and
  heading focus. Screenshot: `.vercel/checklist-privacy.jpg` (ignored).

## Remaining account actions

- **Custom domain:** Hostinger sign-in is required to replace parking DNS. Vercel
  currently recommends apex A records `216.198.79.1` and `64.29.17.1`, and
  `www` CNAME `3a0fe97223ab7ad2.vercel-dns-017.com`. Existing apex A is
  `2.57.91.91`, apex AAAA is `2620:101:9000:53::55`, and `www` points back to
  the parked apex. Recheck Vercel recommendations before changing records;
  remove the parking-only AAAA and preserve unrelated DNS records. Then verify
  DNS, apex HTTPS and the configured `www` → apex 308 redirect. Ownership is
  verified in Vercel, but both domains remain DNS-misconfigured.
- **Production branch:** Vercel browser sign-in reached its authenticator screen.
  Complete sign-in there, then select `codex/0.2.3-website` in Environments →
  Production → Branch Tracking. Keep the exact project-level ignore gate.
- **Speed Insights Plus:** No paid upgrade was made. Current team is Hobby.
  Standard Speed Insights SDK is deployed and free. Official pricing currently
  requires the $20/month Pro platform plan, plus $10/project/month for Plus and
  $0.65 per 10,000 Plus events, before other usage/taxes. Review the account's
  checkout and obtain explicit spending approval before purchase; Pro also
  changes Web Analytics to usage billing. Sources:
  [Pro plan](https://vercel.com/docs/plans/pro-plan),
  [Speed Insights pricing](https://vercel.com/docs/speed-insights/limits-and-pricing),
  [Web Analytics pricing](https://vercel.com/docs/analytics/limits-and-pricing).

Three of the five requested checklist actions are completed: Git connection,
preview deployment, and Web Analytics. Custom-domain DNS and the paid Plus
upgrade remain. No newer CLI contract is required for these account actions.
