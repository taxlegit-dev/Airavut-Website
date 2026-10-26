import "server-only";

import { z } from "zod";
import {
  APPLICATION_STATUSES,
  EXPERIENCE_OPTIONS,
  LIMITS,
  NOTICE_PERIOD_OPTIONS,
  ROLE_OPTIONS,
  isLinkedInUrl,
  isValidPhone,
  normalizeUrl,
  parseHttpUrl
} from "@/lib/career";

const clean = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
// Keeps line breaks in the motivation statement while stripping other control characters.
const cleanMultiline = (value: string) => value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const url = (max: number) => z.string().transform((value) => normalizeUrl(clean(value))).pipe(z.string().max(max).refine((value) => parseHttpUrl(value) !== null));

export const DUPLICATE_APPLICATION_MESSAGE = "We have already received your application for this role. Our team will be in touch if your profile is a match.";

export const careerApplicationSchema = z.object({
  fullName: z.string().transform(clean).pipe(z.string().min(2).max(LIMITS.fullName)),
  email: z.string().transform((value) => clean(value).toLowerCase()).pipe(z.string().email().max(LIMITS.email)),
  phone: z.string().transform(clean).pipe(z.string().max(LIMITS.phone).refine(isValidPhone)),
  location: z.string().transform(clean).pipe(z.string().min(2).max(LIMITS.location)),
  linkedinUrl: url(LIMITS.linkedinUrl).refine(isLinkedInUrl),
  resumeUrl: url(LIMITS.resumeUrl),
  portfolioUrl: z.string().optional().transform((value) => clean(value ?? "")).pipe(z.union([z.literal(""), url(LIMITS.portfolioUrl)])),
  experience: z.enum(EXPERIENCE_OPTIONS),
  role: z.enum(ROLE_OPTIONS),
  noticePeriod: z.enum(NOTICE_PERIOD_OPTIONS),
  whyJoinUs: z.string().transform(cleanMultiline).pipe(z.string().min(LIMITS.whyJoinUsMin).max(LIMITS.whyJoinUsMax)),
  // Honeypot: hidden from people, so any value marks the submission as automated.
  website: z.string().max(200).optional()
});

export type CareerApplicationInput = z.infer<typeof careerApplicationSchema>;

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
