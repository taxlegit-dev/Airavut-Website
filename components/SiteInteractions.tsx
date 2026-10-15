"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function SiteInteractions() {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.getElementById("head");
    const menuButton = document.getElementById("menuBtn");
    const nav = document.getElementById("mainnav");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
    const closeMenu = () => {
      nav?.classList.remove("is-open");
      menuButton?.setAttribute("aria-expanded", "false");
      menuButton?.setAttribute("aria-label", "Open menu");
    };
    const toggleMenu = () => {
      const open = !nav?.classList.contains("is-open");
      nav?.classList.toggle("is-open", open);
      menuButton?.setAttribute("aria-expanded", String(open));
      menuButton?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeMenu();
    const onNavClick = (event: Event) => {
      if ((event.target as HTMLElement).closest("a")) closeMenu();
    };

    const current = pathname === "/" ? "home" : pathname.split("/")[1];
    document.querySelectorAll<HTMLElement>("[data-nav]").forEach((link) => {
      if (link.dataset.nav === current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    menuButton?.addEventListener("click", toggleMenu);
    nav?.addEventListener("click", onNavClick);
    document.addEventListener("keydown", onKey);
    onScroll();

    const revealTargets = [...document.querySelectorAll<HTMLElement>(".sec .wrap, .ihero .hero-inner")];
    let observer: IntersectionObserver | undefined;
    if (!reduce && "IntersectionObserver" in window) {
      revealTargets.forEach((target) => target.classList.add("reveal-ready"));
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealTargets.forEach((target) => observer?.observe(target));
    }

    const slides = [...document.querySelectorAll<HTMLElement>(".slide")];
    const indicators = [...document.querySelectorAll<HTMLButtonElement>(".ind")];
    const hero = document.querySelector<HTMLElement>(".hero");
    const pause = document.getElementById("pauseBtn");
    let currentSlide = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let userPaused = reduce;
    let hoverPaused = false;

    const showSlide = (index: number) => {
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach((slide, position) => {
        const active = position === currentSlide;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
        slide.querySelectorAll<HTMLElement>("a").forEach((link) => {
          if (active) link.removeAttribute("tabindex");
          else link.setAttribute("tabindex", "-1");
        });
      });
      indicators.forEach((indicator, position) => {
        indicator.classList.toggle("is-active", position === currentSlide);
        indicator.toggleAttribute("aria-current", position === currentSlide);
      });
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      if (!slides.length || userPaused || hoverPaused || document.hidden) return;
      timer = setInterval(() => showSlide(currentSlide + 1), 7000);
    };
    const indicatorHandlers = indicators.map((indicator, index) => {
      const handler = () => {
        showSlide(index);
        start();
      };
      indicator.addEventListener("click", handler);
      return handler;
    });
    const togglePause = () => {
      userPaused = !userPaused;
      pause?.setAttribute("aria-pressed", String(userPaused));
      pause?.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
      if (userPaused) stop();
      else start();
    };
    const enter = () => {
      hoverPaused = true;
      stop();
    };
    const leave = () => {
      hoverPaused = false;
      start();
    };
    const heroKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") showSlide(currentSlide + 1);
      if (event.key === "ArrowLeft") showSlide(currentSlide - 1);
    };
    const visibility = () => (document.hidden ? stop() : start());

    if (slides.length) {
      showSlide(0);
      pause?.setAttribute("aria-pressed", String(reduce));
      pause?.addEventListener("click", togglePause);
      hero?.addEventListener("mouseenter", enter);
      hero?.addEventListener("mouseleave", leave);
      hero?.addEventListener("focusin", enter);
      hero?.addEventListener("focusout", leave);
      hero?.addEventListener("keydown", heroKey);
      document.addEventListener("visibilitychange", visibility);
      start();
    }

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      menuButton?.removeEventListener("click", toggleMenu);
      nav?.removeEventListener("click", onNavClick);
      document.removeEventListener("keydown", onKey);
      indicators.forEach((indicator, index) => indicator.removeEventListener("click", indicatorHandlers[index]));
      pause?.removeEventListener("click", togglePause);
      hero?.removeEventListener("mouseenter", enter);
      hero?.removeEventListener("mouseleave", leave);
      hero?.removeEventListener("focusin", enter);
      hero?.removeEventListener("focusout", leave);
      hero?.removeEventListener("keydown", heroKey);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pathname]);

  return null;
}
