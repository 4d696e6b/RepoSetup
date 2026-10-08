# 0.2.2 bounded release security review — 2026-10-08

Scope: dependency-health repairs merged through PR #13, the version/tag gates
and artifact-only publication. This does not qualify every generated combination.

- Typed operations and executor-only process/file mutation remain in force.
  Pip manifests use fail_if_exists; existing user requirements are not overwritten.
- Node probes read package metadata; Python probes use isolated mode, disabled
  bytecode writing, stdlib TOML parsing and distribution metadata. They do not
  import application/dependency modules, run arbitrary config commands or sync
  packages. Doctor does not create a missing uv environment. Required package
  names and process arguments are fixed/validated; no shell interpolation is added.
- External Python requirement formats outside generated pinned requirements
  fail for manual inspection. Probe failures fail health checks rather than report
  success. Metadata presence is explicitly bounded and does not prove live services.
- Publication still requires three exact-source first-attempt qualifications,
  all required jobs/steps, unchanged candidate branch, immutable retained artifact,
  matching version/source/hash and a new tag. Existing published bytes/tags remain
  unchanged. The approved hosted GitHub OIDC workflow is reused without npm tokens;
  [official npm requirements](https://docs.npmjs.com/trusted-publishers/) were rechecked.
- `pnpm audit --prod --json` reports zero production workspace vulnerabilities
  on October 8. This does not cover generated development tooling.
- Generated development tooling retains [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
  affecting versions through 3.0.3 with no published patch as of this review.
  No unqualified transitive override or audit-clean claim is introduced.

No new P0/P1 defect was identified in this bounded review. Native desktop targets,
live databases, browser journeys and all integration permutations remain outside
qualification. Final publication and signature/provenance acceptance are tracked
in [the release record](../release-docs/STABLE_RELEASE_0.2.2.md).
