import gsap from "gsap";
import Swiper from "swiper";
import { A11y, EffectFade, Keyboard, Navigation } from "swiper/modules";
import { mountPointerParallax, pauseWhenHidden } from "@/lib/motion/hero-intros";
import { splitLines } from "@/lib/motion/text";

type Cleanup = () => void;

const AUTOPLAY_DELAY = 7000;

/**
 * Home carousel. Autoplay is driven by the indicator's CSS progress animation: when it
 * ends, the carousel advances. That keeps the bar and the timing in perfect sync and,
 * unlike Swiper's Autoplay module (a requestAnimationFrame loop), costs the main thread
 * nothing between slides. Pausing is just `animation-play-state`.
 */
export function mountHeroCarousel(hero: HTMLElement, reduceMotion: boolean): Cleanup {
  const indicators = [...hero.querySelectorAll<HTMLButtonElement>(".ind")];
  const pauseButton = hero.querySelector<HTMLButtonElement>("#pauseBtn");
  const progressLabel = hero.querySelector<HTMLElement>(".carousel-status");
  const controls = hero.querySelector<HTMLElement>(".hero-ctrl");
  const slides = [...hero.querySelectorAll<HTMLElement>(".swiper-slide")];
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let manuallyPaused = reduceMotion;
  let hovering = false;
  let focused = false;
  let dragging = false;
  let onScreen = true;
  let dragStartX: number | undefined;
  let dragStartIndex = 0;
  let slideTimeline: gsap.core.Timeline | undefined;

  hero.style.setProperty("--autoplay", `${AUTOPLAY_DELAY}ms`);

  function updatePlayback() {
    if (reduceMotion) hero.dataset.playback = "off";
    else hero.dataset.playback = manuallyPaused || hovering || focused || dragging || !onScreen || document.hidden ? "paused" : "running";
  }
  updatePlayback();

  // Each slide headline is split once; its lines are re-revealed on every visit.
  const context = gsap.context(() => {
    slides.forEach((slide) => {
      const title = slide.querySelector(".display");
      if (title && !reduceMotion) splitLines(title, () => undefined);
    });
  }, hero);

  /** Split-screen reveal of the incoming slide: shutters part, rings settle, lines rise. */
  function choreograph(slide: HTMLElement | undefined, first = false) {
    if (!slide || reduceMotion) return;
    slideTimeline?.progress(1).kill();
    const copy = [...slide.querySelectorAll<HTMLElement>(".slide-copy > *")];
    const lines = slide.querySelectorAll<HTMLElement>(".display .line");
    const shutters = slide.querySelectorAll<HTMLElement>(".slide-shutters i");
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(shutters, { scaleX: 1 }, { scaleX: 0, duration: first ? 1.6 : 1.25, ease: "expo.inOut" }, 0)
      .fromTo(slide.querySelector(".art-base"), { scale: 1.08 }, { scale: 1, duration: 2.4 }, 0)
      .fromTo(slide.querySelectorAll(".art-ring"), { autoAlpha: 0, scale: 0.82, rotate: -50 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 2, stagger: 0.12 }, first ? 0.45 : 0.3)
      .fromTo(slide.querySelector(".art-core"), { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: "back.out(2)" }, first ? 0.7 : 0.5)
      .fromTo(slide.querySelector(".art-dust"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.8 }, 0.5)
      .set(slide.querySelector(".art-orbit"), { autoAlpha: 1 }, 0)
      .set(copy, { autoAlpha: 1 }, 0)
      .fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.15, stagger: 0.1 }, first ? 0.35 : 0.2)
      .fromTo(
        copy.filter((element) => !element.matches(".display")),
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, clearProps: "transform" },
        first ? 0.75 : 0.5
      );
    if (first && controls) tl.fromTo(controls, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, clearProps: "transform" }, 1);
    slideTimeline = tl;
  }

  /** Restarts the active indicator's progress (and with it, the autoplay timer). */
  function restartProgress() {
    hero.querySelector(".ind.is-active")?.getAnimations({ subtree: true }).forEach((animation) => {
      animation.currentTime = 0;
    });
  }

  const swiper = new Swiper(hero, {
    modules: [A11y, EffectFade, Keyboard, Navigation],
    a11y: {
      enabled: true,
      prevSlideMessage: "Previous highlight",
      nextSlideMessage: "Next highlight",
      firstSlideMessage: "This is the first highlight",
      lastSlideMessage: "This is the last highlight"
    },
    allowTouchMove: true,
    effect: "fade",
    fadeEffect: { crossFade: true },
    grabCursor: !reduceMotion,
    keyboard: { enabled: true, onlyInViewport: true },
    loop: true,
    loopPreventsSliding: false,
    navigation: {
      prevEl: hero.querySelector<HTMLElement>(".hero-prev"),
      nextEl: hero.querySelector<HTMLElement>(".hero-next")
    },
    simulateTouch: true,
    speed: reduceMotion ? 0 : 1100,
    threshold: 8,
    touchAngle: 42,
    on: {
      init(instance) {
        syncCarouselState(instance.realIndex);
      },
      realIndexChange(instance) {
        syncCarouselState(instance.realIndex);
        choreograph(instance.slides[instance.activeIndex]);
        restartProgress();
      }
    }
  });

  function syncCarouselState(index: number) {
    indicators.forEach((indicator, position) => {
      const active = position === index;
      indicator.classList.toggle("is-active", active);
      indicator.toggleAttribute("aria-current", active);
    });

    hero.querySelectorAll<HTMLElement>(".swiper-slide").forEach((slide) => {
      const active = slide.classList.contains("swiper-slide-active");
      slide.setAttribute("aria-hidden", String(!active));
      slide.querySelectorAll<HTMLElement>("a").forEach((link) => {
        if (active) link.removeAttribute("tabindex");
        else link.setAttribute("tabindex", "-1");
      });
    });

    if (progressLabel) progressLabel.textContent = `Highlight ${index + 1} of ${indicators.length}`;
  }

  choreograph(swiper.slides[swiper.activeIndex], true);

  // Decode the other slides' artwork while idle, so the first visit to each slide
  // doesn't parse and rasterise its SVG layers in the middle of the transition.
  const warmUp = () =>
    hero.querySelectorAll<HTMLImageElement>(".swiper-slide:not(.swiper-slide-active) .art img").forEach((image) => {
      image.loading = "eager";
      image.decode().catch(() => undefined);
    });
  const warmHandle = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(warmUp, { timeout: 3000 });
    else warmUp();
  }, 2200);

  const onProgressEnd = (event: AnimationEvent) => {
    if (event.animationName === "ind-progress") swiper.slideNext();
  };
  const onEnter = () => {
    if (!finePointer) return;
    hovering = true;
    updatePlayback();
  };
  const onLeave = () => {
    hovering = false;
    updatePlayback();
  };
  const onFocusIn = () => {
    focused = true;
    updatePlayback();
  };
  const onFocusOut = (event: FocusEvent) => {
    if (hero.contains(event.relatedTarget as Node | null)) return;
    focused = false;
    updatePlayback();
  };
  const beginDrag = (event: PointerEvent) => {
    dragging = true;
    updatePlayback();
    dragStartX = event.clientX;
    dragStartIndex = swiper.realIndex;
    hero.dataset.dragState = "tracking";
  };
  const finishDrag = (event: PointerEvent) => {
    if (dragStartX === undefined) return;
    if (swiper.realIndex === dragStartIndex) {
      const distance = event.clientX - dragStartX;
      hero.dataset.dragDistance = String(Math.round(distance));
      if (Math.abs(distance) >= 52) {
        const targetIndex = (dragStartIndex + (distance < 0 ? 1 : -1) + indicators.length) % indicators.length;
        window.setTimeout(() => swiper.slideToLoop(targetIndex), 0);
      }
    }
    dragStartX = undefined;
    dragging = false;
    hero.dataset.dragState = "complete";
    updatePlayback();
  };
  const cancelDrag = () => {
    dragStartX = undefined;
    dragging = false;
    hero.dataset.dragState = "cancelled";
    updatePlayback();
  };
  const togglePlayback = () => {
    manuallyPaused = !manuallyPaused;
    pauseButton?.setAttribute("aria-pressed", String(manuallyPaused));
    pauseButton?.setAttribute("aria-label", manuallyPaused ? "Play slideshow" : "Pause slideshow");
    updatePlayback();
  };

  const indicatorHandlers = indicators.map((indicator, index) => {
    const handler = () => {
      if (swiper.realIndex === index) restartProgress();
      else swiper.slideToLoop(index);
    };
    indicator.addEventListener("click", handler);
    return handler;
  });

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    updatePlayback();
  });
  visibility.observe(hero);

  pauseButton?.setAttribute("aria-pressed", String(manuallyPaused));
  pauseButton?.addEventListener("click", togglePlayback);
  hero.addEventListener("animationend", onProgressEnd);
  // Hover pauses only over the controls: the hero fills the screen, so pausing on any
  // hover would mean desktop autoplay almost never advanced.
  controls?.addEventListener("pointerenter", onEnter);
  controls?.addEventListener("pointerleave", onLeave);
  hero.addEventListener("focusin", onFocusIn);
  hero.addEventListener("focusout", onFocusOut);
  hero.addEventListener("pointerdown", beginDrag, { capture: true, passive: true });
  window.addEventListener("pointerup", finishDrag, { capture: true, passive: true });
  hero.addEventListener("pointercancel", cancelDrag, { capture: true, passive: true });
  document.addEventListener("visibilitychange", updatePlayback);
  const stopParallax = reduceMotion ? () => undefined : mountPointerParallax(hero, () => hero.querySelector(".swiper-slide-active .art"));
  const stopPausing = pauseWhenHidden([hero]);

  return () => {
    indicators.forEach((indicator, index) => {
      indicator.removeEventListener("click", indicatorHandlers[index]);
    });
    pauseButton?.removeEventListener("click", togglePlayback);
    hero.removeEventListener("animationend", onProgressEnd);
    controls?.removeEventListener("pointerenter", onEnter);
    controls?.removeEventListener("pointerleave", onLeave);
    hero.removeEventListener("focusin", onFocusIn);
    hero.removeEventListener("focusout", onFocusOut);
    hero.removeEventListener("pointerdown", beginDrag, true);
    window.removeEventListener("pointerup", finishDrag, true);
    hero.removeEventListener("pointercancel", cancelDrag, true);
    document.removeEventListener("visibilitychange", updatePlayback);
    visibility.disconnect();
    window.clearTimeout(warmHandle);
    stopParallax();
    stopPausing();
    slideTimeline?.kill();
    context.revert();
    swiper.destroy(true, true);
  };
}
