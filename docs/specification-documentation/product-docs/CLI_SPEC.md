# CLI Specification

## 1. Current command tree

```text
reposetup
├── create
├── add
├── remove
├── presets
├── search
├── info
├── stack
├── doctor
├── export
├── registry
│   └── validate
└── version/help
```

This tree reflects the inspected `0.3.0-alpha.1` source in [runCli](../../../packages/cli/src/run-cli.ts). `import` remains a proposal, as described below. The experimental task command group is specified at the end of this document and is unimplemented.

## 2. `reposetup create`

### Interactive

```bash
reposetup create
```

Prompts roughly:

```text
Project name
Runtime
Package manager
Framework
Language/options
Styling
UI
Database
ORM/data layer
Validation
Testing
Quality tools
Infrastructure
Review plan
```

Only show choices that are valid/relevant to the selected context.

### Flags

Example:

```bash
reposetup create my-app \
  --framework nextjs \
  --package-manager pnpm \
  --typescript
```

The current parser supports `--config`, `--preset`, `--selection`, `--selection-file`, `--framework`, `--package-manager`, `--typescript`, `--diff`, `--dry-run` and `--yes`. Use a validated config/preset for additional integrations; category-specific flags are not implemented. Selection v1 retains its existing mutually exclusive inputs and interactive confirmation policy; it cannot be combined with `--yes`. See [selection v1](./SELECTION_V1.md).

### Config

```bash
reposetup create --config reposetup.json
```

### Dry-run

```bash
reposetup create --config reposetup.json --dry-run
```

Dry-run must:

- resolve exactly as real execution would;
- display ordered operations;
- display warnings;
- perform no mutations;
- execute no install/setup commands.

## 3. `reposetup add`

```bash
reposetup add prisma
```

Process:

```text
Locate project
↓
Detect runtime/framework/package manager/integrations
↓
Resolve requested integration against detected context
↓
Calculate missing operations only
↓
Show warnings
↓
Confirm unless --yes
↓
Execute
↓
Verify
```

Options:

```text
--dry-run
--yes
--package-manager
--verbose
```

## 4. `reposetup remove`

Removal is dangerous.

v1 may implement only integrations with explicitly safe removal recipes.

If safe removal is not known:

```text
RepoSetup cannot safely remove this integration automatically.
```

Never reverse arbitrary installation steps heuristically.

This phase uninstalls packages only for `zod`, `prettier`, `pydantic`, `pytest`, and `ruff`. Prettier config files are left in place. pip projects are refused because `pip uninstall` does not rewrite `requirements.txt`.

```text
--dry-run
--yes
--package-manager
--verbose
```

## 5. `reposetup search`

```bash
reposetup search prisma
reposetup search --category orm
```

Output compact registry results.

No network required for built-in registry.

## 6. `reposetup info`

```bash
reposetup info prisma
```

Output:

- name;
- category;
- status;
- description;
- requirements;
- recommendations;
- conflicts;
- supported contexts;
- available options;
- verified date;
- official docs link.

## 7. `reposetup stack`

Detect current project and render:

```text
Runtime        Node.js
Package mgr    pnpm
Framework      Next.js
Language       TypeScript
Styling        Tailwind CSS
Database       PostgreSQL (likely)
ORM            Prisma
Validation     Zod
Testing        Vitest
```

Include confidence when not certain.

## Workspace add/remove policy

`reposetup add <id...>` plans one or more additions together, and `reposetup remove <id>` removes one integration with an explicit safe removal recipe. Both commands operate on one detected project package. Run either command from that package directory. RepoSetup refuses a `pnpm-workspace.yaml` that declares `packages:` because selecting a package target there is ambiguous. A file that only approves dependency builds is not a workspace root. This release does not compose or mutate an entire workspace; use each package directory explicitly.

## 8. `reposetup doctor`

Doctor is read-only by default.

Checks:

- runtime exists;
- package manager exists;
- selected/detected dependencies exist;
- expected config exists;
- required env variable names are represented where appropriate;
- curated integration file/dependency checks and runtime/package-manager probes pass.

Exit codes should distinguish healthy vs issues.

The inspected source implements `doctor --config <path>` for an intended schemaVersion 1 stack and `doctor --fix --config <path>` for narrow, reviewed reconstruction of absent known recipe files. `--dry-run` and `--yes` require `--fix`; `--fix` requires `--config`. Existing user files are preserved, dependencies are not installed, and findings outside the allowlist receive manual guidance. Default doctor and repair dry-run can perform runtime version probes; neither constitutes coding-task acceptance. See [handleDoctor](../../../packages/cli/src/doctor.ts) and [planDoctorRepair](../../../packages/core/src/doctor/plan-repair.ts).

