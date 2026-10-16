"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import { mountHeroCarousel } from "@/lib/motion/hero-carousel";
import { mountInnerHero } from "@/lib/motion/hero-intros";
import { mountMicroInteractions } from "@/lib/motion/micro-interactions";
import { mountNavigation, syncCurrentNav } from "@/lib/motion/navigation";
import { mountScrollMotion } from "@/lib/motion/scroll-motion";
import { pages } from "@/lib/site";

const publicPaths = Object.values(pages).map((page) => page.path);
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SiteInteractions() {
  const pathname = usePathname();
  const router = useRouter();

  // Header, menu and client-side routing live for the whole session.
  useEffect(() => mountNavigation(router, publicPaths, prefersReducedMotion()), [router]);

  // Page choreography mounts before paint, so intro start states never flash —
  // on first load and on every client-side navigation.
  useLayoutEffect(() => {
    const reduceMotion = prefersReducedMotion();
    const page = document.querySelector<HTMLElement>("main .page[data-page]");
    syncCurrentNav(pathname);
    if (!page) {
      document.documentElement.classList.add("motion-live");
      return;
    }

    const cleanups: Array<() => void> = [];
    const carousel = page.querySelector<HTMLElement>(".hero.swiper");
    if (carousel) cleanups.push(mountHeroCarousel(carousel, reduceMotion));
    else cleanups.push(mountInnerHero(page.dataset.page ?? "", reduceMotion));
    cleanups.push(mountScrollMotion(page, reduceMotion));
    cleanups.push(mountMicroInteractions(reduceMotion));
    document.documentElement.classList.add("motion-live");

    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, [pathname]);

  return null;
}
