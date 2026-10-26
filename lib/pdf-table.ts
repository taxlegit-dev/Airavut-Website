import "server-only";

// Minimal dependency-free PDF writer for tabular admin exports.
// Uses the built-in Helvetica fonts (WinAnsi encoding): Latin text renders as-is,
// characters outside that set are replaced with "?".

export type PdfColumn = { header: string; width: number };

const PAGE = { width: 842, height: 595, margin: 36 }; // A4 landscape, in points
const BODY_SIZE = 7.5;
const HEAD_SIZE = 7.5;
const LINE = 9.5;
const PAD = 4;
const MAX_LINES = 4;

// Helvetica glyph widths (1/1000 em) for ASCII 32–126, from the standard AFM metrics.
const HELVETICA = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];

const WIN_ANSI: Record<string, number> = { "€": 0x80, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99 };

function encode(text: string) {
  let out = "";
  for (const char of text.replace(/\s+/g, " ")) {
    const code = char.codePointAt(0) ?? 63;
    const byte = WIN_ANSI[char] ?? ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) ? code : 63);
    const ch = String.fromCharCode(byte);
    out += ch === "(" || ch === ")" || ch === "\\" ? `\\${ch}` : ch;
  }
  return out;
}

function textWidth(text: string, size: number, bold = false) {
  let units = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    units += code >= 32 && code <= 126 ? HELVETICA[code - 32] : 556;
  }
  return (units * size * (bold ? 1.08 : 1)) / 1000;
}

function wrap(text: string, width: number, size: number, bold = false) {
  const lines: string[] = [];
  let line = "";
  const push = (value: string) => { if (value) lines.push(value); };
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, bold) <= width) { line = candidate; continue; }
    push(line);
    line = "";
    // Break words that are wider than the column on their own (emails, URLs).
    let chunk = "";
    for (const char of word) {
      if (textWidth(chunk + char, size, bold) > width) { push(chunk); chunk = char; } else chunk += char;
    }
    line = chunk;
  }
  push(line);
  if (lines.length > MAX_LINES) {
    lines.length = MAX_LINES;
    lines[MAX_LINES - 1] = `${lines[MAX_LINES - 1].slice(0, -1)}…`;
  }
  return lines.length ? lines : [""];
}

export function buildTablePdf({ title, subtitle, columns, rows }: { title: string; subtitle: string; columns: PdfColumn[]; rows: string[][] }) {
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const left = PAGE.margin;
  const bottom = PAGE.margin + 18;
  const pages: string[][] = [];
  let ops: string[] = [];
  let y = 0;

  const text = (x: number, baseline: number, value: string, size: number, bold = false) =>
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${baseline.toFixed(2)} Td (${encode(value)}) Tj ET`);
  const rule = (atY: number, shade: number) => ops.push(`${shade} G 0.5 w ${left} ${atY.toFixed(2)} m ${left + tableWidth} ${atY.toFixed(2)} l S`);

  const drawRow = (cells: string[][], bold: boolean) => {
    const height = Math.max(...cells.map((lines) => lines.length)) * LINE + PAD * 2;
    if (bold) ops.push(`0.93 g ${left} ${(y - height).toFixed(2)} ${tableWidth} ${height.toFixed(2)} re f 0 g`);
    let x = left;
    cells.forEach((lines, index) => {
      lines.forEach((value, line) => text(x + PAD, y - PAD - (line + 1) * LINE + 2, value, bold ? HEAD_SIZE : BODY_SIZE, bold));
      x += columns[index].width;
    });
    y -= height;
    rule(y, bold ? 0.6 : 0.85);
  };

  const header = columns.map((column) => wrap(column.header, column.width - PAD * 2, HEAD_SIZE, true));
  const startPage = () => {
    ops = [];
    pages.push(ops);
    y = PAGE.height - PAGE.margin;
    if (pages.length === 1) {
      text(left, y - 14, title, 14, true);
      text(left, y - 30, subtitle, 8);
      y -= 44;
    }
    drawRow(header, true);
  };

  startPage();
  if (!rows.length) text(left + PAD, y - 18, "No records match the current filters.", BODY_SIZE);
  for (const row of rows) {
    const cells = row.map((value, index) => wrap(value, columns[index].width - PAD * 2, BODY_SIZE));
    const height = Math.max(...cells.map((lines) => lines.length)) * LINE + PAD * 2;
    if (y - height < bottom) startPage();
    drawRow(cells, false);
  }

  // Objects: 1 catalog, 2 page tree, 3–4 fonts, then a page + content stream pair per page.
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((pageOps, index) => {
    ops = pageOps;
    text(left, PAGE.margin - 4, `Page ${index + 1} of ${pages.length}`, 7);
    const content = ops.join("\n");
    const id = pageIds[index];
    objects[id] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id + 1} 0 R >>`;
    objects[id + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  // Every character is a single byte (latin1), so string lengths equal byte offsets.
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
