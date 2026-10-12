import { artwork, el, link } from "./dom.js";
import { experimentalIngredients, release } from "./release.js";

const RECIPE_DURATION = 12000;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
};

/** Reserve the chapter footer and fit the tablet at its largest camera scale. */
export function tabletDeviceLayout(stageWidth: number, stageHeight: number) {
  const width = Math.max(1, stageWidth);
  const height = Math.max(1, stageHeight);
  const size = Math.max(
    1,
    Math.min(820, (width - 32) / (0.57 * 1.2), (height - 96) / (0.78 * 1.2)),
  );
  return {
    size,
    left: width / 2 - size * 0.06,
    top: (height - 72) / 2 + size * 0.075,
  };
}

/** Camera pulls back before each swipe, then returns to a readable front view. */
export function tabletStoryFrame(progress: number) {
  const p = Number.isFinite(progress) ? clamp(progress) : 0;
  const first = smooth((p - 0.32) / 0.08);
  const second = smooth((p - 0.64) / 0.08);
  let zoom = smooth(p / 0.18);
  if (p >= 0.28 && p < 0.38) zoom = 1 - smooth((p - 0.28) / 0.1);
  else if (p >= 0.38 && p < 0.48) zoom = smooth((p - 0.38) / 0.1);
  else if (p >= 0.48 && p < 0.6) zoom = 1;
  else if (p >= 0.6 && p < 0.7) zoom = 1 - smooth((p - 0.6) / 0.1);
  else if (p >= 0.7) zoom = smooth((p - 0.7) / 0.12);
  const gesture =
    p >= 0.28 && p <= 0.42
      ? clamp((p - 0.28) / 0.14)
      : p >= 0.6 && p <= 0.74
        ? clamp((p - 0.6) / 0.14)
        : 0;
  return {
    progress: p,
    zoom,
    offset: first + second,
    swipe: Math.sin(gesture * Math.PI),
    swipeY: gesture,
    chapter: p < 0.36 ? ("overview" as const) : p < 0.68 ? ("presets" as const) : ("docs" as const),
  };
}

export function stackRecipeFacts(id: string) {
  const preset = release.presets.find((item) => item.id === id);
  if (!preset) return null;
  const nameFor = (id: string) =>
    release.integrations.find((integration) => integration.id === id)?.name ?? id;
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    framework: nameFor(preset.config.framework.id),
    runtime: preset.config.runtime.id,
    packageManager: preset.config.packageManager,
    ingredients: preset.config.integrations.map((item) => ({
      id: item.id,
      name: nameFor(item.id),
    })),
    experimental: experimentalIngredients(preset).map((item) => item.name),
  };
}

function updateRecipe(experience: HTMLElement, id: string) {
  const facts = stackRecipeFacts(id);
  if (!facts) return false;
  experience.dataset.preset = facts.id;
  experience.querySelector<HTMLElement>(".tablet-stage")!.dataset.preset = facts.id;
  experience.querySelector<HTMLElement>(".tablet-current-recipe")!.textContent = facts.name;
  experience.querySelector<HTMLElement>(".tablet-framework")!.textContent =
    `${facts.framework} · ${facts.runtime} · ${facts.packageManager}`;
  const ingredients = experience.querySelector<HTMLElement>(".tablet-ingredients")!;
  ingredients.replaceChildren(
    ...facts.ingredients.map((item) => {
      const chip = el("span", item.name, "tablet-ingredient");
      chip.dataset.id = item.id;
      return chip;
    }),
  );
  experience.querySelector<HTMLElement>(".tablet-support")!.textContent = facts.experimental.length
    ? `Bundled recipe · Includes experimental integrations: ${facts.experimental.join(", ")}.`
    : "Bundled recipe · Ingredients match the published 0.2.3 preset.";
  return true;
}

