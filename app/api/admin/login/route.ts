import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminSession, hasValidOrigin, keyedHash, requestIp, verifyPassword } from "@/lib/security";

export async function POST(request: Request) {
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const ipHash = keyedHash(await requestIp());
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const failedAttempts = await prisma.loginAttempt.count({ where: { ipHash, succeeded: false, createdAt: { gte: windowStart } } });
  if (failedAttempts >= 8) return NextResponse.redirect(new URL("/admin/login?error=limited", request.url), 303);

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const valid = email === process.env.ADMIN_EMAIL?.toLowerCase() && verifyPassword(password);
  if (!valid) {
    await prisma.loginAttempt.create({ data: { ipHash, succeeded: false } });
    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }
  await prisma.loginAttempt.create({ data: { ipHash, succeeded: true } });
  await createAdminSession(email);
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
