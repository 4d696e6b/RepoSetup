# Post-create dependency health repair

Date: 2026-10-08. Branch: `codex/fix-post-create-health`.
Status: implemented; cross-platform execution qualification pending. This is
unreleased work after `rsetup@0.2.1`, not a change to published npm bytes.

## Confirmed problems

- A fresh pip FastAPI project installed FastAPI 0.141.1 into the selected Python
  environment, but created no requirements.txt or pyproject.toml. Running doctor
  from the generated project returned PROJECT_NOT_FOUND. A parent reposetup.json
  could instead make doctor inspect the parent and report no framework checks.
- Doctor verified declarations and configuration, not installed distributions.
  A declared package could therefore appear healthy after its installation was
  removed. Passing configuration checks did not prove installation.
- Windows Python resolution preferred the py launcher ahead of an activated
  environment's python. A globally available interpreter must not take priority
  over the explicitly activated environment used for pip.

## Implemented behavior

- Pip create records all selected pinned runtime and development dependencies in
  a new requirements.txt in the actual destination, including FastAPI extras.
  The executor refuses an existing file; it never overwrites a user's manifest.
  Add/remove retain their existing preservation behavior and instructions.
- Every create plan ends with a typed verify operation. It inspects required
  dependency metadata after installation and fails with VERIFICATION_FAILED if
  required packages are missing. A zero package-manager exit alone is insufficient.
- Node checks required dependencies and devDependencies through node_modules
  metadata, supporting scopes, pnpm links, ancestor workspace resolution and
  packages whose exports hide package.json. Peer-only and optional-only
  dependencies are not incorrectly required on every platform.
- Python checks project dependencies and the default dev dependency group, or
  generated requirements.txt, using importlib.metadata. FastAPI standard also
  requires fastapi-cli and uvicorn for the advertised startup command.
- Doctor uses the same probes and reports the inspected project/interpreter.
  It invokes uv's existing project interpreter directly, respecting
  UV_PROJECT_ENVIRONMENT; it never runs uv sync or repairs a missing .venv.
  Pip uses the active interpreter with platform fallback. Corrupt manifests or
  unreadable probe results fail verification instead of producing healthy output.
- Configuration checks are explicitly described as configuration checks.
  Generated Python instructions explain the environment and how to reinstall;
  create states that printed commands must run from the project directory.
- Probes read metadata without importing application modules. Python isolated
  mode and disabled bytecode writing avoid local module shadowing and __pycache__
  writes. Create's uv verification uses --no-sync, --offline and
  --no-python-downloads so verification is not another install.

## Validation

- [x] Reproduced the released pip FastAPI failure in a fresh isolated environment.
- [x] Fresh FastAPI create with uv and pip completes the dependency verification.
- [x] Four packed-npx Python bare solutions pass; removal of framework and
  FastAPI CLI metadata is detected; a missing uv environment is not recreated.
- [x] Eight packed-npx Express/Fastify manager/language solutions build or syntax
  check, inspect their own project, and detect deliberately removed dependencies.
- [x] Local final checks: 977 unit tests, typecheck, lint and build pass; all 38
  packed E2E tests pass with uv available and an explicit writable cache.
- [ ] Full golden matrix on Ubuntu x64, macOS arm64 and Windows x64, Python
  3.12/3.13, npm/pnpm, including all twenty bare solutions and fourteen recipes.

The first Windows platform run failed two new test assertions because the runner
uses both RUNNER~1 short paths and full paths for the same directory. Package
verification itself returned the expected results. Assertions now compare resolved
paths; the failed attempt is retained as run 37743472286.

Tests now assert doctor's canonical root, selected framework check and installed
 dependency check. Earlier pip bare tests could accidentally inspect a parent
 reposetup.json; their application imports were real, but their doctor results
 must not be treated as proof of correct project identification.

## Boundaries

Metadata availability is not proof of all imports, native module execution,
transitive version compatibility, live database connectivity or browser journeys.
Golden recipes supply separate build/import/test evidence for their bounded
scope. This repair does not claim every integration permutation is qualified.
Python URL/include/conditional requirement formats outside generated pinned
requirements are reported for manual inspection rather than guessed. Optional
Python extras and non-default groups are not a universal environment validator.
A pip user must reactivate the environment used for installation; RepoSetup does
not silently create or install system runtimes or a replacement environment.

## Official behavior references

- [uv project environments and commands](https://docs.astral.sh/uv/guides/projects/)
- [uv run options](https://docs.astral.sh/uv/reference/cli/#uv-run)
- [Python distribution metadata](https://docs.python.org/3/library/importlib.metadata.html)
- [Python isolated mode](https://docs.python.org/3/using/cmdline.html#cmdoption-I)
- [Python TOML parsing](https://docs.python.org/3/library/tomllib.html)
- [Python virtual environment activation](https://docs.python.org/3/library/venv.html)
