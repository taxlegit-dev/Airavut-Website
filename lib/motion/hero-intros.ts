import gsap from "gsap";
import { splitLines } from "@/lib/motion/text";

type Cleanup = () => void;
type Parts = {
  hero: HTMLElement;
  crumb: HTMLElement | null;
  title: HTMLElement | null;
  rest: HTMLElement[];
  base: HTMLElement | null;
  dust: HTMLElement | null;
  orbit: HTMLElement | null;
  rings: HTMLElement[];
  dial: HTMLElement | null;
  core: HTMLElement | null;
  ripples: HTMLElement | null;
};
type Intro = (parts: Parts, tl: gsap.core.Timeline) => void;

const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function collect(hero: HTMLElement): Parts {
  const inner = hero.querySelector<HTMLElement>(".hero-inner");
  const children = inner ? [...inner.children] as HTMLElement[] : [];
  return {
    hero,
    crumb: inner?.querySelector<HTMLElement>(".crumb") ?? null,
    title: inner?.querySelector<HTMLElement>(".display") ?? null,
    rest: children.filter((child) => !child.matches(".crumb, .display")),
    base: hero.querySelector(".art-base"),
    dust: hero.querySelector(".art-dust"),
    orbit: hero.querySelector(".art-orbit"),
    rings: [...hero.querySelectorAll<HTMLElement>(".art-ring")],
    dial: hero.querySelector(".art-dial"),
    core: hero.querySelector(".art-core"),
    ripples: hero.querySelector(".art-ripples")
  };
}

/** Shared tail: supporting copy settles after the headline. */
function settleCopy(parts: Parts, tl: gsap.core.Timeline, at: number | string, from: gsap.TweenVars = { y: 26 }) {
  if (parts.crumb) tl.fromTo(parts.crumb, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.8 }, 0.1);
  tl.fromTo(parts.rest, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, duration: 0.95, stagger: 0.1, clearProps: "transform" }, at);
}

function headline(parts: Parts, tl: gsap.core.Timeline, at: number, vars: gsap.TweenVars, fromVars: gsap.TweenVars = { yPercent: 108 }) {
  if (!parts.title) return;
  const title = parts.title;
  tl.set(title, { autoAlpha: 1 }, 0);
  splitLines(title, (lines) => {
    const tween = gsap.fromTo(lines, fromVars, { yPercent: 0, x: 0, rotate: 0, ...vars });
    tl.add(tween, at);
    return tween;
  });
}

/* Ecosystem: three orbits converge into one system. */
const ecosystem: Intro = (p, tl) => {
  tl.fromTo(p.base, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: "power2.out" }, 0);
  tl.set(p.orbit, { autoAlpha: 1 }, 0);
  p.rings.forEach((ring, index) => {
    const angle = (index / p.rings.length) * Math.PI * 2;
    tl.fromTo(
      ring,
      { autoAlpha: 0, scale: 0.55, rotate: -120, x: Math.cos(angle) * 80, y: Math.sin(angle) * 80 },
      { autoAlpha: 1, scale: 1, rotate: 0, x: 0, y: 0, duration: 2, ease: "expo.out" },
      0.25 + index * 0.16
    );
  });
  tl.fromTo(p.core, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: "back.out(2.2)" }, 0.75);
  tl.fromTo(p.dust, { autoAlpha: 0 }, { autoAlpha: 1, duration: 2.2 }, 0.6);
  headline(p, tl, 0.2, { duration: 1.1, stagger: 0.11, ease: "expo.out" });
  settleCopy(p, tl, 0.62);
};

/* Accreditations: the certification dial turns and locks, like a seal being set. */
const accreditations: Intro = (p, tl) => {
  tl.fromTo(p.base, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: "power1.out" }, 0);
  tl.set(p.orbit, { autoAlpha: 1 }, 0);
  if (p.dial) tl.fromTo(p.dial, { autoAlpha: 0, rotate: -200, scale: 0.92 }, { autoAlpha: 1, rotate: 0, scale: 1, duration: 2.4, ease: "power4.out" }, 0.1);
  tl.fromTo(p.rings, { autoAlpha: 0, rotate: 140 }, { autoAlpha: 1, rotate: 0, duration: 2.4, ease: "power4.out", stagger: 0.12 }, 0.18);
  // The "lock" moment: a short flash at the centre once the dial settles.
  tl.fromTo(p.core, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1.35, duration: 0.5, ease: "power2.out" }, 1.25)
    .to(p.core, { scale: 1, duration: 1.2, ease: "elastic.out(1, 0.5)" }, 1.75);
  tl.fromTo(p.dust, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 1.6 }, 1.2);
  if (p.title) {
    tl.set(p.title, { autoAlpha: 1, perspective: 900 }, 0);
    headline(p, tl, 0.35, { rotateX: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12, ease: "power3.out" }, { yPercent: 70, rotateX: -75, autoAlpha: 0, transformOrigin: "50% 100%" });
  }
  settleCopy(p, tl, 0.8);
};

