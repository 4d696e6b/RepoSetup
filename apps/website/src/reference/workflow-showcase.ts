import { artwork, codeBlock, el, eyebrow, link } from "./dom.js";

export const workflowSteps = [
  {
    id: "preview",
    label: "Preview",
    title: "A blueprint before you build.",
    description:
      "Download a recipe from the builder. Save its configuration in the parent directory, then inspect the local plan without changing your project.",
    command: `npx rsetup create --config reposetup-my-app.json --dry-run`,
    context: "After downloading reposetup-my-app.json",
    detail: "Dry-run prints the plan. No project writes or installer execution.",
    image: "feature-preview.png",
    href: "#/docs/preview",
    link: "Understand the preview",
    chips: ["Declarative configuration", "Explicit destination", "Local preview"],
  },
  {
    id: "confirm",
    label: "Confirm",
    title: "Your call. Every time.",
    description:
      "Run the same configuration after reviewing it. RepoSetup shows the local plan and asks for confirmation before execution.",
    command: `npx rsetup create --config reposetup-my-app.json`,
    context: "From the same parent directory",
    detail: "Read the plan and confirm in your terminal. The browser never installs anything.",
    image: "feature-compose.png",
    href: "#/docs/create#confirmation",
    link: "Read about confirmation",
    chips: ["Review the plan", "Confirm locally", "Create your project"],
  },
  {
    id: "inspect",
    label: "Inspect",
    title: "Know what you’re working with.",
    description:
      "From the created project directory, inspect the detected stack. Use doctor for read-only health checks and actionable guidance.",
    command: `npx rsetup stack\nnpx rsetup doctor`,
    context: "From inside the created project",
    detail: "Inspection is read-only. Database services and prerequisites stay in your hands.",
    image: "feature-compatibility.png",
    href: "#/docs/inspect",
    link: "Explore stack and doctor",
    chips: ["Detect your stack", "Check prerequisites", "Read-only diagnostics"],
  },
] as const;

export function workflowShowcase() {
  const section = el("section", undefined, "workflow-showcase");
  section.setAttribute("aria-labelledby", "showcase-heading");
  const intro = el("div", undefined, "showcase-intro");
  const heading = el("h2", "See the bigger picture.");
  heading.id = "showcase-heading";
  intro.append(
    eyebrow("THE TERMINAL, WITH INTENTION"),
    heading,
    el("p", "A few considered steps. A foundation you understand."),
  );
  const tabs = el("div", undefined, "showcase-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Explore the RepoSetup workflow");
  const body = el("div", undefined, "showcase-body");
  const buttons: HTMLButtonElement[] = [];
  const panels: HTMLElement[] = [];
  function select(index: number, focus = false) {
    buttons.forEach((button, i) => {
      button.setAttribute("aria-selected", String(index === i));
      button.tabIndex = index === i ? 0 : -1;
      panels[i]!.hidden = index !== i;
    });
    if (focus) buttons[index]!.focus();
  }
  workflowSteps.forEach((step, index) => {
    const button = el("button", undefined, "showcase-tab");
    button.type = "button";
    button.id = `workflow-tab-${step.id}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `workflow-panel-${step.id}`);
    const number = el("span", `0${index + 1}`);
    number.setAttribute("aria-hidden", "true");
    const arrow = el("span", "↗", "showcase-tab-arrow");
    arrow.setAttribute("aria-hidden", "true");
    button.append(number, el("span", step.label), arrow);
    button.addEventListener("click", () => select(index));
    button.addEventListener("keydown", (event) => {
      let next: number | undefined;
      if (event.key === "ArrowRight") next = (index + 1) % workflowSteps.length;
      if (event.key === "ArrowLeft")
        next = (index + workflowSteps.length - 1) % workflowSteps.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = workflowSteps.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(next, true);
    });
    buttons.push(button);
    tabs.append(button);
    const panel = el("div", undefined, "showcase-panel");
    panel.id = `workflow-panel-${step.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);
    const copy = el("div", undefined, "showcase-copy");
    copy.append(el("h3", step.title), el("p", step.description));
    const chips = el("ul", undefined, "showcase-facts");
    step.chips.forEach((fact) => chips.append(el("li", fact)));
    copy.append(chips, link(`${step.link}  ↗`, step.href));
    const visual = el("div", undefined, "showcase-visual");
    const art = el("div", undefined, "showcase-art");
    art.setAttribute("aria-hidden", "true");
    art.append(artwork(step.image));
    const terminal = el("div", undefined, "showcase-terminal");
    const bar = el("div", undefined, "terminal-titlebar");
    bar.append(el("span", "● ● ●", "terminal-dots"), el("span", "EXAMPLE / LOCAL TERMINAL"));
    terminal.append(
      bar,
      el("p", step.context, "terminal-context"),
      codeBlock(step.command, `Copy ${step.label.toLowerCase()} workflow commands`),
      el("p", step.detail, "terminal-detail"),
    );
    visual.append(art, terminal);
    panel.append(copy, visual);
    panels.push(panel);
    body.append(panel);
  });
  const footer = el("div", undefined, "showcase-footer");
  footer.append(
    el("span", "Built for the version you can install today. 0.2.3."),
    link("Choose your recipe  →", "#/presets"),
  );
  section.append(intro, tabs, body, footer);
  select(0);
  return section;
}
