"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

// Live search: updates the URL (and so the server-rendered list) as the admin types.
// Still a plain GET form, so Enter works and it degrades gracefully without JavaScript.
export function AdminSearch({ initial, status, placeholder, label }: { initial: string; status?: string; placeholder: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const applied = useRef(initial);

  useEffect(() => {
    const query = value.trim();
    if (query === applied.current) return;
    const timer = setTimeout(() => {
      applied.current = query;
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      startTransition(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(timer);
  }, [value, status, pathname, router]);

  return (
    <form className="admin-search" role="search" method="get" onSubmit={(event) => event.preventDefault()}>
      <label>
        <span className="sr-only">{label}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input name="q" type="search" value={value} maxLength={100} placeholder={placeholder} autoComplete="off" onChange={(event) => setValue(event.target.value)} />
      </label>
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {pending ? <span className="admin-search-pending" role="status">Searching…</span> : null}
    </form>
  );
}
