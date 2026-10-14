# Security Policy

## Supported versions

RepoSetup is an **early-stage** open-source project. The maintained release line is **`0.2.x`**, with published `0.2.3` as the newest patch. See the [current release record](docs/specification-documentation/release-docs/STABLE_RELEASE_0.2.3.md) for publication and delivery status. Security fixes target the newest published patch; older patches are not a separate long-term support line. Version `1.0.0` and uniformly stable integration support are not claimed.

## What RepoSetup executes

RepoSetup runs on the developer's machine. After a confirmed (or `--yes`) plan it may:

- write files inside the target project root;
- spawn package managers and official generators (`pnpm`, `npm`, `uv`, `create-next-app`, `prisma`, and similar) with `spawn` and `shell: false`.

Integrations are **declarative**: they generate typed operations. They do not embed arbitrary shell. Config files cannot contain scripts, callbacks, or remote plugin URLs.

RepoSetup does **not** install Node, Python, Docker, or database servers.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository (Security advisory / "Report a vulnerability") when that UI is enabled.

If it is not enabled yet, contact the repository owner privately. Do **not** file a public issue that includes an exploit or secrets.

Include:

- RepoSetup version (`reposetup --version` or `node packages/cli/dist/bin.js --version`)
- OS and Node/Python versions
- command executed
- whether `--dry-run` was used
- a minimal config **without secrets**

Do not attach `.env` files, tokens, credentials, or connection strings. Do not paste secrets in bug reports.

## Policy

Please give maintainers a reasonable window to patch before public disclosure. Early-stage software may ship fixes in a newer patch rather than backporting them to every earlier release. Upgrade to the newest published patch and review its support limits.
