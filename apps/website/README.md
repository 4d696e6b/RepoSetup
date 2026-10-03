# RepoSetup companion website — local 0.3.0 slice

A static Vite/TypeScript app in the pnpm workspace, with no runtime framework dependency. English-first pages explain nine reviewed integrations and three starter contexts: React/Vite + TypeScript + pnpm, Express + TypeScript + pnpm, FastAPI + uv. Only their three optional capabilities per context are selectable; 24 create / 21 nonempty add variants are validated at build time by the real registry/core planner. All paths remain candidate maturity.

## Start locally

Use Node 24 and the workspace’s pnpm version. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm website:dev
```

Open `http://127.0.0.1:5173`. Hash routes work with a static server:

- `/#/` — goals and the learn/choose/review journey
- `/#/integrations` and `/#/integrations/zod` — search/filter and library explanations
- `/#/presets` and `/#/presets/beginner-fastapi` — compare minimal starters and optional tools
- `/#/builder/react-vite-ts-pnpm` — new-project selection
- `/#/builder/express-ts-pnpm?mode=add` — existing-project capability selection
- `/#/how-to` — prerequisites, confirmation, stale-input and fallback guidance

Nothing is published. Vite preview serves the built output locally; it is not a production hosting service. No analytics, uploads, accounts, secrets, project scanning or browser installation are included. Drafts stay in memory; selections are not saved in URLs or browser storage.

## Matching CLI artifact: required before pasting commands

The displayed `reposetup create|add --selection TOKEN` command is available in the **local development CLI** `rsetup@0.3.0-alpha.1`, exact committed source `626fce93214af8554c3a0700ead52c5e3db8ae7a` on `codex/0.3.0-cli`. It is not advertised as a published CLI. The retained 0.2.0 parser in this website branch does not implement selection flags. Do not use a floating npx/npm bootstrap or the published 0.2.0 binary with these commands.

Prepare that exact artifact without changing the CLI or candidate checkout:

```sh
pnpm --filter @reposetup/website pack:contract
export PATH="$PWD/apps/website/.local-cli/bin:$PATH"
reposetup --version
```

The tool uses `git archive` of the recorded commit, builds in a disposable directory, packs, installs the tarball into ignored `.local-cli/installed`, and records source/version/Node/platform/SHA-256 in `.local-cli/evidence.json`. It requires Node 24 on PATH and uses argument-array processes. It does not install system prerequisites or touch either sibling checkout. If the commit is missing, fetch/restore the CLI track locally before running; never silently target a different commit.

Now use the browser’s primary Copy RepoSetup command. For create, paste in the parent directory of the new folder. For add, paste in the existing project package directory. The CLI decodes and shows the actual local plan, then asks for interactive confirmation. It refuses noninteractive execution and `--yes` for selections. Preview-only is available as the secondary `--dry-run` command.

For large selections the exporter checks 3,072 decoded bytes, 4,096 token characters and 4,200 complete command characters including the preview suffix. It switches to a validated file handoff rather than truncating. Download `selection.json` and run the displayed command from that directory:

```sh
reposetup create --selection-file selection.json
reposetup add --config selection.json
```

File limit: 16 KiB. Current bounded form selections all fit the token route. Tests use semantically identical JSON whitespace overhead to exercise the true token boundary and larger file route with the packed CLI. The file does not expand supported library/context choices.

## Shared data and boundaries

`packages/integrations/src/beginner-catalog.ts` is the curated education/preset source synchronized verbatim from the committed CLI contract. `packages/registry/src/selection.ts` validates it and every finite subset against the actual core planner. Registry’s `createWebsiteCatalog` adds public definition names/relationships and plan **descriptions**, never operations, commands, generated source content or executable functions. The website build writes `src/generated/catalog.json`; its committed snapshot is checked for reproducibility.

The website only chooses a generated variant and validates name/folder controls; it does not reimplement integration compatibility. Browser serialization is checked against the committed core decoder and packed CLI. Type imports erase at build time; the Vite bundle guard refuses Node/workspace runtime modules. UI dependencies exist only in the app. A catalog update must rerun generation, selection tests and packed joint qualification before changing the displayed CLI identity.

Built HTML also applies a Content Security Policy: scripts/styles and resources are restricted to this static site, network connections and form submissions are blocked, and object/base injection is refused. Browser tests check blocked fetch and literal hostile route text alongside working copy/download flows. This is a built-preview policy; Vite development HMR is unaffected. It does not replace validation or qualify a future hosting provider's headers.

The branch starts at candidate `145e167e6b60897da96942545ba6dbd40359ad4a`. Shared core selection files/tests, registry validation/export/search, integrations guidance/presets/catalog exports, dependency delta safety and the CLI’s error-code mapping are synchronized from `626fce9`; CLI parsing/execution changes stay on the CLI track. The CLI mapping is the one-line compatibility adapter for the new shared error type. Resolve identical shared changes normally when integrating the independently reviewed tracks; do not copy the website parser into core.

