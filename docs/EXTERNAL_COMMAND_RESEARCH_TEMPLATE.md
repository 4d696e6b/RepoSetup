# External Integration Command Research Template

Use this before implementing any external integration whose commands/options are not already verified.

## Integration

Name:
ID:
Category:
Research date:

## Official sources

- Official docs:
- Official repository:
- Package registry:

## Version scope

- Tested current version:
- Supported range:
- Runtime minimum:

## Project contexts

- Frameworks:
- Platforms:
- Package managers:

## Install

### npm
Executable:
Args:

### pnpm
Executable:
Args:

### bun
Executable:
Args:

### uv
Executable:
Args:

### pip
Executable:
Args:

## Initialize/setup

For each command document:

```text
executable:
args:
cwd:
interactive:
requires network:
modifies files:
long-running:
requires elevated privilege:
official source:
```

## Generated/modified files

- creates:
- modifies:
- detection evidence:

## Environment variables

For each:
- name;
- required/optional;
- secret/public;
- safe placeholder.

## Relationships

- requires:
- recommends:
- conflicts:
- includes:

## Verification

- command/check:
- expected result:

## Idempotency

- safe to repeat?
- detection before re-run?

## RepoSetup implementation notes

Do not implement until all required commands are verified from current official sources.
