# rsetup

Terminal-first CLI that composes, validates, and configures development stacks.

```bash
npx rsetup --help
```

This is the public npm name for RepoSetup. After `npm install -g rsetup`, both `rsetup` and `reposetup` work.

This is an **early-stage** `0.2.0-alpha.1` release candidate. It requires Node.js 24 or later. Python recipes require Python 3.12 or later and uv; 3.12 and 3.13 are qualified for this candidate. Integrations are not all equally mature. Use `--dry-run` before changing an important project.

The workspace libraries `@reposetup/core`, `@reposetup/registry`, and `@reposetup/integrations` are bundled into this package. They are not published separately.

Unscoped `reposetup` and `reposetup-cli` cannot be used: npm rejects them as too similar to existing `repo-setup` and `repo-setup-cli`.

Development source: `0.3.0-alpha.1` (unreleased CLI selection slice). Published/candidate commands above remain historical 0.2.0 guidance; no 0.3.0 package has been published by this work. See [selection v1 contract](../../docs/specification-documentation/product-docs/SELECTION_V1.md).

On the separate `codex/0.4.0-task-compiler` development branch, this same unchanged
package version also includes experimental coding-task commands. Inspect
`reposetup task --help` using the exact locally built artifact from that branch;
a floating npm package does not select it. `task compile`, `task next` and
`task status` support local structured drafts/advisory handoffs without API keys
or RepoSetup AI credits. They require independent reviewed inputs and do not
certify completion. `task run` and `task compile --managed` require reviewed
authority, exact preview approval and explicit provider usage allowance for real
model calls. Live provider qualification, production routing and comparative
quality/cost evidence remain deferred. Azure has no runtime adapter. Existing
installer commands and configs need no migration. No 0.4.0 release is qualified
or published; simulated-provider tests establish local behavior only.
