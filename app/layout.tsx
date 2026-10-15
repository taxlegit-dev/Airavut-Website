import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./site-theme.css";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SiteInteractions } from "@/components/SiteInteractions";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Airavut Education Ventures", template: "%s" },
  description: "An integrated performing arts education and skill development platform.",
  openGraph: {
    type: "website",
    siteName: "Airavut Education Ventures",
    locale: "en_IN"
  },
  twitter: { card: "summary_large_image" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A1022",
  colorScheme: "dark"
};

const organization = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Airavut Education Ventures Private Limited",
  url: siteUrl,
  email: "learn@airavut.com",
  founder: { "@type": "Person", name: "Shweta Singh" },
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "H-2, Community Center Rd, Sector 116",
      addressLocality: "Noida",
      addressRegion: "Uttar Pradesh",
      postalCode: "201316",
      addressCountry: "IN"
    },
    {
      "@type": "PostalAddress",
      streetAddress: "First Floor, Plot No. 5, Block 1, West Patel Nagar",
      addressLocality: "New Delhi",
      postalCode: "110008",
      addressCountry: "IN"
    }
  ],
  subOrganization: ["Ikigai Schools", "Ikigai Exams & Certifications", "Ikigai Publishing"].map((name) => ({
    "@type": "Organization",
    name
  }))
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <SiteInteractions />
        <Script
          id="airavut-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
