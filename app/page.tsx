import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { pages } from "@/lib/site";

export const metadata: Metadata = {
  title: pages.home.title,
  description: pages.home.description,
  alternates: { canonical: pages.home.path },
  openGraph: { title: pages.home.title, description: pages.home.description, url: pages.home.path }
};

export default function HomePage() {
  return <ContentPage slug="home" />;
}
