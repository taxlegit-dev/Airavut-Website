import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { sendInquiryNotifications } from "@/lib/email";
import { inquirySchema, verifyTurnstile } from "@/lib/inquiries";
import { prisma } from "@/lib/prisma";
import { hasValidOrigin, keyedHash, requestIp } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ message: "A valid multipart form submission is required." }, { status: 400 });
    const parsed = inquirySchema.safeParse(Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")));
    if (!parsed.success) return NextResponse.json({ message: "Please review the form fields and try again." }, { status: 400 });

    const ip = await requestIp();
    const ipHash = keyedHash(ip);
    const recent = await prisma.inquiry.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } });
    if (recent >= 5) return NextResponse.json({ message: "Too many inquiries were submitted. Please try again later." }, { status: 429 });
    if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) return NextResponse.json({ message: "Anti-spam verification failed. Please try again." }, { status: 400 });

    const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const duplicateKey = keyedHash(`${parsed.data.email}|${parsed.data.phone}|${parsed.data.area}|${hourBucket}`);
    const inquiry = await prisma.inquiry.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        organisation: parsed.data.organisation,
        area: parsed.data.area,
        message: parsed.data.message,
        ipHash,
        duplicateKey,
        auditLogs: { create: { actor: "public-form", action: "INQUIRY_CREATED" } }
      }
    });

    try {
      await sendInquiryNotifications(inquiry);
    } catch (error) {
      await prisma.inquiry.update({ where: { id: inquiry.id }, data: { emailDeliveryError: String(error).slice(0, 500) } });
      await prisma.auditLog.create({ data: { inquiryId: inquiry.id, actor: "system", action: "EMAIL_DELIVERY_FAILED", metadata: { error: String(error).slice(0, 300) } } });
    }

    return NextResponse.json({ message: "Your inquiry has been received. Our team will contact you soon." }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "This inquiry was already received. Please wait before submitting it again." }, { status: 409 });
    }
    console.error("Inquiry submission failed", error);
    return NextResponse.json({ message: "We could not accept the inquiry right now. Please try again." }, { status: 500 });
  }
}
