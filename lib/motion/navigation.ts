type Cleanup = () => void;
type Router = {
  push: (href: string, options?: { scroll?: boolean; transitionTypes?: string[] }) => void;
  prefetch: (href: string) => void;
};

const idle = (callback: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = setTimeout(callback, 600);
  return () => clearTimeout(handle);
};

/**
 * The header, footer and page bodies are server-rendered HTML fragments, so their
 * plain <a> tags would trigger full document reloads. This routes same-origin page
 * links through the App Router instead (keeping the header, fonts, GSAP and Swiper
 * alive), prefetches every public route, and tags navigations so <ViewTransition>
 * can animate them.
 */
export function mountNavigation(router: Router, publicPaths: readonly string[], reduceMotion: boolean): Cleanup {
  const routes = new Set(publicPaths);
  const header = document.getElementById("head");
  const menuButton = document.getElementById("menuBtn");
  const nav = document.getElementById("mainnav");

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
    if (open) header?.classList.remove("is-tucked");
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeMenu();
  };

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !routes.has(url.pathname)) return;
    closeMenu();

    if (url.pathname === location.pathname) {
      if (url.hash) return; // in-page anchor: native smooth scroll
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    event.preventDefault();
    document.documentElement.classList.add("is-navigating");
    router.push(url.pathname + url.search + url.hash, { transitionTypes: reduceMotion ? [] : ["page"] });
  };

  // Header: solid once scrolled, tucks away while reading down, returns on the way up.
  let lastY = window.scrollY;
  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const y = window.scrollY;
      header?.classList.toggle("is-scrolled", y > 24);
      const menuOpen = nav?.classList.contains("is-open");
      if (!menuOpen && Math.abs(y - lastY) > 6) header?.classList.toggle("is-tucked", y > lastY && y > 320);
      lastY = y;
    });
  };
  const onFocusIn = () => header?.classList.remove("is-tucked");

  // Nav indicator follows hover and settles on the current page.
  const list = nav?.querySelector("ul");
  const indicator = document.createElement("span");
  indicator.className = "nav-indicator";
  indicator.setAttribute("aria-hidden", "true");
  list?.append(indicator);
  nav?.classList.add("has-indicator");
  const moveIndicator = (link: HTMLElement | null) => {
    if (!link || !list) {
      indicator.style.opacity = "0";
      return;
    }
    const left = link.offsetLeft;
    indicator.style.opacity = "1";
    indicator.style.transform = `translateX(${left}px) scaleX(${link.offsetWidth / 100})`;
  };
  const current = () => list?.querySelector<HTMLElement>("a[aria-current]") ?? null;
  const onHover = (event: Event) => {
    const link = (event.target as Element).closest<HTMLElement>("a");
    if (link) moveIndicator(link);
  };
  const onHoverEnd = () => moveIndicator(current());
  const onResize = () => moveIndicator(current());

  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  menuButton?.addEventListener("click", toggleMenu);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  header?.addEventListener("focusin", onFocusIn);
  list?.addEventListener("pointerover", onHover);
  list?.addEventListener("pointerleave", onHoverEnd);
  onScroll();
  void document.fonts?.ready.then(onResize);

  const cancelIdle = idle(() => publicPaths.forEach((path) => router.prefetch(path)));

  return () => {
    cancelAnimationFrame(frame);
    cancelIdle();
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
    menuButton?.removeEventListener("click", toggleMenu);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    header?.removeEventListener("focusin", onFocusIn);
    list?.removeEventListener("pointerover", onHover);
    list?.removeEventListener("pointerleave", onHoverEnd);
    indicator.remove();
    nav?.classList.remove("has-indicator");
  };
}

/** Marks the current page in the header and slides the indicator to it. */
export function syncCurrentNav(pathname: string) {
  const currentKey = pathname === "/" ? "home" : pathname.split("/")[1];
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((link) => {
    if (link.dataset.nav === currentKey) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.documentElement.classList.remove("is-navigating");
  const link = document.querySelector<HTMLElement>(".mainnav ul a[aria-current]");
  const indicator = document.querySelector<HTMLElement>(".nav-indicator");
  if (indicator) {
    if (link) {
      indicator.style.opacity = "1";
      indicator.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth / 100})`;
    } else indicator.style.opacity = "0";
  }
}
