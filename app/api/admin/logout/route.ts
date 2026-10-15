import { NextResponse } from "next/server";
import { clearAdminSession, hasValidOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!(await hasValidOrigin(request))) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  await clearAdminSession();
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
