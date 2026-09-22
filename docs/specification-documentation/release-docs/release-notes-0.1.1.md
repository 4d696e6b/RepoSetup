# Release notes — v0.1.1

Patch release on top of the first public launch. `rsetup` is live on npm.

```text
npx rsetup@0.1.1 --help
```

This is still an **early-stage** project. No catalog ID is labeled `stable`. Use `--dry-run` before applying changes to important projects.

## Fixed

- npm scaffolds pass `npx --yes` before the package name, so `create-next-app` and other `dlx` scaffolds no longer stall on npm's "Ok to proceed?" prompt.
- Failed commands print a trimmed, redacted snippet of their output. An exit code alone hid actionable errors such as npm `EACCES` on a root-owned `~/.npm/_npx` cache, which now gets a specific suggestion.

## Unchanged safety posture

- `spawn` with `shell: false`; declarative config only.
- Error details still omit command `stdout` and `stderr`; the printed snippet redacts secret-looking assignments.
- RepoSetup never runs `sudo`. Cache and permission fixes are reported for the user to run.

## Still open

- Next.js execute, FastAPI/Flask (`uv`), and observed Linux/Windows CI evidence.
- npm trusted publishing is not configured yet, so publication is a local authenticated `npm publish`.

Human guide: `docs/humanOnly/RepoSetup_0.1.0.md`.
