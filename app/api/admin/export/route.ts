import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { inquiryOrder, inquiryWhere, type InquiryFilters } from "@/lib/admin-data";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const runtime = "nodejs";

const headers = ["Submitted At", "Full Name", "Email", "Phone", "Organisation", "Area of Inquiry", "Message", "Status"];
const safeCell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};
const csvCell = (value: unknown) => `"${safeCell(value).replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const filters = Object.fromEntries(url.searchParams) as InquiryFilters & { format?: string };
  const records = await prisma.inquiry.findMany({
    where: inquiryWhere(filters),
    orderBy: inquiryOrder(filters.sort),
    take: 10000
  });
  const rows = records.map((item) => [item.createdAt.toISOString(), item.fullName, item.email, item.phone, item.organisation, item.area, item.message, item.status.replace("_", " ")].map(safeCell));
  await prisma.auditLog.create({ data: { actor: session.email, action: "INQUIRIES_EXPORTED", metadata: { format: filters.format ?? "csv", count: records.length } } });

  if (filters.format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Airavut Education Ventures";
    const sheet = workbook.addWorksheet("Inquiries", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D1530" } };
    sheet.columns = headers.map((header, index) => ({ header, key: String(index), width: Math.min(45, Math.max(14, header.length + 4)) }));
    sheet.autoFilter = { from: "A1", to: "H1" };
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": "attachment; filename=airavut-inquiries.xlsx", "cache-control": "private, no-store" } });
  }

  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=airavut-inquiries.csv", "cache-control": "private, no-store" } });
}
