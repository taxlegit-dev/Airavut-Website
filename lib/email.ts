import "server-only";
import type { Inquiry } from "@prisma/client";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

async function send(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
}

export async function sendInquiryNotifications(inquiry: Inquiry) {
  const admin = process.env.INQUIRY_NOTIFICATION_EMAIL ?? process.env.ADMIN_EMAIL;
  if (!admin) throw new Error("INQUIRY_NOTIFICATION_EMAIL or ADMIN_EMAIL is required.");
  const rows = [
    ["Name", inquiry.fullName], ["Email", inquiry.email], ["Phone", inquiry.phone],
    ["Discipline", inquiry.discipline], ["Skill level", inquiry.skillLevel],
    ["Certification goals", inquiry.certificationGoals], ["Schedule", inquiry.preferredSchedule],
    ["Mode", inquiry.learningMode.replace("_", " ")], ["Remarks", inquiry.remarks || "—"]
  ].map(([label, value]) => `<tr><th align="left" style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(value)}</td></tr>`).join("");
  await send(admin, `New Airavut inquiry — ${inquiry.fullName}`, `<h1>New applicant inquiry</h1><table>${rows}</table>`);
  await send(inquiry.email, "We received your Airavut inquiry", `<p>Dear ${escapeHtml(inquiry.fullName)},</p><p>Thank you for contacting Airavut Education Ventures. Your inquiry has been received and our team will review it.</p><p>Airavut Education Ventures</p>`);
}
