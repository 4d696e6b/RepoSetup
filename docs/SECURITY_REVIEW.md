# Security review (Phase 17)

Reviewed against `docs/SECURITY_AND_SAFETY.md` on 2026-09-22. This is an in-repo design review of the current executor, config, and CLI paths. It is not a third-party pentest.

## Scope

- Process execution
- Project path handling
- Config/import validation
- Secrets and logs
- Prerequisites and overwrites
- Registry trust

Out of scope: hosted services, remote plugins, and a website (v1 non-goals).

## Findings

### Fixed this phase

Command failures used to copy child `stdout` and `stderr` into `RepoSetupError.details`. Those buffers can contain tokens, connection strings, or env dumps. Failures now record only `command`, `args`, and `exitCode`. The CLI formatter already omitted raw details except schema issues.

### Accepted controls

| Requirement | Status |
| --- | --- |
| Config is declarative; no shell, callbacks, or remote scripts | Pass — `repoSetupConfigSchema` has no command fields |
| Spawn with `shell: false` and argv arrays | Pass — `createDefaultProcessRunner` |
| Executable names are a single token | Pass — `isSafeExecutableName` |
| Project file ops stay inside the root | Pass — `isSafeProjectRelativePath` + `resolveInsideRoot` |
| No silent overwrites | Pass — `fail_if_exists` / merge behaviors |
| Export does not copy `.env` values | Pass — serialize writes IDs and options only |
| `.env.example` placeholders only | Pass — `add_env_example` |
| No silent system-software install | Pass — PATH doctor and `check_prerequisite` |
| Built-in registry only | Pass — no network registry lookup |
| Dry-run performs no process execution | Pass — CLI returns after rendering |
| Core does not depend on Commander/Inquirer/Ink/React/Firebase | Pass — package dependency test |

### Residual notes

- Child processes inherit `process.env` so PATH works. RepoSetup does not add secrets, but the child may print them. Do not log child output.
- `pip uninstall` is refused; do not invent requirement-file rewrites.
- Bun has no adapter. Unsupported package managers fail closed.
- Doctor has no `--fix`.
- Integrations remain **experimental**. Do not treat this review as a v1 stable sign-off.

## Follow-ups (not this phase)

- Redact known secret patterns if a future verbose mode prints process output.
- Confirm Windows path behavior in GitHub Actions (`windows-latest`).
