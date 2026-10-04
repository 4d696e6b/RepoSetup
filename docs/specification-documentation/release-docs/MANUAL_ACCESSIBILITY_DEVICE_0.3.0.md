# 0.3.0 manual accessibility and device qualification

Status: **protocol ready; no manual screen-reader or physical mobile-device result recorded.** This is Phase 9 gate 9.6, separate from the 70/70 automated browser cases and owner-approved scripted beginner journeys. Do not mark a row passed from emulation, an accessibility tree, or a screenshot alone.

## Record the exact candidate

Before each session, record the website source SHA and deployed/preview URL, catalog revision, CLI source SHA, installed tarball SHA-256, test date, tester, operating-system version, physical device model, browser/version, and screen-reader/version when used. Verify the site displays the candidate CLI version and that the local `reposetup --version` comes from the pinned artifact. Use a fresh test-owned project directory. Never enter real secrets.

## Required sessions

1. **Desktop screen reader:** use a native screen reader with its supported browser on a physical desktop/laptop. Navigate by headings, landmarks and links from the goals page to a minimal React/Vite preset, then the builder. Confirm the purpose/limitations of an optional library are announced. Select Zod, review the summary, copy the command, and verify focus and announced state changes. Submit an invalid folder; confirm the field, its error and the blocked export are announced; correct it without losing the selection. Record any ambiguous or silent state.
2. **Mobile physical device:** use a real phone or tablet browser, with its built-in screen reader enabled for at least the form/error path. Repeat a minimal frontend choice and an existing-project add choice. Check horizontal reflow, touch target reachability, navigation, focus order, labels, checked/disabled states, validation errors, command copy and JSON download. Record the actual clipboard/download result and any browser permission prompt. A simulator/emulator does not close this row.
3. **Local CLI handoff:** on a Node 24 machine, install the exact tarball from the candidate evidence, paste the exported command in the correct directory, and confirm it shows decoded choices plus the local plan before asking to proceed. Cancel once and verify no project mutation; run `--dry-run`; then confirm in a fresh test-owned directory and verify the expected project/add result and doctor output. Record required prerequisite setup and every manual intervention.

For each session, retain a short pass/fail log with the candidate identities, observed behavior, issue IDs/severity, and a redacted recording or notes if the tester consents. Store no project secrets, clipboard contents from unrelated work, or personal data in the repository. A failed or unperformed session leaves gate 9.6 open; fix source defects and rerun the affected candidate checks.

The five B01–B05 automated beginner journeys remain valid scripted evidence, but zero people have been observed for 0.3.0. The owner accepted that substitution for Phase 8 only; this manual accessibility/device gate remains required for release qualification.
