# Test the 0.3.1 CLI preview

Local preview version: `0.3.1-test.1`. It is not an npm release.

This branch starts from production source `dbf691e7db9a88554e1ddf467afcced903e4a8f5`
and includes the no-op `remove --json` fix and its four regression cases from
`5f6c5ad0c6da6b3eec6d34cf3870c0608f8352e0`. No other planned 0.3.1 feature is included.

## Start testing

Open Terminal and run:

```sh
cd /Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/test/0.3.1
source ./activate.sh
reposetup --version
cd playground
reposetup --help
reposetup presets
reposetup registry validate
```

The version must say `0.3.1-test.1`. Activation selects the local package for this
Terminal session. A new Terminal continues to use the installed public CLI.
Both `reposetup` and `rsetup` launch the same local package. You can also use
`../bin/reposetup` from the playground without activation.

Preview a new app, then run it after reviewing the plan:

```sh
reposetup create my-test-app --framework express --package-manager npm --dry-run
reposetup create my-test-app --framework express --package-manager npm
cd my-test-app
reposetup stack
reposetup doctor
reposetup add zod --dry-run --diff
reposetup add zod
reposetup remove zod --dry-run --diff
reposetup remove zod
reposetup --json remove zod --dry-run
```

Confirm the real create/add/remove prompts after reviewing their plans. Real
creation downloads the project's supported dependencies. Choose a fresh folder
name for another attempt; RepoSetup preserves existing projects.

The final command should return JSON with `version: 1`, `kind: "plan"`, and an
empty `plan.operations` array. It must preserve your files. Also try `--quiet` or
`--diff --dry-run` with JSON. Normal text output remains available.

## Files and repeatability

- `bin/`: local launchers, independent of the global installation.
- `runtime/`: private local npm installation of the retained tarball.
- `artifacts/rsetup-0.3.1-test.1.tgz`: exact package being tested.
- `playground/`: empty starting directory for your own projects.
- `checks/`: automated smoke-test fixtures and JSON receipt.
- `ENVIRONMENT.json`: source SHA, version and tarball hash.

Node.js 24 or later is required. Python and Docker are only needed for choices
that require them; RepoSetup does not install system software. Existing audit
projects elsewhere in the test folder are preserved.

To build a new local artifact after changing source, run these from the source
worktree, then install that tarball in a **fresh** local runtime folder:

```sh
pnpm install --frozen-lockfile
pnpm --filter rsetup... build
pnpm --filter rsetup pack --pack-destination tmp/dist/031-artifact
```

Record a new source SHA and hash when changing the tested artifact. Existing
receipts describe only the retained bytes, not later edits.

## Website and publication boundary

The production website remains published for `rsetup@0.3.0`. Its copied npm
commands select that released version. Use the local launcher when testing a
downloaded compatible selection with this preview. The registry revision and
selection-v1 format have not changed.

This task does not modify or deploy the separately developed 0.3.1 website docs.
The source website still binds to its exact published 0.3.0 CLI artifact, so a
full coupled website/release build is not qualification for this new CLI preview.
Before publishing stable 0.3.1, finalize its version, qualify the exact CLI bytes
and website handoff, and run the required release checks. No freeze or soak is
introduced by this environment.
