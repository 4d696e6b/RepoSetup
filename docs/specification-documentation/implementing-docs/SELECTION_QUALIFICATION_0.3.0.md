# Selection qualification for RepoSetup 0.3.0

Status: sections 2.1–2.3 and the local section 2.4 native transport harness are implemented. Real create/add and native shell/POSIX confirmation results cover one macOS/arm64, Node 24, Python 3.13 cell; the other platform/Python cells, Windows TTY behavior and complete release remain pending. The [phase tracker](./STATUS_0.3.0.md) remains authoritative for completion.

## Frozen input and operation matrix

The machine-readable [matrix fixture](../../../tests/e2e/fixtures/selection-v1.matrix.json) is revision `0.3.0-selection.3`, against catalog `0.3.0-cli.3`, recipe revision `2026-09-23` and CLI contract `selection-v1`. It freezes the three contexts, prerequisite targets, catalog direct-version metadata, selection limits, all optional subsets and fingerprints of their local typed plans.

- React/Vite + TypeScript + pnpm: all eight subsets of Zod, Vitest and Prettier.
- Express + TypeScript + pnpm: all eight subsets of Zod, Vitest and Prettier.
- FastAPI + uv: all eight subsets of Pydantic, pytest and Ruff.

Each context has eight create cases, including the minimal starter, and seven nonempty add cases: **24 create + 21 add journeys**. Empty add payloads remain invalid; an already-satisfied nonempty selection produces an empty plan. Optional library options are `{}` or absent; the Node framework option is explicitly `typescript: true`. No databases, deployment, other managers or framework replacement enter this matrix.

The [matrix tests](../../../tests/e2e/selection-matrix.test.ts) compare the fixture with the real built-in catalog/registry, resolve every journey and check minimal presets, limits and coverage. The [packed tests](../../../tests/e2e/selection-packed.test.ts) install an identified CLI tarball outside the monorepo and require:

- Matching token/file JSON plans for every journey, with the existing version 1 JSON envelope.
- Decoded choices and the intended optional IDs, scoped create targets/process directories, and additive plans that preserve existing files and user version declarations.
- No project changes during dry-run, even with project tools removed from PATH; no fixture secret values in output.
- Empty, repeatable plans for already-satisfied Node/Python capability selections.
- Refusal of incompatible actual contexts, malformed/oversized/invalid UTF-8 inputs, stale versions/catalogs, unsafe names/paths, unknown executable fields/options and competing flags.
- Visible review before noninteractive confirmation refusal, plus launch/version checks for both npm-installed aliases.
- Source/version/byte-count/hash checks before installing the CLI tarball; corrupted or mismatched identities fail.

The synthetic existing-project files are detection fixtures, not runnable applications or valid dependency locks. Their success is not real add evidence. The contract-suite alias checks here only verify the installed version through npm's launcher; section 2.4's separate transport suite exercises native shell launchers and bounded payloads.

A plan fingerprint is SHA-256 of the UTF-8 JSON `plan` object after recursively sorting object keys using ordinal string order. Array order and all values remain intact. It includes operations, package pins, generated content, warnings and selected configuration. Temporary working-directory names do not enter these fixtures. A changed fingerprint fails acceptance; review the new plan and compatibility impact before changing the baseline. Revise the matrix revision when its scope, context, limits or frozen plans change. Do not automatically refresh hashes to hide a regression.

Catalog direct-version metadata is a per-integration reference and can include packages used in other contexts. It is not proof that every listed package occurs in every plan, and it does not freeze transitive dependencies. The actual plan fingerprints provide the operation baseline. Real journey qualification must retain each generated project lockfile and command output separately.

Revision 2 records fixes discovered by real create checks. Minimal React/Vite now receives an adapter-driven dependency install after its explicit esbuild policy. Express TypeScript always emits `dist/src/app.js`, retains compilation of other generated source such as `lib`, and approves only the known esbuild dependency required by tsx. FastAPI advertises pytest only when selected. Twenty create fingerprints changed (eight React, eight Express, four FastAPI without pytest); all 21 add fingerprints and four FastAPI-with-pytest fingerprints remain unchanged. Recipe revision `2026-09-23` identifies the inherited pin set; the changed operation bodies are identified by the matrix fingerprints and source SHA.

