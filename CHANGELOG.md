# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses a `0.0.0` pre-release version until the first public tag.

## [Unreleased]

### Added

- Phase 0–16 product surface: create, add, remove, search, info, stack, doctor, export, and registry validate.
- Experimental JavaScript and Python integration catalog with dry-run golden stacks.
- Explicit package-only `remove()` recipes for zod, prettier, pydantic, pytest, and ruff.
- Linux, macOS, and Windows CI; tag workflow that packs workspace tarballs without publishing.
- Integration freshness metadata required on every built-in definition (`verifiedAt` plus docs URL).

### Security

- Command failures no longer copy child stdout/stderr into error details.
- Process execution uses `spawn` with `shell: false` and project-root path checks.

### Notes

- Built-in integrations remain experimental. Packages remain private and unpublished.
