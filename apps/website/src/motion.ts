const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
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
  let disposed = false;
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

  let resetPointer = () => {};
  let pointerCleanup = () => {};
  const hero = main.querySelector<HTMLElement>(".hero-visual");
  let heroVisible = true;
  const visibility = () => {
    main.classList.toggle("motion-home-idle", document.hidden || !heroVisible);
    for (const animation of animations.keys()) {
      if (document.hidden) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }
    if (document.hidden) resetPointer();
  };
  const heroObserver = new IntersectionObserver((entries) => {
    heroVisible = entries[0]?.isIntersecting ?? false;
    visibility();
  });
  document.addEventListener("visibilitychange", visibility);

  if (page === "home") {
    if (hero) heroObserver.observe(hero);
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
      if (hero)
        play(
          hero,
          [
            {
              transform: "perspective(1200px) translate3d(0, 40px, 0) rotateY(-8deg) scale(.94)",
            },
            {
              transform: "perspective(1200px) translate3d(0, 0, 0) rotateY(0) scale(1)",
            },
          ],
          1300,
          140,
        );
    }
    main
      .querySelectorAll<HTMLElement>(
        ".ecosystem-strip, .section-heading, .feature-card > :not(a), .docs-promo > div:first-child > :not(a), .guide-row > div, .start-callout > div:first-child",
      )
      .forEach((element) => reveal.observe(element));

    const art = hero?.querySelector<HTMLElement>(".hero-art-wrap");
    if (hero && art) {
      let frame = 0;
      let tilt: Animation | undefined;
      let point = { x: 0, y: 0 };
      const moveArt = () => {
        frame = 0;
        if (disposed) return;
        const from = getComputedStyle(art).transform;
        tilt?.cancel();
        tilt = art.animate(
          [
            { transform: from },
            {
              transform: `perspective(1000px) rotateX(${-point.y * 4}deg) rotateY(${point.x * 5}deg) translate3d(${point.x * 9}px, ${point.y * 6}px, 0)`,
            },
          ],
          { duration: 450, easing: ease, fill: "forwards" },
        );
      };
      const move = (event: PointerEvent) => {
        if (!finePointer.matches || event.pointerType !== "mouse") return;
        const bounds = hero.getBoundingClientRect();
        point = {
          x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)),
          y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)),
        };
        if (!frame) frame = requestAnimationFrame(moveArt);
      };
      const leave = () => {
        if (!finePointer.matches) return;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        if (!tilt) return;
        const from = getComputedStyle(art).transform;
        tilt?.cancel();
        const returning = art.animate([{ transform: from }, { transform: "none" }], {
          duration: 700,
          easing: ease,
        });
        tilt = returning;
        void returning.finished.then(
          () => returning.cancel(),
          () => {},
        );
      };
      resetPointer = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        tilt?.cancel();
      };
      hero.addEventListener("pointermove", move);
      hero.addEventListener("pointerleave", leave);
      const cleanPointer = resetPointer;
      // Removed below along with all route-specific animation observers.
      pointerCleanup = () => {
        hero.removeEventListener("pointermove", move);
        hero.removeEventListener("pointerleave", leave);
        cleanPointer();
      };
    }
  } else if (page !== "docs" && !anchored) {
    const intro = main.querySelector<HTMLElement>(".page-intro");
    if (intro) lift(intro);
  }
  visibility();

  return () => {
    disposed = true;
    reveal.disconnect();
    heroObserver.disconnect();
    pointerCleanup();
    document.removeEventListener("visibilitychange", visibility);
    main.removeEventListener("focusin", focus);
    main.classList.remove("motion-home-idle");
    for (const animation of animations.keys()) animation.cancel();
    animations.clear();
  };
}

reduced.addEventListener("change", refreshMotion);
finePointer.addEventListener("change", refreshMotion);
updateState();
