import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, hasValidOrigin, makePasswordHash } from "@/lib/security";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  if (!(await hasValidOrigin(request))) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim() || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "A valid email address is required." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "An administrator with this email already exists." }, { status: 409 });
    }

    const passwordHash = makePasswordHash(password);
    const user = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Could not create administrator user. Please check your input." },
      { status: 500 }
    );
  }
}
