import { delivery } from "../../publication.js";
import type { DocPage } from "./content.js";

export const releaseGuides: DocPage[] = [
  {
    slug: "whats-new-0-3",
    title: "What's new in 0.3.0",
    description: "Beginner choices and safer local review, with the shipped 0.2.3 fixes retained.",
    group: "Start",
    sections: [
      {
        id: "choices",
        title: "Start small and understand the tools",
        paragraphs: [
          `${delivery.published ? "RepoSetup 0.3.0" : "The 0.3.0 release candidate"} adds goal discovery, curated explanations and three minimal React/Vite, Express and FastAPI starters. Optional tools are never selected automatically. The bounded create/add combinations come from the built-in registry; the full catalog and five broader bundled presets remain available.`,
          delivery.releaseSummary,
        ],
        links: [{ label: "Prepare the matching CLI", href: "#/how-to" }],
      },
      {
        id: "local-review",
        title: "Review and apply locally",
        paragraphs: [
          "The website exports a declarative selection rather than executable commands inside a configuration. The CLI validates the choices, detects the local context, displays its installation plan and requires confirmation. Dry-run and structural file previews remain available before writes.",
          "Intended-stack doctor compares configuration with local evidence. A narrow repair workflow can create eligible missing recipe files after review. It preserves user files and refuses automatic repair when installed dependencies are unhealthy.",
        ],
        links: [
          { label: "Selection handoff", href: "#/docs/selections" },
          { label: "Intended-stack health", href: "#/docs/intended-health" },
          { label: "Missing-file repair", href: "#/docs/repair-missing-files" },
        ],
      },
      {
        id: "compatibility",
        title: "Keep existing workflows",
        paragraphs: [
          "SchemaVersion 1 configs, create --config, all five create --preset IDs, positional add and supported version 1 JSON output remain compatible. The shipped 0.2.1–0.2.3 installation, dependency-health, database-driver and recovery fixes are retained. Upgrading the CLI does not migrate an existing application or promote all integrations to stable.",
        ],
        links: [{ label: "Published release history", href: "#/release" }],
      },
    ],
  },
  {
    slug: "selections",
    title: "Declarative selections",
    description: "Carry reviewed choices from the builder to your terminal without executable configuration.",
    group: "Guides",
    sections: [
      {
        id: "review",
        title: "Choose the right project context",
        paragraphs: [
          "Choose create for a new relative folder, or add from an existing project's package directory. React/Vite and Express use the reviewed TypeScript/pnpm contexts; FastAPI uses uv. The CLI independently resolves IDs and options from its registry and refuses incompatible or ambiguous existing roots before writes. A preset cannot change an existing framework.",
          "A copied selection command shows decoded choices and the local installation plan, then requests interactive confirmation. --yes cannot bypass selection review. --dry-run is available in noninteractive terminals. Plain schemaVersion 1 configuration and positional add retain their established behavior.",
        ],
        links: [{ label: "Create a selection", href: "#/how-to" }],
      },
      {
        id: "file-fallback",
        title: "Use a file when the command is too large",
        paragraphs: [
          "Selection v1 is a strict versioned envelope with a catalog revision. Tokens are base64url JSON, limited to 4,096 characters and 3,072 decoded bytes. Files are limited to 16 KiB. The builder uses a 4,200-character command ceiling and offers a validated file fallback. An unknown field, stale catalog, hostile name/path, unknown ID, incompatible option or executable field is rejected.",
          "Download selection.json into the directory where you will run the command. Use the displayed create or add file command. Selections must contain public choices only; never include real secrets. Required environment values use placeholders in .env.example.",
        ],
        code: "reposetup create --selection-file selection.json --dry-run\nreposetup add --config selection.json --dry-run",
      },
      {
        id: "conflicts",
        title: "Keep input modes separate",
        paragraphs: [
          "A selection cannot be mixed with a legacy config/preset, positional names or IDs, or framework, language and manager override flags. Use one source of choices. On a stale-catalog error, regenerate the export using the matching website/CLI; do not edit a token to bypass validation.",
        ],
        links: [{ label: "Actual create options", href: "#/docs/cli-create" }],
      },
    ],
  },
  {
    slug: "intended-health",
    title: "Check the intended stack",
    description: "Compare a schemaVersion 1 config with local project evidence.",
    group: "Guides",
    sections: [
      {
        id: "inspect",
        title: "Compare intent with detection",
        paragraphs: [
          "Run doctor from the project directory with its schemaVersion 1 reposetup.json. The CLI compares runtime, manager, framework and selected integrations with local evidence. Confidence and evidence identify what is detected or uncertain. Extra detected integrations and different or unverified versions are informational; a dependency declaration alone does not prove installation or runtime behavior.",
          "Installed Node or Python dependency checks inspect the selected environment without reinstalling packages. Missing tools and dependencies receive actionable guidance. A successful doctor check does not prove every import, service connection or application test.",
        ],
        code: "reposetup doctor --config reposetup.json\nreposetup --json doctor --config reposetup.json",
      },
      {
        id: "preview",
        title: "Review structural file changes",
        paragraphs: [
          "Create, add and remove support --diff. Combine it with --dry-run for a read-only structural preview. Generated or external-tool effects may be uncertain until execution. Preview output is bounded and excludes secret contents; use it to review paths, operation types and preservation decisions.",
        ],
        code: "reposetup add zod --diff --dry-run",
      },
    ],
  },
  {
    slug: "repair-missing-files",
    title: "Repair an eligible missing file",
    description: "Review narrow recipe-file repair without replacing user configuration or secrets.",
    group: "Help",
    sections: [
      {
        id: "preview",
        title: "Preview before confirming",
        paragraphs: [
          "Intended-stack doctor can offer an allowlisted repair for eligible missing Prettier configuration or recipe-defined .env.example placeholders. Start with --fix --dry-run to inspect the content-free preview and manual guidance. Run without --dry-run and confirm locally only after reviewing it. --yes is an explicit noninteractive repair confirmation, not a selection-confirmation bypass.",
        ],
        code: "reposetup doctor --config reposetup.json --fix --dry-run\nreposetup doctor --config reposetup.json --fix",
      },
      {
        id: "preservation",
        title: "Preserve the application",
        paragraphs: [
          "Repair creates missing files only. It does not replace existing or alternative user configuration, modify dependencies/source, copy a real .env, or recreate an environment. Malformed configs, linked targets, unsupported/custom recipes and other failing checks block unsafe automatic work. Missing installed dependencies must be repaired through the project's manager before file repair is safe.",
          "After a successful repair, repeat doctor; applying the same repair again is a no-op. Other findings need the printed manual guidance.",
        ],
      },
    ],
  },
];
