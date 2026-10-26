import { NextResponse } from "next/server";
import { applicationStatusSchema } from "@/lib/career-applications";
import { prisma } from "@/lib/prisma";
import { getAdminSession, hasValidOrigin } from "@/lib/security";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ message: "Application not found." }, { status: 404 });
  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  const status = applicationStatusSchema.safeParse(body?.status);
  if (!status.success) return NextResponse.json({ message: "Invalid status." }, { status: 400 });
  try {
    const application = await prisma.careerApplication.update({ where: { id }, data: { status: status.data } });
    await prisma.auditLog.create({ data: { actor: session.email, action: "APPLICATION_STATUS_UPDATED", metadata: { applicationId: id, status: status.data } } });
    return NextResponse.json({ status: application.status, updatedAt: application.updatedAt.toISOString() });
  } catch {
    return NextResponse.json({ message: "Application not found." }, { status: 404 });
  }
}
