# Security review — 0.2.0 candidate

Reviewed on 2026-09-30 against code source commit `8c1f29cd825a948a6cc50b97d6389589675e59a9` and the [security and safety requirements](./SECURITY_AND_SAFETY.md). This is a targeted in-repository code and test review. It is not a penetration test or a claim about third-party package vulnerabilities.

## Scope

- Process and package-manager launch boundaries
- Project path containment and existing-file preservation
- Config and recipe input boundaries
- Child-output redaction and error reporting
- Package lifecycle surface and packed-artifact installation

## Review results

| Area | Result | Evidence |
| --- | --- | --- |
| Process execution | Pass | The executor accepts typed operations; the CLI adapter uses argument arrays with `shell: false`. Windows `.cmd` shims use explicit `cmd.exe` handling and reject shell metacharacters. |
| Process identity | Pass | Integration definitions generate operations only. `isSafeExecutableName` rejects shell strings, and package-manager adapters own command construction. |
| Config injection | Pass | The Zod configuration boundary accepts declarative IDs/options and rejects command fields. Recipe records hash validated configuration and reject unexpected command-shaped fields. |
| Path containment | Pass | Canonical path resolution rejects traversal and escaping symlinks before mutation or process execution. Final-component symlinks cannot redirect writes outside the project. |
| Existing files | Pass | `fail_if_exists` uses exclusive writes; merge operations use replacement files; user files are not silently overwritten. Removal is recipe-specific and does not delete generated source blindly. |
| Secret handling | Pass | Exported config excludes environment values. `.env.example` entries are placeholders. Failure snippets and streamed output redact assignment-style secrets before rendering. |
| Failure recovery | Pass | Failed operations stop dependent work, preserve only a content-free hashed journal, and do not attempt unsafe automatic rollback. |
| Lifecycle scripts | Pass | The packed public CLI has no `preinstall`, `install`, or `postinstall` script. Candidate acceptance installs the tarball normally and invokes both npm launchers. The workspace-root `prepublishOnly` guard is not part of the public package. |
| Dependency licenses | Pass | `pnpm review:licenses` writes a path-free review record and fails on a license outside the approved current set. This is a license review, not a vulnerability scan. |

## Tests inspected

- Executor and adapter tests cover shell-string rejection, path traversal, symlink escape, final-symlink writes, secret-redacted failures, and split-output redaction.
- Config/recipe tests cover command-shaped input rejection, export without secrets, and recipe hash validation.
- Packed-artifact tests install one SHA-256-identified tarball outside the workspace and execute both aliases.
- Candidate workflow tests assert that publication has platform, recipe, failure-path, pack, and artifact-acceptance dependencies without `continue-on-error`.
- The failure-path workflow uses the ordinary test and packed usability surfaces on each supported OS. Its port-collision check owns and closes a temporary loopback listener, verifies that the generated Vite command rejects a forced occupied port with a bounded process timeout, then runs the normal printed command. It does not execute an arbitrary server command or alter a user project.

## Findings

No P0/P1 security or data-loss defect was identified in the reviewed source. This result does not close the Phase 27 release gate: exact-SHA CI evidence, soak, repeated qualification, manual sessions, and the executed candidate failure-path exercises remain required. Any source change to executor, adapters, config parsing, recipe validation, artifact packaging, or release workflow requires this review to be repeated.
