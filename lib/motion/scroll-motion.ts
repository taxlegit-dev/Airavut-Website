import gsap from "gsap";
import { pauseWhenHidden } from "@/lib/motion/hero-intros";
import { splitLines } from "@/lib/motion/text";

type Cleanup = () => void;

/**
 * Reveal flavours. Each maps to a CSS start state in app/motion.css; the reveal itself is
 * a CSS transition to the resting state, so it runs on the compositor and costs the main
 * thread nothing per frame — even when several sections enter while the user scrolls.
 */
type Reveal = "rise" | "lines" | "slide" | "pop" | "iris" | "draw";

/** "5,000+" → { value: 5000, prefix: "", suffix: "+", grouped: true } */
function parseStat(text: string) {
  const match = text.trim().match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], value: Number(match[2].replace(/,/g, "")), suffix: match[3], grouped: match[2].includes(",") };
}

function countUp(element: HTMLElement) {
  const stat = parseStat(element.textContent ?? "");
  if (!stat || stat.value < 2) return;
  const final = element.textContent;
  const state = { value: 0 };
  const format = (value: number) =>
    `${stat.prefix}${stat.grouped ? Math.round(value).toLocaleString("en-IN") : Math.round(value)}${stat.suffix}`;
  return gsap.to(state, {
    value: stat.value,
    duration: Math.min(2.4, 1.2 + Math.log10(stat.value) * 0.25),
    ease: "power3.out",
    onUpdate: () => {
      element.textContent = format(state.value);
    },
    onComplete: () => {
      element.textContent = final;
    }
  });
}

export function mountScrollMotion(scope: HTMLElement, reduceMotion: boolean): Cleanup {
  const sections = [...scope.querySelectorAll<HTMLElement>(".sec")];
  const stopPausing = pauseWhenHidden(sections);
  if (reduceMotion) return stopPausing;

  const marked = new Map<Element, Reveal>();
  const splits: Array<{ revert: () => void }> = [];
  const counters: gsap.core.Tween[] = [];
  const mark = (elements: Iterable<Element>, reveal: Reveal) => {
    for (const element of elements) if (!marked.has(element)) marked.set(element, reveal);
  };

  // Headings: masked lines rise into place.
  scope.querySelectorAll<HTMLElement>(".sec .h2, .sec .bigwords, .sec .closing").forEach((heading) => {
    splits.push(
      splitLines(heading, (lines) => {
        lines.forEach((line, index) => line.style.setProperty("--li", String(index)));
      })
    );
    mark([heading], "lines");
  });
  // Eyebrows and ledger rows slide in from the left; quotes from the right.
  mark(scope.querySelectorAll(".sec .eyebrow, .sec .tier > .tag, .sec .vrow"), "slide");
  // Journey nodes and chips pop like keys being pressed; their lines draw.
  mark(scope.querySelectorAll(".journey, .lppc"), "draw");
  mark(scope.querySelectorAll(".jnode, .lnode, .chips > *, .flow > *"), "pop");
  // The founder portrait opens like an iris.
  mark(scope.querySelectorAll(".founder .photo"), "iris");
  // Everything else rises.
  mark(
    scope.querySelectorAll(
      ".sec :is(.grid2, .grid3, .grid4, .pcards, .trio, .addr, .reach, .pair, .stats, .stats3, .statements, .rolecols) > *, .sec :is(.head, .col, .ftext, .center, .tier, .split > div, .card.roles) > *, .sec .note, .sec .statement, .sec .motto, .sec .quote, .sec .fquote, .sec .side-statement, .journey li > span:last-child, .lppc li > span:last-child"
    ),
    "rise"
  );
  // An ancestor that is itself revealing would double the motion; let it carry its children.
  // ("draw" only animates the journey's connector line, so it doesn't count.)
  const insideReveal = (element: Element) => {
    for (let parent = element.parentElement; parent && parent !== scope; parent = parent.parentElement) {
      const reveal = marked.get(parent);
      if (reveal && reveal !== "draw") return true;
    }
    return false;
  };
  [...marked.keys()].filter(insideReveal).forEach((element) => marked.delete(element));
  marked.forEach((reveal, element) => element.classList.add("rv", `rv-${reveal}`));

  // One observer for the whole page. Elements that enter together are staggered.
  const observer = new IntersectionObserver(
    (entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
      entering
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .forEach((element, index) => {
          element.style.setProperty("--d", `${Math.min(index, 8) * 70}ms`);
          element.classList.add("in");
          observer.unobserve(element);
          // Reveal classes are temporary: once settled, the element gets its own
          // transitions back (so hover tilt and lifts respond immediately).
          const reveal = marked.get(element);
          if (reveal !== "lines" && reveal !== "draw") {
            window.setTimeout(() => {
              element.classList.remove("rv", `rv-${reveal}`, "in");
              element.style.removeProperty("--d");
              marked.delete(element);
            }, 2400 + Math.min(index, 8) * 70);
          }
          element.querySelectorAll<HTMLElement>(".num").forEach((number) => {
            const tween = countUp(number);
            if (tween) counters.push(tween);
          });
        });
    },
    { rootMargin: "0px 0px -10% 0px" }
  );
  marked.forEach((_, element) => observer.observe(element));

  return () => {
    observer.disconnect();
    stopPausing();
    counters.forEach((tween) => tween.progress(1).kill());
    splits.forEach((split) => split.revert());
    marked.forEach((reveal, element) => {
      element.classList.remove("rv", `rv-${reveal}`, "in");
      (element as HTMLElement).style.removeProperty("--d");
    });
  };
}
