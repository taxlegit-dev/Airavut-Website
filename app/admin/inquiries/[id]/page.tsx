import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminStatus } from "@/components/AdminStatus";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const dynamic = "force-dynamic";

export default async function InquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) redirect("/admin/login");
  const { id } = await params;
  const item = await prisma.inquiry.findUnique({ where: { id }, include: { auditLogs: { orderBy: { createdAt: "desc" }, take: 20 } } });
  if (!item) notFound();
  const details = [["Full name", item.fullName], ["Email", item.email], ["Phone / WhatsApp", item.phone], ["Organisation", item.organisation], ["Area of inquiry", item.area], ["Message", item.message]];
  return <main className="admin-main"><Link className="admin-back" href="/admin">← Back to inquiries</Link><header className="detail-head"><div><p className="admin-kicker">Inquiry</p><h1>{item.fullName}</h1><p>Submitted {item.createdAt.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" })}</p></div><AdminStatus id={item.id} initial={item.status} /></header><section className="detail-grid"><article className="admin-panel"><h2>Inquiry details</h2><dl>{details.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article><aside className="admin-panel"><h2>Activity</h2><ol className="activity">{item.auditLogs.map((log) => <li key={String(log.id)}><strong>{log.action.replaceAll("_", " ")}</strong><span>{log.actor}</span><time>{log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</time></li>)}</ol>{item.emailDeliveryError ? <p className="admin-error">Email delivery issue: {item.emailDeliveryError}</p> : null}</aside></section></main>;
}
