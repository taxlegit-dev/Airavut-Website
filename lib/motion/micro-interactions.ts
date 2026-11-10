import gsap from "gsap";

type Cleanup = () => void;

/**
 * Pointer-driven polish for desktop: card tilt with a cursor spotlight, and magnetic
 * primary buttons. Geometry is measured once per hover (not per move) and updates are
 * coalesced to one per frame.
 *
 * GSAP never touches `transform` on these elements. It tweens plain numbers and writes them
 * to CSS custom properties that app/motion.css composes (.tilt / .magnetic). Letting GSAP own
 * `transform` made it snapshot whatever offset the card had on first hover — a scroll reveal
 * still sliding in, or the hover lift — and pin it inline, leaving cards out of line until a
 * reload.
 */
export function mountMicroInteractions(reduceMotion: boolean): Cleanup {
  const cleanups: Cleanup[] = [];
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (finePointer && !reduceMotion) {
    document.querySelectorAll<HTMLElement>("main .card:not(.roles):not(.enq)").forEach((card) => {
      const tilt = !card.closest(".grid2, .addr, .pair");
      const angle = { x: 0, y: 0 };
      const paint = () => {
        card.style.setProperty("--rx", `${angle.x.toFixed(2)}deg`);
        card.style.setProperty("--ry", `${angle.y.toFixed(2)}deg`);
      };
      const rotateX = gsap.quickTo(angle, "x", { duration: 0.6, ease: "power3.out", onUpdate: paint });
      const rotateY = gsap.quickTo(angle, "y", { duration: 0.6, ease: "power3.out", onUpdate: paint });
      if (tilt) card.classList.add("tilt");
      let bounds: DOMRect | undefined;
      let frame = 0;
      let px = 0.5;
      let py = 0.5;

      const apply = () => {
        frame = 0;
        card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        if (tilt) {
          rotateX((py - 0.5) * -5);
          rotateY((px - 0.5) * 5);
        }
      };
      const enter = () => {
        bounds = card.getBoundingClientRect();
      };
      const move = (event: PointerEvent) => {
        if (!bounds) enter();
        px = (event.clientX - bounds!.left) / bounds!.width;
        py = (event.clientY - bounds!.top) / bounds!.height;
        if (!frame) frame = requestAnimationFrame(apply);
      };
      const leave = () => {
        bounds = undefined;
        if (tilt) {
          rotateX(0);
          rotateY(0);
        }
      };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointermove", move, { passive: true });
      card.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        gsap.killTweensOf(angle);
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
        card.classList.remove("tilt");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });

    document.querySelectorAll<HTMLElement>("main .btn:not(.btn-ghost)").forEach((button) => {
      const offset = { x: 0, y: 0 };
      const paint = () => {
        button.style.setProperty("--bx", `${offset.x.toFixed(2)}px`);
        button.style.setProperty("--by", `${offset.y.toFixed(2)}px`);
      };
      const x = gsap.quickTo(offset, "x", { duration: 0.5, ease: "power3.out", onUpdate: paint });
      const y = gsap.quickTo(offset, "y", { duration: 0.5, ease: "power3.out", onUpdate: paint });
      button.classList.add("magnetic");
      let bounds: DOMRect | undefined;
      const move = (event: PointerEvent) => {
        bounds ??= button.getBoundingClientRect();
        x((event.clientX - bounds.left - bounds.width / 2) * 0.22);
        y((event.clientY - bounds.top - bounds.height / 2) * 0.32);
      };
      const leave = () => {
        bounds = undefined;
        x(0);
        y(0);
      };
      button.addEventListener("pointermove", move, { passive: true });
      button.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        gsap.killTweensOf(offset);
        button.removeEventListener("pointermove", move);
        button.removeEventListener("pointerleave", leave);
        button.classList.remove("magnetic");
        button.style.removeProperty("--bx");
        button.style.removeProperty("--by");
      });
    });
  }

  // Ticker: the partner audience list scrolls as a seamless marquee.
  if (!reduceMotion) {
    document.querySelectorAll<HTMLElement>("main .partner .dots").forEach((list) => {
      const viewport = document.createElement("div");
      viewport.className = "marquee-viewport";
      list.before(viewport);
      viewport.append(list);
      [...list.children].forEach((item) => {
        const clone = item.cloneNode(true) as HTMLElement;
        clone.dataset.marqueeClone = "true";
        clone.setAttribute("aria-hidden", "true");
        list.append(clone);
      });
      list.classList.add("motion-marquee");
      cleanups.push(() => {
        list.classList.remove("motion-marquee");
        list.querySelectorAll("[data-marquee-clone]").forEach((clone) => clone.remove());
        viewport.before(list);
        viewport.remove();
      });
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
