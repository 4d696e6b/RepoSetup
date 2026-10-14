# RepoSetup companion website — 0.4.0 candidate

The existing companion website is [reposetupcli.com](https://reposetupcli.com/). Its
0.3.1 delivery is recorded in the [stable delivery record](../../docs/specification-documentation/release-docs/STABLE_RELEASE_0.3.1.md).
This release checkout prepares the 0.4.0 reference while preserving published
0.3.1 and 0.2.3 snapshots, all 37 integrations, five legacy presets, artwork,
routes and beginner selection workflows. The active reference is byte-checked
and generated from the exact 0.4.0 CLI handoff, including all 16 actual commands.
Fact regeneration requires unchanged reviewed release definitions.

The candidate site has 84 documentation pages, including five generated task
command references, a portable workflow guide and two experimental managed guides. It retains nine curated explanations,
three minimal starters, 24 create and 21 nonempty add choices. It supports
React/Vite + TypeScript + pnpm, Express + TypeScript + pnpm and FastAPI + uv.
Choices start empty and actual local context remains authoritative.
Integration maturity and prerequisites are explicit. These new guides are not deployed.

## Local development and routes

Use Node 24 and the workspace's pinned pnpm version. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm website:dev
```

Open `http://127.0.0.1:5173`. Supported hash routes include:

- `/#/` — full home and workflow discovery.
- `/#/docs`, `/#/integrations`, `/#/presets`, `/#/release` — full references and published history.
- `/#/docs/task-compiler`, `/#/docs/task-router`, `/#/docs/task-troubleshooting` — coding-task guides, copyable prompts, exact local commands and recovery.
- `/#/builder/<legacy-preset-id>` — schemaVersion 1 download with explicit name/folder.
- `/#/goals`, `/#/learn/libraries`, `/#/learn/libraries/<id>`, `/#/learn/starters` — curated guidance.
- `/#/builder/react-vite-ts-pnpm`, `/#/builder/express-ts-pnpm?mode=add` — bounded create/add choices.
- `/#/presets/<beginner-preset-id>` and `/#/how-to` — minimal starters and local maintenance/handoff guidance.

Beginner code/catalog load only when requested. Returning from an explanation preserves the builder draft. Navigation sequence checks prevent delayed imports from replacing a newer page. Optional-tool help opens curated purpose/skip guidance rather than the general catalog reference.

## Matching CLI artifact: required before pasting commands

The selection handoff requires reviewed `rsetup@0.4.0`, CLI byte-source
`9758e84074f9a862f1b8ed91340a277c2ca3e1ce`, tarball SHA-256
`55d9af9243a376de92104e98b6a23f75ebcdfa744d31032b2b451f68e2a9e97e`.
Prepare that candidate with `pack:contract` below. After registry-verified
publication, install `npm install -g rsetup@0.4.0` before using these exports.
The single authoritative pin is `src/handoff.ts`. Published-mode builds verify
registry bytes before displaying public installation instructions. Candidate task examples use the exact reviewed local CLI. After verified
publication, the guides switch to exact-version npm aliases. Published 0.3.1
does not contain task commands. Production model routing remains unqualified.

For development qualification, prepare the exact artifact locally:

```sh
pnpm --filter @reposetup/website pack:contract
export PATH="$PWD/apps/website/.local-cli/bin:$PATH"
reposetup --version
```

The tool archives the pinned Git commit into a disposable directory, builds only the CLI dependency graph, packs and verifies its digest, installs into ignored `.local-cli/installed`, and records version/source/runtime/hash in `.local-cli/evidence.json`. It uses argument arrays and requires existing Node/pnpm prerequisites. It does not alter the original candidate, source worktrees, system tools or production deployment. An unavailable source or changed hash fails rather than silently substituting another artifact.

For create, paste the exported command in the parent directory of a new relative folder. For add, paste from the existing project's package directory. The CLI independently validates the decoded choices and local context, displays its installation plan and requests interactive confirmation. Selection execution refuses `--yes` and a noninteractive terminal; `--dry-run` remains available.

The token is limited to 4,096 characters / 3,072 decoded bytes. Commands are bounded to 4,200 characters including the preview suffix. Larger selections use a validated JSON fallback, limited to 16 KiB, with the same supported choices:

```sh
reposetup create --selection-file selection.json
reposetup add --config selection.json
```

Download into the command directory. No configuration contains executable commands or real secrets; exports carry public choices only.

## Data, execution and privacy boundaries

Curated definitions live in integrations. Registry exports planner-validated public JSON for every offered subset. The browser chooses a generated variant and validates form controls; it has no separate compatibility registry, executor, process adapter or project-scanning capability. Its bundle refuses Node/workspace runtime modules. Business logic remains in core and execution in the local CLI.

Drafts stay in memory; project names, choices, queries and tokens are absent from storage and analytics. Production-only observability retains bounded public route labels on the explicitly allowed production origins. Local/unknown hosts do not initialize it. Built CSP restricts resources and telemetry destinations, blocks project uploads/form submissions and refuses object/base injection. Source maps, private artwork prompts/provenance, credentials and repository sources are excluded from the public build. Production hosting must preserve the reviewed HTTP security headers.

## Qualification

```sh
pnpm build
pnpm --filter @reposetup/website test
pnpm --filter @reposetup/website pack:contract
pnpm --filter @reposetup/website test:handoff
pnpm --filter @reposetup/website qualify
```

`qualify` verifies the exact artifact, runs workspace build/unit/typecheck/lint, checks the packed handoff and executes all five browser profiles: desktop/mobile Chrome, desktop Firefox and desktop/mobile WebKit. It records clean source, lockfile/catalog/CLI/build hashes and step results under ignored `qualification/`; source changes during a run are refused. `wholeReleaseQualified` remains false while actual manual/device or delivery gates are open.

`qualify:local` and `test:browser:local` explicitly select Chrome/Firefox. Mobile profiles emulate viewport/touch; they cannot establish physical-device or native screen-reader behavior. Chrome must already exist. Matching test-only Firefox/WebKit binaries can be installed explicitly:

```sh
pnpm --filter @reposetup/website exec playwright install firefox webkit
```

The macOS-15 workflow supplies full WebKit evidence. Local macOS 14.7.2 cannot run the pinned WebKit build; unavailable cases are never counted as passing. Tests cover the full retained/new routes, clipboard denial, file export, field-linked errors, navigation/draft preservation, keyboard/reflow/WCAG checks, privacy, motion and the five owner-approved scripted beginner journeys. No person is represented by those simulations.

## Delivery status

Formal freeze, soak and calendar waiting gates were removed by the owner. Current product evidence and exact-source qualification are in [reconciliation](../../docs/specification-documentation/implementing-docs/RECONCILIATION_0.3.0.md), [release preparation](../../docs/specification-documentation/release-docs/RELEASE_PREPARATION_0.3.0.md) and the latest workflow reports. Publication/deployment were explicitly authorized and 0.3.0 is delivered. Native screen-reader qualification is explicitly deferred; the owner requested Chrome phone simulation, and no physical-device pass is claimed. The stable delivery record preserves live-check/control limitations and rollback.

## Verified publication mode

Default builds remain candidate previews and perform no registry lookup. After the qualified CLI has actually been published, run the same clean-source full website qualification in verified publication mode:

```sh
REPOSETUP_WEBSITE_RELEASE=published pnpm --filter @reposetup/website qualify
```

This verifies the canonical npm metadata and downloaded tarball against the committed handoff before generating the site. It requires the exact version to be `latest`, an actual publication timestamp and matching SHA-512/SHA-256 bytes. Registry outages, redirects, wrong versions, malformed/oversized responses or changed bytes fail the build. It does not execute downloaded packages, tag, publish or deploy. The registry may omit `gitHead` when publishing a retained tarball; the displayed reviewed source comes from the committed byte-matched CLI pin rather than inventing registry provenance.

The verified build changes public installation instructions, candidate labels, footer/package links and 0.3.0 release history together. The immutable 0.2.3 snapshot and earlier publication dates stay intact. Browser tests exercise the same journeys in both modes; before npm delivery, synthetic unit fixtures cover published presentation and refusal cases without claiming an actual publication. Use the [delivery procedure](../../docs/specification-documentation/release-docs/RELEASE_DELIVERY_0.3.0.md) for the final explicitly authorized promotion.
