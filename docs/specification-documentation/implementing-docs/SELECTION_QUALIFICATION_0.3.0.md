# Selection qualification for RepoSetup 0.3.0

Status: section 2.1 implemented locally. This defines acceptance fixtures and the evidence matrix; it does not qualify real installations, native shell transports or the complete release. The [phase tracker](./STATUS_0.3.0.md) remains authoritative for completion.

## Frozen input and operation matrix

The machine-readable [matrix fixture](../../../tests/e2e/fixtures/selection-v1.matrix.json) is revision `0.3.0-selection.1`, against catalog `0.3.0-cli.1`, recipe revision `2026-09-23` and CLI contract `selection-v1`. It freezes the three contexts, prerequisite targets, catalog direct-version metadata, selection limits, all optional subsets and fingerprints of their local typed plans.

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

The synthetic existing-project files are detection fixtures, not runnable applications or valid dependency locks. Their success is not real add evidence. Native alias/launcher execution of maximum-size payloads remains section 2.4; the alias checks here only verify the installed version through npm's launcher.

A plan fingerprint is SHA-256 of the UTF-8 JSON `plan` object after recursively sorting object keys using ordinal string order. Array order and all values remain intact. It includes operations, package pins, generated content, warnings and selected configuration. Temporary working-directory names do not enter these fixtures. A changed fingerprint fails acceptance; review the new plan and compatibility impact before changing the baseline. Revise the matrix revision when its scope, context, limits or frozen plans change. Do not automatically refresh hashes to hide a regression.

Catalog direct-version metadata is a per-integration reference and can include packages used in other contexts. It is not proof that every listed package occurs in every plan, and it does not freeze transitive dependencies. The actual plan fingerprints provide the operation baseline. Real journey qualification must retain each generated project lockfile and command output separately.

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

## Remaining Phase 2 gates

Section 2.2 next: real packed-CLI creation for all frozen variants, application build/import/test/doctor assertions and retained locks. Section 2.3: real additive execution, existing-file/version preservation and repeated application. Section 2.4: native POSIX/Windows shells, launcher payload bounds/file fallback and interactive confirmation. Section 2.5: retained schemaVersion 1 config, legacy preset/positional add and JSON regressions on the advertised matrix. Connect the complete evidence to the later candidate gates only after these pass.
