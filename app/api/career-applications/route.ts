import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { DUPLICATE_APPLICATION_MESSAGE, careerApplicationSchema } from "@/lib/career-applications";
import { prisma } from "@/lib/prisma";
import { hasValidOrigin, keyedHash, requestIp } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ message: "A JSON submission is required." }, { status: 415 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ message: "The application is too large." }, { status: 413 });

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ message: "The application is too large." }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ message: "A valid JSON submission is required." }, { status: 400 });
    }

    const parsed = careerApplicationSchema.safeParse(body);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "")).filter(Boolean))];
      return NextResponse.json({ message: "Please review the highlighted fields and try again.", fields }, { status: 400 });
    }
    const { website, ...data } = parsed.data;

    // Pretend success to automated submissions so bots get no signal to adapt to.
    if (website) return NextResponse.json({ message: "Thank you. Your application has been received." }, { status: 201 });

    const ipHash = keyedHash(await requestIp());
    const recent = await prisma.careerApplication.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } });
    if (recent >= 5) return NextResponse.json({ message: "Too many applications were submitted. Please try again later." }, { status: 429 });

    // One application per email address and role; applicants may still apply to other departments.
    const fingerprint = keyedHash(`career-application|${data.email}|${data.role}`);
    await prisma.careerApplication.create({
      data: { ...data, portfolioUrl: data.portfolioUrl || null, ipHash, fingerprint }
    });

    return NextResponse.json({ message: "Thank you. Your application has been received and our team will review it shortly." }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: DUPLICATE_APPLICATION_MESSAGE, duplicate: true }, { status: 409 });
    }
    console.error("Career application submission failed", error);
    return NextResponse.json({ message: "We could not accept your application right now. Please try again." }, { status: 500 });
  }
}
