# rsetup

Terminal-first CLI that composes, validates, and configures development stacks.

```bash
npx rsetup --help
```

This is the public npm name for RepoSetup. After `npm install -g rsetup`, both `rsetup` and `reposetup` work.

This is the unpublished `0.3.0-alpha.1` CLI release preparation branch. It requires Node.js 24 or later. Python recipes require Python 3.12 or later with uv or an activated pip environment; 3.12 and 3.13 are in the qualification matrix. Integrations are not all equally mature. Use `--dry-run` before changing an important project.

The workspace libraries `@reposetup/core`, `@reposetup/registry`, and `@reposetup/integrations` are bundled into this package. They are not published separately.

Unscoped `reposetup` and `reposetup-cli` cannot be used: npm rejects them as too similar to existing `repo-setup` and `repo-setup-cli`.

Development source: `0.3.0-alpha.1` (unreleased CLI selection slice). Published npm commands above install the released 0.2.3 CLI; no 0.3.0 package has been published by this work. See [selection v1 contract](../../docs/specification-documentation/product-docs/SELECTION_V1.md).
Creation verifies required installed dependency metadata before reporting success. `rsetup doctor` checks the existing environment without reinstalling packages. Pip creation records selected dependencies in `requirements.txt`; for uv projects, run commands through `uv run` from the project directory.
