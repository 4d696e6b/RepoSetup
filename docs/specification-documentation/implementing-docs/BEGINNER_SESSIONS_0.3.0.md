# 0.3.0 beginner-session protocol

Prepared 2026-10-03 for release Phase 8. **Observed sessions: 0 of 5 originally planned.** On 2026-10-04 the owner accepted scripted beginner simulations in place of recruiting participants for this phase. The five planned human sessions below remain an optional future study; no participant behavior or comprehension has been observed. The simulations are reproducible browser tasks in `apps/website/tests/browser/simulated-beginner.spec.ts`, with packed CLI application and safety evidence recorded separately. Phase 8 still has independent safety and manual accessibility/device gates.

## What the sessions must establish

The website plan requires beginners to explain a library's purpose, choose a minimal preset, customize deliberately, export, preview locally and apply without undocumented repair. Observe the complete learn → choose → copy → local plan → confirmation journey. Record whether people understand optional choices, the provisional existing-project context, the required CLI version and the distinction between preview and installation.

Use the local website and its exact pinned packed CLI. Actual apply tasks require the corresponding real create/add recipe to have passed Phase 2 qualification with its prerequisites. If that evidence is unavailable, run the learning/export/preview portion and mark the session **incomplete for the apply acceptance gate**. A successful dry-run or cancellation does not establish a working installation. The pinned CLI now supports `--diff --dry-run`, `doctor --config` and the narrow `doctor --config --fix` flow; qualify those commands independently before counting maintenance acceptance.

## Prepare each session

1. Invite a willing beginner through the maintainer's normal process. Explain that the software, rather than the participant, is being evaluated and that they may stop. This document does not authorize contacting anyone or collecting recordings.
2. Use a session code such as B01, with no participant name, email, credentials or private project details in the repository. Record only the experience level and device/input details voluntarily relevant to the task. Use local fictional project names and disposable fixtures.
3. Record the website commit, generated catalog/recipe revisions, CLI source commit, tarball SHA-256, Node/package-manager versions, OS, browser/version, viewport and input method. Include assistive technology when used; do not infer screen-reader coverage from axe.
4. Prepare an empty parent directory for create and a qualified disposable project for add. Keep a baseline snapshot of existing files and a documented expected outcome. Do not use an actual personal repository, real secrets or elevated prerequisite installation. Start the browser at goals with no retained draft.
5. Ensure the pinned local CLI is on PATH. Keep commands visible and let the participant read the plan and decide whether to confirm. The browser never runs the command. Stop when an unexpected mutation, missing prerequisite or unexplained conflict appears; record the blocker rather than repairing it behind the participant's back.

## Five planned human sessions (optional future study)

These are coverage assignments, not completed results. Use five distinct beginners; additional sessions are welcome. Keep moderator wording neutral and offer help only after recording the difficulty.

- **B01 — minimal frontend.** “You want to start a small browser app. Find a starting point and choose only what you need today.” Observe whether the React/Vite preset is understood and optional tools remain unselected deliberately. Ask the person to explain one library they skipped, export, preview, then apply the qualified minimal starter.
- **B02 — deliberate frontend capability.** “Your browser app needs to validate form data. Find out what can help and prepare that setup.” Observe goal discovery, Zod's explanation and a purposeful optional choice. Ask what changes when it is added, where the copied command should run, and whether the local plan matches their expectation. Apply only the qualified chosen variant.
- **B03 — Node API.** “You want a small TypeScript API and a way to test it. Find a starting point and prepare the setup.” Observe Express versus frontend context, minimal essentials, Vitest's purpose and selected impact. Follow the token handoff through plan, confirmation and verified starter outcome.
- **B04 — Python API.** “You want a small Python API and tests. Decide what belongs in the starting setup.” Observe FastAPI/uv context, pytest, Pydantic's existing role and explanations for unavailable Node tools. Verify prerequisites and use only the qualified Python recipe; record any confusion about redundant capability choices.
- **B05 — existing project.** “This prepared project already exists. Add input validation without replacing its framework or your files.” Provide a qualified existing Express or React fixture. Observe explicit add mode, at-least-one guidance and provisional context. Verify preserved existing files, expected added capability and repeat behavior against Phase 2 evidence. Then ask how to recover from an invalid new-project folder and how to use Download selection.json if copying fails.

Across the sessions include keyboard use, at least one narrow viewport, and a participant using a screen reader when available. Do not assign assistive technology to someone who does not normally use it. An independent manual screen-reader check remains necessary if sessions do not cover it. Current bounded choices fit the command limit; explain the validated file alternative without claiming a participant reached automatic size fallback. Boundary fixture tests provide separate transport evidence.

## Planned maintenance follow-ups

These are additional observed tasks, not completed sessions. Give a beginner a disposable, qualified project with its intended-stack config and a missing Prettier recipe config. Ask what `doctor --config reposetup.json` found, what `--fix --dry-run` would change, and whether they want to confirm `--fix`. Record the decision and verify the file and repeat result. In a separate qualified Python/Pydantic Settings or Prisma fixture, remove only the generated `.env.example`, keep a fictional `.env`, and observe whether the person distinguishes placeholders from secrets and understands any manual finding. Preserve custom alternative configs and user files. Record exact CLI artifact, OS and outcome; automated fixtures do not replace these observations.

## Moderator prompts and observations

Begin with the goal prompt only. Ask the participant to think aloud if comfortable. At useful checkpoints ask: “What does this library do?”, “Why add it now?”, “What can you skip?”, “Where will you run this?”, and “What happens before anything changes?” Avoid giving the name of a button or the correct answer before the attempt.

Record the first route/choice, wrong turns, misunderstood wording, ignored notices, unnecessary selections, export failures and recovery. Note where help was requested or supplied, the exact blocker and whether the person succeeded unassisted. Optional elapsed time is descriptive; do not invent a speed benchmark. Before confirmation, verify the person can explain the local plan. After apply, verify the actual documented expected result and preservation baseline, and record any manual steps. An undocumented repair makes that task a failure even if the project eventually works.

## Session record template

Copy this block for each actual session. Until then keep planned slots B01–B05 unfilled.

- Session code/date and goal:
- Relevant experience and device/input context, voluntarily supplied:
- Website commit/catalog/recipe; CLI commit/version/artifact hash:
- Runtime/prerequisites; OS/browser/version/viewport; assistive technology:
- Fixture and expected outcome/preservation baseline:
- Purpose/minimal-preset/optional-choice explanation in the participant's own words:
- Observed route, choices and missteps:
- Export, local preview, plan comprehension and confirmation result:
- Actual apply verification, preserved files and repeat outcome where relevant:
- Assistance/undocumented repair, or reason apply was not attempted:
- Outcome: unassisted success / assisted success / failure / incomplete; rationale:
- Issues, severity, evidence and follow-up fix/retest identity:

## Close the gate honestly

For the owner-approved simulated path, report B01–B05 as scripted browser checks and pair them with the packed CLI create/add evidence; record source/artifact identities, failures and fixes. These checks establish that the scripted routes and exported choices work, but cannot establish how a new person would understand them. If a human study happens later, summarize actual outcomes, recurring terminology problems and remaining coverage gaps; keep incomplete sessions and adverse results in the evidence. Phase 8 also retains whole-release safety, manual accessibility and maintenance checks. Update [combined phase progress](./STATUS_0.3.0.md) and [website status](./STATUS_WEBSITE_0.3.0.md) without renaming automated checks as participant observations.
