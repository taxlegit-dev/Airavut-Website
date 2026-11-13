// Ikigai verticals that get their own domain. Each one has an info page on this site
// (/exams, /publishing) whose "Visit" button points at the vertical's domain.
//
// Connecting a domain:
//   1. Point the domain's DNS at this deployment (add it to the same hosting project).
//   2. Set the env var below to the full URL, e.g. IKIGAI_EXAMS_URL=https://ikigaiexams.com
//   3. Redeploy.
// Requests arriving on that domain are then served the vertical's "Coming soon" page
// (see proxy.ts). While the env var is unset, the button opens the same page on this site
// at /coming-soon/<key>.

export const verticals = {
  exams: {
    name: "Ikigai Exams & Certifications",
    shortName: "Ikigai Exams",
    env: "IKIGAI_EXAMS_URL",
    infoPath: "/exams",
    description:
      "Structured frameworks for skill assessment, grading, certification and employment readiness across performing arts disciplines. Our new home is on its way."
  },
  publishing: {
    name: "Ikigai Publishing",
    shortName: "Ikigai Publishing",
    env: "IKIGAI_PUBLISHING_URL",
    infoPath: "/publishing",
    description:
      "Course books, exam books and learning resources built on the Airavut methodology, for students, educators and institutions. Our new home is on its way."
  }
} as const;

export type VerticalKey = keyof typeof verticals;

export const isVerticalKey = (value: string): value is VerticalKey => Object.hasOwn(verticals, value);

export const comingSoonPath = (key: VerticalKey) => `/coming-soon/${key}`;

/** The vertical's configured domain, or null when it has not been connected yet. */
export function verticalSiteUrl(key: VerticalKey): URL | null {
  const value = process.env[verticals[key].env]?.trim();
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" || url.protocol === "http:" ? url : null;
}

/**
 * Content HTML links to a vertical's domain with href="vertical-site:<key>". Points it at the
 * connected domain (opened in a new tab) or, until one is set, the built-in coming-soon page.
 */
export function withVerticalSiteLinks(html: string) {
  return html.replace(/href="vertical-site:([a-z-]+)"/g, (match, key: string) => {
    if (!isVerticalKey(key)) return match;
    const url = verticalSiteUrl(key);
    return url ? `href="${url.toString()}" rel="noopener" target="_blank"` : `href="${comingSoonPath(key)}"`;
  });
}

const bareHost =(host: string) => host.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");

/** Which vertical (if any) owns the given Host header. */
export function verticalForHost(host: string | null): VerticalKey | null {
  if (!host) return null;
  const requested = bareHost(host);
  for (const key of Object.keys(verticals) as VerticalKey[]) {
    const url = verticalSiteUrl(key);
    if (url && bareHost(url.host) === requested) return key;
  }
  return null;
}
