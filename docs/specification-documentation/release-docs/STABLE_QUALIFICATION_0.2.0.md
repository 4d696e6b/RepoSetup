# Stable 0.2.0 qualification and delivery evidence

Phase 27 closed for the alpha source after its seven-day soak. On October 7, 2026 the owner removed the proposed *additional* seven-day stable soak and authorized completing 0.2.0 after exact-source qualification. Phase 28 is complete: the exact qualified artifact is published with provenance, and installed-package acceptance passed on all three supported operating systems.

## Published source and artifact

- Git tag: `v0.2.0` at `04228d5206617355b609f640267c73669880e060` on `codex/phase-28-provenance-correction`.
- Package: `rsetup@0.2.0`, Node.js 24+.
- Three consecutive successful first-attempt full qualifications: [37657135210](https://github.com/4d696e6b/RepoSetup/actions/runs/37657135210), [37657140756](https://github.com/4d696e6b/RepoSetup/actions/runs/37657140756), [37657146191](https://github.com/4d696e6b/RepoSetup/actions/runs/37657146191). Each passed all 16 required jobs and steps without a required skip, including Ubuntu, macOS, Windows, Python 3.12/3.13 recipes, failure paths, one pack, and same-tarball acceptance.
- Exact-source [benchmark 37657151415](https://github.com/4d696e6b/RepoSetup/actions/runs/37657151415) and [usability checks 37657157460](https://github.com/4d696e6b/RepoSetup/actions/runs/37657157460) passed.
- Retained `candidate-artifact` ID `11498793067` from the final qualification contains `rsetup-0.2.0.tgz`, 106623 bytes, SHA-256 `3ac07e71812f90b95b60802900bf1fa862e0b9129ed32b13232dd2c1eee8cde8`, npm integrity `sha512-Lykt5gGuxFGlEXMUuMZZ1Y3n9bxLF63OWo+zQQaV1ZtqKF2T5QqhQPokpSuSaZ1GeCuJAyKvLdXZ+88SbSHZQA==`.
- The downloaded artifact passed `verify-packed-artifact.mjs` again on macOS outside the monorepo.

The tag had initially pointed to `ee93373c59615a197d0e724353738fd3e695a1a2`. Its package tarball had the *same* SHA-256, but its publication workflow nested the downloaded archive. A default-branch workaround verified the archive but npm rejected its provenance with `E422`, because the workflow event source differed from the tag source. The owner explicitly authorized a one-time replacement of the unpublished `v0.2.0` tag **after** fresh qualification. The corrected `04228d5` source flattens artifact downloads while preserving the tag event, and the tag was moved only after npm confirmed 0.2.0 did not yet exist. Never move this released tag or replace published bytes.

## Publication and registry state

The package owner authenticated and approved a GitHub OIDC trusted publisher for `4d696e6b/RepoSetup`, workflow `publish-npm.yml`, with direct `npm publish` permission and no environment restriction. npm reports that publisher as `Valid` after the first tag-bound publish. [Tag-bound dry run 37658608341](https://github.com/4d696e6b/RepoSetup/actions/runs/37658608341) passed against the exact source and retained artifact.

[Tag-bound publish 37658713089](https://github.com/4d696e6b/RepoSetup/actions/runs/37658713089) returned `+ rsetup@0.2.0` and published its signed provenance statement to [Sigstore log entry 3133834168](https://search.sigstore.dev/?logIndex=3133834168). The registry attestation identifies `refs/tags/v0.2.0`, source digest `04228d5206617355b609f640267c73669880e060`, and that publishing run. Its workflow failed *after npm accepted the upload* because an immediate metadata lookup returned 404 while npm's publish-time scan was still processing the package. The package subsequently appeared in the registry with the qualified SHA-512 integrity, and `latest` points to `0.2.0`. This delayed visibility is expected under [npm's publish-time scanning policy](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/). The release-tooling correction in this evidence branch waits up to 20 minutes for visibility on future publishes; no second upload or package-byte replacement was attempted.

[Safe delivery retry 37659541713](https://github.com/4d696e6b/RepoSetup/actions/runs/37659541713) succeeded on the same tag and qualification IDs. Its publication step detected the existing version, verified exact integrity, and skipped `npm publish`. All three registry acceptance jobs passed on Ubuntu 24.04, macOS 15, and Windows 2025, with no skipped step. Each installed the published package outside the monorepo, checked both aliases, help/version and dry-run, and built and tested a real TypeScript Express/Vitest recipe.

## Superseded and failed evidence retained

- Initial stable preparation source `3821519511acd79b3263f42f1be14a752149cd4f` passed [37647145314](https://github.com/4d696e6b/RepoSetup/actions/runs/37647145314) and [37647150898](https://github.com/4d696e6b/RepoSetup/actions/runs/37647150898), but [37647155958](https://github.com/4d696e6b/RepoSetup/actions/runs/37647155958) failed a Windows locked-install fixture deadline. The fixture was corrected; those runs do not count for release.
- Intermediate source `4a6f49ca139cbd4f0915a3556497f48ae7543ae6` passed [37648824809](https://github.com/4d696e6b/RepoSetup/actions/runs/37648824809), [37648831078](https://github.com/4d696e6b/RepoSetup/actions/runs/37648831078), and [37648836155](https://github.com/4d696e6b/RepoSetup/actions/runs/37648836155), plus benchmark and usability checks. Its identical tarball hash does not replace exact-source qualification.
- The prior tag source `ee93373c59615a197d0e724353738fd3e695a1a2` passed [37653362998](https://github.com/4d696e6b/RepoSetup/actions/runs/37653362998), [37653376658](https://github.com/4d696e6b/RepoSetup/actions/runs/37653376658), and [37653392242](https://github.com/4d696e6b/RepoSetup/actions/runs/37653392242), plus benchmark and usability checks. [First dry run 37655329425](https://github.com/4d696e6b/RepoSetup/actions/runs/37655329425) exposed the artifact layout issue. [Main-branch publish 37655948630](https://github.com/4d696e6b/RepoSetup/actions/runs/37655948630) failed npm authentication (`ENEEDAUTH`), and [retry 37656653901](https://github.com/4d696e6b/RepoSetup/actions/runs/37656653901) failed provenance (`E422`). Neither published package bytes.

## Gate result

- [x] Exact-source qualification, benchmark, usability, retained artifact, trusted publisher, tag-bound dry run, signed npm publish, registry integrity, and `latest` tag.
- [x] Safe retry and installed-package acceptance passed on all three supported operating systems, with final results linked in [implementation status](../implementing-docs/IMPLEMENTATION_STATUS.md).

Follow [the stable delivery runbook](./STABLE_RELEASE_0.2.0.md) for acceptance and patch recovery. The final tag and npm version are immutable release identities.
