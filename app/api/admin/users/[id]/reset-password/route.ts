import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, hasValidOrigin, makePasswordHash } from "@/lib/security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasValidOrigin(request))) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "User ID is required." }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "");

    if (!password || password.length < 8) {
      return NextResponse.json({ message: "New password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Administrator user not found." }, { status: 404 });
    }

    const passwordHash = makePasswordHash(password);
    await prisma.adminUser.update({
      where: { id },
      data: { passwordHash }
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return NextResponse.json(
      { message: "Could not reset password. Please try again." },
      { status: 500 }
    );
  }
}
