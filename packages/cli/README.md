# reposetup-cli

Terminal-first CLI that composes, validates, and configures development stacks.

```bash
npx reposetup-cli --help
```

The executable name is `reposetup`. After `npm install -g reposetup-cli`, run `reposetup`.

This is an **early-stage** `0.1.0` release. Integrations are not all equally mature. Use `--dry-run` before changing an important project.

The workspace libraries `@reposetup/core`, `@reposetup/registry`, and `@reposetup/integrations` are bundled into this package. They are not published separately.

Unscoped `reposetup` is not used: npm rejects it as too similar to existing `repo-setup`.
