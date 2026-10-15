import type { MetadataRoute } from "next";
import { pages, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(pages).map((page) => ({ url: new URL(page.path, siteUrl).toString(), changeFrequency: "monthly", priority: page.slug === "home" ? 1 : 0.8 }));
}
