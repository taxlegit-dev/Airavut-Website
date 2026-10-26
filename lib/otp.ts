import "server-only";

import { randomInt, timingSafeEqual } from "node:crypto";
import { keyedHash } from "@/lib/security";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_PER_PHONE_PER_HOUR = 5;
export const OTP_MAX_PER_IP_PER_HOUR = 10;
const TOKEN_TTL_MS = 30 * 60 * 1000;

export const phoneHash = (phone: string) => keyedHash(`otp-phone|${phone}`);
export const codeHash = (challengeId: string, code: string) => keyedHash(`otp-code|${challengeId}|${code}`);
export const generateCode = () => String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

export function sameHash(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Proof that a phone number passed OTP verification, valid for 30 minutes. The form endpoints
// accept a submission only with a token issued for that exact number.
export function createPhoneToken(phone: string) {
  const payload = Buffer.from(JSON.stringify({ p: phone, e: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${keyedHash(`otp-token|${payload}`)}`;
}

export function isPhoneTokenValid(token: unknown, phone: string) {
  if (typeof token !== "string" || token.length > 500) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !sameHash(signature, keyedHash(`otp-token|${payload}`))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { p?: string; e?: number };
    return data.p === phone && typeof data.e === "number" && data.e > Date.now();
  } catch {
    return false;
  }
}

/** Phone OTP is required on the public forms unless OTP_REQUIRED="false" (e.g. to launch before
 *  MSG91/DLT is ready). Pages read it at build time and the API at runtime, so set it in both and redeploy. */
export const otpRequired = () => process.env.OTP_REQUIRED?.trim().toLowerCase() !== "false";

/** Without MSG91 keys, codes are logged and returned to the page instead of sent: always in
 *  development, and in production only when OTP_TEST_MODE=true is set explicitly. */
export function otpTestMode() {
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID) return false;
  return process.env.NODE_ENV !== "production" || process.env.OTP_TEST_MODE === "true";
}

export class SmsUnavailableError extends Error {}

/** Sends the code through MSG91's OTP API (we generate the code, MSG91 delivers it via the DLT template). */
export async function sendOtpSms(phone: string, code: string) {
  if (otpTestMode()) {
    console.info(`[OTP test mode] code for ${phone.slice(0, 2)}******${phone.slice(-2)}: ${code}`);
    return;
  }
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  if (!authKey || !templateId) throw new SmsUnavailableError("SMS provider is not configured.");
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.search = new URLSearchParams({ template_id: templateId, mobile: `91${phone}`, otp: code, otp_length: String(OTP_LENGTH), otp_expiry: String(OTP_TTL_MINUTES) }).toString();
  const response = await fetch(url, { method: "POST", headers: { authkey: authKey, "content-type": "application/json", accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  // MSG91 can report errors with HTTP 200, so the JSON "type" field is authoritative.
  const result = (await response.json().catch(() => ({}))) as { type?: string; message?: string };
  if (!response.ok || result.type !== "success") throw new Error(`MSG91 send failed: ${response.status} ${result.message ?? ""}`.trim());
}
