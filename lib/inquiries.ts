import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

const clean = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

export const DUPLICATE_INQUIRY_MESSAGE = "Your inquiry has already been received from this email address or phone number.";

export const inquirySchema = z.object({
  fullName: z.string().transform(clean).pipe(z.string().min(2).max(100)),
  email: z.string().transform((value) => clean(value).toLowerCase()).pipe(z.string().email().max(254)),
  phone: z.string().transform(clean).pipe(z.string().regex(/^[+()\-\s\d]{7,20}$/)),
  organisation: z.string().transform(clean).pipe(z.string().min(2).max(150)),
  area: z.enum(["Schools & Universities", "Examination & Certification Bodies", "Strategic & Institutional Partners", "Investors & Financial Institutions", "Media"]),
  message: z.string().transform(clean).pipe(z.string().min(10).max(2000)),
  // Temporarily disabled Turnstile anti-spam verification:
  // turnstileToken: z.string().min(1).max(2048)
  turnstileToken: z.string().optional()
});

export const statusSchema = z.enum(["NEW", "CONTACTED", "IN_REVIEW", "CLOSED"]);

// Temporarily disabled Turnstile anti-spam verification:
// export async function verifyTurnstile(token: string, remoteip: string) {
//   const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
//   if (!turnstileSecret) return process.env.NODE_ENV !== "production" && token === "development-bypass";
//   const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
//     method: "POST",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify({ secret: turnstileSecret, response: token, remoteip }),
//     cache: "no-store"
//   });
//   if (!response.ok) return false;
//   const result = (await response.json()) as { success?: boolean };
//   return result.success === true;
// }

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isPhoneMatch(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false;
  if (phoneA.trim() === phoneB.trim()) return true;
  const digitsA = normalizePhoneDigits(phoneA);
  const digitsB = normalizePhoneDigits(phoneB);
  if (!digitsA || !digitsB) return false;
  if (digitsA === digitsB) return true;
  if (digitsA.length >= 10 && digitsB.length >= 10) {
    return digitsA.slice(-10) === digitsB.slice(-10);
  }
  return false;
}

export async function findExistingInquiry(email: string, phone: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const digits = normalizePhoneDigits(phone);
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

  // 1. Case-insensitive email check
  if (cleanEmail) {
    const byEmail = await prisma.inquiry.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" }
      },
      select: { id: true }
    });
    if (byEmail) return true;
  }

  // 2. Phone check with formatting normalization
  if (digits) {
    try {
      const byPhone = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM inquiries
        WHERE regexp_replace(phone, '[^0-9]', '', 'g') = ${digits}
           OR (length(${digits}) >= 10 AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10 AND RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ${last10})
        LIMIT 1
      `;
      if (byPhone && byPhone.length > 0) return true;
    } catch {
      // Fallback if raw query is not supported in the active environment
      const records = await prisma.inquiry.findMany({
        select: { phone: true }
      });
      if (records.some((r) => isPhoneMatch(r.phone, phone))) {
        return true;
      }
    }
  }

  return false;
}
