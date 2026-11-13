import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { pages } from "@/lib/site";

const page = pages.publishing;
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: page.path }, openGraph: { title: page.title, description: page.description, url: page.path } };
export default function PublishingPage() { return <ContentPage slug="publishing" />; }
