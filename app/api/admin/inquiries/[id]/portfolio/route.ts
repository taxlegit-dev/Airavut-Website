import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const file = await prisma.portfolio.findUnique({ where: { inquiryId: id } });
  if (!file) return NextResponse.json({ message: "Portfolio not found." }, { status: 404 });
  await prisma.auditLog.create({ data: { inquiryId: id, actor: session.email, action: "PORTFOLIO_DOWNLOADED" } });
  const encoded = encodeURIComponent(file.fileName).replace(/[()']/g, escape);
  return new NextResponse(file.content, {
    headers: {
      "content-type": file.mimeType,
      "content-length": String(file.byteSize),
      "content-disposition": `attachment; filename="portfolio"; filename*=UTF-8''${encoded}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
