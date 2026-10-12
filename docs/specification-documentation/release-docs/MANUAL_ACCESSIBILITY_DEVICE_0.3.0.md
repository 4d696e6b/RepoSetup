# 0.3.0 manual accessibility and device qualification

Status: **protocol ready; no manual screen-reader or physical mobile-device result recorded.** This is Phase 9 gate 9.6, separate from the 70/70 automated browser cases and owner-approved scripted beginner journeys. Do not mark a row passed from emulation, an accessibility tree, or a screenshot alone.

## Owner-requested Chrome substitution — 12 October 2026

The owner requested that the assistant test using the installed Chrome phone extension rather than arranging a physical-phone session. That instruction supersedes the earlier physical-phone requirement for the requested emulated session. It does not turn an emulator into physical-device or native mobile screen-reader evidence.

The assistant used the installed “Activate mobile view on this tab” simulator, displaying the iPhone 13 Pro profile, against fixed preview `http://127.0.0.1:4177/` at website source `6a65d65b84067a67b1faa6d482583bfcf7b92ed9`. Catalog/matrix: `0.3.0-cli.5` / `0.3.0-selection.5`; reviewed CLI source `ae4b9011c47d23d176770a749cde2560c64775c8`, version 0.3.0, tarball SHA-256 `cf458b036cf78e25445416dc1ba9e73ab2d40c3591828afac576cbd1a406d7e4`. Host: macOS 14.7.2 arm64 with desktop Chrome 154.0.8037.98; the emulated phone is not running Safari or iOS.

Passed: React/Vite creation with Zod, invalid traversal-folder refusal and recovery, “When can I skip it?” guidance and retained selections, actual command clipboard equality, actual downloaded selection-v1 JSON, existing-project add, clearing incompatible Node choices on switching to FastAPI, and pytest add export. Additional 390px/320px Chrome viewport checks show no horizontal page overflow; when clipboard access was unavailable, the command was selected and manual copying succeeded. The browser download-event observer timed out, but the native download history and downloaded JSON files independently confirmed completion. No product defect is inferred from that observer timeout.

A native VoiceOver 10 (920.17) attempt confirmed the macOS switch could be enabled and restored to its initial off state. The tool could not reliably expose spoken/caption feedback, so this attempt does not pass the full announcement/error/focus protocol. No physical-device, native mobile reader, observed participant or full desktop screen-reader result is claimed. Evidence and screenshots are retained locally under `tmp/dist/chrome-extension-evidence`; the PR records current readiness independently of historical protocol wording below.

## Record the exact candidate

Before each session, record the website source SHA and deployed/preview URL, catalog revision, CLI source SHA, installed tarball SHA-256, test date, tester, operating-system version, physical device model, browser/version, and screen-reader/version when used. Verify the site displays the candidate CLI version and that the local `reposetup --version` comes from the pinned artifact. Use a fresh test-owned project directory. Never enter real secrets.

## Required sessions

1. **Desktop screen reader:** use a native screen reader with its supported browser on a physical desktop/laptop. Navigate by headings, landmarks and links from the goals page to a minimal React/Vite preset, then the builder. Confirm the purpose/limitations of an optional library are announced. Select Zod, review the summary, copy the command, and verify focus and announced state changes. Submit an invalid folder; confirm the field, its error and the blocked export are announced; correct it without losing the selection. Record any ambiguous or silent state.
2. **Mobile physical device:** use a real phone or tablet browser, with its built-in screen reader enabled for at least the form/error path. Repeat a minimal frontend choice and an existing-project add choice. Check horizontal reflow, touch target reachability, navigation, focus order, labels, checked/disabled states, validation errors, command copy and JSON download. Record the actual clipboard/download result and any browser permission prompt. A simulator/emulator does not close this row.
3. **Local CLI handoff:** on a Node 24 machine, install the exact tarball from the candidate evidence, paste the exported command in the correct directory, and confirm it shows decoded choices plus the local plan before asking to proceed. Cancel once and verify no project mutation; run `--dry-run`; then confirm in a fresh test-owned directory and verify the expected project/add result and doctor output. Record required prerequisite setup and every manual intervention.

For each session, retain a short pass/fail log with the candidate identities, observed behavior, issue IDs/severity, and a redacted recording or notes if the tester consents. Store no project secrets, clipboard contents from unrelated work, or personal data in the repository. A failed or unperformed session leaves gate 9.6 open; fix source defects and rerun the affected candidate checks.

The five B01–B05 automated beginner journeys remain valid scripted evidence, but zero people have been observed for 0.3.0. The owner accepted that substitution for Phase 8 only; this manual accessibility/device gate remains required for release qualification.
