import { NextResponse } from "next/server";
import { INQUIRY_STATUS_LABELS, inquiryWhere, isInquiryStatus, type InquiryFilters } from "@/lib/admin-data";
import { pdfResponse, xlsxResponse } from "@/lib/export";
import { buildTablePdf } from "@/lib/pdf-table";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const runtime = "nodejs";

const FILENAME = "airavut-inquiries";
const headers = ["Submitted At", "Full Name", "Email", "Phone", "Organisation", "Area of Inquiry", "Message", "Status"];
const dateIST = (date: Date) => date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const filters: InquiryFilters = { q: url.searchParams.get("q") ?? undefined, status: url.searchParams.get("status") ?? undefined };
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const records = await prisma.inquiry.findMany({
    where: inquiryWhere(filters),
    orderBy: { createdAt: "desc" },
    take: 10000
  });
  await prisma.auditLog.create({ data: { actor: session.email, action: "INQUIRIES_EXPORTED", metadata: { format, count: records.length } } });

  if (format === "pdf") {
    // Long messages are cut to a few lines in the PDF; the Excel export keeps them in full.
    const applied = [filters.q?.trim() && `search "${filters.q.trim()}"`, isInquiryStatus(filters.status) && `status ${INQUIRY_STATUS_LABELS[filters.status]}`].filter(Boolean).join(", ");
    const pdf = buildTablePdf({
      title: "Airavut — Inquiries",
      subtitle: `Generated ${dateIST(new Date())} IST · ${records.length} inquir${records.length === 1 ? "y" : "ies"}${applied ? ` · Filtered by ${applied}` : ""}`,
      columns: [
        { header: "Name", width: 90 }, { header: "Email", width: 125 }, { header: "Phone", width: 80 }, { header: "Organisation", width: 100 },
        { header: "Area of Inquiry", width: 105 }, { header: "Message", width: 120 }, { header: "Submitted", width: 95 }, { header: "Status", width: 55 }
      ],
      rows: records.map((item) => [item.fullName, item.email, item.phone, item.organisation, item.area, item.message, dateIST(item.createdAt), INQUIRY_STATUS_LABELS[item.status]])
    });
    return pdfResponse(FILENAME, pdf);
  }

  const rows = records.map((item) => [item.createdAt.toISOString(), item.fullName, item.email, item.phone, item.organisation, item.area, item.message, item.status.replace("_", " ")]);
  return xlsxResponse(FILENAME, "Inquiries", headers, rows);
}
