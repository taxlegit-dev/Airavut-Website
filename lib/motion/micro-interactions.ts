import gsap from "gsap";

type Cleanup = () => void;

/**
 * Pointer-driven polish for desktop: card tilt with a cursor spotlight, and magnetic
 * primary buttons. Geometry is measured once per hover (not per move) and updates are
 * coalesced to one per frame.
 */
export function mountMicroInteractions(reduceMotion: boolean): Cleanup {
  const cleanups: Cleanup[] = [];
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (finePointer && !reduceMotion) {
    document.querySelectorAll<HTMLElement>("main .card:not(.roles):not(.enq)").forEach((card) => {
      const tilt = !card.closest(".grid2, .addr, .pair");
      const rotateX = gsap.quickTo(card, "rotateX", { duration: 0.6, ease: "power3.out" });
      const rotateY = gsap.quickTo(card, "rotateY", { duration: 0.6, ease: "power3.out" });
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
        gsap.set(card, { transformPerspective: 900 });
      };
      const move = (event: PointerEvent) => {
        if (!bounds) enter();
        px = (event.clientX - bounds!.left) / bounds!.width;
        py = (event.clientY - bounds!.top) / bounds!.height;
        if (!frame) frame = requestAnimationFrame(apply);
      };
      const leave = () => {
        bounds = undefined;
        rotateX(0);
        rotateY(0);
      };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointermove", move, { passive: true });
      card.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
        gsap.set(card, { clearProps: "transform" });
      });
    });

    document.querySelectorAll<HTMLElement>("main .btn:not(.btn-ghost)").forEach((button) => {
      const x = gsap.quickTo(button, "x", { duration: 0.5, ease: "power3.out" });
      const y = gsap.quickTo(button, "y", { duration: 0.5, ease: "power3.out" });
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
        button.removeEventListener("pointermove", move);
        button.removeEventListener("pointerleave", leave);
        gsap.set(button, { clearProps: "transform" });
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
