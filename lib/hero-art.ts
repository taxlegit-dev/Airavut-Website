import "server-only";

import layers from "@/lib/hero-layers.json";

type Placement = { src: string; x: number; y: number; size: number };
type HeroLayers = { base: string; dust: string; rings: Placement[]; dial: Placement | null; core: { x: number; y: number; r: number } };

const manifest = layers as Record<string, HeroLayers>;
const heroImage = /<img\b[^>]*\bclass="(hero-art|slide-art)"[^>]*>/g;

const place = ({ x, y, size }: Placement) => `--x:${x}%;--y:${y}%;--s:${size}%`;

/**
 * Replaces a hero's flat SVG with its motion layers (see scripts/build-hero-layers.mjs).
 * Each depth plane is its own wrapper so pointer/scroll parallax and the CSS ambient
 * loops animate different elements and never fight over the same transform.
 */
function layeredArt(tag: string, kind: string, priority: boolean) {
  const src = tag.match(/\bsrc="([^"]+)"/)?.[1] ?? "";
  const art = manifest[src];
  if (!art) return tag;

  const name = src.split("/").pop()!.replace(/\.svg$/, "");
  const loading = priority ? `loading="eager" fetchpriority="high"` : `loading="lazy"`;
  const image = (file: string, className: string, style = "") =>
    `<img alt="" class="${className}" decoding="async" ${loading} src="${file}"${style ? ` style="${style}"` : ""}/>`;
  const rings = art.rings
    .map((ring, index) => image(ring.src, "art-ring", `${place(ring)};--i:${index}`))
    .join("");
  const dial = art.dial ? image(art.dial.src, "art-dial", place(art.dial)) : "";
  const core = `<span class="art-core" style="--x:${art.core.x}%;--y:${art.core.y}%;--s:${(art.core.r * 5).toFixed(2)}%"></span>`;
  const ripples = `<span class="art-ripples" style="--x:${art.core.x}%;--y:${art.core.y}%;--s:${(art.core.r * 14).toFixed(2)}%"><i></i><i></i><i></i></span>`;

  return (
    `<div class="art ${kind === "slide-art" ? "art-slide" : "art-page"}" data-art="${name}" aria-hidden="true" style="--fx:${art.core.x}%;--fy:${art.core.y}%"><div class="art-stage" style="--cx:${art.core.x}%;--cy:${art.core.y}%">` +
    `<div class="art-plane" data-depth="0.35">${image(art.base, "art-base", "")}</div>` +
    `<div class="art-plane" data-depth="1">${image(art.dust, "art-dust", "")}</div>` +
    `<div class="art-plane art-orbit" data-depth="0.6">${core}${ripples}${dial}${rings}</div>` +
    `</div>${kind === "slide-art" ? `<div class="slide-shutters"><i></i><i></i></div>` : ""}</div>`
  );
}

export function withLayeredHeroArt(html: string) {
  let first = true;
  return html.replace(heroImage, (tag, kind: string) => {
    const result = layeredArt(tag, kind, first);
    first = false;
    return result;
  });
}
