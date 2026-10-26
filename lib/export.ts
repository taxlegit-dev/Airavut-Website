import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

/** Neutralises spreadsheet formula injection (=, +, -, @ prefixes). */
export const safeCell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

export async function xlsxResponse(filename: string, sheetName: string, headers: string[], rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Airavut Education Ventures";
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row.map(safeCell)));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D1530" } };
  sheet.columns = headers.map((header, index) => ({ header, key: String(index), width: Math.min(45, Math.max(14, header.length + 4)) }));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename=${filename}.xlsx`, "cache-control": "private, no-store" } });
}

export function pdfResponse(filename: string, pdf: Buffer) {
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename=${filename}.pdf`, "cache-control": "private, no-store" } });
}