Catalog `0.3.0-cli.2` corrected React template metadata, retained in `0.3.0-cli.3`: the pinned executable is **create-vite 8.3.0**, whose official [React TypeScript template](https://github.com/vitejs/vite/blob/create-vite%408.3.0/packages/create-vite/template-react-ts/package.json) declares React `^19.2.0` and Vite `^7.3.1`. The starter does not pin application Vite to 8.3.0. Tests check template declarations and record the actual resolved versions with the generated lock. Revision 3 moves generated Express and FastAPI endpoint tests into the Vitest and pytest integration plans so the same test appears when that capability is added later. Exactly 16 create/add plan fingerprints changed; 29 stayed unchanged. Exporters must regenerate older catalog selections; those are refused as stale. The selection envelope version and existing schemaVersion 1 configs do not change.

## Runtime and platform targets

Retain Node 24 and pnpm 12.5.1 for the Node journeys and CLI runtime. FastAPI journeys additionally require CPython 3.12 and 3.13, each with uv 0.12.17. These carry forward the existing targets; no runtime is silently installed by RepoSetup. Record exact patch versions and runner identity for each actual run.

The runner targets in the fixture are Ubuntu 24.04/x64, macOS 15/arm64 and Windows 2025/x64. For later real-execution qualification, run every Node create/add variant on all three targets and every FastAPI variant on both Python versions on all three targets. Preserve the legacy golden/regression matrix independently. Parent recipe runs do not prove these minimal/optional journeys work.

Section 2.1's contract suite does not require Python or uv: Python selections are planned without running them. A green contract run on Node 22 still leaves the Node 24 execution gate open, and no contract run satisfies the real install, native shell, usability or candidate-soak gates.

## Identified artifact and report

By default the suite packs the built CLI once, records the current Git HEAD using the existing artifact-evidence writer and installs that tarball into a temporary directory. It checks the manifest version, aliases, source SHA, filename, byte count and SHA-256 before installation. Local runs record whether the worktree was dirty; a dirty run cannot stand in for qualification of a frozen source SHA.

For shared artifact acceptance, set `REPOSETUP_SELECTION_ARTIFACT_DIR` to a directory containing exactly one `.tgz` and its `candidate-artifact.json`. This route requires a clean checkout at the evidence's exact source SHA and refuses mismatched bytes or versions. It never repacks the downloaded artifact.

The report has `kind: "selection-packed-contract"` and `qualification: false`. It records source/artifact identity, dirty state, matrix revision/hash, catalog identifiers, workspace/installed-CLI lock hashes, observed Node/npm/pnpm versions, platform/architecture, the Node 24 target check, expected/passed case IDs and observed plan hashes. `allJourneysPassed` refers to the 45 journeys; `allPackedCasesPassed` also includes the packed safety/no-op/alias fixtures. Matrix-validation test results remain in the Vitest output. Failure reports retain only passed case IDs and never become release qualification.

Use `REPOSETUP_SELECTION_REPORT` to retain a JSON report at a fresh path. Existing reports are never overwritten. Without that variable the report lives in the temporary fixture directory and is cleaned up; `REPOSETUP_KEEP_E2E=1` retains test-owned temporary directories for investigation. Reports contain no project file contents or environment values.

## Commands and workflow

Run from the separate 0.3.0 worktree:

```sh
pnpm test:selection:packed
pnpm typecheck:selection-tests
```

To retain a local report, choose a new output filename:

```sh
REPOSETUP_SELECTION_REPORT=/tmp/selection-contract-run-1.json pnpm test:selection:packed
```

The manually dispatched [selection contract workflow](../../../.github/workflows/selection-contract.yml) packs one artifact and passes it unchanged to the three runner targets read from the fixture. Each runner validates that artifact, runs all contract fixtures and uploads its report; failures are not skipped or allowed to pass. This workflow is authored, but has not been dispatched as part of section 2.1. It has no publication/deployment job and is not yet a complete 0.3.0 candidate gate.

The test harness installs only the CLI with `npm install --ignore-scripts --no-audit --no-fund`; project install commands are not executed by these contract fixtures. Local tarball installation and these flags were checked against official [npm 10 install documentation](https://docs.npmjs.com/cli/v10/commands/npm-install/) for the local npm 10.9.0 host and [npm 11 install documentation](https://docs.npmjs.com/cli/v11/commands/npm-install/) on 2026-10-03. Alias version checks reuse `npm exec -- <alias> --version`, with argument separation described in [official npm exec documentation](https://docs.npmjs.com/cli/v11/commands/npm-exec/). These test harness choices do not change RepoSetup's executor/package-manager adapters or qualify project dependency lifecycle behavior.

## Real create execution (section 2.2)

Run the separate network/install suite with existing Node 24, pnpm 12.5.1, CPython 3.12 or 3.13 and uv 0.12.17 on PATH:

```sh
REPOSETUP_SELECTION_CREATE_EVIDENCE_DIR=/tmp/selection-create-run-1 pnpm test:selection:create
```

The evidence directory must be fresh; the harness refuses to overwrite previous reports. `UV_PYTHON` may select an existing interpreter. Its absolute path is resolved and reused, and the harness sets `UV_PYTHON_DOWNLOADS=never` and a test-owned `UV_CACHE_DIR`. No missing Python runtime is downloaded. This behavior follows uv's official [environment variable reference](https://docs.astral.sh/uv/reference/environment/) and [Python download settings](https://docs.astral.sh/uv/reference/settings/#python-downloads). Missing or wrong prerequisites fail setup, rather than skipping cases. `REPOSETUP_SELECTION_PYTHON_TARGET` optionally asserts the requested minor version, as the workflow does.

The [real create suite](../../../tests/e2e/selection-create.test.ts) executes all 24 subsets in separate directories with spaces and Unicode, alternating token/file input. It first checks each dry-run plan and filesystem preservation, then invokes the installed artifact's exported `runCli`. A small [confirmation adapter](../../../tests/e2e/fixtures/confirmed-selection-create.mjs) supplies only I/O and an affirmative answer after asserting that decoded choices and the JSON installation plan were emitted. All parsing, registry lookup, planning, preflight, filesystem/process adapters and installation execution come from the packed artifact. This adapter does not prove native TTY prompting; section 2.4 must test that independently. There is no product bypass flag.

Each generated project must have a real lockfile, build/import successfully and pass the generated sample test when its runner is selected. React checks its production output; Express calls the compiled entry's HTTP endpoint; FastAPI checks its in-process endpoint and interpreter using the official [TestClient pattern](https://fastapi.tiangolo.com/tutorial/testing/). Selected Zod must accept/reject representative values; Prettier checks generated source; Ruff checks Python source. Doctor must pass and report every selected component. Repeating creation with confirmation must refuse the existing target and preserve source/manifests/locks and surrounding user files. The suite never installs extra project dependencies to make a check pass.

Dependency checks compare declared pins/ranges with the reviewed catalog and retain observed installed versions. [Vitest's one-shot command](https://vitest.dev/guide/) runs the generated tests; [uv run --frozen](https://docs.astral.sh/uv/reference/cli/#uv-run) keeps the generated lock unchanged. Test command logs and every actual lock are retained alongside `report.json` when an evidence directory is supplied. These are public generated fixtures, not user-project contents. Do not point this suite at a real project.

The report has `kind: "selection-packed-create"`, `releaseQualification: false`, expected/passed case results, observed runtimes/platform/architecture, source/artifact identity and dirty state, matrix/catalog identifiers, installed CLI lock hash, per-project lock hashes, plan hashes, installed versions and command exit codes. Failed cases/setup are reported without promoting the run. External artifact acceptance follows the same clean exact-source checks as section 2.1; the create suite never repacks an externally supplied candidate.

The manual [real create/add workflow](../../../.github/workflows/selection-create.yml) packs once and supplies that artifact to all six platform/Python cells derived from the frozen matrix. Every cell executes all 24 create and 21 add cases, with no environmental skips. The Python/uv setup uses official [setup-python](https://github.com/actions/setup-python) and [setup-uv](https://github.com/astral-sh/setup-uv) actions; RepoSetup itself does not install those prerequisites. The workflow is authored but has not been dispatched. Its reports/locks/logs upload even on failure. No release/deployment job is included.

## Real add execution (section 2.3)

Run the separate network/install suite with the same prerequisite targets and an unused evidence directory:

```sh
REPOSETUP_SELECTION_ADD_EVIDENCE_DIR=/tmp/selection-add-run-1 pnpm test:selection:add
```

The [real add suite](../../../tests/e2e/selection-add.test.ts) first creates a minimal runnable project from the installed tarball for each of the 21 nonempty variants. It alternates add token and JSON-file transports, previews the decoded local plan, refuses a mismatched actual context without mutation, and uses the same reviewed-plan confirmation adapter for execution. It retains the pre-existing README, .env value, custom notes, optional existing Prettier config and original dependency/script declarations. The selected packages/tools, generated endpoint tests, actual lock and doctor must work; two subsequent add attempts must have empty plans and leave source and lock unchanged. It records per-case command output, lock hashes and installed versions without copying private fixture values into CLI output. Native TTY behavior remains section 2.4.

The report has `kind: "selection-packed-add"`, `releaseQualification: false`, source/artifact identity, dirty state, matrix/catalog identifiers, observed runtimes/platform, per-case plan/lock hashes, installed versions and command exit codes. The external-artifact route requires a clean checkout at the exact source SHA and never repacks the candidate. Local passing evidence covers only macOS/arm64 with Python 3.13; the six-cell workflow is pending.

## Native transport and terminal confirmation (section 2.4)

Run the [packed transport suite](../../../tests/e2e/selection-transport.test.ts) with Node 24, pnpm 12.5.1 and, for POSIX terminal checks, an existing Python interpreter:

```sh
REPOSETUP_SELECTION_TRANSPORT_EVIDENCE_DIR=/tmp/selection-transport-run-1 pnpm test:selection:transport
```

The suite uses each npm-installed alias, `rsetup` and `reposetup`, via `/bin/sh` on POSIX or `cmd.exe` on Windows, for both create and add. It sends the selection as an environment value to a fixed shell command, avoiding shell interpolation of payload data. Each case checks an exactly 4,096-character canonical token (3,072 decoded JSON bytes), an exactly 16 KiB file with spaces and Unicode in its path, equivalent JSON dry-run plans, oversized token/file refusal, and a non-TTY execution attempt that displays choices and plan before refusing without mutation. The test's padded JSON is intentionally valid but larger than the compact normal export; the catalog and application size limits do not change.

On POSIX, a small [pseudo-terminal driver](../../../tests/e2e/fixtures/pty-selection.py) waits until the installed CLI has displayed decoded choices, operations and its real confirmation prompt before sending “n” or “y”. A declined create or add preserves the project; an accepted create builds and an accepted add installs Zod, then repeats with an empty plan. This is a test-only driver, not a CLI confirmation bypass. The report records source/artifact identity and dirty state, runner/shell details, case results and whether native TTY was covered. Windows runs skip the POSIX-only driver and explicitly report `nativeTtyCovered: false`; a Windows terminal confirmation harness remains to be implemented and run.

The [manual contract workflow](../../../.github/workflows/selection-contract.yml) has a separate transport job on the frozen Ubuntu, macOS and Windows runners. It downloads the same identified tarball as the contract job and retains a transport report. The job has not been dispatched; local macOS success is not cross-platform qualification.

## Legacy compatibility regression (section 2.5)

Run the [packed legacy suite](../../../tests/e2e/selection-legacy.test.ts) with Node 24, pnpm 12.5.1, Python 3.12/3.13 and uv 0.12.17:

```sh
REPOSETUP_SELECTION_LEGACY_EVIDENCE_DIR=/tmp/selection-legacy-run-1 pnpm test:selection:legacy
```

The suite confirms all five existing preset IDs remain valid schemaVersion 1 JSON dry-run plans. It creates real minimal React/Vite, Express and FastAPI projects through the retained `create --config` path, adds Vitest or pytest with positional `add --yes`, verifies dry-run preservation, locks, generated tests, builds and doctor, and checks that a repeated no-op add returns a version 1 JSON empty plan. It also executes the existing React/Vite preset through its original `create --preset` path. The other four old presets receive dry-run contract coverage here; their real execution belongs to separate legacy golden qualification and is not implied by this suite.

The report records source/artifact identity, dirty state, frozen matrix identity, runtimes/platform, per-case outcome and generated lock hashes. It does not upload project secrets. The [manual six-cell create/add workflow](../../../.github/workflows/selection-create.yml) now runs this suite using the same tarball and retains its report; it has not been dispatched.

## Remaining Phase 2 gates

The two selection workflows and the historical golden workflow now run on pushes to `codex/0.3.0-cli` in addition to their existing triggers. The Windows transport cell installs pinned test-only pywinpty and drives the installed command through a real pseudo-console for both accept and decline; this does not establish qualification until its report passes. The workflows have no publish or deployment job.

Finish sections 2.2, 2.3 and 2.5 by retaining clean-source evidence on the entire platform/Python matrix, including the separate legacy golden workflows. Finish section 2.4 with clean-source native shell evidence on all three runners and a Windows terminal confirmation test. Connect the complete evidence to the later candidate gates only after these pass.
