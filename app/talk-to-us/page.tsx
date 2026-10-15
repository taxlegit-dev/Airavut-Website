import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { pages } from "@/lib/site";

const page = pages["talk-to-us"];
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: page.path }, openGraph: { title: page.title, description: page.description, url: page.path } };
export default function TalkToUsPage() { return <ContentPage slug="talk-to-us" />; }
