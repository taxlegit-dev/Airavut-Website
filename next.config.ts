import type { NextConfig } from "next";

// Ikigai vertical landing pages. While a vertical's URL is unset, its route shows the built-in
// "Coming soon" page; set the env var to the vertical's live domain to redirect there instead.
// Read at build time, so changing a URL needs a rebuild/redeploy.
const verticalSites = [
  { source: "/ikigai-exams", env: "IKIGAI_EXAMS_URL" },
  { source: "/ikigai-publishing", env: "IKIGAI_PUBLISHING_URL" }
];

function verticalRedirects() {
  return verticalSites.flatMap(({ source, env }) => {
    const value = process.env[env]?.trim();
    if (!value) return [];
    const url = URL.canParse(value) ? new URL(value) : null;
    if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) throw new Error(`${env} must be a full http(s) URL, e.g. https://example.com`);
    return [{ source, destination: url.toString(), permanent: false }];
  });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async redirects() {
    return verticalRedirects();
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" }
        ]
      }
    ];
  }
};

export default nextConfig;
