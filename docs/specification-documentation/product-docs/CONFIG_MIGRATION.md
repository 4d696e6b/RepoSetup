# Config schema migration policy

RepoSetup configuration is versioned with `schemaVersion`.

## Current version

`schemaVersion` is `1`. This is the only supported version.

A valid v1 `reposetup.json`:
- is JSON;
- matches the strict `RepoSetupConfig` schema;
- names a runtime, package manager, framework, and known integration IDs;
- uses a relative `project.path` when a path is present;
- does not contain secrets, shell commands, or absolute write paths.

Unknown top-level keys are rejected. Integration IDs and options are validated when the config is resolved against the built-in registry, not when the JSON is parsed.

`create --config` is the canonical way to apply an exported config. `import` is not a separate v1 command.

## Unsupported versions

Configs with a missing `schemaVersion` or a value other than `1` are rejected with `CONFIG_INVALID`.

RepoSetup does not rewrite, coerce, or download a replacement for an unsupported config.

## Future versions

When a later `schemaVersion` is introduced:
- document the delta in this file first;
- keep accepting v1 configs until an explicit deprecation window ends;
- never execute fields that are not in the declared schema;
- never migrate by fetching remote scripts.

Do not invent a v2 schema in v1.
