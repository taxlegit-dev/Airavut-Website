export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://airavut.com";

export const pages = {
  home: {
    slug: "home",
    path: "/",
    title: "Airavut Education Ventures | Performing Arts Education, Certification & Publishing",
    description:
      "Airavut Education Ventures is building an integrated performing arts education platform: Ikigai Schools, Ikigai Exams & Certifications and Ikigai Publishing. ISO-certified, from India for the world."
  },
  ecosystem: {
    slug: "ecosystem",
    path: "/ecosystem",
    title: "Ecosystem | Ikigai Schools, Exams & Publishing | Airavut",
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
