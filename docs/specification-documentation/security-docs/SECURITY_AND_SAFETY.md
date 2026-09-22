# Security and Safety Requirements

RepoSetup executes tools on developer machines. Safety is a product requirement.

## 1. Declarative configs only

`reposetup.json` may describe:
- runtime;
- package manager;
- framework;
- known integration IDs;
- validated integration options.

It may not contain:
- raw shell scripts;
- arbitrary commands;
- JavaScript callbacks;
- URLs to executable scripts;
- postinstall hooks supplied by config authors;
- arbitrary absolute write paths.

## 2. Process execution

Prefer:

```ts
execa("pnpm", ["add", "zod"], { cwd })
```

Never:

```ts
exec(`pnpm add ${userValue}`)
```

unless a specifically reviewed shell requirement exists.

## 3. Project paths

All project-scoped file operations must remain inside the normalized target project root.

Block path traversal.

## 4. Overwrites

No silent overwrites.

Operations declare behavior:
- fail if exists;
- create if missing;
- merge;
- overwrite only when explicitly safe and expected.

For existing projects, prefer structured/AST-aware edits when feasible.

## 5. Secrets

Never store real secrets in exported configuration.

Generate:

```env
DATABASE_URL="<DATABASE_CONNECTION_STRING>"
```

rather than a real credential.

## 6. Prerequisites

RepoSetup v1 does not silently install system-level prerequisites.

If Node/Python/Docker/database server is missing, diagnose and explain.

Do not invoke sudo/admin installation automatically.

## 7. Network

Operations should state whether they require network access.

Dry-run must not perform network-dependent installation.

Registry search in v1 uses built-in local metadata.

## 8. Imported configs

All imported configs:
1. parse;
2. schema validate;
3. lookup integration IDs against trusted built-in registry;
4. validate integration options;
5. resolve compatibility;
6. only then generate operations.

## 9. Logs

Avoid logging:
- access tokens;
- environment variable values;
- credentials;
- full secret-bearing URLs.

Redact when necessary.

## 10. Failure behavior

On command failure:
- stop dependent operations;
- show which operation failed;
- preserve logs;
- never falsely report success;
- explain whether partial changes were made.

Full transactional rollback is not required for v1, but operations should be designed to support recovery later.
