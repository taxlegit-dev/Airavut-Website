// Splits each hero SVG into motion layers without altering the artwork:
//   base  - everything except rotating text rings and loose particles
//   ring  - one tightly cropped SVG per closed "Sa Re Ga Ma" text ring (cheap to rotate)
//   dust  - the loose glowing particles (drifts on its own depth plane)
// Writes the layers to public/media/layers/ and a manifest to lib/hero-layers.json.
// Run: node scripts/build-hero-layers.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const mediaDir = path.join(root, "public", "media");
const outDir = path.join(mediaDir, "layers");
const heroes = [
  "home-hero-education",
  "home-hero-ecosystem",
  "home-hero-global",
  "ecosystem-hero",
  "accreditations-hero",
  "leadership-hero",
  "careers-hero",
  "contact-hero"
];
const W = 1920;
const H = 1080;
const MAX_RING_RADIUS = 600; // larger rings are horizon arcs: they stay in the base layer

/** Splits markup into top-level elements, respecting nesting. */
function topLevel(markup) {
  const parts = [];
  const tag = /<\/?([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g;
  let depth = 0;
  let start = 0;
  let match;
  while ((match = tag.exec(markup))) {
    const [text, , selfClosing] = match;
    if (depth === 0) start = match.index;
    if (text.startsWith("</")) depth -= 1;
    else if (!selfClosing) depth += 1;
    if (depth === 0) parts.push(markup.slice(start, tag.lastIndex));
  }
  return parts;
}

const attr = (element, name) => element.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const round = (value) => Math.round(value * 1000) / 1000;

const manifest = {};
await mkdir(outDir, { recursive: true });

for (const name of heroes) {
  const source = (await readFile(path.join(mediaDir, `${name}.svg`), "utf8")).replace(/<metadata>[\s\S]*?<\/metadata>/, "");
  const open = source.match(/^<svg[^>]*>/)[0].replace(/\s+xmlns:c2pa="[^"]*"/, "");
  const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? "";
  const body = source.slice(source.indexOf(defs) + defs.length, source.lastIndexOf("</svg>"));
  const ringPaths = Object.fromEntries(
    [...defs.matchAll(/<path id="([^"]+)" d="M([\d.-]+) ([\d.-]+) A([\d.]+) [\d.]+ 0 1 1 ([\d.-]+) ([\d.-]+)/g)].map((m) => {
      const [, id, x1, y1, r, x2, y2] = m;
      return [id, { cx: (Number(x1) + Number(x2)) / 2, cy: (Number(y1) + Number(y2)) / 2, r: Number(r) }];
    })
  );

  const base = [];
  const dust = [];
  const rings = [];
  const ticks = [];
  const halo = body.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+" fill="url\(#halo\)"/);
  const centre = halo ? { x: Number(halo[1]), y: Number(halo[2]) } : { x: W / 2, y: H / 2 };
  let core;

  for (const element of topLevel(body)) {
    const ringRef = element.startsWith("<text") ? element.match(/href="#([^"]+)"/)?.[1] : undefined;
    const ring = ringRef ? ringPaths[ringRef] : undefined;
    if (ring && ring.r <= MAX_RING_RADIUS) {
      const pad = 28;
      const size = 2 * (ring.r + pad);
      const pathDef = defs.match(new RegExp(`<path id="${ringRef}"[^>]*/>`))[0];
      const file = `${name}.ring${rings.length}.svg`;
      await writeFile(
        path.join(outDir, file),
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="${ring.cx - size / 2} ${ring.cy - size / 2} ${size} ${size}"><defs>${pathDef}</defs>${element}</svg>`
      );
      rings.push({
        src: `/media/layers/${file}`,
        x: round((ring.cx / W) * 100),
        y: round((ring.cy / H) * 100),
        size: round((size / W) * 100)
      });
      continue;
    }
    if (element.startsWith("<line")) {
      // Radial tick marks around the centre form a dial that can turn on its own.
      const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((key) => Number(attr(element, key)));
      const d1 = Math.hypot(x1 - centre.x, y1 - centre.y);
      const d2 = Math.hypot(x2 - centre.x, y2 - centre.y);
      if (d1 > 120 && d2 > 120 && d1 < 260 && d2 < 260 && Math.abs(d1 - d2) > 2) {
        ticks.push(element);
        continue;
      }
    }
    if (element.startsWith("<circle")) {
      const r = Number(attr(element, "r"));
      const fill = attr(element, "fill") ?? "";
      if (fill === "url(#core)") {
        core = { x: round((Number(attr(element, "cx")) / W) * 100), y: round((Number(attr(element, "cy")) / H) * 100), r: round((r / W) * 100) };
      }
      if (r <= 10 && fill.startsWith("#")) {
        dust.push(element);
        continue;
      }
    }
    base.push(element);
  }

  let dial = null;
  if (ticks.length >= 24) {
    const size = 560;
    const file = `${name}.dial.svg`;
    await writeFile(
      path.join(outDir, file),
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${centre.x - size / 2} ${centre.y - size / 2} ${size} ${size}">${ticks.join("")}</svg>`
    );
    dial = { src: `/media/layers/${file}`, x: round((centre.x / W) * 100), y: round((centre.y / H) * 100), size: round((size / W) * 100) };
  } else base.push(...ticks);
  core ??= { x: round((centre.x / W) * 100), y: round((centre.y / H) * 100), r: round((60 / W) * 100) };

  await writeFile(path.join(outDir, `${name}.base.svg`), `${open}${defs}${base.join("")}</svg>`);
  await writeFile(path.join(outDir, `${name}.dust.svg`), `${open}${defs}${dust.join("")}</svg>`);
  manifest[`/media/${name}.svg`] = {
    base: `/media/layers/${name}.base.svg`,
    dust: `/media/layers/${name}.dust.svg`,
    rings,
    dial,
    core
  };
  console.log(`${name}: ${rings.length} rings, ${dust.length} particles, ${dial ? ticks.length : 0} dial ticks`);
}

await writeFile(path.join(root, "lib", "hero-layers.json"), `${JSON.stringify(manifest, null, 2)}\n`);
