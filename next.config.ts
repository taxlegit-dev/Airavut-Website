import type { NextConfig } from "next";

// Ikigai vertical domains (see lib/verticals.ts). Fail the build early on a malformed value
// instead of silently falling back to the built-in coming-soon page.
for (const env of ["IKIGAI_EXAMS_URL", "IKIGAI_PUBLISHING_URL"]) {
  const value = process.env[env]?.trim();
  if (!value) continue;
  const url = URL.canParse(value) ? new URL(value) : null;
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) throw new Error(`${env} must be a full http(s) URL, e.g. https://example.com`);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async redirects() {
    // The vertical pages moved from /ikigai-* to /exams and /publishing.
    return [
      { source: "/ikigai-exams", destination: "/exams", permanent: true },
      { source: "/ikigai-publishing", destination: "/publishing", permanent: true }
    ];
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
