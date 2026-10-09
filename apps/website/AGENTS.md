# Published 0.2.3 companion website

The owner authorized this website and documentation renovation. This scoped
exception supersedes the original website exclusion for this application only.

- Work on `codex/0.2.3-website`, based on `v0.2.3` at
  `a213a6a1edf63771aba8d5b91bfdcf44d665de22`.
- Document only published `rsetup@0.2.3`. Generate IDs, flags, schemas, and
  relationships from the pinned release definitions. Keep explanations curated.
- Do not import CLI or core runtime code into the public browser bundle. Browser
  dependencies belong to this application; leave core, registry, integrations,
  and CLI release definitions unchanged.
- Preserve the supplied assets from the chat “Create RepoSetup logo”; record their
  provenance in `public/brand/README.md`.
- Hand off declarative configuration and exact version-pinned terminal commands.
  Require local preview and retain CLI confirmation; never execute installers,
  upload user projects, or request secrets. The owner has explicitly authorized
  public Vercel deployment of this website's checked static artifact. Keep
  repository source, planning documents, credentials, and CLI execution out of
  the public deployment artifact.
- Keep maturity labels and qualification limits visible. Schema acceptance does
  not prove an arbitrary combination is qualified.
- Test catalog generation, docs links and examples, invalid choices, downloads,
  keyboard navigation, direct links, responsive layout, and accessibility.
- Run website unit/browser/published-package handoff checks, workspace typecheck,
  lint, and build. Record unavailable browser environments honestly.
- Update `docs/specification-documentation/implementing-docs/STATUS_WEBSITE_0.2.3.md`.
