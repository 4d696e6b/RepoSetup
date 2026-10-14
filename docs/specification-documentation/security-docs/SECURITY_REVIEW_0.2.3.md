# 0.2.3 bounded release security review — 2026-10-08

Scope: installed-stack repairs merged through PR #17, development-dependency
policy, generated database helpers and Compose configuration, diagnostics and
version-bound artifact-only publication. Final publication acceptance passes as recorded below.

- Integration definitions still produce typed operations; only the executor
  mutates generated projects or starts installation commands. Declarative configs
  cannot provide arbitrary executables. Process arguments remain arrays with
  shell execution disabled.
- Create includes explicitly selected development dependencies. Normal runtime
  additions and locked reproduction retain their existing dependency policy.
  Doctor's damaged-link reinstall is a displayed manual recovery command;
  doctor remains read-only and does not install packages automatically.
- Timeout/cache diagnostics are bounded and redacted. Partial creation stops
  with a nonzero error and its actual destination; no resume or silent overwrite
  is introduced. Cache ownership and system prerequisites are not modified.
- Generated SQLAlchemy uses the selected Psycopg binary driver and explicit
  DATABASE_URL; constructing the engine does not connect. Prisma JavaScript
  imports real generated TypeScript paths through the supported Node runtime.
- Compose PostgreSQL publishes on IPv4 loopback, requires a locally supplied
  password and uses the official PostgreSQL 18 persistent-volume layout. Generated
  config contains placeholders. Database/container acceptance uses disposable
  owned resources and does not touch user services or persist real credentials.
- Publication still requires three consecutive first-attempt exact-source release
  qualifications with every required job and step passing, an unchanged candidate
  branch, and one identified unexpired artifact. Tag/version/source/hash checks
  reject mismatches. The approved hosted GitHub OIDC publisher is reused; no npm
  token or new publisher permission is added. Existing public versions/tags remain
  immutable, and publication uses retained bytes without rebuilding.
- `pnpm audit --prod --json` reports zero known production workspace vulnerabilities
  on October 8. The report is retained at `/tmp/reposetup-0.2.3-production-audit.json`.
  This does not cover every generated development dependency.
- The inherited generated-tool [braces advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  still lists versions through 3.0.3 as affected and no patched version. npm reports
  3.0.3 as current on October 8. No unverified transitive override or audit-clean
  generated-stack claim is introduced.

The bounded review found no new P0/P1 defect in the repair. Native Windows 11,
Linux arm64, browser journeys and arbitrary integration permutations remain
outside qualification. Representative live database and Linux Compose acceptance
are recorded separately; they do not promote every integration to stable.

## Publication acceptance

Passed: exact-source artifact/hash and clean license review; three consecutive
first-attempt release runs; tag-bound dry-run; approved OIDC publication of the
retained bytes; matching registry/latest archive integrity; signed SLSA source/tag/
workflow provenance; 27 verified registry signatures and twenty attestations;
fresh Linux/macOS/Windows registry delivery. A fresh October 9 production audit
again reports zero known vulnerabilities. Original qualification failures remain
recorded; the generated development-tool advisory remains outside that clean
production audit.
See [the release record](../release-docs/STABLE_RELEASE_0.2.3.md).
