import { NextResponse } from "next/server";
import { isValidPhone } from "@/lib/contact-validation";
import { OTP_LENGTH, OTP_MAX_ATTEMPTS, codeHash, createPhoneToken, phoneHash, sameHash } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { hasValidOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!isValidPhone(phone)) return NextResponse.json({ message: "Enter a 10-digit phone number." }, { status: 400 });
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) return NextResponse.json({ message: `Enter the ${OTP_LENGTH}-digit code.` }, { status: 400 });

  try {
    // Only the most recent unexpired code for this number is valid.
    const challenge = await prisma.otpVerification.findFirst({
      where: { phoneHash: phoneHash(phone), verifiedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    if (!challenge) return NextResponse.json({ message: "This code has expired. Please request a new one." }, { status: 400 });
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) return NextResponse.json({ message: "Too many incorrect attempts. Please request a new code." }, { status: 429 });

    // Count the attempt before comparing, so parallel guesses can't exceed the limit.
    const { attempts } = await prisma.otpVerification.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } }, select: { attempts: true } });
    if (attempts > OTP_MAX_ATTEMPTS) return NextResponse.json({ message: "Too many incorrect attempts. Please request a new code." }, { status: 429 });
    if (!sameHash(challenge.codeHash, codeHash(challenge.id, code))) {
      const left = OTP_MAX_ATTEMPTS - attempts;
      return NextResponse.json({ message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Please request a new code." }, { status: 400 });
    }

    await prisma.otpVerification.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });
    return NextResponse.json({ message: "Phone number verified.", token: createPhoneToken(phone) });
  } catch (error) {
    console.error("OTP verify failed", error);
    return NextResponse.json({ message: "We could not verify the code right now. Please try again." }, { status: 500 });
  }
}
