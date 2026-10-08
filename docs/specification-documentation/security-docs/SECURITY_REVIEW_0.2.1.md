# 0.2.1 release security review — 2026-10-08

Scope: the regression fixes merged through PR #10, version/tag changes, artifact-only
publication, registry identity and delivery checks. This is a bounded release
review, not a claim that upstream dependencies or all generated combinations are
free of vulnerabilities. Historical 0.2.0 review remains separate.

- Typed operation/process boundaries and canonical destination protections remain
  in force; their regression suites pass. Integration definitions contain no new
  shell execution. Child launch-setting filtering preserves registry/cache settings
  while discarding outer npm exec options and manager identity.
- Existing-file and LF/CRLF preservation is tested; aliases/path resolution and
  missing prerequisites remain explicit. No runtime, database or browser is silently
  installed. Prisma initialization opts out of fetching remote coding-agent skills.
- Publication requires three complete exact-source first-attempt runs, unchanged
  candidate branch, official repository, retained immutable artifact and new tag.
  Version/source/size/hash checks precede execution; a 403 is not treated as 404.
  Published bytes and old release tags are never overwritten.
- The npm publisher uses the existing approved GitHub OIDC workflow, hosted runner,
  Node 24 and compatible npm 11, with no new persistent npm credential. Current
  [official requirements](https://docs.npmjs.com/trusted-publishers/) were rechecked.
- `pnpm audit --prod --json` reported zero vulnerabilities in production workspace
  dependencies on October 8. This does not cover generated development tooling.
- Generated Next.js tooling retains [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  recursive-pattern denial of service, affected through 3.0.3, no published patch
  on October 8. The release keeps this explicit and does not force an unqualified
  transitive override. Untrusted patterns are outside the intended development-tool
  use. Next.js 16.3.6 addresses its separately researched security advisory.

No new P0/P1 security or data-loss defect was identified in this bounded review.
The unresolved generated-tool advisory remains documented; zero production audit
findings are not an audit-clean claim for generated stacks. Live databases,
native desktop platforms and browser journeys remain outside qualification.
The owner authorized 0.2.1 publication on October 8; exact artifact and delivery
acceptance are still required before release completion.
