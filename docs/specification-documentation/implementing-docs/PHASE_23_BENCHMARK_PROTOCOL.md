# Phase 23 — Installation-performance benchmark protocol

Phase 23 improves the number and safety of package-install operations. It does not permit a speed claim until the complete controlled benchmark below has been recorded against the Phase 19 source baseline.

## Repeatable planner measurement

Run this command from the repository root:

```sh
REPOSETUP_BENCHMARK_TRIALS=5 \
REPOSETUP_BENCHMARK_OUTPUT=tmp/phase23-plans.json \
pnpm benchmark:plans
```

The command builds the workspace once, then invokes the built CLI in dry-run mode for the five required recipes: Next.js/SQLite, React/Vite, Express/PostgreSQL configuration, FastAPI/uv, and Flask/uv. The JSON result records each recipe path, its configuration SHA-256, trial count, median/minimum/maximum elapsed time, and the rendered process-operation count.

This measurement never writes a generated project, contacts a registry, or launches an installer. It is useful for detecting planner regressions and verifying that recipe inputs have not changed. It is not a package-download or project-creation benchmark and cannot satisfy the Phase 23 acceptance targets by itself.

The default is five trials. `REPOSETUP_BENCHMARK_TRIALS` must be a positive integer. `REPOSETUP_BENCHMARK_OUTPUT` selects a result path so benchmark evidence can be stored outside the working tree or attached to a qualification run.

## Release-comparison procedure

Run the comparison on Ubuntu 24.04 x64, macOS 14 arm64, and Windows 11 x64. Use the Phase 19 baseline commit `a0e48a19479dc574c3f2bc3fba4a39608dc33e77` and the exact candidate commit. Record host model, OS image/version, Node, npm, pnpm, Python, uv, registry endpoint, package-manager settings, available disk, and a brief network-condition note.

For every required recipe and applicable manager, use an isolated benchmark cache and a fresh temporary output directory. Never delete or modify a developer's normal npm, pnpm, or uv cache. Use fixed direct and generator versions from the recipe record. Alternate baseline and candidate trials to avoid systematic network drift.

For each baseline/candidate pair, run five cold-cache trials and five warm-cache trials. A cold trial starts with a new benchmark-owned cache. A warm trial reuses only the immediately preceding trial's benchmark-owned cache. Capture total wall time, scaffold/setup time, package-install time, verification time, peak child-process memory, install subprocess count, failures, and available cache-hit or download-byte reports from the package manager. Keep cold and warm results separate.

Use a controlled registry/cache fixture for planner and installer-overhead comparisons, then repeat against the pinned public registry endpoint for usability evidence. Public-registry measurements must not be interpreted as a network-bandwidth claim.

## Evidence and acceptance decision

Store raw JSON, command output, and a concise environment record with the candidate qualification evidence. Each record must identify the source commit, recipe config hash, lockfile hash when applicable, and the command that produced it. A failed trial remains in the record with its classified failure and no silent rerun beyond the product's bounded retry behavior.

Accept Phase 23 only when controlled comparisons show at least 25% lower warm-cache median total setup time for two representative multi-integration recipes, at least 50% fewer install subprocesses where the baseline had redundant batches, and no repeatable regression above 10% for another required recipe. The optimized and reference outputs must also pass the Phase 23 correctness gate. If evidence cannot meet a target, write an explicit release-scope decision; do not mark the target waived by omission.

## Current evidence status

The repository has a repeatable dry-run planner benchmark and implementation tests for batching, cache preference, and bounded transient-download retry. Full cold/warm real-install comparisons on the three-OS matrix have not yet been recorded, so no installation-speed target is claimed and Phase 23 remains in progress.
