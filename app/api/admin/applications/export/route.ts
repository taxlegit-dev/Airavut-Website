import { NextResponse } from "next/server";
import { applicationWhere, isApplicationStatus, type ApplicationFilters } from "@/lib/admin-data";
import { APPLICATION_STATUS_LABELS } from "@/lib/career";
import { pdfResponse, xlsxResponse } from "@/lib/export";
import { buildTablePdf } from "@/lib/pdf-table";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const runtime = "nodejs";

const FILENAME = "airavut-career-applications";
const headers = ["Submitted At", "Full Name", "Email", "Phone", "Location", "LinkedIn", "Resume / CV", "Portfolio", "Experience", "Role / Department", "Notice Period", "Why Join Airavut", "Status", "Last Updated"];
const dateIST = (date: Date) => date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const filters: ApplicationFilters = { q: url.searchParams.get("q") ?? undefined, status: url.searchParams.get("status") ?? undefined };
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";

  const records = await prisma.careerApplication.findMany({ where: applicationWhere(filters), orderBy: { createdAt: "desc" }, take: 10000 });
  await prisma.auditLog.create({ data: { actor: session.email, action: "APPLICATIONS_EXPORTED", metadata: { format, count: records.length } } });

  if (format === "pdf") {
    // The PDF is a printable summary; links and the motivation statement are in the Excel export.
    const applied = [filters.q?.trim() && `search "${filters.q.trim()}"`, isApplicationStatus(filters.status) && `status ${APPLICATION_STATUS_LABELS[filters.status]}`].filter(Boolean).join(", ");
    const pdf = buildTablePdf({
      title: "Airavut — Career Applications",
      subtitle: `Generated ${dateIST(new Date())} IST · ${records.length} application${records.length === 1 ? "" : "s"}${applied ? ` · Filtered by ${applied}` : ""}`,
      columns: [
        { header: "Name", width: 100 }, { header: "Email", width: 130 }, { header: "Phone", width: 80 }, { header: "Location", width: 75 },
        { header: "Role / Department", width: 85 }, { header: "Experience", width: 80 }, { header: "Notice", width: 55 },
        { header: "Submitted", width: 100 }, { header: "Status", width: 65 }
      ],
      rows: records.map((item) => [item.fullName, item.email, item.phone, item.location, item.role, item.experience, item.noticePeriod, dateIST(item.createdAt), APPLICATION_STATUS_LABELS[item.status]])
    });
    return pdfResponse(FILENAME, pdf);
  }

  const rows = records.map((item) => [
    item.createdAt.toISOString(), item.fullName, item.email, item.phone, item.location, item.linkedinUrl, item.resumeUrl, item.portfolioUrl ?? "",
    item.experience, item.role, item.noticePeriod, item.whyJoinUs, APPLICATION_STATUS_LABELS[item.status], item.updatedAt.toISOString()
  ]);
  return xlsxResponse(FILENAME, "Applications", headers, rows);
}
