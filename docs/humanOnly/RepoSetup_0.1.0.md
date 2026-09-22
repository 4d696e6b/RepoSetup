# RepoSetup v0.1.0 — human guide

**For humans.** This is the first **public GitHub** release of RepoSetup. It is an early-stage `0.1.0`. It is not `1.0.0`. The public npm name is `reposetup-cli`. It is **not on npm** until the maintainer publishes from `packages/cli`.

Date: 22 September 2026.

## What this version is

RepoSetup is a terminal program. You describe a project stack. It validates compatibility, orders work, and prints a typed plan. `--dry-run` shows that plan without writing files or running installers.

There is no website, no accounts, and no hosted registry.

## How to run it

Requires Node.js 20+ and pnpm 12.5.1.

```bash
pnpm install
pnpm build
node packages/cli/dist/bin.js --help
node packages/cli/dist/bin.js --version
```

`--version` must print `0.1.0`.

After npm publication:

```bash
npx reposetup-cli --help
```

Preview:

```bash
node packages/cli/dist/bin.js create --config examples/reposetup.next-sqlite.json --dry-run
```

## Commands that exist

`create`, `add`, `remove`, `search`, `info`, `stack`, `doctor`, `export`, `registry validate`.

There is no `import` command. Use `create --config`.

## Honesty

- **Candidate** integrations have tests; they are not all proven on every OS.
- **Experimental** IDs are implemented but not qualified.
- **Stable:** none.
- Next.js full execute needs disk/CI. FastAPI/Flask need `uv`. Linux/Windows GitHub Actions exist but may not have been observed on this machine.
- Do not treat all 33 catalog IDs as production-ready.

## Safety

Prefer `--dry-run`. Do not put secrets in `reposetup.json`. See `SECURITY.md`.

## More

Public README: repository root `README.md`. Specs: `docs/specification-documentation/`.
