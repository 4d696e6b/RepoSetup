# CLI Specification — 0.2.3

## 1. Command tree

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

The command tree and create flags above/below match the current CLI help. Recipe-record import remains a proposed workflow, not an implemented command. Older design examples do not authorize arbitrary config commands.

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
reposetup create my-app --preset next-sqlite --dry-run
reposetup create my-app --preset next-sqlite --yes
```

The five preset IDs are `next-sqlite`, `react-vite`, `express-postgres`, `fastapi`
and `flask`; `reposetup presets` lists their contents. Supported create selection
flags are `--framework`, `--package-manager`, `--typescript`, `--preset` and
`--config`, plus preview/confirmation/output flags. Integration selections use
prompts, a preset or declarative configuration. `--tailwind`, `--database`, `--orm`
and `--validation` are not implemented create flags.

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
- verification commands/checks pass.

Exit codes should distinguish healthy vs issues.

Doctor checks installed dependency metadata in
addition to configuration. Node checks required runtime and development packages;
Python checks project requirements and the default development group. FastAPI's
standard extras require the CLI and Uvicorn. For uv, doctor reads the existing
project environment without syncing or creating one; for pip, it uses the active
Python interpreter. Missing packages fail the health check and include remediation.
Configuration health alone does not prove application imports or live services.
See [post-create dependency health](../implementing-docs/POST_CREATE_DEPENDENCY_HEALTH.md)
for the implementation, qualification and boundaries.

0.2.3 installed-stack behavior: Docker selection writes discoverable
prerequisite guidance. Doctor checks that Docker and, when detected, Docker Compose
can run bounded version probes, without starting or connecting to the daemon.
SQLAlchemy PostgreSQL recipes declare the Psycopg binary driver; its binary metadata
is included in installed dependency checks. Create includes development tools under
production/omit settings and explains manual service setup after completion.
Interrupted creation prints the target directory and does not imply resumable create.
See [the audit record](../implementing-docs/INSTALLED_STACK_AUDIT.md).

## 9. `reposetup export`

Creates `reposetup.json` in the detected project root.

The file is always `schemaVersion` 1 and can be consumed by `create --config`.

`--dry-run` prints the JSON without writing.

An existing `reposetup.json` is not overwritten unless `--yes` is passed.

Do not include:
- secrets;
- local absolute paths unless unavoidable;
- arbitrary commands.

## 10. Proposed `reposetup import` (not shipped)

Alias/flow for applying a known declarative config to a target context may be considered, but `create --config` is canonical for new projects.

## 11. Global flags

Implemented global flags:

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

Implemented exit-code contract:

```text
0 success
1 general execution failure
2 invalid input/config
3 compatibility/resolution failure
4 prerequisite missing
5 verification failure
```

Preserve these codes across compatible releases; changes require explicit migration guidance.

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
