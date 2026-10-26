import Link from "next/link";
import { redirect } from "next/navigation";
import { ExportLinks, StatusFilterCards, listHref } from "@/components/AdminListControls";
import { AdminSearch } from "@/components/AdminSearch";
import { AdminStatus } from "@/components/AdminStatus";
import { applicationWhere, isApplicationStatus, type ApplicationFilters } from "@/lib/admin-data";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_OPTIONS } from "@/lib/career";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications | Airavut", robots: { index: false, follow: false } };
const perPage = 20;

export default async function AdminApplications({ searchParams }: { searchParams: Promise<ApplicationFilters> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const filters = await searchParams;
  const q = filters.q?.trim() ?? "";
  const status = isApplicationStatus(filters.status) ? filters.status : undefined;
  const currentPage = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const where = applicationWhere({ q, status });
  const [records, total, counts] = await Promise.all([
    prisma.careerApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * perPage,
      take: perPage,
      select: { id: true, fullName: true, email: true, phone: true, location: true, role: true, experience: true, noticePeriod: true, createdAt: true, status: true }
    }),
    prisma.careerApplication.count({ where }),
    // Status counts follow the search, so each card shows how many results clicking it would give.
    prisma.careerApplication.groupBy({ by: ["status"], where: applicationWhere({ q }, { includeStatus: false }), _count: { _all: true } })
  ]);
  const countMap: Record<string, number> = Object.fromEntries(counts.map((item) => [item.status, item._count._all]));
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <main className="admin-main">
      <header className="admin-topbar"><div><p className="admin-kicker">Airavut administration</p><h1>Applications</h1><p>Signed in as {session.email}</p></div><form method="post" action="/api/admin/logout"><button className="admin-secondary">Sign out</button></form></header>
      <StatusFilterCards basePath="/admin/applications" q={q} active={status} allLabel="All applications" statuses={APPLICATION_STATUS_OPTIONS} counts={countMap} />
      <section className="admin-panel">
        <div className="applications-toolbar">
          <AdminSearch initial={q} status={status} label="Search applications" placeholder="Search by name, email, phone, city or role" />
          <ExportLinks endpoint="/api/admin/applications/export" q={q} status={status} />
        </div>
        <p className="results-count">{total} result{total === 1 ? "" : "s"}{status ? ` · ${APPLICATION_STATUS_LABELS[status]}` : ""}{q ? ` · matching “${q}”` : ""}</p>
        {records.length ? (
          <div className="table-scroll"><table className="applications-table"><thead><tr><th>Applicant</th><th>Location</th><th>Role / department</th><th>Experience</th><th>Notice period</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {records.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.fullName}</strong><small><a href={`mailto:${item.email}`}>{item.email}</a><br /><a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}>{item.phone}</a></small></td>
                <td>{item.location}</td>
                <td>{item.role}</td>
                <td>{item.experience}</td>
                <td>{item.noticePeriod}</td>
                <td><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</time></td>
                <td><AdminStatus id={item.id} initial={item.status} options={APPLICATION_STATUS_OPTIONS} endpoint={`/api/admin/applications/${item.id}/status`} label={`Status for ${item.fullName}`} /></td>
                <td><Link href={`/admin/applications/${item.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody></table></div>
        ) : (
          <div className="admin-empty">
            <h2>{q || status ? "No matching applications" : "No applications yet"}</h2>
            <p>{q || status ? "Try a different search or status." : "Applications submitted from the Careers page will appear here."}</p>
          </div>
        )}
        {pages > 1 ? <nav className="pagination" aria-label="Pagination"><Link aria-disabled={currentPage === 1} href={listHref("/admin/applications", { q, status, page: currentPage - 1 })}>Previous</Link><span>Page {currentPage} of {pages}</span><Link aria-disabled={currentPage === pages} href={listHref("/admin/applications", { q, status, page: Math.min(pages, currentPage + 1) })}>Next</Link></nav> : null}
      </section>
    </main>
  );
}