/* Leadership: typography-led; a slow focus pull on the artwork, lines arrive one by one. */
const leadership: Intro = (p, tl) => {
  tl.fromTo(p.base, { autoAlpha: 0, scale: 1.16 }, { autoAlpha: 1, scale: 1, duration: 2.8, ease: "power3.out" }, 0);
  tl.set(p.orbit, { autoAlpha: 1 }, 0);
  tl.fromTo(p.core, { autoAlpha: 0, scale: 2.4 }, { autoAlpha: 1, scale: 1, duration: 2.4, ease: "expo.out" }, 0.2);
  tl.fromTo(p.rings, { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 2.2, ease: "expo.out" }, 0.45);
  tl.fromTo(p.dust, { autoAlpha: 0 }, { autoAlpha: 1, duration: 2.4 }, 0.8);
  headline(p, tl, 0.3, { duration: 1.35, stagger: 0.32, ease: "expo.out" }, { yPercent: 115 });
  settleCopy(p, tl, 1.05, { y: 18 });
};

/* Careers: forward momentum; the trajectories launch in from the lower left. */
const career: Intro = (p, tl) => {
  tl.fromTo(p.base, { autoAlpha: 0, xPercent: -4, yPercent: 4 }, { autoAlpha: 1, xPercent: 0, yPercent: 0, duration: 2, ease: "expo.out" }, 0);
  tl.fromTo(p.orbit, { autoAlpha: 0, rotate: -8, xPercent: -6, yPercent: 6, transformOrigin: "58% 73%" }, { autoAlpha: 1, rotate: 0, xPercent: 0, yPercent: 0, duration: 2.1, ease: "expo.out" }, 0.1);
  tl.fromTo(p.dust, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 2.2, ease: "power3.out" }, 0.4);
  headline(p, tl, 0.2, { autoAlpha: 1, duration: 1.1, stagger: 0.1, ease: "expo.out" }, { yPercent: 0, x: -70, autoAlpha: 0 });
  settleCopy(p, tl, 0.5, { x: -36, y: 0 });
};

/* Talk to us: calm and quick — a signal pulse invites the conversation. */
const talk: Intro = (p, tl) => {
  tl.fromTo(p.base, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4, ease: "power1.out" }, 0);
  tl.set(p.orbit, { autoAlpha: 1 }, 0);
  tl.fromTo(p.core, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 1.1, ease: "back.out(2)" }, 0.15);
  tl.fromTo([...p.rings, p.ripples], { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4 }, 0.4);
  tl.fromTo(p.dust, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.6 }, 0.3);
  headline(p, tl, 0.1, { duration: 0.9, stagger: 0.08, ease: "power4.out" }, { yPercent: 100 });
  settleCopy(p, tl, 0.35, { y: 16 });
};

const intros: Record<string, Intro> = {
  ecosystem,
  accreditations,
  leadership,
  career,
  "talk-to-us": talk
};

/**
 * Pointer parallax across the artwork's depth planes (desktop only). quickTo keeps
 * one tween per axis per plane and the movement eases out, so it reads as weight
 * rather than tracking.
 */
export function mountPointerParallax(hero: HTMLElement, getArt: () => HTMLElement | null): Cleanup {
  if (!finePointer()) return () => undefined;
  let setters: Array<{ x: (value: number) => void; y: (value: number) => void; depth: number }> = [];
  let currentArt: HTMLElement | null = null;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const bind = () => {
    const art = getArt();
    if (art === currentArt) return;
    currentArt = art;
    setters = [...(art?.querySelectorAll<HTMLElement>(".art-plane") ?? [])].map((plane) => ({
      x: gsap.quickTo(plane, "x", { duration: 1.4, ease: "power3.out" }),
      y: gsap.quickTo(plane, "y", { duration: 1.4, ease: "power3.out" }),
      depth: Number(plane.dataset.depth ?? 0.5)
    }));
  };
  const apply = () => {
    frame = 0;
    bind();
    setters.forEach(({ x, y, depth }) => {
      x(pointerX * depth * 28);
      y(pointerY * depth * 18);
    });
  };
  const onMove = (event: PointerEvent) => {
    pointerX = event.clientX / window.innerWidth - 0.5;
    pointerY = event.clientY / window.innerHeight - 0.5;
    if (!frame) frame = requestAnimationFrame(apply);
  };
  const onLeave = () => {
    pointerX = 0;
    pointerY = 0;
    if (!frame) frame = requestAnimationFrame(apply);
  };

  hero.addEventListener("pointermove", onMove, { passive: true });
  hero.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(frame);
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerleave", onLeave);
  };
}

/** Pauses an element's CSS ambient loops while it is off screen. */
export function pauseWhenHidden(elements: Element[], rootMargin = "15% 0px"): Cleanup {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-offscreen", !entry.isIntersecting)),
    { rootMargin }
  );
  elements.forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}

export function mountInnerHero(page: string, reduceMotion: boolean): Cleanup {
  const hero = document.querySelector<HTMLElement>(".ihero");
  if (!hero) return () => undefined;
  const cleanups: Cleanup[] = [pauseWhenHidden([hero])];

  if (!reduceMotion) {
    const parts = collect(hero);
    const context = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      (intros[page] ?? ecosystem)(parts, tl);
    }, hero);
    cleanups.push(() => context.revert());
    cleanups.push(mountPointerParallax(hero, () => hero.querySelector(".art")));
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
