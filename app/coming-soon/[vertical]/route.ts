import { siteUrl } from "@/lib/site";
import { isVerticalKey, verticals } from "@/lib/verticals";

// Standalone "Coming soon" page for an Ikigai vertical's own domain. It is a route handler,
// not a page, so it renders without the Airavut header/footer: on the vertical's domain every
// path is rewritten here (see proxy.ts), so the site's relative nav links would not work.
// Links back to Airavut are therefore absolute.

export function generateStaticParams() {
  return Object.keys(verticals).map((vertical) => ({ vertical }));
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_request: Request, ctx: RouteContext<"/coming-soon/[vertical]">) {
  const { vertical } = await ctx.params;
  if (!isVerticalKey(vertical)) return new Response("Not found", { status: 404 });

  const { name, description, infoPath } = verticals[vertical];
  const home = new URL("/", siteUrl).toString();
  const learnMore = new URL(infoPath, siteUrl).toString();
  const contact = new URL("/talk-to-us", siteUrl).toString();
  // Assets stay relative: proxy.ts never rewrites /media or icons, so they load on either domain.
  const asset = (path: string) => path;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A1022">
<meta name="color-scheme" content="dark">
<meta name="robots" content="noindex, follow">
<title>${escape(name)} | Coming Soon</title>
<meta name="description" content="${escape(`${name}, part of Airavut Education Ventures, is launching soon.`)}">
<link rel="icon" href="${asset("/icon.png")}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Poppins:wght@400;500;600&display=swap">
<style>
:root{--navy:#0A1022;--gold:#D2B57D;--gold-l:#F2D98A;--violet:#9B6BFF;--text:#fff;--muted:#C9D1EA;--faint:#8E98BC;--gut:clamp(16px,5vw,64px)}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--navy);color:var(--text)}
body{font-family:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:clamp(16px,1vw,18px);line-height:1.65;-webkit-font-smoothing:antialiased}
.page{position:relative;overflow:hidden;min-height:100svh;display:flex;flex-direction:column}
.art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9;pointer-events:none}
header,main,footer{position:relative;z-index:1;width:min(1440px,100% - 2*var(--gut));margin-inline:auto}
header{padding-top:calc(24px + env(safe-area-inset-top,0px))}
header img{display:block;height:auto;width:min(180px,48vw)}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;text-align:center;padding-block:64px}
.eyebrow{margin:0;font-family:Poppins,sans-serif;font-size:14px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-l)}
h1{margin:0 0 -.18em;padding-bottom:.18em;font-family:Poppins,sans-serif;font-weight:600;font-size:clamp(52px,11vw,168px);line-height:1.05;letter-spacing:-.03em;background:linear-gradient(100deg,var(--gold-l) 0%,var(--gold) 55%,#fff3cf 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-wrap:balance}
.lede{margin:0;max-width:46ch;font-family:Poppins,sans-serif;font-size:clamp(18px,1.4vw,22px);color:var(--muted)}
.actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px 32px;margin-top:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 36px;background:var(--gold);color:var(--navy);border:1.5px solid var(--gold);border-radius:999px;text-decoration:none;font-family:Poppins,sans-serif;font-size:17px;font-weight:600;transition:background .2s,color .2s}
.btn:hover{background:transparent;color:var(--gold-l)}
.ulink{display:inline-flex;align-items:center;min-height:44px;color:var(--text);font-family:Poppins,sans-serif;font-size:17px;text-decoration:underline;text-underline-offset:8px;text-decoration-color:var(--violet)}
footer{padding-bottom:calc(24px + env(safe-area-inset-bottom,0px));color:var(--faint);font-size:14px;text-align:center}
footer a{color:var(--gold-l);text-decoration:none}
:focus-visible{outline:2px solid var(--gold-l);outline-offset:3px;border-radius:4px}
@media (max-width:420px){.btn{padding:0 28px}}
</style>
</head>
<body>
<div class="page">
<img class="art" alt="" src="${asset("/media/ambient-rings-center.svg")}">
<header><a href="${home}" aria-label="Airavut Education Ventures home"><img alt="Airavut Education Ventures" width="214" height="60" src="${asset("/media/airavut-logo.png")}"></a></header>
<main>
<p class="eyebrow">${escape(name)}</p>
<h1>Coming Soon</h1>
<p class="lede">${escape(description)}</p>
<div class="actions">
<a class="btn" href="${learnMore}">Learn more on Airavut</a>
<a class="ulink" href="${contact}">Talk to Us</a>
</div>
</main>
<footer>A vertical of <a href="${home}">Airavut Education Ventures</a> · <a href="mailto:learn@airavut.com">learn@airavut.com</a></footer>
</div>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
