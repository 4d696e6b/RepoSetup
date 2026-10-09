export interface DocSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  code?: string;
  links?: { label: string; href: string }[];
}

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  group: "Start" | "Guides" | "Reference" | "Help";
  sections: DocSection[];
}

const source = "https://github.com/4d696e6b/RepoSetup/blob/v0.2.3";

export const authoredPages: DocPage[] = [
  {
    slug: "getting-started",
    title: "Start with a plan",
    description: "Install the published 0.2.3 CLI, preview a stack, and create your first project.",
    group: "Start",
    sections: [
      {
        id: "what-reposetup-does",
        title: "A stack you can inspect",
        paragraphs: [
          "RepoSetup brings supported framework and library setup into one terminal workflow. You choose a stack; the CLI checks requirements and conflicts, orders the work, and prints the installation plan before execution.",
          "This website documents the published rsetup 0.2.3 package. Browse integrations to understand each tool, compare the five bundled presets, or download a declarative config. Installation runs in your terminal, on your computer.",
        ],
        links: [
          { label: "Explore integrations", href: "#/integrations" },
          { label: "Compare presets", href: "#/presets" },
        ],
      },
      {
        id: "prerequisites",
        title: "Prepare your computer",
        paragraphs: [
          "The CLI requires Node.js 24 or later. Install Node and your selected package manager before creating a project. RepoSetup reports missing system tools; it does not install them for you.",
          "Python projects also require Python 3.12 or later and either uv or an activated pip environment. The reviewed Python matrix covers 3.12 and 3.13. Bundled Python presets use uv. Node recipes use npm or pnpm.",
        ],
        links: [
          { label: "Official Node.js downloads", href: "https://nodejs.org/en/download" },
          {
            label: "Official uv installation guide",
            href: "https://docs.astral.sh/uv/getting-started/installation/",
          },
          { label: "Support boundaries", href: "#/docs/safety" },
        ],
      },
      {
        id: "run-the-cli",
        title: "Use the exact published version",
        paragraphs: [
          "Run the version-pinned package through npx. npm may first ask to download the CLI; that prompt is separate from RepoSetup's confirmation of the project installation plan.",
          "The npm package is named rsetup. After a global installation, both rsetup and reposetup are command aliases. Use npx rsetup@0.2.3 for these examples: npx reposetup identifies a different package.",
        ],
        code: "npx rsetup@0.2.3 --version\nnpx rsetup@0.2.3 --help",
        links: [
          { label: "How npx runs packages", href: "https://docs.npmjs.com/cli/v11/commands/npx/" },
        ],
      },
      {
        id: "global-install",
        title: "Optional: install the CLI globally",
        paragraphs: [
          "A global installation makes rsetup and reposetup available as aliases in your terminal. Pin the version explicitly so this guide and your CLI match. The npx examples below work without keeping a global installation.",
        ],
        code: "npm install -g rsetup@0.2.3\nrsetup --version\nreposetup --version",
        links: [
          {
            label: "npm global installation",
            href: "https://docs.npmjs.com/cli/v11/commands/npm-install/",
          },
        ],
      },
      {
        id: "first-project",
        title: "Preview, then create",
        paragraphs: [
          "Open a terminal in the parent folder where you want your project. This basic flag example previews a TypeScript Next.js application in a new folder named my-app. Dry-run uses the real planner and performs no project writes or installer execution.",
          "Read the destination, selected integrations, prerequisites, and operations. When the plan looks right, run the second command. It prints the plan and asks for confirmation. A new project may take time while framework generators and package managers download dependencies.",
        ],
        code: "npx rsetup@0.2.3 create my-app --framework nextjs --package-manager npm --typescript --dry-run\nnpx rsetup@0.2.3 create my-app --framework nextjs --package-manager npm --typescript",
      },
      {
        id: "after-create",
        title: "Check the generated application",
        paragraphs: [
          "After successful creation, change into the exact project directory printed by RepoSetup. Follow its generated development, build, and test commands, then run doctor from that directory.",
          "An installed dependency check confirms expected package metadata. Build and test the application too. Database configuration still needs a reachable service and your own local connection settings.",
        ],
        code: "cd my-app\nnpx rsetup@0.2.3 stack\nnpx rsetup@0.2.3 doctor",
        links: [
          { label: "Inspect an existing project", href: "#/docs/inspect" },
          { label: "If creation stopped", href: "#/docs/recovery" },
        ],
      },
    ],
  },
  {
    slug: "create",
    title: "Create a project",
    description: "Choose prompts, a bundled preset, basic flags, or a reusable config file.",
    group: "Guides",
    sections: [
      {
        id: "interactive",
        title: "Build a stack through prompts",
        paragraphs: [
          "Run create without a config or preset to choose your project name, runtime, package manager, framework, and optional integrations. Passing a name pre-fills that part of the flow.",
          "The prompts use the local registry. Choices are still validated together by the resolver. A displayed integration is not a promise that every possible combination is supported.",
        ],
        code: "npx rsetup@0.2.3 create\nnpx rsetup@0.2.3 create my-app",
      },
      {
        id: "flags",
        title: "Use basic flags for a small stack",
        paragraphs: [
          "A project name together with --framework supplies enough input for the basic flag flow. --package-manager selects the manager, and --typescript sets the framework TypeScript option.",
          "Styling, databases, testing, and other library choices belong in the interactive flow or a config file. They do not have individual create flags in 0.2.3.",
        ],
        code: "npx rsetup@0.2.3 create my-app --framework react-vite --package-manager npm --typescript --dry-run",
      },
      {
        id: "preset-or-config",
        title: "Use one explicit source of choices",
        paragraphs: [
          "Use --preset for a bundled recipe or --config for a JSON file. With a preset, the positional name overrides the preset's default project name, but does not choose a child directory. Bundled presets target the current directory in 0.2.3: run them only from the empty destination you intend to use. With a config, the file supplies the name, path, and choices.",
          "The CLI resolves a config before a preset and a preset before flags or prompts. Avoid mixing these input styles. Edit the config itself when you want to change a config-based project.",
        ],
        code: "npx rsetup@0.2.3 create my-app --preset react-vite --dry-run\nnpx rsetup@0.2.3 create --config ./reposetup.json --dry-run",
        links: [
          { label: "Understand presets", href: "#/docs/presets" },
          { label: "Config format", href: "#/docs/configuration" },
        ],
      },
      {
        id: "destination",
        title: "Choose a fresh destination",
        paragraphs: [
          "Project names must be one path segment, without slashes, traversal, or leading and trailing whitespace. A config can set a relative project.path; absolute paths and parent traversal are rejected.",
          "The flag flow and interactive flow set a path from the project name. Config files without project.path and bundled presets target the current directory (.). For reusable configs, set project.path explicitly to a fresh relative folder. Existing files are not silently overwritten, and create does not resume an interrupted project over generated files.",
        ],
        links: [{ label: "Recovery after a failed create", href: "#/docs/recovery" }],
      },
      {
        id: "confirmation",
        title: "Review the plan before execution",
        paragraphs: [
          "--dry-run prints the resolved plan and stops. Without it, a valid plan is printed and RepoSetup asks whether to proceed. --yes skips that confirmation, so reserve it for plans you have already reviewed.",
          "A failed compatibility check prevents installation. A failure during execution can leave a partially generated project. The CLI prints the directory, completed operation count, and failure details so you can inspect what happened.",
        ],
        links: [{ label: "Read a dry-run plan", href: "#/docs/preview" }],
      },
    ],
  },
  {
    slug: "add-remove",
    title: "Add and remove libraries",
    description: "Apply a bounded change to an existing supported application.",
    group: "Guides",
    sections: [
      {
        id: "before-changing",
        title: "Start in the application directory",
        paragraphs: [
          "Run stack and doctor inside the application package you want to change. RepoSetup detects the runtime, framework, and package manager from local project files. Commit or back up your work before executing a change.",
          "Workspaces require care: use one application package directory. This release does not compose a whole workspace, and removing from a workspace root is refused.",
        ],
        code: "npx rsetup@0.2.3 stack\nnpx rsetup@0.2.3 doctor",
      },
      {
        id: "add",
        title: "Add one or several integrations",
        paragraphs: [
          "add accepts one or more integration IDs. The planner checks the detected project and requested integrations together before making changes. Use the catalog or info to confirm an ID is addable and relevant to your framework.",
          "This example previews Zod and Prettier in a compatible Node application. Run it again without --dry-run to review the plan and confirm execution. Already-present integrations can produce a successful no-change result.",
        ],
        code: "npx rsetup@0.2.3 info zod\nnpx rsetup@0.2.3 add zod prettier --dry-run\nnpx rsetup@0.2.3 add zod prettier",
        links: [{ label: "Integration catalog", href: "#/integrations" }],
      },
      {
        id: "remove",
        title: "Removal needs an explicit safe recipe",
        paragraphs: [
          "remove accepts one ID and only works where that definition has a safe removal recipe. It cannot remove runtimes, package managers, or frameworks, and it refuses a library that a detected integration still requires.",
          "The current package-only removal recipes cover zod, prettier, pydantic, pydantic-settings, pytest, ruff, testing-library, tanstack-query, and httpx. Generated source, tests, and .env.example files remain. pip uninstall is refused.",
          "Review imports and generated files after removal. A package-only recipe does not automatically undo all code or configuration added during installation.",
        ],
        code: "npx rsetup@0.2.3 remove prettier --dry-run\nnpx rsetup@0.2.3 remove prettier",
      },
      {
        id: "manager",
        title: "Resolve ambiguous package managers",
        paragraphs: [
          "If detection finds more than one manager, pass --package-manager to choose the manager actually used by that application. An override does not convert the project to a different manager or make an unsupported context work.",
          "Node recipes are reviewed for npm and pnpm; Python recipes use uv or a prepared pip environment. Although the general config enum recognizes bun, 0.2.3 has no built-in bun integration.",
        ],
        code: "npx rsetup@0.2.3 add zod --package-manager pnpm --dry-run",
      },
    ],
  },
  {
    slug: "presets",
    title: "Choose a preset",
    description: "Understand the five bundled recipes and the cost of each starting point.",
    group: "Start",
    sections: [
      {
        id: "what-is-a-preset",
        title: "A recipe, not a new compatibility rule",
        paragraphs: [
          "A preset is a checked-in config: a runtime, package manager, framework, and a specific set of integrations. It saves choosing every item by hand. Presets are broader recipes, so compare their contents before adding tools you will not use. In 0.2.3, bundled presets target the current directory; use an empty destination folder, or download a config with an explicit project.path from the builder.",
          "The CLI labels these bundled recipes guaranteed. That is a preset label, not a promotion of every included integration to stable. Some preset IDs include experimental components, and no integration ID is stable in the 0.2.3 support contract.",
        ],
        code: "npx rsetup@0.2.3 presets",
        links: [{ label: "Compare exact preset contents", href: "#/presets" }],
      },
      {
        id: "node-recipes",
        title: "Node application recipes",
        paragraphs: [
          "next-sqlite starts a TypeScript Next.js application with Tailwind, SQLite, Prisma, Zod, Vitest, and Prettier. Choose it when you want a web application with a local database and are ready to use an ORM.",
          "react-vite starts a TypeScript React + Vite application with Tailwind, shadcn, Vitest, ESLint, and Prettier. Choose it for a browser application; shadcn remains experimental in the registry.",
          "express-postgres starts a TypeScript Express application with PostgreSQL configuration, Prisma, Zod, Prettier, Docker, Docker Compose, and GitHub Actions. It prepares configuration; it does not provide a running PostgreSQL server.",
        ],
        links: [
          { label: "Configure Next.js + SQLite", href: "#/builder/next-sqlite" },
          { label: "Configure React + Vite", href: "#/builder/react-vite" },
          { label: "Configure Express + PostgreSQL", href: "#/builder/express-postgres" },
        ],
      },
      {
        id: "python-recipes",
        title: "Python API recipes",
        paragraphs: [
          "fastapi uses uv and includes FastAPI, Pydantic, PostgreSQL configuration, SQLAlchemy, Alembic, pytest, Ruff, Docker, and Docker Compose. It is a starting point for an API with data-model and migration tools.",
          "flask uses uv and includes Flask, PostgreSQL configuration, SQLAlchemy, Alembic, pytest, Ruff, Docker, and Docker Compose. Choose it when you prefer Flask's application model.",
          "Both require your own Python and uv installation. Database and container selections need additional local setup before the application's database operations can work.",
        ],
        links: [
          { label: "Configure FastAPI", href: "#/builder/fastapi" },
          { label: "Configure Flask", href: "#/builder/flask" },
          { label: "Database setup boundaries", href: "#/docs/databases" },
        ],
      },
      {
        id: "customize",
        title: "Use the recipe as-is or curate a smaller config",
        paragraphs: [
          "The website setup page downloads the selected preset's exact ingredients and options. It changes only project.name and project.path to the project name you choose, giving the config an explicit fresh child folder. It does not remove optional ingredients or create a new combination.",
          "For a project named my-app, save the downloaded reposetup-my-app.json in the parent directory where you want my-app/ to be created. Run the commands below from that same parent directory. The preview shows the local plan; the second command asks for execution confirmation.",
          "If a preset includes tools you do not need, use interactive create or curate a separate config. Changing a recipe can change its support and qualification. Registry validation checks declared requirements; it does not establish evidence for every combination. Experimental choices stay experimental.",
        ],
        code: "npx rsetup@0.2.3 create --config ./reposetup-my-app.json --dry-run\nnpx rsetup@0.2.3 create --config ./reposetup-my-app.json",
        links: [{ label: "Config file reference", href: "#/docs/configuration" }],
      },
    ],
  },
  {
    slug: "configuration",
    title: "Configuration files",
    description: "Use schemaVersion 1 JSON for repeatable, declarative stack choices.",
    group: "Reference",
    sections: [
      {
        id: "format",
        title: "A small, declarative JSON file",
        paragraphs: [
          "A RepoSetup config describes choices rather than scripts. The schema requires schemaVersion, project, runtime, packageManager, framework, and integrations. Unknown top-level fields are rejected.",
          "This example selects a TypeScript React + Vite application with Zod and Prettier. Save it as reposetup.json outside the fresh destination, then preview with create --config. The integrations list can be empty when you want only the framework.",
        ],
        code: '{\n  "schemaVersion": 1,\n  "project": { "name": "my-app", "path": "my-app" },\n  "runtime": { "id": "node" },\n  "packageManager": "npm",\n  "framework": { "id": "react-vite", "options": { "typescript": true } },\n  "integrations": [{ "id": "zod" }, { "id": "prettier" }]\n}',
      },
      {
        id: "fields",
        title: "What each field controls",
        paragraphs: [
          "IDs must come from the built-in registry. Use the catalog and info to understand each definition's requirements and supported options.",
        ],
        bullets: [
          "schemaVersion: the number 1, identifying this config format.",
          "project.name: a single safe name. project.path is optional and must be relative to the current directory without parent traversal. Omitting it targets the current directory (.), so set it explicitly for a fresh child folder.",
          "runtime.id: node or python. runtime.version is an optional nonempty string; it does not install a runtime.",
          "packageManager: the selected manager. The schema recognizes npm, pnpm, bun, uv, and pip, but the built-in catalog has no bun definition. Use the reviewed npm/pnpm Node paths or prepared uv/pip Python paths.",
          "framework: one framework ID and an optional options object, validated by that integration's option schema.",
          "integrations: an array of ID selections with optional options objects. Select required libraries explicitly; missing integration requirements are reported rather than automatically installed.",
        ],
        links: [{ label: "Browse integration IDs", href: "#/integrations" }],
      },
      {
        id: "options",
        title: "Only use options the integration defines",
        paragraphs: [
          "An options object is not a place for arbitrary shell commands, secrets, or generator arguments. Each integration decides which fields are valid. For example, supported Node framework definitions expose a typescript boolean.",
          "The website setup page preserves a selected preset's exact ingredients and options, and sets only the project name and explicit path. For other choices, review the integration definitions and checked-in example configs. A structurally valid JSON file can still fail resolution because its IDs, options, requirements, or context are invalid. Always run the real CLI preview.",
        ],
        code: "npx rsetup@0.2.3 create --config ./reposetup.json --dry-run",
        links: [{ label: "0.2.3 example configs", href: `${source}/examples` }],
      },
      {
        id: "sharing",
        title: "Share choices, not credentials",
        paragraphs: [
          "Commit the config if you want to share the recipe. It records choices, not exact installed dependency versions. Keep the generated project's package lockfile for resolved package versions.",
          "Never place a real database password, token, or private key in RepoSetup config. Generated .env.example files contain placeholders. Configure real local values separately and exclude them from version control.",
        ],
        links: [
          { label: "Export an existing stack", href: "#/docs/inspect" },
          { label: "Safety model", href: "#/docs/safety" },
        ],
      },
    ],
  },
  {
    slug: "inspect",
    title: "Inspect, diagnose, and export",
    description: "Use stack, doctor, and export to understand an existing project.",
    group: "Guides",
    sections: [
      {
        id: "stack",
        title: "See what is detected",
        paragraphs: [
          "stack reads project markers and known package or configuration evidence. It reports the runtime, manager, framework, language, and integrations it can identify. Detection starts at the current directory and searches upward for a project root.",
          "Run it from the application's own package directory, especially in a workspace. Detection is evidence about files and metadata; it does not prove a running application or database connection.",
        ],
        code: "npx rsetup@0.2.3 stack\nnpx rsetup@0.2.3 --verbose stack",
      },
      {
        id: "doctor",
        title: "Check local health without changing files",
        paragraphs: [
          "doctor performs read-only checks of expected configuration, installed dependency metadata, and required tools. It reports missing dependencies and recovery guidance. It never reinstalls packages or synchronizes a uv environment.",
          "For pip projects it checks the active interpreter; activate the same environment used by your application first. Docker/Compose version probes are bounded. A successful probe does not confirm that a daemon, container, or database is running.",
          "Follow up with the generated project's build and tests. Healthy metadata alone does not verify every import, transitive dependency, or application path.",
        ],
        code: "npx rsetup@0.2.3 doctor\nnpx rsetup@0.2.3 --json doctor",
        links: [{ label: "Recover missing dependencies", href: "#/docs/recovery" }],
      },
      {
        id: "export",
        title: "Turn detected choices into a config",
        paragraphs: [
          "export writes schemaVersion 1 reposetup.json in the detected project root. It records known IDs and options; it does not copy application code, exact dependency versions, or .env secrets.",
          "Preview with --dry-run before writing. If reposetup.json already exists, export refuses to overwrite unless you explicitly pass --yes. When several package managers are detected, choose the application's actual manager with --package-manager.",
        ],
        code: "npx rsetup@0.2.3 export --dry-run\nnpx rsetup@0.2.3 export\nnpx rsetup@0.2.3 export --package-manager npm --dry-run",
      },
      {
        id: "recreate",
        title: "Review an export before reusing it",
        paragraphs: [
          "Export reflects what RepoSetup can detect, not every detail of a hand-written application. Inspect its framework and integration list. Export omits project.path, so add an explicit fresh relative path and change project.name before recreating from a parent directory.",
          "There is no import command. Apply the reviewed file through create --config in a fresh destination. Keep the original project's source and lockfiles separately.",
        ],
        code: "npx rsetup@0.2.3 create --config ./reposetup.json --dry-run",
      },
    ],
  },
  {
    slug: "preview",
    title: "Read a dry-run plan",
    description: "Understand resolved choices, prerequisites, operations, and confirmation.",
    group: "Start",
    sections: [
      {
        id: "real-planner",
        title: "Preview the actual planned work",
        paragraphs: [
          "--dry-run is available for create, add, remove, and export. Installation commands use the same resolver and planner as execution, then stop before mutation. export prints the config it would write.",
          "A dry-run does not run generators, install packages, connect to services, or verify the application's future runtime. It can catch declared compatibility problems while leaving execution prerequisites and network behavior for the real run.",
          "Run this basic flag example from the parent directory where you want the new my-app/ folder. Bundled preset commands behave differently in 0.2.3: they target the current directory, so use an empty destination or a downloaded config with an explicit path.",
        ],
        code: "npx rsetup@0.2.3 create my-app --framework nextjs --package-manager npm --typescript --dry-run",
      },
      {
        id: "what-to-review",
        title: "Read the plan from top to bottom",
        paragraphs: [
          "Check the context first, then the resolved integrations, warnings, and operations. The runtime and manager definitions join the resolved context. Required libraries must be selected explicitly, and installation ordering can differ from the order you selected them.",
        ],
        bullets: [
          "Destination: confirm the terminal's current directory and the project's relative path.",
          "Runtime, package manager, and framework: confirm these match the application you want.",
          "Resolved integrations: understand why each library or required tool is present.",
          "Operations: inspect prerequisite checks, generator/package commands, and planned file changes.",
          "Warnings and errors: resolve a failed plan rather than trying to force execution.",
        ],
      },
      {
        id: "execute",
        title: "Make confirmation deliberate",
        paragraphs: [
          "For create, add, and remove, omit --dry-run to print the plan and receive an execution confirmation. --yes skips the question. Prefer a reviewed preview before using --yes in automation.",
          "The terminal plan is the final authority for your local project. This website prepares educational choices and config files; it does not execute installation in the browser.",
        ],
        links: [{ label: "CLI flags", href: "#/docs/cli" }],
      },
      {
        id: "machine-output",
        title: "Capture a plan for tooling",
        paragraphs: [
          "Place the global --json option before the command to request versioned machine-readable plans and errors for create, add, or remove. stack and doctor also provide JSON results. Treat the output version and kind as part of its contract.",
          "--json is not a universal JSON formatter: catalog commands, presets, and export retain their command-specific output. A real JSON-mode installation still needs --yes if you intend to skip the interactive confirmation.",
          "This flag-based example plans a my-app/ child folder under your current terminal directory. It prints JSON and performs no project writes.",
        ],
        code: "npx rsetup@0.2.3 --json create my-app --framework nextjs --package-manager npm --typescript --dry-run",
      },
    ],
  },
  {
    slug: "safety",
    title: "Safety and support boundaries",
    description: "Know what RepoSetup checks, what it changes, and what still needs your review.",
    group: "Help",
    sections: [
      {
        id: "before-mutation",
        title: "Validate before changing a project",
        paragraphs: [
          "RepoSetup validates config, looks up local definitions, resolves requirements and conflicts, and orders typed operations before execution. Compatibility failures stop before filesystem mutation.",
          "Dry-run exposes that plan. Existing files are not silently overwritten. For an existing application, keep a backup or clean version-control checkpoint before accepting add or remove.",
        ],
      },
      {
        id: "local-execution",
        title: "Execution stays in your terminal",
        paragraphs: [
          "Integration definitions generate typed operations. Only the executor writes project files or runs processes, and it passes command arguments without shell interpolation. Config files cannot introduce arbitrary commands or remote executable plugins.",
          "Framework generators and package managers may download packages when you execute a plan. Review their output and your project's dependencies. RepoSetup does not silently install Node, Python, Docker, databases, or other system software.",
        ],
      },
      {
        id: "secrets",
        title: "Keep credentials out of recipes",
        paragraphs: [
          "RepoSetup uses .env.example placeholders and exports choices rather than .env values. Supply real credentials locally using your application's configuration method, and keep them out of committed configs and issue reports.",
          "The website works with catalog facts and local choices. You do not need to upload a project or provide credentials to read documentation or download a recipe.",
        ],
      },
      {
        id: "maturity",
        title: "Read the label for each integration",
        paragraphs: [
          "Candidate means official setup commands and plan/detect/doctor tests exist; it is not a promise that every context has real execution evidence. Experimental means implemented but outside the qualified support claim. No built-in integration is stable in the 0.2.3 support contract.",
          "The recorded qualification covers Ubuntu 24.04 x64, macOS 15 arm64, and Windows Server 2025 x64 recipes, plus representative live database cases. It does not establish native Windows 11 desktop behavior, Linux arm64, every integration permutation, arbitrary service or deployment contexts, general migration workflows, or actual Playwright application journeys.",
          "A passing recipe and an integration's maturity are different kinds of evidence. The recorded development-tool advisory remains; this website makes no audit-clean claim.",
        ],
        links: [
          {
            label: "Integration support record",
            href: `${source}/docs/specification-documentation/implementing-docs/INTEGRATION_SUPPORT.md`,
          },
          {
            label: "Installed-stack audit",
            href: `${source}/docs/specification-documentation/implementing-docs/INSTALLED_STACK_AUDIT.md`,
          },
          { label: "Published release details", href: "#/release" },
          {
            label: "Published 0.2.3 qualification summary",
            href: "https://github.com/4d696e6b/RepoSetup/releases/tag/v0.2.3",
          },
        ],
      },
    ],
  },
  {
    slug: "recovery",
    title: "Recover after an interrupted run",
    description: "Inspect partial creation and restore dependencies without overwriting your work.",
    group: "Help",
    sections: [
      {
        id: "partial-project",
        title: "An error means creation is incomplete",
        paragraphs: [
          "If RepoSetup prints Execution stopped, generated source may exist while packages or configuration are still missing. The CLI reports the actual directory and completed operation count. Save that output and inspect the failed operation.",
          "Create does not automatically roll back or resume over generated files. Avoid rerunning it over a partial project. Preserve useful work before choosing a fresh destination or carrying out a specific manual repair.",
          "For a failed add or remove, inspect the application and package manifest before retrying. A completed earlier operation may already have changed files or dependencies.",
        ],
      },
      {
        id: "missing-node-packages",
        title: "Restore a complete Node package manifest",
        paragraphs: [
          "If your generated package manifest is complete but installed packages are missing, use that project's own manager from its root. npm can explicitly include development dependencies. pnpm's forced reinstall is a manual recovery option for missing or damaged links.",
          "These are manual package-manager commands, not RepoSetup repair actions. Inspect the project and confirm the missing dependencies first. Afterward, rerun doctor and the application's build and tests.",
        ],
        code: "# In an npm project:\nnpm install --include=dev\n\n# In a pnpm project with damaged package links:\npnpm install --prod=false --force\n\nnpx rsetup@0.2.3 doctor",
        links: [
          {
            label: "npm install options",
            href: "https://docs.npmjs.com/cli/v11/commands/npm-install/",
          },
          { label: "pnpm install options", href: "https://pnpm.io/cli/install" },
        ],
      },
      {
        id: "python-environment",
        title: "Use the original Python environment",
        paragraphs: [
          "For a uv project with an intact pyproject.toml, synchronize its environment from the project root, then rerun doctor and the generated application checks. uv sync is a manual action that can install or remove environment packages.",
          "For pip, reactivate the environment used during creation and follow the generated requirements instructions. Doctor inspects the active interpreter for pip and an existing uv environment without synchronizing it.",
        ],
        code: "# In a uv project:\nuv sync\nnpx rsetup@0.2.3 doctor",
        links: [
          {
            label: "uv syncing behavior",
            href: "https://docs.astral.sh/uv/concepts/projects/sync/",
          },
        ],
      },
      {
        id: "cache-errors",
        title: "Handle an unwritable npm cache",
        paragraphs: [
          "An EACCES or EEXIST cache failure can stop installation even when earlier source generation succeeded. Read the fatal error rather than treating a preceding peer warning as its cause. RepoSetup does not change global cache ownership.",
          "For an existing npm project whose manifest is complete, a separate writable cache may help. Keep the task-specific recovery directory out of version control. If the framework generator failed, dependency installation alone will not recreate missing generated files.",
        ],
        code: "npm install --include=dev --cache ./npm-cache-recovery",
        links: [
          {
            label: "npm cache configuration",
            href: "https://docs.npmjs.com/cli/v11/using-npm/config#cache",
          },
        ],
      },
      {
        id: "report",
        title: "Report enough detail to reproduce",
        paragraphs: [
          "Include CLI version 0.2.3, operating system, Node/Python version, selected manager, config with credentials removed, the failed operation, and relevant error text. Explain whether the target was new or existing.",
          "Do not upload .env files, private registry tokens, or real database URLs. If a log contains credentials, redact them before sharing.",
        ],
        links: [
          {
            label: "Open a repository issue",
            href: "https://github.com/4d696e6b/RepoSetup/issues",
          },
        ],
      },
    ],
  },
  {
    slug: "databases",
    title: "Databases and containers",
    description: "Understand what 0.2.3 generates and what you must provision yourself.",
    group: "Guides",
    sections: [
      {
        id: "configuration-is-not-a-service",
        title: "Configuration is only part of setup",
        paragraphs: [
          "PostgreSQL and MongoDB selections prepare application configuration. They do not install or start a server, create production credentials, or prove a connection. Both integrations remain experimental.",
          "SQLite is the local-file candidate path. An ORM such as Prisma or SQLAlchemy provides a code interface; it does not make every schema, migration, or deployment decision for you.",
        ],
        links: [
          { label: "SQLite", href: "#/integrations/sqlite" },
          { label: "PostgreSQL", href: "#/integrations/postgresql" },
          { label: "MongoDB", href: "#/integrations/mongodb" },
        ],
      },
      {
        id: "docker",
        title: "Docker is a system prerequisite",
        paragraphs: [
          "Selecting docker writes DOCKER_SETUP.md with guidance. Install Docker yourself if needed. Docker alone does not generate an application Dockerfile or a database service.",
          "For the PostgreSQL service configuration, select postgresql together with docker and docker-compose. The generated Compose configuration uses a loopback port, persistent storage, and environment placeholders. Set your own local password and connection settings, then follow the generated instructions.",
          "RepoSetup does not start containers. Doctor's version probes only establish that the Docker/Compose CLI is available; they do not verify a running daemon or healthy database.",
        ],
        links: [
          {
            label: "Docker's official installation guide",
            href: "https://docs.docker.com/engine/install/",
          },
          { label: "Docker Compose documentation", href: "https://docs.docker.com/compose/" },
        ],
      },
      {
        id: "python-driver",
        title: "The PostgreSQL Python driver in 0.2.3",
        paragraphs: [
          "SQLAlchemy PostgreSQL recipes include Psycopg's binary driver and a guarded engine helper using the postgresql+psycopg:// URL form. The helper prepares an engine; engine creation alone does not connect to PostgreSQL.",
          "Provide a reachable service and valid local connection settings before application database operations. Representative live SQLAlchemy cases passed acceptance, but RepoSetup does not apply Alembic migrations or qualify arbitrary service and migration contexts.",
        ],
        links: [{ label: "SQLAlchemy integration", href: "#/integrations/sqlalchemy" }],
      },
      {
        id: "live-evidence",
        title: "What the live-service evidence covers",
        paragraphs: [
          "The published 0.2.3 release records representative real-service acceptance for freshly generated Prisma, Drizzle, SQLAlchemy, and Mongoose projects. The acceptance includes PostgreSQL persistence after container recreation and cleanup of disposable test resources.",
          "This is evidence for recorded cases, not every database version, host, deployment, migration, or library combination. PostgreSQL and MongoDB maturity labels are unchanged. Your application's service settings and real database operations still need local checks.",
        ],
        links: [
          {
            label: "Published 0.2.3 release evidence",
            href: "https://github.com/4d696e6b/RepoSetup/releases/tag/v0.2.3",
          },
        ],
      },
      {
        id: "prisma",
        title: "Prisma imports and application checks",
        paragraphs: [
          "0.2.3 repairs the generated JavaScript Prisma helper's TypeScript import paths for Node 24. TypeScript projects retain compiled JavaScript paths. Use the generated client's matching helper rather than copying an import from a different recipe.",
          "A generated client and a passing build do not prove that your database is online. Follow your application's generated instructions, review its database URL, and test real database operations separately.",
        ],
        links: [{ label: "Prisma integration", href: "#/integrations/prisma" }],
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Find the next step for invalid choices, missing tools, and incomplete projects.",
    group: "Help",
    sections: [
      {
        id: "wrong-version",
        title: "The command or version is unexpected",
        paragraphs: [
          "Check npx rsetup@0.2.3 --version. The published package is rsetup, while a global install exposes both rsetup and reposetup aliases. npx reposetup invokes a different package.",
          "Use Node 24 or later. Upgrading the CLI does not update an already-generated application's source or reinstall its dependencies.",
        ],
        code: "npx rsetup@0.2.3 --version\nnpx rsetup@0.2.3 --help",
      },
      {
        id: "invalid-choice",
        title: "An ID, option, or combination is rejected",
        paragraphs: [
          "Use search and info to confirm the exact ID spelling and requirements. Check that the runtime, framework, manager, and library belong together. Config files must be strict schemaVersion 1 JSON with supported integration options.",
          "Unknown IDs, invalid options, missing requirements, and unsupported contexts have explicit error codes. Resolve the indicated choice rather than adding unrecognized fields or bypassing checks.",
        ],
        code: "npx rsetup@0.2.3 search validation\nnpx rsetup@0.2.3 info zod",
        links: [{ label: "Configuration reference", href: "#/docs/configuration" }],
      },
      {
        id: "project-detection",
        title: "The project or manager cannot be detected",
        paragraphs: [
          "Run the command from the application package directory, where package.json, pyproject.toml, requirements.txt, or the application's lockfile lives. Detection searches upward, so a workspace root can lead to an unintended context.",
          "If multiple managers are detected, choose the actual manager with --package-manager on add, remove, or export. This is an ambiguity override, not a conversion tool. Remove stale lockfiles only after you understand your project's package workflow.",
        ],
        code: "npx rsetup@0.2.3 stack\nnpx rsetup@0.2.3 add zod --package-manager npm --dry-run",
      },
      {
        id: "missing-tools",
        title: "A prerequisite is missing",
        paragraphs: [
          "Install the required runtime or manager through its official instructions, then reopen the terminal if its executable is not visible. Python recipes need Python 3.12+ and uv or an activated pip environment.",
          "For Docker and database choices, read the generated guidance. RepoSetup does not install system software, start containers, or supply credentials. A missing Docker daemon and a missing Docker executable are different problems.",
        ],
        links: [
          { label: "Node.js", href: "https://nodejs.org/en/download" },
          { label: "uv", href: "https://docs.astral.sh/uv/getting-started/installation/" },
          { label: "Database and container guide", href: "#/docs/databases" },
        ],
      },
      {
        id: "installation-stopped",
        title: "Creation stopped or doctor finds missing packages",
        paragraphs: [
          "A project folder does not imply successful creation. Inspect the fatal error, reported directory, and completed operation count. EACCES/EEXIST npm cache failures, failed generators, and package-install errors need different recovery steps.",
          "Doctor is read-only. Use the recovery guide to restore a complete manifest's dependencies; do not expect doctor to reinstall them. Build and test after recovery to check more than metadata.",
        ],
        links: [{ label: "Recovery guide", href: "#/docs/recovery" }],
      },
      {
        id: "database-fails",
        title: "The generated app cannot reach its database",
        paragraphs: [
          "Confirm the service is running and reachable, and that your application's local URL matches its driver and credentials. A Compose file, engine helper, or Prisma client is configuration, not evidence of a connection.",
          "Never paste real credentials into an issue or RepoSetup config. Representative live database acceptance exists, but it does not qualify your particular service, deployment, or migration workflow.",
        ],
        links: [{ label: "Database setup guide", href: "#/docs/databases" }],
      },
      {
        id: "remove-refused",
        title: "Removal is refused",
        paragraphs: [
          "Only definitions with explicit package-only removal recipes can be removed. Frameworks and runtimes are never removed. A dependent integration, workspace-root ambiguity, or pip environment can also make removal unsafe.",
          "Check info and the add/remove guide. If no safe recipe exists, review the library's own removal instructions and your source changes manually.",
        ],
        links: [{ label: "Removal limits", href: "#/docs/add-remove" }],
      },
    ],
  },
  {
    slug: "command-basics",
    title: "Command basics",
    description: "Every public command and option in rsetup 0.2.3.",
    group: "Reference",
    sections: [
      {
        id: "global",
        title: "Global options",
        paragraphs: [
          "Use npx rsetup@0.2.3 followed by the command and its arguments. Put global options before the command for clear, consistent parsing. Every command also offers -h, --help.",
          "JSON plans/results are implemented for create, add, remove, stack, and doctor. Other commands retain their own text or config format, so --json does not turn every output into a JSON envelope.",
        ],
        bullets: [
          "-V, --version: print the CLI version.",
          "-h, --help: print root or command help.",
          "--verbose: include additional output detail.",
          "--quiet: reduce output.",
          "--json: request supported versioned machine-readable output.",
          "--no-color: disable ANSI color; the current output is already plain.",
        ],
        code: "npx rsetup@0.2.3 --help\nnpx rsetup@0.2.3 create --help\nnpx rsetup@0.2.3 --json stack",
      },
      {
        id: "create",
        title: "create [name]",
        paragraphs: [
          "Create a project from interactive prompts, a bundled preset, a JSON config, or basic flags. A name plus --framework uses the flag flow. Config is resolved first, then preset, then flags/prompts; use one input style.",
          "The plan is printed before execution. --dry-run stops after planning; otherwise the CLI confirms unless --yes is passed. --verbose and --quiet are also available after this command.",
          "The preset example below plans for the current directory (.), even with the my-app positional name. Run it from the intended empty destination. For a child folder under a parent directory, use the website's downloaded config with explicit project.path or the basic flag flow.",
        ],
        bullets: [
          "-c, --config <path>: load a RepoSetup JSON config.",
          "--preset <id>: load a bundled recipe in the current directory; [name] overrides its default name, not its destination.",
          "--dry-run: print the installation plan without writes or installer execution.",
          "--yes: skip execution confirmation.",
          "--framework <id>: select a framework integration.",
          "--package-manager <id>: select a package manager.",
          "--typescript: set framework options.typescript to true.",
          "--verbose, --quiet: adjust output detail.",
        ],
        code: "npx rsetup@0.2.3 create my-app --preset next-sqlite --dry-run",
        links: [{ label: "Create guide", href: "#/docs/create" }],
      },
      {
        id: "add",
        title: "add <ids...>",
        paragraphs: [
          "Add one or more supported integration IDs to the current detected project. Already-present selections can produce no changes. Validate the requested context before accepting the printed plan.",
        ],
        bullets: [
          "--dry-run: preview the add plan.",
          "--yes: skip execution confirmation.",
          "--package-manager <id>: choose the manager when detection is ambiguous.",
          "--verbose, --quiet: adjust output detail.",
        ],
        code: "npx rsetup@0.2.3 add zod prettier --dry-run",
        links: [{ label: "Add and remove guide", href: "#/docs/add-remove" }],
      },
      {
        id: "remove",
        title: "remove <id>",
        paragraphs: [
          "Remove one integration with an explicit safe recipe. Runtimes, managers, frameworks, unsafe dependent removals, workspace-root removal, and pip uninstall are refused. Generated source and tests remain.",
        ],
        bullets: [
          "--dry-run: preview the remove plan.",
          "--yes: skip execution confirmation.",
          "--package-manager <id>: choose the manager when detection is ambiguous.",
          "--verbose, --quiet: adjust output detail.",
        ],
        code: "npx rsetup@0.2.3 remove prettier --dry-run",
      },
      {
        id: "presets",
        title: "presets",
        paragraphs: [
          "List the five bundled recipe IDs, names, support labels, and descriptions. There are no command-specific flags. Inspect a recipe's individual integration labels too.",
        ],
        code: "npx rsetup@0.2.3 presets",
        links: [{ label: "Preset guide", href: "#/docs/presets" }],
      },
      {
        id: "search-info",
        title: "search [query] and info <id>",
        paragraphs: [
          "search matches local IDs, names, categories, and keywords. With no query it lists the catalog. --category <category> limits results to one integration category.",
          "info prints one definition's category, maturity, requirements, recommendations, conflicts, verification record, option availability, add/remove capability, and official docs URL. It has no command-specific flags.",
        ],
        code: "npx rsetup@0.2.3 search testing\nnpx rsetup@0.2.3 search --category testing\nnpx rsetup@0.2.3 info vitest",
      },
      {
        id: "stack-doctor",
        title: "stack and doctor",
        paragraphs: [
          "stack detects and reports the project. doctor performs read-only health checks and reports failed checks. Neither command has command-specific flags; use global --verbose, --quiet, or --json where useful.",
          "These commands do not reinstall dependencies, synchronize environments, start services, or prove every application path. Run from the application package directory.",
        ],
        code: "npx rsetup@0.2.3 stack\nnpx rsetup@0.2.3 doctor",
        links: [{ label: "Inspection guide", href: "#/docs/inspect" }],
      },
      {
        id: "export",
        title: "export",
        paragraphs: [
          "Write a detected schemaVersion 1 config to reposetup.json in the project root. It excludes .env secrets. There is no import command; reuse a reviewed file with create --config.",
        ],
        bullets: [
          "--dry-run: print the config without writing it.",
          "--yes: explicitly overwrite an existing reposetup.json.",
          "--package-manager <id>: choose the manager when detection is ambiguous.",
          "--verbose, --quiet: adjust output detail.",
        ],
        code: "npx rsetup@0.2.3 export --dry-run",
      },
      {
        id: "registry",
        title: "registry validate",
        paragraphs: [
          "Validate the loaded built-in registry and report definition errors. registry is a command group and requires its validate subcommand. validate has no command-specific flags.",
        ],
        code: "npx rsetup@0.2.3 registry validate",
      },
      {
        id: "exit-status",
        title: "Exit status",
        paragraphs: [
          "A nonzero exit status means the command did not complete successfully. Read its machine-readable error code or human-readable details before retrying. Multiple resolver errors use the highest applicable error status.",
        ],
        bullets: [
          "0 — success, including a valid dry-run or no-change result.",
          "1 — general failure, such as command failure, timeout, file error, execution lock, or interruption.",
          "2 — invalid input, unknown IDs, config errors, missing project context, or declined confirmation.",
          "3 — resolution failure, such as incompatible context, missing requirements, conflicts, or invalid plans.",
          "4 — a required runtime, manager, or other prerequisite is missing.",
          "5 — verification failed after execution or in a health check.",
        ],
        links: [{ label: "Troubleshoot a failure", href: "#/docs/troubleshooting" }],
      },
    ],
  },
  {
    slug: "glossary",
    title: "Glossary",
    description: "Plain-language definitions for the choices in a development stack.",
    group: "Help",
    sections: [
      {
        id: "stack",
        title: "Stack, runtime, and framework",
        paragraphs: [
          "Stack: the tools used together to build and run an application. RepoSetup describes a stack through one runtime, one package manager, one framework, and optional integrations.",
          "Runtime: the program that executes application code, such as Node.js or Python. Package manager: the tool that resolves and installs packages, such as npm, pnpm, uv, or pip.",
          "Framework: the structure and conventions for your application, such as Next.js, React + Vite, Express, FastAPI, or Flask. A backend framework helps build server routes and APIs; a browser framework helps build the user interface.",
        ],
      },
      {
        id: "libraries",
        title: "Libraries that solve specific problems",
        paragraphs: [
          "Validation library: checks input against an expected shape, such as Zod or Pydantic. It is useful at boundaries where input comes from users, files, or another service.",
          "Database: stores application data. ORM or data layer: code that helps interact with a database, such as Prisma or SQLAlchemy. Migration tool: tracks changes to a database schema, such as Alembic.",
          "Testing library: supports automated checks of code or application behavior. Formatter: makes source layout consistent. Linter: checks code for known problems and style rules.",
        ],
        links: [{ label: "Browse what each integration does", href: "#/integrations" }],
      },
      {
        id: "reposetup-terms",
        title: "RepoSetup terms",
        paragraphs: [
          "Integration ID: the exact identifier used by config and CLI commands. Preset: a checked-in recipe selecting a group of IDs and options. Registry: the built-in catalog of definitions and their relationships.",
          "Requirement: something an integration needs. Conflict: a pair of choices that cannot be resolved together. Plan: the ordered typed operations generated from validated choices. Dry-run: display that plan without executing it.",
          "Detection: inspect local project evidence. Doctor: read-only checks of expected files, dependency metadata, and prerequisites. Export: produce a declarative recipe from detected choices.",
          "Candidate and experimental: per-integration maturity labels. They are separate from a passing recipe test or a preset support label.",
        ],
      },
      {
        id: "files-and-services",
        title: "Files, environments, and services",
        paragraphs: [
          "Manifest: a file declaring dependencies, such as package.json or pyproject.toml. Lockfile: records resolved dependency versions for a package manager. A RepoSetup config records stack choices, not a replacement lockfile.",
          "Environment variable: a value read by an application at runtime. .env.example: shareable placeholder names and values. A real .env file may contain private credentials and should not be shared.",
          "Container: a packaged environment run by a container engine such as Docker. Compose configuration: describes services and their settings. Neither a config file nor an installed CLI means a service is running.",
        ],
      },
    ],
  },
  {
    slug: "contribute",
    title: "Contribute and get support",
    description: "Report reproducible issues, improve explanations, or qualify an integration.",
    group: "Help",
    sections: [
      {
        id: "report-an-issue",
        title: "A useful bug report starts with evidence",
        paragraphs: [
          "Share the RepoSetup version, operating system and architecture, runtime versions, selected manager, a redacted config, and the failed operation. Explain whether the problem happened during dry-run, execution, detection, or doctor.",
          "Include the smallest reproduction that does not require credentials. Never attach a real .env, access token, or private database URL. Security reports should follow the repository's security policy.",
        ],
        links: [
          { label: "Repository issues", href: "https://github.com/4d696e6b/RepoSetup/issues" },
          { label: "0.2.3 security policy", href: `${source}/SECURITY.md` },
        ],
      },
      {
        id: "help-beginners",
        title: "Improve the learning path",
        paragraphs: [
          "Examples of confusing output, missing setup explanations, and unclear library tradeoffs help improve the product. Include the page or command that left you uncertain and what you expected to learn.",
          "Documentation for this site is intentionally scoped to the published 0.2.3 behavior. Changes should use exact public flags, real registry IDs, and honest maturity and qualification labels.",
        ],
      },
      {
        id: "integration-work",
        title: "Extend an integration with verified setup",
        paragraphs: [
          "Integration contributions belong in the checked-in definitions. They generate typed operations and use package-manager adapters; definitions must not execute shell commands themselves.",
          "Verify external flags and setup instructions against current official documentation, record verification evidence, and add plan, detection, and doctor/verification tests. Start new IDs as experimental; stable promotion requires real execution and advertised-platform evidence.",
        ],
        links: [
          { label: "Contribution guide at 0.2.3", href: `${source}/CONTRIBUTING.md` },
          {
            label: "Integration system",
            href: `${source}/docs/specification-documentation/product-docs/INTEGRATION_SYSTEM.md`,
          },
          {
            label: "Command research template",
            href: `${source}/docs/specification-documentation/implementing-docs/EXTERNAL_COMMAND_RESEARCH_TEMPLATE.md`,
          },
        ],
      },
      {
        id: "source",
        title: "Review the published source",
        paragraphs: [
          "The v0.2.3 source tag is the reference for the behavior described here. Development uses TypeScript and pnpm workspaces, with domain logic, integration definitions, registry validation, and the CLI separated into packages.",
          "Use Node 24+ when testing the published CLI behavior. Read the contribution workflow and existing tests before changing code, and keep user-facing safety and support limits visible.",
        ],
        links: [
          { label: "v0.2.3 source", href: "https://github.com/4d696e6b/RepoSetup/tree/v0.2.3" },
          { label: "Published npm package", href: "https://www.npmjs.com/package/rsetup/v/0.2.3" },
        ],
      },
    ],
  },
];
