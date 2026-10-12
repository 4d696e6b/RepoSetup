# rsetup

Terminal-first CLI that composes, validates, and configures development stacks.

```bash
npx rsetup --help
```

This is the public npm name for RepoSetup. After `npm install -g rsetup`, both `rsetup` and `reposetup` work.

This is the `0.3.0` CLI release candidate. It requires Node.js 24 or later. Python recipes require Python 3.12 or later with uv or an activated pip environment; 3.12 and 3.13 are in the qualification matrix. Integrations are not all equally mature. Use `--dry-run` before changing an important project.

The workspace libraries `@reposetup/core`, `@reposetup/registry`, and `@reposetup/integrations` are bundled into this package. They are not published separately.

Unscoped `reposetup` and `reposetup-cli` cannot be used: npm rejects them as too similar to existing `repo-setup` and `repo-setup-cli`.

Release preparation: `0.3.0`, not yet published. Published npm commands above install the released 0.2.3 CLI; no 0.3.0 package has been published by this work. See [selection v1 contract](../../docs/specification-documentation/product-docs/SELECTION_V1.md).
Creation verifies required installed dependency metadata before reporting success. `rsetup doctor` checks the existing environment without reinstalling packages. Pip creation records selected dependencies in `requirements.txt`; for uv projects, run commands through `uv run` from the project directory.

RepoSetup 0.3.0 adds curated beginner guidance and minimal React/Vite, Express and FastAPI starting points. A versioned declarative selection carries supported choices from the companion website to the local CLI. The CLI resolves every operation from its built-in registry, shows the decoded choices and installation plan, and requires confirmation. `--dry-run` remains read-only; selection commands cannot use `--yes` to bypass review.

`create`, `add`, and `remove` support structural previews through `--diff`. `doctor --config reposetup.json` compares the intended stack with detected evidence. `doctor --config reposetup.json --fix --dry-run` previews narrowly allowlisted missing-file repairs; confirm a reviewed repair without `--dry-run`. Existing user files, source code, dependencies and secrets are preserved. Installed dependencies must be healthy before a repair can run.

Existing schemaVersion 1 configs, all five bundled `--preset` IDs, positional `add`, supported JSON output and the shipped 0.2.3 reliability fixes are retained. Not every registry combination is qualified; integration maturity and required system prerequisites remain explicit.
