# RepoSetup 0.2.3 website

A local, English-first companion to the published `rsetup@0.2.3` CLI. This app
contains the landing page, documentation, local search, all 37 integration
references, the five bundled presets, and a bounded recipe builder. This branch
does not document future release behavior.

## Source and browser boundary

The release catalog is generated from the immutable
[`v0.2.3` source](https://github.com/4d696e6b/RepoSetup/tree/v0.2.3), commit
`a213a6a1edf63771aba8d5b91bfdcf44d665de22`. The generator checks the package and
built CLI versions and refuses changes to the release's core, integration,
registry, and CLI definitions. It projects facts, public help, options, and
support labels into `src/generated/release.json`.

The public browser consumes that JSON and authored explanations. It does not
bundle CLI execution or installation logic. Integration maturity, preset labels,
and qualification scope remain distinct. Registry presence does not qualify
every possible combination.

## Local development and review

Use Node.js 24 or newer and the repository's pinned `pnpm@12.5.1`. Install
dependencies and build from the monorepo root so the catalog can inspect the
built release CLI:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @reposetup/website preview --port 4180 --strictPort
```

Open [the local site](http://127.0.0.1:4180/) or
[the documentation](http://127.0.0.1:4180/#/docs). For source changes, use the
development server after the workspace packages have been built:

```sh
pnpm --filter @reposetup/website dev
```

The website build regenerates the catalog, runs unit and integrity tests, and
writes `apps/website/dist`. Preview serves the existing build; rebuild after
changing source to review the production result. Vite preview is a local review
server, not a production server. See the official
[pnpm installation guide](https://pnpm.io/installation) and
[Vite local preview documentation](https://vite.dev/guide/static-deploy.html#testing-the-app-locally).

## Motion and accessibility

The home page uses sequenced headline entrances, floating supplied artwork,
pointer-responsive depth, orbit rings, scroll reveals, and illustration hover
effects. Documentation reading text stays static. Text retains full opacity and
contrast during entrance and modal motion. Buttons, links, and form controls
remain in fixed positions while surrounding text and artwork animate.

Use the header's Motion button to pause or resume animations. The choice is
remembered locally in the browser. System reduced-motion preferences always take
precedence, including changes while the page is open. Keyboard focus finishes
an element's entrance immediately. Decorative loops pause when the hero is
offscreen or the tab is hidden; route changes remove observers and pending
pointer frames. Touch devices do not get pointer tilt. No animation dependency
or browser installation capability was added.

## Intentional recipe handoff

The builder offers exactly the five released bundled presets and a validated
project name. It changes no library options or recipe ingredients. Downloaded
configuration explicitly sets both `project.name` and `project.path` to that
name, creating a fresh relative destination.

This is deliberate: the published preset command can override a preset's name
without setting its destination. A preset without `project.path` targets the
current directory (`.`). The website therefore hands off an explicit-destination
config instead of suggesting a preset command creates a named child folder.

Download `reposetup-my-app.json`, save it in the parent directory, and run:

```sh
npx rsetup@0.2.3 create --config reposetup-my-app.json --dry-run
npx rsetup@0.2.3 create --config reposetup-my-app.json
```

The first command prints the plan without project writes or installer execution.
The second prints the local plan and requires RepoSetup confirmation before
execution; the generated handoff never adds `--yes`. npm may separately ask to
download the version-pinned CLI. See
[the official npx reference](https://docs.npmjs.com/cli/v11/commands/npx/).

The browser does not install packages, execute commands, upload projects, request
secrets, or provision database services. Search and configuration creation are
local. The production content security policy prevents network connections from
the app; outgoing documentation links navigate to the selected site.

## Checks

Run these from the monorepo root after building:

```sh
pnpm --filter @reposetup/website test
pnpm typecheck
pnpm lint
pnpm --filter @reposetup/website build
pnpm --filter @reposetup/website test:handoff
pnpm --filter @reposetup/website test:browser:local
```

Unit tests cover generated release facts, route and metadata integrity, internal
links, public command examples, local search, and valid and invalid builder
choices. The published-package check downloads and installs only the exact
`rsetup@0.2.3` archive into ignored `apps/website/.published-cli`, with lifecycle
scripts disabled. It validates SHA-256
`f740df147bc9e8dbf4dc076322f2424d96ad2f27a0da14ef3e46c818e26edd2b` and
the pinned npm SHA-512 integrity, then tests published help, read-only commands,
all preset/config previews, destination behavior, and confirmation refusal
without creating projects. Its report stays in the ignored folder.

Local browser tests use installed Chrome for desktop and mobile-sized projects,
plus Playwright Firefox. They cover direct-entry docs, search, keyboard use,
responsive layout, accessibility scans, config downloads, and command handoff.
The test server uses port 4181 and requires it to be free. Browser binaries must
match the pinned Playwright version; follow
[Playwright's official browser setup](https://playwright.dev/docs/browsers).

Run the complete configured matrix, including WebKit, on a compatible runner:

```sh
pnpm --filter @reposetup/website test:browser
```

The current macOS 14 host cannot launch the current Playwright WebKit build.
Use a compatible runner, such as macOS 15, for that evidence. Automated
accessibility scans and viewport emulation do not replace manual screen-reader
and physical-device checks.

## Static hosting shape

The app uses hash routes such as `#/docs/create`,
`#/integrations/vitest`, and `#/builder/react-vite`. The server receives only the
base page URL, so these direct links do not require per-page rewrite rules.
Relative asset URLs (`base: "./"`) support serving the built directory at a
root or subdirectory. Serve the complete `dist` contents through an HTTP(S)
static host; review that host's security headers, caching, and direct-entry
behavior before a release.

No deployment or publication was performed for this implementation. Hosting
selection, a compatible full browser run, manual accessibility/device review,
and owner review remain separate release work.

## Artwork

The visual assets came from the chat **Create RepoSetup logo**, thread
`01a10155-82d9-7d90-804d-a2f08d645624`. They were copied unchanged from the
original checkout's `assets/website` directory. See
[the brand asset record](public/brand/README.md) for provenance and usage.