## 9. `reposetup export`

Creates `reposetup.json` in the detected project root.

The file is always `schemaVersion` 1 and can be consumed by `create --config`.

`--dry-run` prints the JSON without writing.

An existing `reposetup.json` is not overwritten unless `--yes` is passed.

Do not include:

- secrets;
- local absolute paths unless unavoidable;
- arbitrary commands.

## 10. `reposetup import`

Alias/flow for applying a known declarative config to a target context may be considered, but `create --config` is canonical for new projects.

## 11. Global flags

Recommended:

```text
--help
--version
--verbose
--quiet
--no-color
--json
```

Mutating commands:

```text
--dry-run
--yes
```

## 12. Exit codes

Suggested initial contract:

```text
0 success
1 general execution failure
2 invalid input/config
3 compatibility/resolution failure
4 prerequisite missing
5 verification failure
```

Document before v1 stable and avoid changing casually.

## 13. Non-TTY daily workflow

A non-interactive session sets `CI=true` and `--no-color`, installs the packed `rsetup` tarball, and does not allocate a terminal. The supported order is:

```text
reposetup presets
reposetup --no-color --json create --preset <id> --dry-run
reposetup --no-color create --preset <id> --yes
# run each printed "Next:" command from the printed project directory
reposetup --no-color add <id> --yes
reposetup --no-color --json doctor
reposetup --no-color export --yes
```

Preview is the dry-run. Progress stays on stderr when `--json` is set. Long-running `Next:` servers are started, checked once, then stopped. `add` runs only after create, from that project directory.

## 14. Terminal UX

Default output should be concise.

Verbose mode includes:

- resolved config;
- operation IDs;
- command details;
- detection evidence;
- timing if useful.

Interactive prompt library: `@inquirer/prompts`.

Ink is optional later for a richer explorer but must not be required for basic functionality.

## Experimental 0.4.0 task CLI contract — unimplemented

Milestone A freezes behavior, not parser entries or help output. Proposed spellings are `reposetup task compile`, `run`, `next`, `verify` and `status`; they must be added only in their implementing milestones with help and compatibility tests. There are no placeholder commands in this slice. The [versioned contracts](./TASK_CONTRACTS_0.4.0.md) and [support profile](./TASK_SUPPORT_0.4.0.md) are authoritative for inputs and acceptance.

- `compile` selects one phase, imports an explicit structured draft or uses an explicitly configured managed decomposition provider, and validates coverage, DAG, ownership and scopes before freezing a TaskPlan. Missing decomposition authority is an actionable blocker; Markdown parsing alone cannot fabricate tasks.
- `next` prepares one ready, revisioned portable task packet. It does not claim that an external agent obeyed scopes or model/effort routing. `status` reports local state and evidence, including unknown effective configuration or usage.
- `run` uses the bounded TypeScript/Node managed profile, reviewed context/change/check authority and finite provider allowance. A model returns typed proposals; the executor applies permitted changes and executes fixed trusted checks. No plan/config/model command is executed.
- `verify` requests executor-owned trusted checks against the current revision. Doctor success, model assertions and zero discovered required tests cannot mark a task complete. Final phase acceptance is separate from individual task acceptance.

Every task dry-run performs zero writes, provider calls, subprocesses or verification. It may read bounded permitted local inputs, validate a supplied draft and render projected routing/context/check intent. Provider-generated decomposition, executable/tool availability, runtime probes and acceptance remain explicitly unresolved when they require effects. Dry-run does not allocate state directories, acquire mutation locks or consume provider allowance. This stronger task rule does not change inherited doctor dry-run behavior.

Keep `reposetup.json` schemaVersion 1 and selection v1 unchanged. Optional `reposetup.tasks.json` is a separately versioned preference file without secrets, commands, hooks or arbitrary endpoints. Task JSON kinds are additive to output version 1; preserve existing `plan`, `error`, `doctor` and other envelopes, stdout/stderr conventions, binary aliases and exit codes 0–5. New task errors map to those existing meanings as defined in the task contracts.

Local draft validation, context preparation, handoff and trusted local verification require no RepoSetup AI credits. An external agent uses its own allowance; managed model calls require the selected provider's credentials and usage allowance. Do not claim universally free automatic decomposition or coding. No task command installs dependencies or system prerequisites, rolls back changes, runs parallel workers, uses MCP or changes the website.
