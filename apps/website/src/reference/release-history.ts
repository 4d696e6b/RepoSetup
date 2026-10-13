import { publication } from "../publication.js";
import { el, link } from "./dom.js";
import { REPOSITORY, PUBLISHED_VERSION } from "./release.js";

export interface ReleaseHistoryEntry {
  readonly version: string;
  /** npm publication time, rather than the earlier date on a planning changelog. */
  readonly publishedAt: string;
  readonly title: string;
  readonly summary: string;
  readonly nodeRequirement: string;
  readonly changes: readonly { readonly title: string; readonly description: string }[];
  readonly qualification: string;
  readonly sources: readonly { readonly label: string; readonly href: string }[];
}

export const RELEASE_HISTORY_VERIFIED_ON = "2026-10-09";
export const RELEASE_HISTORY_PUBLICATION_SOURCE = "https://registry.npmjs.org/rsetup";

const npmSource = (version: string) => ({
  label: `npm package ${version}`,
  href: `https://www.npmjs.com/package/rsetup/v/${version}`,
});
const releaseSources = (version: string) => [
  { label: `Release notes ${version}`, href: `${REPOSITORY}/releases/tag/v${version}` },
  npmSource(version),
];
const changelogSource = (version: string) => ({
  label: `Changelog ${version}`,
  // The first npm launch predates the available GitHub release pages.
  href: `${REPOSITORY}/blob/v0.1.1/CHANGELOG.md`,
});

