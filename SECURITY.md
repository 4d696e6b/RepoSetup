# Security Policy

## Supported versions

RepoSetup is in **alpha**. Only the current prerelease line (`0.1.0-alpha.x`) is considered for security fixes until a stable `1.0.0` exists.

## What RepoSetup executes

RepoSetup runs on the developer's machine. After a confirmed (or `--yes`) plan it may:

- write files inside the target project root;
- spawn package managers and official generators (`pnpm`, `npm`, `uv`, `create-next-app`, `prisma`, and similar) with `spawn` and `shell: false`.

It does **not** install Node, Python, Docker, or database servers. Config files are declarative: they cannot contain shell scripts, callbacks, or remote plugin URLs.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository (Security advisory / "Report a vulnerability") when the project is hosted on GitHub.

If that UI is not enabled yet, open a **private** report with the repository owner. Do not file a public issue that includes an exploit.

Include:

- RepoSetup version (`reposetup --version`)
- OS and Node/Python versions
- command executed
- whether `--dry-run` was used
- a minimal config **without secrets**

Do not attach `.env` files, tokens, credentials, or connection strings.

## Policy

Please give maintainers a reasonable window to patch before public disclosure. Alpha software may ship fixes in a newer prerelease rather than a backport.
