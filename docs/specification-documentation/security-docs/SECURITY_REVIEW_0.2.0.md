# Security review — 0.2.0 candidate

Reviewed on 2026-09-30 against code source commit `67e555eaeb4090f585228797e956961506398dd5` and the [security and safety requirements](./SECURITY_AND_SAFETY.md). This is a targeted in-repository code and test review. It is not a penetration test or a claim about third-party package vulnerabilities.

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

### Stable publication tooling follow-up — 2026-10-07

The stable preparation review additionally covers `check-release-qualification.mjs`, `artifact-identity.mjs`, `publish-qualified-artifact.mjs`, `verify-registry-release.mjs`, and the replacement manual publication workflow. The product executor, configuration parser, integration commands and dependency lockfile are unchanged from the soaked alpha source.

- Qualification IDs accept exactly three distinct decimal identifiers; workflow inputs reach Node through environment variables rather than shell interpolation. GitHub requests use the fixed official repository/API origin, an Actions read token, and bounded timeouts. The token is not printed or persisted.
- The gate verifies official repository and workflow identity, first-attempt successful exact-source runs, every required job and step, unchanged branch, latest consecutive evidence, seven elapsed days, and a retained immutable artifact ID. It rejects missing/truncated evidence instead of assuming success.
- Publication checks stable tag/source/version, artifact size and SHA-256, installed manifest and both launchers. The publishing job never builds or repacks. `npm publish` receives an argument array with `shell: false`, an explicit registry/dist-tag and `--ignore-scripts`; it defaults to `--dry-run`. A conflicting existing version or registry error fails closed.
- Registry acceptance compares SHA-512 integrity against the qualified bytes before installation. Its generated fixture and cleanup are restricted to an owned temporary directory. Windows npm invocations use fixed arguments; generated-project execution uses Node with argument arrays. No user project or system runtime is modified.
- Regression tests reject changed sources, fork evidence, missing/skipped/failed gates, stale runs, expired artifacts, tampered bytes, and conflicting registry identity. The owner removed the additional stable soak gate on October 7; the three-run exact-source and artifact gates remain. The packed delivery test launches both aliases, verifies dry-run in an empty directory, and builds/tests the actual generated Express recipe.

No P0/P1 security or data-loss issue was identified in this bounded publication-tooling review. This is not a registry publication or provenance acceptance result; owner review and the remaining stable gates still apply.

No P0/P1 security or data-loss defect was identified in the reviewed source. This result does not close the Phase 27 release gate: exact-SHA CI evidence, soak, repeated qualification, manual sessions, and the executed candidate failure-path exercises remain required. Any source change to executor, adapters, config parsing, recipe validation, artifact packaging, or release workflow requires this review to be repeated.
