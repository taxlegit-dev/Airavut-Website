// Shared by the public application form and the server, so both validate against the same lists and rules.

export const EXPERIENCE_OPTIONS = [
  "Fresher / Less than 1 year",
  "1 – 3 years",
  "3 – 5 years",
  "5 – 8 years",
  "8+ years"
] as const;

export const ROLE_OPTIONS = [
  "Teaching",
  "Academic Leadership",
  "Student Relations",
  "Operations",
  "Events",
  "Examinations",
  "Publishing",
  "Technology"
] as const;

export const NOTICE_PERIOD_OPTIONS = ["Immediate", "15 Days", "30 Days", "60+ Days"] as const;

export const APPLICATION_STATUSES = ["NEW", "IN_REVIEW", "SHORTLISTED", "REJECTED"] as const;
export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatusValue, string> = {
  NEW: "New",
  IN_REVIEW: "In Review",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected"
};

export const APPLICATION_STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({ value, label: APPLICATION_STATUS_LABELS[value] }));

export const LIMITS = { fullName: 100, email: 254, phone: 20, location: 120, linkedinUrl: 500, resumeUrl: 1000, portfolioUrl: 1000, whyJoinUsMin: 20, whyJoinUsMax: 2000 } as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^\+?[()\-\s\d]{7,20}$/;

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "").length;
  return PHONE_PATTERN.test(value) && digits >= 7 && digits <= 15;
}

/** Adds https:// when the scheme is omitted, so "linkedin.com/in/name" is accepted. */
export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Accepts only public http(s) URLs without embedded credentials. */
export function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return null;
    return url;
  } catch {
    return null;
  }
}

export function isLinkedInUrl(value: string) {
  const url = parseHttpUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}
