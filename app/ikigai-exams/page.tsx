import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Ikigai Exams & Certifications | Coming Soon | Airavut",
  description: "Ikigai Exams & Certifications, Airavut’s performing arts assessment and certification vertical, is launching soon.",
  alternates: { canonical: "/ikigai-exams" },
  robots: { index: false, follow: true }
};

export default function IkigaiExamsPage() {
  return (
    <ComingSoon
      vertical="Ikigai Exams & Certifications"
      description="Structured frameworks for skill assessment, grading, certification and employment readiness across performing arts disciplines. Our new home is on its way."
    />
  );
}
