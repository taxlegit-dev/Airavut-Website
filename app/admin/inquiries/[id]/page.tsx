import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminStatus } from "@/components/AdminStatus";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const dynamic = "force-dynamic";

export default async function InquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) redirect("/admin/login");
  const { id } = await params;
  const item = await prisma.inquiry.findUnique({ where: { id }, include: { portfolio: { select: { fileName: true, byteSize: true } }, auditLogs: { orderBy: { createdAt: "desc" }, take: 20 } } });
  if (!item) notFound();
  const details = [["Full name", item.fullName], ["Email", item.email], ["Phone / WhatsApp", item.phone], ["Discipline", item.discipline], ["Skill level", item.skillLevel], ["Certification goals", item.certificationGoals], ["Preferred schedule", item.preferredSchedule], ["Learning mode", item.learningMode.replace("_", " ")], ["Remarks", item.remarks || "—"]];
  return <main className="admin-main"><Link className="admin-back" href="/admin">← Back to inquiries</Link><header className="detail-head"><div><p className="admin-kicker">Applicant inquiry</p><h1>{item.fullName}</h1><p>Submitted {item.createdAt.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" })}</p></div><AdminStatus id={item.id} initial={item.status} /></header><section className="detail-grid"><article className="admin-panel"><h2>Application details</h2><dl>{details.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{item.portfolio ? <a className="download" href={`/api/admin/inquiries/${item.id}/portfolio`}>Download {item.portfolio.fileName} ({Math.ceil(item.portfolio.byteSize/1024)} KB)</a> : <p className="muted">No portfolio was uploaded.</p>}</article><aside className="admin-panel"><h2>Activity</h2><ol className="activity">{item.auditLogs.map((log) => <li key={String(log.id)}><strong>{log.action.replaceAll("_", " ")}</strong><span>{log.actor}</span><time>{log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</time></li>)}</ol>{item.emailDeliveryError ? <p className="admin-error">Email delivery issue: {item.emailDeliveryError}</p> : null}</aside></section></main>;
}
