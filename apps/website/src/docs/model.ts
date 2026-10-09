import { release, categoryName } from "../release.js";
import { authoredPages, type DocPage } from "./content.js";
import { relationshipTarget } from "../relationships.js";

const page = (
  slug: string,
  title: string,
  description: string,
  sections: DocPage["sections"],
): DocPage => ({ slug, title, description, group: "Reference", sections });
const commands = release.cli.commands.map((command) =>
  page(`cli-${command.id}`, `rsetup ${command.path.join(" ")}`, command.description, [
    {
      id: "usage",
      title: "Usage",
      paragraphs: [
        command.description,
        "Both installed aliases, rsetup and reposetup, invoke this command. The syntax below is generated from the published release's parser.",
      ],
      code: command.usage,
    },
    {
      id: "options",
      title: "Command options",
      paragraphs: [
        "These descriptions come from the 0.2.3 CLI help. Global options apply where the command's output handler supports them; --json does not make every command emit JSON.",
      ],
      bullets: command.flags.map((flag) => `${flag.flags} — ${flag.description}`),
      links: [{ label: "Global CLI options", href: "#/docs/cli-global" }],
    },
    {
      id: "help",
      title: "Get help locally",
      paragraphs: ["Inspect the installed command's help before applying it to a project."],
      code: `npx rsetup@0.2.3 ${command.path.join(" ")} --help`,
      links: [{ label: "Command behavior and confirmation", href: "#/docs/command-basics" }],
    },
  ]),
);
const integrations = release.integrations.map((item) =>
  page(`integration-${item.id}`, item.name, item.description, [
    {
      id: "role",
      title: "Role in a project",
      paragraphs: [item.description, `ID: ${item.id}. Category: ${categoryName(item.category)}.`],
      links: [
        { label: "Explore this integration", href: `#/integrations/${item.id}` },
        { label: "Official documentation", href: item.documentationUrl },
      ],
    },
    {
      id: "scope",
      title: "Support and scope",
      paragraphs: [
        `Registry maturity: ${item.status}. Add recipe: ${item.addable ? "available" : "not declared"}. Safe remove recipe: ${item.removable ? "available" : "not declared"}.`,
        "A published CLI does not promote every integration to stable. The CLI resolves your actual project context; registry presence does not qualify every combination.",
      ],
    },
    {
      id: "relationships",
      title: "Declared relationships",
      paragraphs: ["The notes below are projected from the checked-in definition."],
      bullets: [
        ...item.requirements,
        ...item.recommendations,
        ...item.conflicts,
        ...item.includes,
        ...item.alternatives,
      ].map(
        (relation) =>
          `${relation.kind}: ${relationshipTarget(relation.target).label} — ${relation.reason}`,
      ),
      links: [
        ...item.requirements,
        ...item.recommendations,
        ...item.conflicts,
        ...item.includes,
        ...item.alternatives,
      ].map((relation) => relationshipTarget(relation.target)),
    },
    {
      id: "inspect",
      title: "Inspect and verify",
      paragraphs: [
        `Detection: ${item.detectable ? "declared" : "not declared"}. Verification: ${item.verifiable ? "declared" : "not declared"}. Recorded recipe check: ${item.verification?.verifiedAt ?? "not recorded"}. A review date is not a compatibility guarantee.`,
        "Preview the actual plan to see the typed operation descriptions. Generated files and manual work depend on the selected context.",
      ],
      code: `npx rsetup@0.2.3 info ${item.id}`,
      links: [{ label: "Stack and doctor", href: "#/docs/inspect" }],
    },
  ]),
);
const presets = release.presets.map((item) =>
  page(`preset-${item.id}`, item.name, item.description, [
    {
      id: "ingredients",
      title: "Included ingredients",
      paragraphs: [
        `Preset ID: ${item.id}. Framework: ${item.config.framework.id}. Runtime: ${item.config.runtime.id}. Package manager: ${item.config.packageManager}.`,
        "The bundled preset is a defined recipe. Individual integration maturity still applies, and database services require your own setup.",
      ],
      links: [
        { label: "Preview this preset", href: `#/builder/${item.id}` },
        ...item.config.integrations.map((integration) => ({
          label:
            release.integrations.find((entry) => entry.id === integration.id)?.name ??
            integration.id,
          href: `#/docs/integration-${integration.id}`,
        })),
      ],
    },
    {
      id: "preview",
      title: "Preview before creating",
      paragraphs: [
        "In 0.2.3 a bundled preset has no project.path, so this command plans for the current directory. A positional name changes the project name, not the destination. Use a new empty directory, or download a config from the setup page to set an explicit child folder. This example only prints the plan.",
      ],
      code: `npx rsetup@0.2.3 create my-app --preset ${item.id} --dry-run`,
    },
  ]),
);
const indexes = [
  page(
    "cli",
    "CLI reference",
    "Every public command in RepoSetup 0.2.3, from the checked-in CLI help.",
    [
      {
        id: "commands",
        title: "Commands",
        paragraphs: [
          "Learn what a command does before running it. Commands that change files have a dry-run path; stack and doctor are read-only.",
        ],
        links: commands.map((item) => ({ label: item.title, href: `#/docs/${item.slug}` })),
      },
      {
        id: "globals",
        title: "Shared options",
        paragraphs: ["Help, version, verbosity and output flags are declared at the root."],
        links: [
          { label: "Global CLI options", href: "#/docs/cli-global" },
          { label: "Exit status", href: "#/docs/cli-exit-codes" },
        ],
      },
    ],
  ),
  page("cli-global", "Global CLI options", "Flags shared by the released CLI parser.", [
    {
      id: "flags",
      title: "Available flags",
      paragraphs: [
        "JSON output is implemented by create, add, remove, stack and doctor. Other commands can print text even when the root accepts --json. --yes has command-specific behavior and is not a global flag.",
      ],
      bullets: release.cli.globalFlags.map((flag) => `${flag.flags} — ${flag.description}`),
      code: "npx rsetup@0.2.3 --help",
    },
  ]),
  page("cli-exit-codes", "CLI exit codes", "Process status categories from the 0.2.3 CLI.", [
    {
      id: "statuses",
      title: "Status values",
      paragraphs: [
        "Read the accompanying error code and suggested recovery. An exit status identifies a category, not the exact cause.",
      ],
      bullets: Object.entries(release.exitCodes).map(
        ([name, value]) => `${value} — ${name.replaceAll("_", " ").toLowerCase()}`,
      ),
      links: [{ label: "Troubleshooting", href: "#/docs/troubleshooting" }],
    },
  ]),
  page("integrations", "Integration reference", "All checked-in integration IDs in 0.2.3.", [
    {
      id: "catalog",
      title: "Browse the definitions",
      paragraphs: [
        "Labels describe registry maturity. Use the local CLI to resolve an actual combination.",
      ],
      links: integrations.map((item) => ({ label: item.title, href: `#/docs/${item.slug}` })),
    },
  ]),
  page("preset-reference", "Preset reference", "The five exact bundled recipes from 0.2.3.", [
    {
      id: "recipes",
      title: "Bundled recipes",
      paragraphs: ["Preview a preset before execution and read each ingredient's limits."],
      links: presets.map((item) => ({ label: item.title, href: `#/docs/${item.slug}` })),
    },
  ]),
];
export const docPages: DocPage[] = [
  ...authoredPages,
  ...indexes,
  ...commands,
  ...integrations,
  ...presets,
];
export const docBySlug = new Map(docPages.map((item) => [item.slug, item]));
export const primaryPages = [...authoredPages, ...indexes];
export const searchPages = (query: string) => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return docPages
    .filter((item) => {
      const text = [
        item.title,
        item.description,
        item.slug,
        ...item.sections.flatMap((section) => [
          section.title,
          ...section.paragraphs,
          ...(section.bullets ?? []),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .slice(0, 30);
};
