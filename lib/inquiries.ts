import "server-only";

import { z } from "zod";

const clean = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

export const inquirySchema = z.object({
  fullName: z.string().transform(clean).pipe(z.string().min(2).max(100)),
  email: z.string().transform((value) => clean(value).toLowerCase()).pipe(z.string().email().max(254)),
  phone: z.string().transform(clean).pipe(z.string().regex(/^[+()\-\s\d]{7,20}$/)),
  discipline: z.string().transform(clean).pipe(z.string().min(2).max(100)),
  skillLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Professional"]),
  certificationGoals: z.string().transform(clean).pipe(z.string().min(3).max(1000)),
  preferredSchedule: z.string().transform(clean).pipe(z.string().min(2).max(200)),
  learningMode: z.enum(["ONLINE", "IN_PERSON"]),
  remarks: z.string().transform(clean).pipe(z.string().max(2000)).optional().default(""),
  privacyConsent: z.literal("true"),
  turnstileToken: z.string().min(1).max(2048)
});

export const statusSchema = z.enum(["NEW", "CONTACTED", "IN_REVIEW", "CLOSED"]);

const allowedFiles: Record<string, { extensions: string[]; signature: (bytes: Buffer) => boolean }> = {
  "application/pdf": { extensions: ["pdf"], signature: (bytes) => bytes.subarray(0, 5).toString() === "%PDF-" },
  "image/jpeg": { extensions: ["jpg", "jpeg"], signature: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extensions: ["png"], signature: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  "audio/mpeg": { extensions: ["mp3"], signature: (bytes) => bytes.subarray(0, 3).toString() === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) },
  "video/mp4": { extensions: ["mp4"], signature: (bytes) => bytes.subarray(4, 8).toString() === "ftyp" }
};

export async function validatePortfolio(file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > 10 * 1024 * 1024) throw new Error("Portfolio files must be 10 MB or smaller.");
  const rule = allowedFiles[file.type];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!rule || !rule.extensions.includes(extension)) throw new Error("This portfolio file type is not allowed.");
  const content = Buffer.from(await file.arrayBuffer());
  if (!rule.signature(content)) throw new Error("The portfolio file content does not match its declared type.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-255);
  return { fileName: safeName, mimeType: file.type, byteSize: file.size, content };
}

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