export function createStackScene(): HTMLElement {
  const experience = el("div", undefined, "stack-experience");
  experience.style.setProperty("--scene-progress", "0");
  const track = el("div", undefined, "tablet-scroll-track");
  const stage = el("div", undefined, "tablet-stage");
  stage.dataset.phase = "overview";
  stage.dataset.progress = "0";
  const sceneLabel = el("div", "COMPOSE · PREVIEW · CREATE", "tablet-scene-label");
  sceneLabel.setAttribute("aria-hidden", "true");
  const device = el("div", undefined, "tablet-device");
  const hand = artwork("tablet-hand.png", "", "tablet-hand");
  hand.width = hand.height = 1254;
  const screen = el("div", undefined, "tablet-screen");
  screen.setAttribute("aria-hidden", "true");
  const content = el("div", undefined, "tablet-screen-content");
  const overviewPanel = el("div", undefined, "tablet-story-panel tablet-overview-panel");
  const presetPanel = el("div", undefined, "tablet-story-panel tablet-preset-panel");
  const docsPanel = el("div", undefined, "tablet-story-panel tablet-documentation-panel");
  overviewPanel.dataset.chapter = "overview";
  presetPanel.dataset.chapter = "presets";
  docsPanel.dataset.chapter = "docs";
  const header = el("div", undefined, "tablet-screen-header");
  const navigation = el("div", undefined, "tablet-screen-nav");
  navigation.append(el("span", "Docs"), el("span", "Integrations"), el("span", "Presets"));
  header.append(artwork("reposetup-wordmark.svg", "", "tablet-logo"), navigation);
  const hero = el("div", undefined, "tablet-screen-hero");
  const art = el("div", undefined, "hero-art-wrap");
  art.append(artwork("hero-stack.png", "", "hero-art"));
  hero.append(
    el("p", "RepoSetup", "tablet-eyebrow"),
    el("h2", "Your stack. Ready to build.", "tablet-screen-title"),
    el("p", "Less setup. More making.", "tablet-screen-description"),
    el(
      "p",
      "Compose your tools. Preview the plan. Build with confidence.",
      "tablet-overview-description",
    ),
    art,
  );
  const recipe = el("div", undefined, "tablet-recipe-pane");
  recipe.append(
    el("p", "A BUNDLED RECIPE", "tablet-section-label"),
    el("h3", undefined, "tablet-current-recipe"),
    el("p", undefined, "tablet-framework"),
    el("div", undefined, "tablet-ingredients"),
    el("p", undefined, "tablet-support"),
  );
  const docs = el("div", undefined, "tablet-docs-pane");
  const guides = el("ul", undefined, "tablet-docs-list");
  for (const [title, detail] of [
    ["Getting started", "Install, preview, and create"],
    ["Create and preview", "Understand the local plan"],
    ["Inspect your project", "Stack, doctor, and recovery"],
  ]) {
    const row = el("li", undefined, "tablet-doc-row");
    row.append(el("strong", title), el("span", detail));
    guides.append(row);
  }
  const command = el("pre", undefined, "tablet-command");
  command.append(el("code", "npx rsetup create --config reposetup-my-app.json --dry-run"));
  docs.append(guides, el("p", "Preview in your terminal", "tablet-section-label"), command);
  const overviewFacts = el("div", undefined, "tablet-overview-facts");
  for (const [number, title, detail] of [
    ["01", "Choose your stack", "Five bundled recipes. Clear ingredients."],
    ["02", "See the plan first", "Dry-run before changing your project."],
    ["03", "Stay in control", "Confirm the work in your terminal."],
  ]) {
    const fact = el("div");
    fact.append(el("span", number), el("strong", title), el("p", detail));
    overviewFacts.append(fact);
  }
  overviewPanel.append(header, hero, overviewFacts);
  presetPanel.append(
    el("p", "02 / YOUR FOUNDATION", "tablet-chapter-eyebrow"),
    el("h2", "A recipe for your next idea.", "tablet-panel-title"),
    el(
      "p",
      "Start with a bundled preset. Understand every ingredient before adding it.",
      "tablet-panel-description",
    ),
    recipe,
    el("p", "Frameworks. Libraries. One considered starting point.", "tablet-panel-footer"),
  );
  docsPanel.append(
    el("p", "03 / MADE TO BE UNDERSTOOD", "tablet-chapter-eyebrow"),
    el("h2", "Good docs. Less guesswork.", "tablet-panel-title"),
    el(
      "p",
      "From your first command to your next project. Read, preview, and build.",
      "tablet-panel-description",
    ),
    docs,
  );
  content.append(overviewPanel, presetPanel, docsPanel);
  screen.append(content);
  const gestureWrap = el("div", undefined, "tablet-gesture-wrap");
  gestureWrap.setAttribute("aria-hidden", "true");
  const gesture = artwork("tablet-gesture.png", "", "tablet-gesture");
  gesture.width = gesture.height = 1254;
  gestureWrap.append(gesture);
  device.append(hand, screen, gestureWrap);
  const storyCaption = el("p", "01 / THE BIG PICTURE", "tablet-story-caption");
  storyCaption.setAttribute("aria-hidden", "true");
  const backdrop = el("div", undefined, "tablet-backdrop");
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.append(
    el("div", undefined, "tablet-grid"),
    el("div", undefined, "tablet-orbit"),
    el("div", undefined, "tablet-orbit tablet-orbit-inner"),
  );
  const rail = el("div", undefined, "tablet-scene-rail");
  rail.setAttribute("aria-hidden", "true");
  const leftRail = el("div", undefined, "tablet-rail-column tablet-rail-left");
  const rightRail = el("div", undefined, "tablet-rail-column tablet-rail-right");
  const stackCard = el("div", undefined, "tablet-rail-card tablet-rail-stack");
  stackCard.append(
    artwork("feature-compose.png"),
    el("p", "YOUR TOOLKIT", "tablet-rail-eyebrow"),
    el("strong", `${release.integrations.length} built-in integrations`),
    el("p", "Explore the ingredients. Understand the fit."),
  );
  const recipeCard = el("div", undefined, "tablet-rail-card tablet-rail-recipe");
  recipeCard.append(
    el("span", "{ }", "tablet-rail-symbol"),
    el("strong", `${release.presets.length} bundled recipes`),
    el("p", "A considered starting point for your next idea."),
  );
  const planCard = el("div", undefined, "tablet-rail-card tablet-rail-plan");
  planCard.append(
    el("p", "IN YOUR TERMINAL", "tablet-rail-eyebrow"),
    el("strong", "Preview before you build."),
    el(
      "p",
      "01  Compose your stack\n02  Review the dry-run\n03  Confirm the work",
      "tablet-rail-steps",
    ),
    el("span", "LOCAL · DECLARATIVE · YOUR CALL", "tablet-rail-footnote"),
  );
  const guideCard = el("div", undefined, "tablet-rail-card tablet-rail-guide");
  guideCard.append(
    artwork("feature-preview.png"),
    el("strong", "Clarity, built in."),
    el("p", "Guides, reference, and recovery. One place to keep moving."),
  );
  leftRail.append(stackCard, recipeCard);
  rightRail.append(planCard, guideCard);
  rail.append(leftRail, rightRail);
  const dots = el("div", undefined, "tablet-chapter-dots");
  dots.setAttribute("aria-hidden", "true");
  for (const chapter of ["overview", "presets", "docs"]) {
    const dot = el("span");
    dot.dataset.chapter = chapter;
    dots.append(dot);
  }
  stage.append(backdrop, rail, sceneLabel, device, storyCaption, dots);
  track.append(stage);
  const caption = el("div", undefined, "tablet-caption");
  caption.append(
    el("h2", "From the big picture to the details.", "tablet-caption-title"),
    el(
      "p",
      "Browse the recipes, read the documentation, and preview the work in your terminal.",
      "tablet-caption-description",
    ),
    link("Explore the presets →", "#/presets", "tablet-presets-link"),
  );
  experience.append(track, caption);
  updateRecipe(experience, "next-sqlite");
  return experience;
}

