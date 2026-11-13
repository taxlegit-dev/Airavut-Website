export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://airavut.com";

export const pages = {
  home: {
    slug: "home",
    path: "/",
    title: "Airavut Education Ventures | An Integrated Performing Arts Education Ecosystem",
    description:
      "Airavut Education Ventures connects performing arts learning, skill development, examinations, certification and publishing through an integrated education ecosystem."
  },
  ecosystem: {
    slug: "ecosystem",
    path: "/ecosystem",
    title: "Ecosystem | Ikigai Schools, Ikigai Exams & Certifications, and Ikigai Publishing | Airavut",
    description:
      "Explore Airavut’s connected performing arts ecosystem spanning structured learning, examinations, certification and publishing."
  },
  accreditations: {
    slug: "accreditations",
    path: "/accreditations",
    title: "Accreditations, ISO Certifications & Exam Pathways | Airavut",
    description:
      "Discover Airavut’s ISO-certified quality framework and performing arts examination and certification pathways."
  },
  exams: {
    slug: "exams",
    path: "/exams",
    title: "Ikigai Exams & Certifications | Performing Arts Assessment & Certification | Airavut",
    description:
      "Ikigai Exams & Certifications is Airavut’s framework for performing arts examinations, skill assessment, grading, certification and employment readiness."
  },
  publishing: {
    slug: "publishing",
    path: "/publishing",
    title: "Ikigai Publishing | Course Books, Exam Books & Learning Resources | Airavut",
    description:
      "Ikigai Publishing turns the Airavut methodology into course books, exam books, syllabi and teaching resources for students, educators and institutions."
  },
  leadership: {
    slug: "leadership",
    path: "/leadership",
    title: "Leadership | Shweta Singh & Board of Directors | Airavut",
    description:
      "Meet the leadership behind Airavut Education Ventures and its integrated performing arts education platform."
  },
  career: {
    slug: "career",
    path: "/career",
    title: "Careers in Performing Arts Education | Airavut",
    description:
      "Explore teaching, operations, business and marketing career opportunities in performing arts education at Airavut."
  },
  "talk-to-us": {
    slug: "talk-to-us",
    path: "/talk-to-us",
    title: "Talk to Us | Contact Airavut Education Ventures",
    description:
      "Contact Airavut Education Ventures about performing arts learning, certification, institutional partnerships, careers and investment."
  }
} as const;

export type PageSlug = keyof typeof pages;