## Checks

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @reposetup/website test:browser
pnpm --filter @reposetup/website test:browser:local
pnpm --filter @reposetup/website test:browser:webkit
pnpm --filter @reposetup/website pack:contract
pnpm --filter @reposetup/website test:handoff
pnpm --filter @reposetup/website qualify:local
# On a compatible host, require the entire browser matrix:
pnpm --filter @reposetup/website qualify
```

Handoff tests are a separate explicit gate and fail if the pinned artifact or Node 24 is missing; there are no hidden skips. They validate every exported create/add variant, token/file plan equivalence, no project mutation during previews, actual detected-context refusal, stale/hostile inputs, real size boundaries, and Bash/zsh launch with confirmation required.

Before any CLI execution, qualification verifies the committed target/version, the recorded tarball SHA-256 and byte equality of the installed package metadata and all executable chunks with that tarball. Altered or missing local artifacts fail; `pack:contract` is an explicit preparation step. Browser labels and the packer use one target in `src/handoff.ts`.

`qualify` runs artifact verification, workspace build/unit/typecheck/lint, packed handoff and the full browser suite, stopping on failure. `qualify:local` explicitly selects Chrome/Firefox instead. It writes timestamped, ignored `qualification/<run>/report.json`, step logs and the browser report; records commit/dirty flag/working-tree digest, Node/platform, lockfile/catalog/artifact/build-asset hashes; and refuses source changes during a run. Its `automatedScopePassed` result applies only to the named scope. `wholeReleaseQualified` stays false because human, platform, maintenance and freeze/soak gates require separate evidence. No installation into a project, publication, upload or automatic test-browser setup occurs.

The manual-only [website qualification workflow](../../.github/workflows/website-qualification.yml) prepares the full test matrix on macOS 15 with Node 24. It is authored, not dispatched or proven by the local run. It requires the exact pinned CLI commit in repository history and Chrome on the runner. It performs no deployment or project upload; changing source/catalog/CLI identities requires a fresh joint run. Native Windows qualification remains separate because this tool currently checks POSIX launchers.

`test:browser` is the full five-profile gate: Chrome desktop/mobile, Firefox desktop and WebKit desktop/mobile. `test:browser:local` explicitly selects the three locally verified Chrome/Firefox profiles; `test:browser:webkit` retains the separate open WebKit gate. Tests cover all 22 routes with axe WCAG A/AA scans, keyboard controls, copying/downloading, invalid linked-field errors, context/draft preservation, clipboard denial, no data transmission/storage and reflow at 320, 768 and 1440 pixels. Browser versions and screenshots are saved under ignored `test-results/`. Mobile profiles emulate viewports/touch, not physical devices.

Chrome must already be installed. Obtain the matching test-only Firefox/WebKit binaries explicitly if needed:

```sh
pnpm --filter @reposetup/website exec playwright install firefox webkit
```

Builds, tests and the website do not automatically install browsers or system prerequisites. This local qualification downloaded those test binaries to Playwright's user cache; no OS packages were installed. On macOS 14.7.2 arm64, Playwright 1.63.0's frozen WebKit r2251 fails page setup with `Unknown setting: PushAPIEnabled`; the full browser gate therefore fails on this host. Keep the gate open and rerun on a compatible platform without removing assertions or counting unavailable tests as passing. See [current validation evidence](../../docs/specification-documentation/implementing-docs/STATUS_WEBSITE_0.3.0.md).

## Remaining release gates

Publication/version-pinned bootstrap and native Windows/Linux transport are unqualified. WebKit, physical-device checks, screen-reader/manual accessibility, five beginner sessions, and independent minimal recipe/optional subset execution qualification remain release gates. Chrome/Firefox local automated checks pass. Use the [beginner-session protocol](../../docs/specification-documentation/implementing-docs/BEGINNER_SESSIONS_0.3.0.md) for actual observations; none have been recorded. This slice verifies handoff planning and confirmation safety; it does not claim a complete 0.3.0 release or promote any integration to stable. CLI previews/doctor/repair work outside selection-v1 remains on its own track.

## Research checked 2026-10-03

The build/dev/preview behavior was checked against [Vite’s official guide](https://vite.dev/guide/) and [static build guidance](https://vite.dev/guide/build.html). Form labeling follows [WAI’s labeling guidance](https://www.w3.org/WAI/tutorials/forms/labels/); browser checks use [Playwright assertions](https://playwright.dev/docs/test-assertions). The nine integration guidance links were opened against current official project documentation; recipe setup/pins still come from the committed curated definitions and recorded parent evidence, not latest upstream versions. Hosting choice and published bootstrap remain research-required.

Phase 8 linked-field feedback follows [WAI form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/). Clipboard recovery was checked against [MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText). Binary/engine and mobile-emulation limits follow [Playwright browser guidance](https://playwright.dev/docs/browsers); the macOS-14 WebKit failure above is direct local test evidence.

The build-only HTML policy uses [Vite's plugin API](https://vite.dev/guide/api-plugin) and [MDN CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), including its [form-action directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/form-action). The manually authored runner follows [Playwright CI guidance](https://playwright.dev/docs/ci) and [JSON reporter guidance](https://playwright.dev/docs/test-reporters). Local logs demonstrate only the local scope; the new workflow has no remote execution evidence.
