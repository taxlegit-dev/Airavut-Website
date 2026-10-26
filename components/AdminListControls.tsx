import Link from "next/link";

// Shared list controls for the admin Inquiries and Applications pages.

/** Builds a list or export URL that keeps the current search. */
export function listHref(base: string, { q, status, page, format }: { q?: string; status?: string; page?: number; format?: string }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (page && page > 1) params.set("page", String(page));
  if (format) params.set("format", format);
  return params.size ? `${base}?${params}` : base;
}

/** Clickable count cards: picking one filters the list straight away. */
export function StatusFilterCards({ basePath, q, active, allLabel, statuses, counts }: {
  basePath: string;
  q: string;
  active?: string;
  allLabel: string;
  statuses: Array<{ value: string; label: string }>;
  counts: Record<string, number>;
}) {
  const cards = [{ value: undefined, label: allLabel, count: Object.values(counts).reduce((sum, value) => sum + value, 0) }, ...statuses.map(({ value, label }) => ({ value, label, count: counts[value] ?? 0 }))];
  return (
    <nav className="metric-grid status-filters" aria-label="Filter by status">
      {cards.map((card) => (
        <Link key={card.label} href={listHref(basePath, { q, status: card.value })} scroll={false} className={card.value === active ? "active" : undefined} aria-current={card.value === active ? "page" : undefined}>
          <span>{card.label}</span><strong>{card.count}</strong>
        </Link>
      ))}
    </nav>
  );
}

export function ExportLinks({ endpoint, q, status }: { endpoint: string; q: string; status?: string }) {
  return (
    <div className="export-links" role="group" aria-label="Export the current list">
      <a href={listHref(endpoint, { q, status, format: "xlsx" })}>Export Excel</a>
      <a href={listHref(endpoint, { q, status, format: "pdf" })}>Export PDF</a>
    </div>
  );
}
