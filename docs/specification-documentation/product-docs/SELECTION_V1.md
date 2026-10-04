# Selection v1 — first 0.3.0 CLI slice

Status: implemented development contract, not a published 0.3.0 release. Catalog revision `0.3.0-cli.4`; CLI contract `selection-v1`; envelope `selectionVersion: 1`. The bounded create/add and native handoff matrix passed on Node 24 Linux, macOS and Windows with Python 3.12/3.13 for FastAPI; other release gates remain open. Recipe pins remain those of the built-in registry; React/Vite's pinned create-vite generator produces the reviewed template's dependency ranges, captured by actual locks. A stale catalog, envelope version or CLI contract is refused; no remote registry is fetched.

## Shared foundation

Core owns strict Zod selection/catalog models and pure planning. Integrations own curated guidance, contexts, starter presets and legacy preset definitions. Registry validates references, options, all finite optional subsets and public snapshot export. CLI loads local inputs, detects the actual target, renders choices/plan, confirms, and invokes the existing executor. The approved companion website lives in `apps/website` and exports only bounded selections; hosting remains later work. The Node core barrel is not a browser entry point.

The new starter IDs are `beginner-react-vite`, `beginner-express`, and `beginner-fastapi`. Existing `next-sqlite`, `react-vite`, `express-postgres`, `fastapi` and `flask` IDs retain their contents. New starters include no optional libraries. Use `info` to learn purpose, when to consider/skip an integration, prerequisites, alternatives and setup impact; goal search includes “test an app”, “validate input” and “format code”.

Selections are bounded to React/Vite + TypeScript + pnpm, Express + TypeScript + pnpm, and FastAPI + uv. Node choices: Zod, Vitest, Prettier. Python choices: Pydantic, pytest, Ruff. Node prerequisite remains Node 24; Python qualification targets 3.12/3.13 and uv 0.12.17. Framework option `typescript: true` is required in the Node contexts. Optional library options are absent or `{}` in this slice: these integrations currently expose no configurable option schema. Unknown options are rejected, never ignored. No database/service/browser installation is advertised.

Existing full golden fixtures provide parent recipe evidence. Every minimal/optional subset is checked against the real planner, but this new handoff still needs packed Node 24 cross-platform execution evidence. Candidate labels are not stable guarantees. Catalog exports include official links, review dates, parent evidence, limitations, recipe revision and direct-version information; they contain no functions or executable operations.

## Declarative envelope

Create wraps an existing schemaVersion 1 config:

```json
{
  "selectionVersion": 1,
  "catalogRevision": "0.3.0-cli.4",
  "cliContract": "selection-v1",
  "mode": "create",
  "config": {
    "schemaVersion": 1,
    "project": { "name": "my-app", "path": "my-app" },
    "runtime": { "id": "node" },
    "packageManager": "pnpm",
    "framework": { "id": "react-vite", "options": { "typescript": true } },
    "integrations": [{ "id": "zod" }]
  }
}
```

Add describes capabilities and an expected context; it has no project path, runtime override, framework replacement or operations:

```json
{
  "selectionVersion": 1,
  "catalogRevision": "0.3.0-cli.4",
  "cliContract": "selection-v1",
  "mode": "add",
  "context": {
    "runtimeId": "node",
    "frameworkId": "react-vite",
    "packageManager": "pnpm",
    "typescript": true
  },
  "integrations": [{ "id": "zod", "options": {} }]
}
```

The context is a constraint checked against local framework/runtime/manager/language evidence. Ambiguous roots or multiple contexts are refused. Requirements must already be satisfied or explicitly selected; the resolver never guesses a framework, database or additional capability. All operations originate in the local built-in definitions.

New starter creation reserves a new project directory with `fail_if_exists`, then scopes every generated file and process there. Without `project.path`, the selection uses `project.name` as its directory. Names/path segments match `[a-z][a-z0-9-]{0,63}`; paths are relative, at most 256 characters, and cannot contain dot/traversal segments, whitespace, drive letters, backslashes or shell characters; Windows device names are rejected. The existing executor enforces realpath boundaries. This stricter selection policy does not change legacy schemaVersion 1 config parsing/planning.

Add preserves existing generated-target files, scripts and declared dependency versions. Missing packages are planned separately from already-declared members of a grouped install. A satisfied selection has an empty plan. After confirmation, add detects/replans again and refuses a changed plan before execution. This is not a general before/after diff or a full filesystem transaction.

## Token, file and command bounds

