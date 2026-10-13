# RepoSetup 0.3.0 command audit

All documented CLI commands were exercised in this folder on 13 October 2026. Existing files were absent before testing. Test projects, per-command stdout/stderr, preservation checks and machine-readable receipts are retained under `.reposetup-command-audit-20261013`. See [the summary](/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/test/COMMAND_AUDIT.json).

Every command's help, all 37 info IDs, all registry search categories, eight preset plans/real project paths, npm flag/config creation, selections, interactive create/add/remove consent, repeated operations, export preservation, intended doctor/repair and unhealthy-repair refusal were checked. Generated projects build/import successfully; representative Next/React/Python tests and an actual compiled Express HTTP response pass.

One product defect was reproduced: published `reposetup --json remove zod --dry-run` emits prose after Zod is already absent. The source fix and four regression variants pass. A local patched artifact is installed below; it is **not a published release** and does not replace immutable npm 0.3.0.

Use the local repair for review:

```sh
node "/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/test/.reposetup-command-audit-20261013/fixed-cli/node_modules/rsetup/dist/bin.js" --json remove zod --dry-run
```

Run from a generated project's directory. Healthy sample: `/Volumes/Developer/zeaek_/Desktop/Content/Soft-En-TU/Project/test/.reposetup-command-audit-20261013/cases/flag-npm/flag-express`. Begin with a dry-run on any project you care about.

Other retained samples are in `cases/next-complete`, `cases/react-vite`, `cases/express-postgres`, `cases/fastapi`, `cases/flask`, `cases/beginner-react-vite`, `cases/beginner-express` and `cases/beginner-fastapi`. Legacy presets create in their selected current folder; beginner presets use the explicit folder in their config.

Docker cannot run on this Mac and doctor correctly reports that prerequisite. No system software/database/container server was installed or started. uv 0.12.17 is isolated in `tools/bin`; [official installation guidance](https://docs.astral.sh/uv/getting-started/installation/) supports PyPI installation. Python 3.13.1 was already installed and downloads were disabled. This run does not claim every integration combination or other operating systems were locally tested. Harness mistakes and expected input/prerequisite refusals remain in the raw reports with their classifications.

## Source validation

CLI/core/registry/integrations: 1,154 affected unit tests pass (158 CLI), targeted 54 command tests pass including four new no-op JSON regressions; affected build/typecheck, selection-test typecheck and repository lint pass. Only the JSON no-op branch changes; plain terminal output and preservation/consent behavior remain.

The original full-monorepo check correctly refuses combining a changed CLI implementation with the website's immutable 0.3.0 artifact pin. The CLI patch is isolated on codex/0.3.0-command-audit for a later versioned package update; it is not a qualified npm 0.3.0 replacement. Website consistency and the historical-changelog unit assertion are fixed and validated separately on codex/0.3.0-theme-consistency, with unchanged CLI pins. Its 1,218 workspace unit tests, typecheck, lint and published-mode build pass; full five-profile qualification/deployment follow separately.