/** Curated from published notes and pinned changelogs; npm confirms this complete version list. */
export const publishedHistory: readonly ReleaseHistoryEntry[] = [
  {
    version: "0.2.3",
    publishedAt: "2026-10-09T02:48:16.084Z",
    title: "Installed-stack reliability",
    summary:
      "More dependable generated projects, clearer prerequisites, and useful recovery when setup stops.",
    nodeRequirement: "Node 24+",
    changes: [
      {
        title: "Keep development tools installed",
        description:
          "Node scaffolds and development-package additions retain their required tools even when parent settings omit development dependencies.",
      },
      {
        title: "Repair database client setup",
        description:
          "PostgreSQL SQLAlchemy recipes include the Psycopg binary driver and a guarded engine helper. JavaScript Prisma imports use Node 24-compatible generated-client paths.",
      },
      {
        title: "Explain container and database prerequisites",
        description:
          "Doctor checks Docker and Compose availability. PostgreSQL Compose uses a loopback port, aligned placeholders, a required password, and persistent storage.",
      },
      {
        title: "Make failed setup recoverable",
        description:
          "Cache errors, interrupted creation, and timeouts report the project destination and bounded, redacted diagnostics. Doctor suggests dependency and pnpm-link repairs without changing files.",
      },
      {
        title: "Exercise real database connections",
        description:
          "Representative generated Prisma, Drizzle, SQLAlchemy, and Mongoose projects gained live-service acceptance, including PostgreSQL persistence after container recreation.",
      },
    ],
    qualification:
      "Recorded CI recipes and representative live database cases are qualified. Arbitrary combinations, native Windows 11, Linux arm64, general migrations, and Playwright browser journeys are not. Integration maturity and the documented development-tool advisory remain unchanged.",
    sources: releaseSources("0.2.3"),
  },
  {
    version: "0.2.2",
    publishedAt: "2026-10-08T11:30:45.134Z",
    title: "Dependency health you can inspect",
    summary:
      "Creation and doctor check the packages actually installed, with better Python environment and startup guidance.",
    nodeRequirement: "Node 24+",
    changes: [
      {
        title: "Record pip dependencies",
        description:
          "New pip projects write every selected pinned runtime and development dependency to requirements.txt, so doctor inspects the generated project.",
      },
      {
        title: "Verify installed package metadata",
        description:
          "Create checks required dependencies before reporting success. Doctor detects absent Node or Python packages and describes recovery.",
      },
      {
        title: "Inspect the correct Python environment",
        description:
          "FastAPI checks include its CLI and Uvicorn. uv inspection uses the existing project environment; pip uses the active interpreter, including activated Windows environments.",
      },
      {
        title: "Clarify startup and repair",
        description:
          "Python guidance explains environment activation, uv run, and restoring dependencies. Doctor stays read-only and does not recreate environments.",
      },
    ],
    qualification:
      "Installed metadata does not establish every import, transitive dependency, combination, or live service. Native Windows 11, Linux arm64, database/container connectivity, and Playwright journeys were outside this release's qualified matrix. Catalog maturity was unchanged.",
    sources: releaseSources("0.2.2"),
  },
  {
    version: "0.2.1",
    publishedAt: "2026-10-08T04:29:45.401Z",
    title: "Scaffolds that land in the right place",
    summary:
      "Repairs for project destinations, dependency ordering, frontend configuration, and generated startup instructions.",
    nodeRequirement: "Node 24+",
    changes: [
      {
        title: "Fix named and nested destinations",
        description:
          "Generated files and installation commands use the intended project root, including Next.js layout files and Python initialization.",
      },
      {
        title: "Complete frontend and server setup",
        description:
          "Bare Vite dependencies, pnpm Express build approval, Tailwind configuration, and shadcn aliases and defaults are installed or generated before verification.",
      },
      {
        title: "Isolate generators and preserve files",
        description:
          "Nested generators avoid inherited npm launch settings. Prisma initialization avoids fetching coding-agent skills, and text insertion preserves LF or CRLF line endings.",
      },
      {
        title: "Align startup and test paths",
        description:
          "Express/Fastify startup guidance, Python testing instructions, Windows Next.js Vitest roots, and retained Compose context match the generated project.",
      },
      {
        title: "Expand regression coverage",
        description:
          "Next.js pins move to the qualified 16.3.6 security patch. Packed checks exercise six frameworks, twenty bare solutions, fourteen recipes, and five presets across the recorded matrix.",
      },
    ],
    qualification:
      "Native Windows 11, Linux arm64, live database/container connections, and Playwright journeys were not qualified. No integration became stable, and the generated development-tool advisory remained documented.",
    sources: releaseSources("0.2.1"),
  },
  {
    version: "0.2.0",
    publishedAt: "2026-10-07T17:29:13.531Z",
    title: "Curated recipes and qualified delivery",
    summary:
      "A broader terminal-first release with reproducible recipes and recorded cross-platform package delivery.",
    nodeRequirement: "Node 24+",
    changes: [
      {
        title: "Introduce five bundled starting points",
        description:
          "Next.js with SQLite/Prisma, React/Vite, Express with PostgreSQL configuration, FastAPI, and Flask provide curated preset paths.",
      },
      {
        title: "Make installs more reproducible",
        description:
          "Pinned recipes, consolidated dependency installs, platform adapters, and clearer execution and recovery diagnostics support repeatable setup.",
      },
      {
        title: "Add practical integration examples",
        description:
          "The catalog adds React Testing Library and TanStack Query, plus FastAPI HTTPX and Pydantic Settings examples.",
      },
      {
        title: "Record delivery across three systems",
        description:
          "Qualification and exact published-package delivery cover Ubuntu 24.04, macOS 15, and Windows Server 2025. Python recipes qualify Python 3.12 and 3.13 with uv.",
      },
    ],
    qualification:
      "Upgrading from 0.1.x requires Node 24+. Qualified delivery applies to the recorded recipes, not every integration combination. PostgreSQL configuration does not provision a database; experimental integrations and native Windows 11 remain outside that scope. Later patches repair setup regressions found after this release.",
    sources: releaseSources("0.2.0"),
  },
  {
    version: "0.1.1",
    publishedAt: "2026-09-22T03:15:45.109Z",
    title: "Clearer first-run failures",
    summary:
      "The first patch removes npm scaffold prompt stalls and makes command failures easier to diagnose.",
    nodeRequirement: "Node 20+ at publication",
    changes: [
      {
        title: "Prevent scaffold confirmation stalls",
        description:
          "npm scaffolding places npx --yes before the generator package, so the option reaches npx instead of the generator.",
      },
      {
        title: "Show useful, bounded diagnostics",
        description:
          "COMMAND_FAILED includes a short redacted output excerpt and targeted guidance for npm cache ownership failures. Machine-readable errors continue to omit raw command output.",
      },
    ],
    qualification:
      "This was an early patch. RepoSetup did not execute sudo or broaden the first launch's integration qualification.",
    sources: [changelogSource("0.1.1"), npmSource("0.1.1")],
  },
  {
    version: "0.1.0",
    publishedAt: "2026-09-22T02:47:47.436Z",
    title: "The first public launch",
    summary:
      "RepoSetup begins as an open-source terminal stack composer, published as rsetup with rsetup and reposetup command aliases.",
    nodeRequirement: "Node 20+ at publication",
    changes: [
      {
        title: "Compose and inspect locally",
        description:
          "The launch includes create, add, remove, search, info, stack, doctor, export, and registry validate, backed by 33 built-in integration IDs.",
      },
      {
        title: "Preview declarative plans",
        description:
          "Schema-versioned configuration and dry-run planning describe changes before execution. Processes use argument arrays; paths are checked and existing files are protected.",
      },
      {
        title: "Keep secrets and prerequisites explicit",
        description:
          "Exports use environment placeholders. Missing system tools are reported, and executable scripts or remote plugins are excluded from configuration.",
      },
    ],
    qualification:
      "No integration was labeled stable. Database paths generated configuration; Python execution required uv. Removal covered a small package-only subset, and pip uninstall was refused.",
    sources: [changelogSource("0.1.0"), npmSource("0.1.0")],
  },
];

