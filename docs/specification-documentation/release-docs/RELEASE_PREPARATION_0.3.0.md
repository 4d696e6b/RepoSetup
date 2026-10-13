# 0.3.0 release preparation

## Current delivery checkpoint — 13 October 2026

Use [current implementation status](../implementing-docs/STATUS_0.3.0.md#current-delivery-implementation--13-october-2026) and [the delivery procedure](./RELEASE_DELIVERY_0.3.0.md) for current source and gates. All selected automated gates, including three full release-workflow waves, passed at `506069c960e6a914b5f459c03e9d74786ad38dbd`. The following website publication-mode implementation requires renewed qualification at its own source; results at an older SHA are not substituted. Native screen-reader announcements remain unverified, pending an actual test or explicit owner deferral. The Chrome phone substitution is accurately recorded as emulation. No main merge, tag, npm publication or production deployment has happened; no freeze or soak gate applies. Older preparation/alpha statements below are historical checkpoints.


## Owner decision — 12 October 2026

The owner removed the formal freeze, seven-day soak and calendar waiting requirements for 0.3.0. Continue implementation immediately. Exact source/artifact identity, meaningful regression and platform checks, blocker review, manual accessibility/device evidence, and separate publication/deployment authorization still apply. The old soak monitor is paused. Historical freeze/soak statements below describe the preceding policy and do not impose a current waiting gate.

Status: **stable metadata and integrated website prepared; final qualification and delivery pending. No freeze or soak gate.**

Canonical release branch: `codex/release-0.3.0`. Target: `0.3.0`; prepared CLI, website and private library version: `0.3.0`. The public npm release remains `0.2.3`. The core, registry and integrations libraries remain private.

The branch reconciles integrated 0.3.0 feature source `bfeab2f66806d42fa7d32ac4c144d1464bd88a48` with published-fix baseline `main` at `1b5b4c2de3ad20cf5ee2366136732e417e3b0603`. This retains selection, previews, intended-stack doctor, bounded repairs and companion website work together with the shipped 0.2.1–0.2.3 fixes. The original candidate/development worktrees and the website's two additional local documentation commits are preserved.

## Current delivery preparation — 12 October 2026

- Stable `0.3.0` metadata is prepared for the CLI, private libraries and website. No tag or publication has occurred.
- The full 0.2.3 reference is preserved as an immutable historical JSON snapshot with its original digest. Active command references are generated from the pinned 0.3.0 CLI, with all 37 integration IDs and five legacy presets retained. Four new guides cover selection, previews, intended health and narrow repair. Published release history remains accurate at 0.2.3.
- Real dependency installation in packed maintenance fixtures closes the regression without weakening installed-health checks. A damaged environment now has an explicit packed refusal regression. The repaired platform push workflow passes on all three advertised runners.
- WebKit focus restoration, native Option-Tab navigation and deterministic fake-clock tests address the renewed browser failures. The final five-profile browser run remains required.
- Maintainer build tooling now pins patched esbuild 0.28.1 and source-map-js 1.2.2. Workspace audit reports zero advisories after the update; generated application dependencies have their own independent scope and this is not a universal security guarantee.
- Source/artifact identity, unchanged tarball handoff, complete real Python/create/add/legacy, native transport, golden and three exact-source release-workflow qualifications remain technical gates. They can run immediately; no calendar delay applies.
- The owner can perform native desktop screen-reader and physical-mobile checks on the fixed preview. Their actual results must be recorded; automated emulation does not substitute for them.
- Publication uses the reviewed retained artifact, not a rebuilt package, after the immutable tag and explicit publication authorization. Website production promotion follows verified npm delivery; candidate wording and historical production 0.2.3 remain separate until then.

See [reconciliation](../implementing-docs/RECONCILIATION_0.3.0.md) for current evidence and [the manual protocol](MANUAL_ACCESSIBILITY_DEVICE_0.3.0.md) for the remaining device checks. Historical candidate evidence is retained in [the candidate record](RELEASE_CANDIDATE_0.3.0.md). This document does not mark the release complete.
