import Link from "next/link";
import { redirect } from "next/navigation";
import { InquiryStatus } from "@prisma/client";
import { AdminStatus } from "@/components/AdminStatus";
import { inquiryOrder, inquiryWhere, type InquiryFilters } from "@/lib/admin-data";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/security";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries | Airavut", robots: { index: false, follow: false } };
const perPage = 20;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<InquiryFilters> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const filters = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const where = inquiryWhere(filters);
  const [records, total, counts, areas] = await Promise.all([
    prisma.inquiry.findMany({ where, orderBy: inquiryOrder(filters.sort), skip: (currentPage - 1) * perPage, take: perPage }),
    prisma.inquiry.count({ where }),
    prisma.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.inquiry.findMany({ distinct: ["area"], select: { area: true }, orderBy: { area: "asc" } })
  ]);
  const countMap = Object.fromEntries(counts.map((item) => [item.status, item._count._all]));
  const pages = Math.max(1, Math.ceil(total / perPage));
  const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));
  query.delete("page");
  const exportQuery = query.toString();

  return (
    <main className="admin-main">
      <header className="admin-topbar"><div><p className="admin-kicker">Airavut administration</p><h1>Inquiries</h1><p>Signed in as {session.email}</p></div><form method="post" action="/api/admin/logout"><button className="admin-secondary">Sign out</button></form></header>
      <section className="metric-grid" aria-label="Inquiry totals">
        <article><span>Total matching</span><strong>{total}</strong></article>
        {Object.values(InquiryStatus).map((status) => <article key={status}><span>{status.replace("_", " ")}</span><strong>{countMap[status] ?? 0}</strong></article>)}
      </section>
      <section className="admin-panel">
        <form className="filters" method="get">
          <label>Search<input name="q" defaultValue={filters.q} placeholder="Name, organisation, email or phone" /></label>
          <label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option>{Object.values(InquiryStatus).map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Area<select name="area" defaultValue={filters.area ?? ""}><option value="">All areas</option>{areas.map(({ area }) => <option key={area}>{area}</option>)}</select></label>
          <label>From<input name="from" type="date" defaultValue={filters.from} /></label>
          <label>To<input name="to" type="date" defaultValue={filters.to} /></label>
          <label>Sort<select name="sort" defaultValue={filters.sort ?? "newest"}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select></label>
          <button type="submit">Apply filters</button><Link className="admin-secondary" href="/admin">Reset</Link>
        </form>
        <div className="export-row"><span>{total} result{total === 1 ? "" : "s"}</span><div><a href={`/api/admin/export?${exportQuery}${exportQuery ? "&" : ""}format=csv`}>Export CSV</a><a href={`/api/admin/export?${exportQuery}${exportQuery ? "&" : ""}format=xlsx`}>Export Excel</a></div></div>
        {records.length ? (
          <div className="table-scroll"><table><thead><tr><th>Contact</th><th>Organisation</th><th>Area</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {records.map((item) => <tr key={item.id}><td><strong>{item.fullName}</strong><small>{item.email}<br />{item.phone}</small></td><td>{item.organisation}</td><td>{item.area}</td><td><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</time></td><td><AdminStatus id={item.id} initial={item.status} /></td><td><Link href={`/admin/inquiries/${item.id}`}>View</Link></td></tr>)}
          </tbody></table></div>
        ) : <div className="admin-empty"><h2>No inquiries found</h2><p>Adjust the filters or check back after a submission arrives.</p></div>}
        {pages > 1 ? <nav className="pagination" aria-label="Pagination"><Link aria-disabled={currentPage === 1} href={`/admin?${query.toString()}${query.size ? "&" : ""}page=${Math.max(1,currentPage-1)}`}>Previous</Link><span>Page {currentPage} of {pages}</span><Link aria-disabled={currentPage === pages} href={`/admin?${query.toString()}${query.size ? "&" : ""}page=${Math.min(pages,currentPage+1)}`}>Next</Link></nav> : null}
      </section>
    </main>
  );
}