export const releaseHistory: readonly ReleaseHistoryEntry[] = publication
  ? [
      {
        version: publication.version,
        publishedAt: publication.publishedAt,
        title: "Understand choices and review local changes",
        summary:
          "Curated beginner guidance, declarative selections, file previews, intended-stack health and bounded missing-file repair, with the shipped 0.2.3 fixes retained.",
        nodeRequirement: "Node 24+",
        changes: [
          {
            title: "Choose a minimal starter",
            description:
              "React/Vite, Express and FastAPI guidance starts small and explains optional tools. The full catalog and legacy presets remain available.",
          },
          {
            title: "Carry choices to your terminal",
            description:
              "Versioned selection tokens and JSON files resolve through the built-in registry. The CLI shows the local plan and requires confirmation before execution.",
          },
          {
            title: "Inspect and repair carefully",
            description:
              "Structural dry-run previews, intended-stack doctor and narrow missing-file repair preserve user files and refuse unhealthy automatic repair.",
          },
        ],
        qualification:
          "Recorded platform and bounded create/add/legacy recipes are qualified. Browser emulation is separate from native screen-reader and physical-device evidence; arbitrary combinations and integration maturity are unchanged.",
        sources: [
          npmSource(publication.version),
          { label: "Reviewed release source", href: `${REPOSITORY}/tree/${publication.sourceSha}` },
          { label: "What’s new", href: "#/docs/whats-new-0-3" },
        ],
      },
      ...publishedHistory,
    ]
  : publishedHistory;

export function releaseDateLabel(publishedAt: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(publishedAt));
}

export function renderReleaseHistory(): HTMLElement {
  const history = el("section", undefined, "release-history");
  history.setAttribute("aria-label", "Published release history");
  for (const entry of releaseHistory) {
    const card = el("article", undefined, "release-card");
    card.dataset.version = entry.version;
    const id = `release-v${entry.version.replaceAll(".", "-")}`;
    card.id = id;
    card.setAttribute("aria-labelledby", `${id}-title`);
    const meta = el("div", undefined, "release-card-meta");
    const date = el("time", releaseDateLabel(entry.publishedAt));
    date.dateTime = entry.publishedAt.slice(0, 10);
    meta.append(date, el("span", entry.nodeRequirement, "release-node-requirement"));
    if (entry.version === PUBLISHED_VERSION)
      meta.append(el("span", "Latest published", "release-latest"));
    const heading = el("h2", `${entry.version} · ${entry.title}`, "release-card-heading");
    heading.id = `${id}-title`;
    const changes = el("ul", undefined, "release-card-changes");
    for (const change of entry.changes) {
      const item = el("li");
      item.append(el("h3", change.title), el("p", change.description));
      changes.append(item);
    }
    const sources = el("nav", undefined, "release-card-sources");
    sources.setAttribute("aria-label", `Sources for ${entry.version}`);
    for (const source of entry.sources) sources.append(link(source.label, source.href));
    card.append(
      meta,
      heading,
      el("p", entry.summary, "release-card-summary"),
      changes,
      el("p", entry.qualification, "release-qualification"),
      sources,
    );
    history.append(card);
  }
  return history;
}
