import { getSiteFragment } from "@/lib/site-content";

export async function SiteHeader() {
  const html = await getSiteFragment("header");
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export async function SiteFooter() {
  const html = await getSiteFragment("footer");
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
