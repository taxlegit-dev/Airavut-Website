import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isValidPhone } from "@/lib/contact-validation";
import {
  OTP_MAX_PER_IP_PER_HOUR,
  OTP_MAX_PER_PHONE_PER_HOUR,
  OTP_RESEND_SECONDS,
  OTP_TTL_MINUTES,
  SmsUnavailableError,
  codeHash,
  generateCode,
  otpTestMode,
  phoneHash,
  sendOtpSms
} from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { hasValidOrigin, keyedHash, requestIp } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!isValidPhone(phone)) return NextResponse.json({ message: "Enter a 10-digit phone number." }, { status: 400 });

  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const pHash = phoneHash(phone);
    const ipHash = keyedHash(await requestIp());
    const [latest, perPhone, perIp] = await Promise.all([
      prisma.otpVerification.findFirst({ where: { phoneHash: pHash }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.otpVerification.count({ where: { phoneHash: pHash, createdAt: { gte: hourAgo } } }),
      prisma.otpVerification.count({ where: { ipHash, createdAt: { gte: hourAgo } } })
    ]);
    const wait = latest ? Math.ceil(OTP_RESEND_SECONDS - (Date.now() - latest.createdAt.getTime()) / 1000) : 0;
    if (wait > 0) return NextResponse.json({ message: `Please wait ${wait} seconds before requesting another code.`, retryAfter: wait }, { status: 429 });
    if (perPhone >= OTP_MAX_PER_PHONE_PER_HOUR || perIp >= OTP_MAX_PER_IP_PER_HOUR) {
      return NextResponse.json({ message: "Too many verification codes were requested. Please try again in an hour." }, { status: 429 });
    }

    const code = generateCode();
    const id = randomUUID();
    const challenge = await prisma.otpVerification.create({
      data: { id, phoneHash: pHash, codeHash: codeHash(id, code), ipHash, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) }
    });

    try {
      await sendOtpSms(phone, code);
    } catch (error) {
      // Drop the unsent challenge so it doesn't count against the user's limits.
      await prisma.otpVerification.delete({ where: { id: challenge.id } }).catch(() => {});
      if (error instanceof SmsUnavailableError) return NextResponse.json({ message: "Phone verification is temporarily unavailable. Please try again later." }, { status: 503 });
      throw error;
    }

    return NextResponse.json({
      message: `We sent a ${code.length}-digit code to ${phone.slice(0, 5)} ${phone.slice(5)}.`,
      resendIn: OTP_RESEND_SECONDS,
      expiresIn: OTP_TTL_MINUTES * 60,
      ...(otpTestMode() ? { testCode: code } : {})
    });
  } catch (error) {
    console.error("OTP send failed", error);
    return NextResponse.json({ message: "We could not send the code right now. Please try again." }, { status: 502 });
  }
}
