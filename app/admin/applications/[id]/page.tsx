import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { AdminStatus } from "@/components/AdminStatus";
import { APPLICATION_STATUS_OPTIONS, parseHttpUrl } from "@/lib/career";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const dynamic = "force-dynamic";
export const metadata = { title: "Career Application | Airavut", robots: { index: false, follow: false } };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const formatDate = (date: Date) => date.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" });

// Only http(s) URLs become links; anything else is shown as plain text.
function ExternalLink({ href }: { href: string | null }) {
  if (!href) return <span className="muted">Not provided</span>;
  const url = parseHttpUrl(href);
  if (!url) return <>{href}</>;
  return <a href={url.toString()} target="_blank" rel="noopener noreferrer nofollow">{href}</a>;
}

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) redirect("/admin/login");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const [item, activity] = await Promise.all([
    prisma.careerApplication.findUnique({ where: { id } }),
    prisma.auditLog.findMany({ where: { metadata: { path: ["applicationId"], equals: id } }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  if (!item) notFound();

  const details: Array<[string, ReactNode]> = [
    ["Full name", item.fullName],
    ["Email", <a key="email" href={`mailto:${item.email}`}>{item.email}</a>],
    ["Phone / WhatsApp", <a key="phone" href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}>{item.phone}</a>],
    ["Current city / location", item.location],
    ["LinkedIn profile", <ExternalLink key="linkedin" href={item.linkedinUrl} />],
    ["Resume / CV", <ExternalLink key="resume" href={item.resumeUrl} />],
    ["Portfolio / work / reel", <ExternalLink key="portfolio" href={item.portfolioUrl} />],
    ["Total experience", item.experience],
    ["Role / department", item.role],
    ["Notice period / availability", item.noticePeriod],
    ["Why join Airavut", item.whyJoinUs],
    ["Submitted", <time key="created" dateTime={item.createdAt.toISOString()}>{formatDate(item.createdAt)}</time>],
    ["Last updated", <time key="updated" dateTime={item.updatedAt.toISOString()}>{formatDate(item.updatedAt)}</time>]
  ];

  return (
    <main className="admin-main">
      <Link className="admin-back" href="/admin/applications">← Back to applications</Link>
      <header className="detail-head">
        <div><p className="admin-kicker">Career application · {item.role}</p><h1>{item.fullName}</h1><p>Submitted {formatDate(item.createdAt)}</p></div>
        <div className="detail-status"><span>Application status</span><AdminStatus id={item.id} initial={item.status} options={APPLICATION_STATUS_OPTIONS} endpoint={`/api/admin/applications/${item.id}/status`} /></div>
      </header>
      <section className="detail-grid">
        <article className="admin-panel"><h2>Application details</h2><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>
        <aside className="admin-panel">
          <h2>Activity</h2>
          {activity.length ? (
            <ol className="activity">{activity.map((log) => <li key={String(log.id)}><strong>{log.action.replaceAll("_", " ")}</strong><span>{log.actor}</span><time>{log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</time></li>)}</ol>
          ) : <p className="muted">No status changes yet.</p>}
        </aside>
      </section>
    </main>
  );
}
