import { NextResponse } from "next/server";
import { statusSchema } from "@/lib/inquiries";
import { prisma } from "@/lib/prisma";
import { getAdminSession, hasValidOrigin } from "@/lib/security";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  const status = statusSchema.safeParse(body?.status);
  if (!status.success) return NextResponse.json({ message: "Invalid status." }, { status: 400 });
  try {
    const inquiry = await prisma.inquiry.update({ where: { id }, data: { status: status.data } });
    await prisma.auditLog.create({ data: { inquiryId: id, actor: session.email, action: "STATUS_UPDATED", metadata: { status: status.data } } });
    return NextResponse.json({ status: inquiry.status });
  } catch {
    return NextResponse.json({ message: "Inquiry not found." }, { status: 404 });
  }
}