Encode UTF-8 JSON as canonical unpadded base64url; no compression. Before decoding, enforce the ASCII alphabet and at most 4,096 token characters. Enforce at most 3,072 decoded bytes, valid UTF-8, JSON nesting of at most 8, at most 16 integrations, no duplicates, and strict schemas/options/context semantics. The command renderer emits only `reposetup create|add --selection TOKEN` with optional `--dry-run`, at most 4,200 characters. It cannot append `--yes`, pipelines, callbacks, scripts or user-controlled launcher text.

These conservative application limits are not a claim that arbitrary bootstrap launchers fit every shell. The alphabet needs no quotes in ordinary shells. The bounded native transport matrix, including Windows TTY confirmation, passed on the CLI development branch; Phase 9 must repeat relevant checks for the integrated candidate. Npm/npx bootstrap version pinning remains a release qualification decision. Use the pinned local CLI artifact for development; do not advertise an unpublished package or a floating bootstrap as a shipped 0.3.0 command.

File fallback uses the same envelope and semantics:

```text
reposetup create --selection-file selection.json --dry-run
reposetup add --config selection.json --dry-run
```

Files have a 16 KiB byte bound, valid UTF-8 and the same depth/count/schema checks. The production reader reads at most the bound plus one byte and requires a regular file. File and token inputs plan identically. `create --config` continues to accept its original schemaVersion 1 input; it does not consume the new envelope. For exact selection semantics use `create --selection-file`. Files can accommodate more JSON whitespace/transport overhead; this does not expand the bounded catalog.

## Review, conflicts and errors

`create --selection TOKEN` and `add --selection TOKEN` print decoded choices and the actual local typed plan, then ask for confirmation before execution. No TTY means refusal; `--dry-run` works without a TTY and runs no processes or mutations. `--quiet` cannot hide a selection plan. With `--json`, the existing version 1 plan envelope stays on stdout and human-readable decoded choices/progress go to stderr. Empty selection add plans also emit the JSON plan envelope.

Create config/preset/token/file input modes are mutually exclusive. A selection conflicts with a positional name, `--framework`, `--package-manager`, `--typescript` and `--yes`. Add token/file/positional IDs are mutually exclusive; selection inputs conflict with manager overrides and `--yes`. Selection `mode` must match the command. Existing positional add and legacy `--yes` flows remain supported; an already-satisfied positional `add --json` returns the same version 1 empty-plan envelope as a selection add.

Invalid format/transport/version/catalog/options/flags use `SELECTION_INVALID`, exit 2, with a machine-readable `details.reason` and no echoed raw token, option value or file content. An incompatible detected project uses `UNSUPPORTED_CONTEXT`, exit 3. Existing planner/executor error codes remain in use. No payload field can carry executable commands, arbitrary scripts or real secrets. Tokens are public choices, not encrypted secret storage.

## Packed contract fixtures

Section 2.1 freezes all 24 create and 21 nonempty add variants in [matrix revision `0.3.0-selection.4`](../../../tests/e2e/fixtures/selection-v1.matrix.json). Installed-tarball acceptance checks token/file plans, operation fingerprints, preservation, no-op repeats and refusals. The [qualification protocol](../implementing-docs/SELECTION_QUALIFICATION_0.3.0.md) defines source/artifact/report identity and the manual single-artifact workflow. Contract reports alone are not installation evidence; the retained real create/add and native platform runs provide separate execution evidence. Local Node 22 checks do not satisfy the Node 24 execution target.

Sections 2.2 and 2.3 add real packed-command create and add execution for every variant, with retained locks/logs and app/tool/doctor/preservation assertions. Local macOS/arm64, Node 24 and Python 3.13 results do not qualify the other platform/Python cells or native prompting. Catalog revision 2 incorporated starter fixes and corrected React template metadata; revision 3 makes generated Express/FastAPI tests available when Vitest/pytest are added later. Regenerate exports from older catalog revisions before applying them. The envelope remains version 1.

## Remaining qualification

The bounded CLI create/add variants, native shell/launcher transport, retained legacy paths and website-to-packed-CLI export have now passed their development-branch matrices. `--diff` previews, intended-stack doctor and the narrow repair allowlist are implemented. Phase 9 must qualify the integrated candidate pair on the advertised runners, including preview/doctor/repair, the full browser matrix, manual screen-reader/physical-device checks, combined safety review, repeated passes and soak. The whole release remains incomplete; optional roadmap work is not selected.
