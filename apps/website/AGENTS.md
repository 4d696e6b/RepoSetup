# Integrated companion website development

Continue on `codex/release-0.3.0`. The owner approved integrating the published 0.2.3 website with the bounded 0.3.0 guidance/selection surface, and removed formal freeze, soak and calendar waiting requirements on 12 October 2026.

- Keep `src/reference` explicitly tied to published 0.2.3 facts while development selections use the reviewed CLI in `src/handoff.ts`. Do not present unpublished selection flags as working through a floating public npm launcher.
- Preserve full catalog/docs, existing routes, schemaVersion 1 downloads with an explicit project path, supplied artwork, keyboard/reduced-motion behavior and production privacy safeguards.
- The beginner surface is lazy-loaded and receives validated JSON from registry export. Keep installation/domain behavior in core/integrations/registry and process/file execution in the CLI executor. No workspace runtime imports in the browser bundle.
- Tokens/configs/project names/search values never enter analytics labels, storage or network requests. Never request real secrets.
- Exclude private artwork provenance, prompts, source maps, credentials and repository sources from public build output. Production deployment remains separately authorized; development work does not change the live site.
- Test both legacy and beginner routes, downloads, command/file equivalence, invalid input, clipboard fallback, navigation races, reflow and accessibility. Run workspace unit tests/typecheck/lint/build and exact-artifact handoff checks. Record unavailable Python/browser/manual checks honestly.
- Update `RECONCILIATION_0.3.0.md` and current website status. Preserve historical published evidence.
