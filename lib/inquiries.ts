import "server-only";

import { z } from "zod";

const clean = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

export const inquirySchema = z.object({
  fullName: z.string().transform(clean).pipe(z.string().min(2).max(100)),
  email: z.string().transform((value) => clean(value).toLowerCase()).pipe(z.string().email().max(254)),
  phone: z.string().transform(clean).pipe(z.string().regex(/^[+()\-\s\d]{7,20}$/)),
  organisation: z.string().transform(clean).pipe(z.string().min(2).max(150)),
  area: z.enum(["Schools & Universities", "Examination & Certification Bodies", "Strategic & Institutional Partners", "Investors & Financial Institutions", "Media"]),
  message: z.string().transform(clean).pipe(z.string().min(10).max(2000)),
  turnstileToken: z.string().min(1).max(2048)
});

export const statusSchema = z.enum(["NEW", "CONTACTED", "IN_REVIEW", "CLOSED"]);

export async function verifyTurnstile(token: string, remoteip: string) {
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) return process.env.NODE_ENV !== "production" && token === "development-bypass";
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: turnstileSecret, response: token, remoteip }),
    cache: "no-store"
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
