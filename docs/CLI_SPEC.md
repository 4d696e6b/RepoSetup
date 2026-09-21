# CLI Specification

## 1. Command tree

```text
reposetup
├── create
├── add
├── remove
├── search
├── info
├── stack
├── doctor
├── export
├── import
├── registry
│   └── validate
└── version/help
```

Some commands may ship after the first alpha, but v1 architecture must support them.

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
  --typescript \
  --tailwind \
  --database sqlite \
  --orm prisma \
  --validation zod
```

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

## 13. Terminal UX

Default output should be concise.

Verbose mode includes:
- resolved config;
- operation IDs;
- command details;
- detection evidence;
- timing if useful.

Interactive prompt library: `@inquirer/prompts`.

Ink is optional later for a richer explorer but must not be required for basic functionality.
