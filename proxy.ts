import { NextResponse, type NextRequest } from "next/server";
import { comingSoonPath, verticalForHost } from "@/lib/verticals";

// When an Ikigai vertical's own domain (IKIGAI_EXAMS_URL / IKIGAI_PUBLISHING_URL) is pointed at
// this deployment, every page on that domain shows the vertical's "Coming soon" page.
// Requests on the Airavut domain pass straight through.
export function proxy(request: NextRequest) {
  const vertical = verticalForHost(request.headers.get("host"));
  if (!vertical) return NextResponse.next();
  return NextResponse.rewrite(new URL(comingSoonPath(vertical), request.url));
}

export const config = {
  // Skip framework files, API routes and static assets so the coming-soon page can load its images.
  matcher: ["/((?!api|_next/static|_next/image|media/|favicon.ico|icon.png|apple-icon.png).*)"]
};
