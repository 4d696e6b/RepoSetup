import { handoff } from "./catalog.js";
import { section } from "./dom.js";
import { intro } from "./ui.js";
export function howTo(main: HTMLElement) {
  main.append(
    intro(
      "Review here. Apply locally.",
      "The companion guide helps you decide. RepoSetup’s local CLI remains responsible for validation, review and execution.",
      "HOW IT WORKS",
    ),
  );
  main.append(
    section(
      "Use the matching local CLI",
      `This preview targets rsetup ${handoff.version}, committed at ${handoff.commit}. Have Node 24 and the required manager available. Build/pack the CLI track and install its local tarball using the instructions in apps/website/README.md. Do not use a published 0.2.0 CLI for selection-v1.`,
    ),
  );
  main.append(
    section(
      "New projects",
      "Pick a minimal starter, optionally add tools, and use a new relative folder. Paste the copied command in its parent directory. The CLI refuses an existing target, shows decoded choices and the local plan, and requires interactive confirmation.",
    ),
    section(
      "Existing projects",
      "Choose add capabilities and the current context. Paste from the project package directory. The CLI detects the actual context, preserves existing target files and versions, and refuses incompatible or ambiguous roots. A preset cannot change your framework.",
    ),
    section(
      "Preview before confirming",
      "The secondary --dry-run command is read-only and works without an interactive terminal. Add --diff --dry-run to the copied create or add command for a structural file-change preview; generated and external-tool effects remain uncertain until execution. A normal selection command cannot bypass confirmation with --yes. A cancelled plan makes no project changes.",
    ),
    section(
      "Missing prerequisites",
      "Install Node, Python and your manager yourself using their official instructions. RepoSetup reports missing prerequisites; it does not install system software silently.",
    ),
    section(
      "Stale catalog or wrong CLI",
      "If the CLI reports SELECTION_INVALID with a catalog or version reason, use this preview’s exact local CLI artifact and regenerate the selection. Do not edit encoded tokens to bypass validation. Local detection may also reject an incompatible project.",
    ),
    section(
      "Selection too large",
      "The command limit is 4,200 characters, the token limit is 4,096 characters / 3,072 bytes. Use the validated selection.json fallback for larger inputs, up to 16 KiB. Download into the command directory and use the displayed mode-specific file command.",
    ),
    section(
      "After applying",
      "Inspect generated files and write your application logic/tests. Run reposetup doctor for read-only discovery checks. With a schemaVersion 1 reposetup.json for this project, reposetup doctor --config reposetup.json compares the intended stack with local evidence. A dependency declaration does not prove that the app runs.",
    ),
    section(
      "Review a small missing-file repair",
      "If intended doctor reports an eligible missing Prettier config or recipe-defined .env.example, run reposetup doctor --config reposetup.json --fix --dry-run first. The CLI shows a content-free preview and manual guidance. Then run the same command without --dry-run and confirm locally; --yes is only for an explicit noninteractive repair. Existing files, dependencies, source and real .env values are not replaced or copied. Other findings require manual action.",
    ),
  );
}
