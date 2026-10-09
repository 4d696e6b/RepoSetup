import { artwork, codeBlock, el, eyebrow, link, tag } from "./dom.js";
import { INSTALL, release, RELEASE_URL, REPOSITORY } from "./release.js";

export function home(main: HTMLElement) {
  const hero = el("section", undefined, "hero");
  const copy = el("div", undefined, "hero-copy");
  const announcement = link("0.2.3 is here  ↗", "#/release", "release-pill");
  announcement.prepend(el("span", "", "status-dot"));
  const title = el("h1");
  title.append("Your stack.", el("br"), el("span", "Ready to build.", "muted-title"));
  copy.append(
    announcement,
    title,
    el(
      "p",
      "Less setup. More making. Compose your development stack, preview the plan, and start with confidence.",
      "hero-description",
    ),
  );
  const actions = el("div", undefined, "actions");
  actions.append(
    link("Get started  ↗", "#/docs/getting-started", "button primary"),
    link("Explore integrations  →", "#/integrations", "button text-button"),
  );
  copy.append(
    actions,
    codeBlock(INSTALL, "Copy installation command"),
    el("p", "Node.js 24+ · Open source · Runs in your terminal", "hint"),
  );
  const visual = el("div", undefined, "hero-visual");
  visual.append(artwork("hero-stack.png", "", "hero-art"));
  const visualLabel = el("div", undefined, "visual-label");
  visualLabel.append(el("span", "01 / COMPOSE WITH CLARITY"), el("span", ">_"));
  visual.append(visualLabel);
  hero.append(copy, visual);
  main.append(hero);
  const strip = el("div", undefined, "ecosystem-strip");
  strip.append(el("p", "A considered toolkit.\nOne coherent workflow."));
  for (const name of ["Next.js", "React + Vite", "Express", "FastAPI", "Flask"])
    strip.append(el("span", name));
  main.append(strip);
  const features = el("section", undefined, "section features");
  const heading = el("div", undefined, "section-heading");
  heading.append(
    eyebrow("THE WORKFLOW"),
    el("h2", "From idea to a\nworking foundation."),
    el(
      "p",
      "Bring the tools together. Know what happens next. Keep the important decisions in your hands.",
    ),
  );
  features.append(heading);
  const grid = el("div", undefined, "feature-grid");
  for (const [number, image, title, description, href, label] of [
    [
      "01",
      "feature-compose.png",
      "Compose your stack",
      "Start with a bundled recipe. Explore the integrations and learn where each one fits.",
      "#/presets",
      "Explore presets",
    ],
    [
      "02",
      "feature-preview.png",
      "See the plan first",
      "Review the real installation plan with a dry-run before changing your project.",
      "#/docs/preview",
      "Understand dry-run",
    ],
    [
      "03",
      "feature-compatibility.png",
      "Check the fit",
      "RepoSetup resolves declared requirements and conflicts before execution.",
      "#/docs/inspect",
      "Meet stack & doctor",
    ],
  ]) {
    const card = el("article", undefined, "feature-card");
    card.append(
      el("span", number, "index-label"),
      artwork(image!),
      el("h3", title),
      el("p", description),
      link(`${label}  ↗`, href!),
    );
    grid.append(card);
  }
  features.append(grid);
  main.append(features);
  const docs = el("section", undefined, "docs-promo section");
  const text = el("div");
  text.append(
    eyebrow("MADE TO BE UNDERSTOOD"),
    el("h2", "Good docs.\nLess guesswork."),
    el(
      "p",
      "A clear path from your first command to configuration, databases, and recovery. Written for the version you can install today.",
    ),
    link("Read the documentation  ↗", "#/docs/getting-started", "button primary"),
  );
  const guide = el("div", undefined, "guide-links");
  for (const [number, title, href, subtitle] of [
    ["01", "Start here", "getting-started", "Install, preview, and create your first project"],
    ["02", "Find your recipe", "presets", "Five presets, explained without the jargon"],
    ["03", "Understand your project", "inspect", "Detect your stack and check its health"],
    ["04", "Keep moving", "recovery", "Recover safely when setup stops"],
  ]) {
    const a = link("", `#/docs/${href}`, "guide-row");
    const body = el("div");
    body.append(el("h3", title), el("p", subtitle));
    a.append(el("span", number, "index-label"), body, el("span", "↗"));
    guide.append(a);
  }
  docs.append(text, guide);
  main.append(docs);
  const callout = el("section", undefined, "start-callout section");
  const summary = el("div");
  summary.append(
    tag(`RELEASE ${release.package.version}`, "inverted"),
    el("h2", "Make something\nworth setting up."),
    el("p", "Choose a recipe. Read the plan. Build from there."),
  );
  const aside = el("div");
  aside.append(
    codeBlock("npx rsetup@0.2.3 create", "Copy interactive create command"),
    link("See what's in 0.2.3  ↗", RELEASE_URL),
    link("View the source  ↗", REPOSITORY),
  );
  callout.append(summary, aside);
  main.append(callout);
}
