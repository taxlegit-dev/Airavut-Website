import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

type LineAnimation = (lines: HTMLElement[]) => gsap.core.Animation | void;

/**
 * Splits a heading into masked lines. SplitText re-splits after web fonts load or the
 * viewport changes width (autoSplit), and `animate` is re-run against the new lines so
 * an in-flight animation keeps its progress. Screen readers get the original text
 * through SplitText's aria handling.
 */
export function splitLines(element: Element, animate: LineAnimation) {
  return SplitText.create(element, {
    type: "lines",
    mask: "lines",
    linesClass: "line",
    autoSplit: true,
    onSplit: (self) => animate(self.lines as HTMLElement[]) ?? undefined
  });
}
