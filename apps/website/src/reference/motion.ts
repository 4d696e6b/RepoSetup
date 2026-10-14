const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const ease = "cubic-bezier(.16, 1, .3, 1)";
let current: { main: HTMLElement; page: string; anchored: boolean } | undefined;
let dispose = () => {};

const enabled = () => !reduced.matches;

function updateState() {
  document.body.classList.toggle("motion-enabled", enabled());
  document.body.classList.toggle("motion-reduced", reduced.matches);
}

function refreshMotion() {
  dispose();
  dispose = () => {};
  updateState();
  if (current && enabled()) dispose = animatePage(current.main, current.page, current.anchored);
}

export function mountMotion(main: HTMLElement, page: string, anchored = false) {
  current = { main, page, anchored };
  refreshMotion();
}

function animatePage(main: HTMLElement, page: string, anchored: boolean) {
  const animations = new Map<Animation, HTMLElement>();
  const play = (target: HTMLElement, frames: Keyframe[], duration = 650, delay = 0) => {
    const animation = target.animate(frames, { duration, delay, easing: ease, fill: "both" });
    animations.set(animation, target);
    if (document.hidden) animation.pause();
    // Return to ordinary CSS after entrance; no permanent transforms or layers.
    void animation.finished.then(
      () => {
        animation.cancel();
        animations.delete(animation);
      },
      () => animations.delete(animation),
    );
    return animation;
  };
  const lift = (target: HTMLElement, delay = 0) =>
    play(
      target,
      [{ transform: "translate3d(0, 32px, 0)" }, { transform: "translate3d(0, 0, 0)" }],
      700,
      delay,
    );

  const reveal = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          const target = entry.target as HTMLElement;
          reveal.unobserve(target);
          if (!target.contains(document.activeElement)) lift(target, Math.min(index * 75, 225));
        });
    },
    { threshold: 0.08 },
  );

  const focus = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    for (const [animation, element] of animations) {
      if (element.contains(target)) {
        animation.cancel();
        animations.delete(animation);
      }
    }
  };
  main.addEventListener("focusin", focus);

  const hero = main.querySelector<HTMLElement>(".hero-visual");
  const showcase = main.querySelector<HTMLElement>(".workflow-showcase");
  let heroVisible = true;
  let showcaseVisible = true;
  const visibility = () => {
    main.classList.toggle("motion-home-idle", document.hidden || !heroVisible);
    showcase?.classList.toggle("motion-workflow-idle", document.hidden || !showcaseVisible);
    for (const animation of animations.keys()) {
      if (document.hidden) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }
  };
  const heroObserver = new IntersectionObserver((entries) => {
    heroVisible = entries[0]?.isIntersecting ?? false;
    visibility();
  });
  const showcaseObserver = new IntersectionObserver((entries) => {
    showcaseVisible = entries[0]?.isIntersecting ?? false;
    visibility();
  });
  document.addEventListener("visibilitychange", visibility);

  if (page === "home") {
    if (hero) heroObserver.observe(hero);
    if (showcase) showcaseObserver.observe(showcase);
    if (!anchored) {
      main.querySelectorAll<HTMLElement>(".hero-title-word").forEach((line, index) => {
        play(
          line,
          [
            { transform: "translate3d(0, 105%, 0) rotate(3deg)" },
            { transform: "translate3d(0, 0, 0) rotate(0)" },
          ],
          1000,
          100 + index * 120,
        );
      });
      main
        .querySelectorAll<HTMLElement>(".hero-description, .hero-copy > .hint")
        .forEach((element, index) => lift(element, index * 65));
    }
    main
      .querySelectorAll<HTMLElement>(
        ".ecosystem-strip, .section-heading, .feature-card > :not(a), .docs-promo > div:first-child > :not(a), .guide-row > div, .start-callout > div:first-child",
      )
      .forEach((element) => reveal.observe(element));
  } else if (page !== "docs" && !anchored) {
    const intro = main.querySelector<HTMLElement>(".page-intro");
    if (intro) lift(intro);
  }
  visibility();

  return () => {
    reveal.disconnect();
    heroObserver.disconnect();
    showcaseObserver.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    main.removeEventListener("focusin", focus);
    main.classList.remove("motion-home-idle");
    showcase?.classList.remove("motion-workflow-idle");
    for (const animation of animations.keys()) animation.cancel();
    animations.clear();
  };
}

reduced.addEventListener("change", refreshMotion);
updateState();
