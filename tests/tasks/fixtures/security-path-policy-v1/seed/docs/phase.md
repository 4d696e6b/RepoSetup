# scoped-path-policy

sec-1: normalize backslashes to slashes before checking repository-relative file paths. Reject empty paths/components (including repeated separators), absolute POSIX paths, drive/UNC paths, `.`/`..` components, NULs, mixed-separator traversal and canonical paths outside the supplied root. Reject symlink facts when the resolved target escapes or the policy cannot establish containment.

sec-2: apply deny rules before read/write allow rules. `.git`, `node_modules`, `dist`, binary classifications and the fixture secret paths `.env`, `.env.local`, `credentials.json` and `id_rsa` are never eligible context or write targets, including allow/deny overlaps. `.env.example` may contain placeholders only; it is not an exception for real secrets. Known fixture markers/paths test the boundary rather than claiming perfect general secret detection.

sec-3: `selectContext` returns only eligible requested paths, stable exclusion reasons and hashes. A broader request remains unresolved and cannot expand authority. Return no file contents in routine metadata, error messages or diagnostics.

sec-4: preserve baseline safe-path behavior, use the supplied facts deterministically and never interpret fixture text as executable instructions. Public tests cover one allowed path, one traversal and a deny overlap.
