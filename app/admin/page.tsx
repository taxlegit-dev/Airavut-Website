import Link from "next/link";
import { redirect } from "next/navigation";
import { InquiryStatus } from "@prisma/client";
import { ExportLinks, StatusFilterCards, listHref } from "@/components/AdminListControls";
import { AdminSearch } from "@/components/AdminSearch";
import { AdminStatus } from "@/components/AdminStatus";
import { INQUIRY_STATUS_LABELS, inquiryWhere, isInquiryStatus, type InquiryFilters } from "@/lib/admin-data";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries | Airavut", robots: { index: false, follow: false } };
const perPage = 20;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<InquiryFilters> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const filters = await searchParams;
  const q = filters.q?.trim() ?? "";
  const status = isInquiryStatus(filters.status) ? filters.status : undefined;
  const currentPage = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const where = inquiryWhere({ q, status });
  const [records, total, counts] = await Promise.all([
    prisma.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (currentPage - 1) * perPage, take: perPage }),
    prisma.inquiry.count({ where }),
    // Status counts follow the search, so each card shows how many results clicking it would give.
    prisma.inquiry.groupBy({ by: ["status"], where: inquiryWhere({ q }, { includeStatus: false }), _count: { _all: true } })
  ]);
  const countMap: Record<string, number> = Object.fromEntries(counts.map((item) => [item.status, item._count._all]));
  const pages = Math.max(1, Math.ceil(total / perPage));
  const statuses = Object.values(InquiryStatus).map((value) => ({ value, label: INQUIRY_STATUS_LABELS[value] }));

  return (
    <main className="admin-main">
      <header className="admin-topbar"><div><p className="admin-kicker">Airavut administration</p><h1>Inquiries</h1><p>Signed in as {session.email}</p></div><form method="post" action="/api/admin/logout"><button className="admin-secondary">Sign out</button></form></header>
      <StatusFilterCards basePath="/admin" q={q} active={status} allLabel="All inquiries" statuses={statuses} counts={countMap} />
      <section className="admin-panel">
        <div className="applications-toolbar">
          <AdminSearch initial={q} status={status} label="Search inquiries" placeholder="Search by name, email, phone, organisation or area" />
          <ExportLinks endpoint="/api/admin/export" q={q} status={status} />
        </div>
        <p className="results-count">{total} result{total === 1 ? "" : "s"}{status ? ` · ${INQUIRY_STATUS_LABELS[status]}` : ""}{q ? ` · matching “${q}”` : ""}</p>
        {records.length ? (
          <div className="table-scroll"><table><thead><tr><th>Contact</th><th>Organisation</th><th>Area</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {records.map((item) => <tr key={item.id}><td><strong>{item.fullName}</strong><small>{item.email}<br />{item.phone}</small></td><td>{item.organisation}</td><td>{item.area}</td><td><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</time></td><td><AdminStatus id={item.id} initial={item.status} /></td><td><Link href={`/admin/inquiries/${item.id}`}>View</Link></td></tr>)}
          </tbody></table></div>
        ) : (
          <div className="admin-empty">
            <h2>{q || status ? "No matching inquiries" : "No inquiries yet"}</h2>
            <p>{q || status ? "Try a different search or status." : "Inquiries submitted from the Talk to Us form will appear here."}</p>
          </div>
        )}
        {pages > 1 ? <nav className="pagination" aria-label="Pagination"><Link aria-disabled={currentPage === 1} href={listHref("/admin", { q, status, page: currentPage - 1 })}>Previous</Link><span>Page {currentPage} of {pages}</span><Link aria-disabled={currentPage === pages} href={listHref("/admin", { q, status, page: Math.min(pages, currentPage + 1) })}>Next</Link></nav> : null}
      </section>
    </main>
  );
}
