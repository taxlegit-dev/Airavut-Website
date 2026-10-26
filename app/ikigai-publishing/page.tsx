import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Ikigai Publishing | Coming Soon | Airavut",
  description: "Ikigai Publishing, Airavut’s course books, exam books and learning resources vertical, is launching soon.",
  alternates: { canonical: "/ikigai-publishing" },
  robots: { index: false, follow: true }
};

export default function IkigaiPublishingPage() {
  return (
    <ComingSoon
      vertical="Ikigai Publishing"
      description="Course books, exam books and learning resources built on the Airavut methodology, for students, educators and institutions. Our new home is on its way."
    />
  );
}
