import { pages } from "@/lib/site";

export function GET() {
  const lines = ["# Airavut Education Ventures", "", "Airavut is an integrated performing arts education and skill development company.", "", "## Public pages", ...Object.values(pages).map((page) => `- [${page.title}](${page.path}): ${page.description}`)];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