export function mountStackScene(main: HTMLElement): () => void {
  const experience = main.querySelector<HTMLElement>(".stack-experience");
  if (!experience) return () => {};
  const track = experience.querySelector<HTMLElement>(".tablet-scroll-track")!;
  const stage = experience.querySelector<HTMLElement>(".tablet-stage")!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stageVisible = false;
  let trackVisible = false;
  let disposed = false;
  let presetIndex = 0;
  let remaining = RECIPE_DURATION;
  let due = 0;
  let frame = 0;
  let readingRecipe = false;

  const paintLayout = () => {
    const layout = tabletDeviceLayout(stage.clientWidth, stage.clientHeight);
    experience.style.setProperty("--device-size", `${layout.size.toFixed(2)}px`);
    experience.style.setProperty("--device-left", `${layout.left.toFixed(2)}px`);
    experience.style.setProperty("--device-top", `${layout.top.toFixed(2)}px`);
  };

  const playing = () =>
    !disposed && stageVisible && trackVisible && !document.hidden && !reduced.matches;
  const paintScrollProgress = () => {
    if (!playing()) return;
    const bounds = track.getBoundingClientRect();
    const progress = Math.max(
      0,
      Math.min(1, -bounds.top / Math.max(1, bounds.height - window.innerHeight)),
    );
    const story = tabletStoryFrame(progress);
    // Hidden recipes may rotate; the visible chapter stays still for reading.
    readingRecipe = story.offset > 0 && story.offset < 2;
    if (readingRecipe) pauseRecipes();
    else schedule();
    for (const [key, value] of Object.entries({
      "scene-progress": story.progress,
      "camera-zoom": story.zoom,
      "screen-offset": story.offset,
      swipe: story.swipe,
      "swipe-y": story.swipeY,
    }))
      experience.style.setProperty(`--${key}`, value.toFixed(3));
    stage.dataset.phase = story.chapter;
    stage.dataset.progress = progress.toFixed(3);
    const captions = {
      overview: "01 / THE BIG PICTURE",
      presets: "02 / YOUR FOUNDATION",
      docs: "03 / MADE TO BE UNDERSTOOD",
    };
    stage.querySelector(".tablet-story-caption")!.textContent = captions[story.chapter];
  };
  const queueScrollProgress = () => {
    if (frame || !playing()) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      paintScrollProgress();
    });
  };
  const resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    paintLayout();
    queueScrollProgress();
  });
  resizeObserver.observe(stage);
  paintLayout();
  const pauseRecipes = () => {
    if (timer !== undefined) {
      remaining = Math.max(0, due - Date.now());
      clearTimeout(timer);
      timer = undefined;
    }
  };
  const stop = () => {
    pauseRecipes();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    experience.classList.remove("is-playing");
  };
  const schedule = () => {
    if (timer !== undefined || !playing() || readingRecipe) return;
    due = Date.now() + remaining;
    timer = setTimeout(() => {
      timer = undefined;
      if (!playing()) return;
      presetIndex = (presetIndex + 1) % release.presets.length;
      updateRecipe(experience, release.presets[presetIndex]!.id);
      remaining = RECIPE_DURATION;
      schedule();
    }, remaining);
  };
  const syncVisibility = () => {
    if (playing()) {
      experience.classList.add("is-playing");
      paintScrollProgress();
      schedule();
    } else stop();
  };
  const syncPreference = () => {
    if (reduced.matches) {
      stop();
      presetIndex = 0;
      remaining = RECIPE_DURATION;
      readingRecipe = false;
      for (const property of ["scene-progress", "camera-zoom", "screen-offset", "swipe", "swipe-y"])
        experience.style.setProperty(`--${property}`, "0");
      stage.dataset.phase = "overview";
      stage.dataset.progress = "0";
      stage.querySelector(".tablet-story-caption")!.textContent = "01 / THE BIG PICTURE";
      updateRecipe(experience, "next-sqlite");
    }
    syncVisibility();
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === stage) stageVisible = entry.isIntersecting;
      if (entry.target === track) trackVisible = entry.isIntersecting;
    }
    syncVisibility();
  });
  observer.observe(stage);
  observer.observe(track);
  document.addEventListener("visibilitychange", syncVisibility);
  reduced.addEventListener("change", syncPreference);
  window.addEventListener("scroll", queueScrollProgress, { passive: true });
  window.addEventListener("resize", queueScrollProgress);
  syncPreference();

  return () => {
    disposed = true;
    stop();
    observer.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", syncVisibility);
    reduced.removeEventListener("change", syncPreference);
    window.removeEventListener("scroll", queueScrollProgress);
    window.removeEventListener("resize", queueScrollProgress);
  };
}
