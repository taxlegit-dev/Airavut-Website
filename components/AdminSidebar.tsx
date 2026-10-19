"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminSidebar({ sessionEmail }: { sessionEmail: string }) {
  const pathname = usePathname();

  const isInquiries = pathname === "/admin" || pathname.startsWith("/admin/inquiries");
  const isUsers = pathname.startsWith("/admin/users");

  return (
    <aside className="admin-sidebar" aria-label="Admin Navigation">
      <div className="admin-sidebar-top">
        <Link href="/" className="admin-sidebar-brand" aria-label="Airavut Home">
          <img src="/media/airavut-logo.png" alt="Airavut" height="36" />
        </Link>
        <span className="admin-kicker">Administration</span>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin Menu">
        <Link
          href="/admin"
          className={`admin-nav-item ${isInquiries ? "active" : ""}`}
          aria-current={isInquiries ? "page" : undefined}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Inquiries</span>
        </Link>

        <Link
          href="/admin/users"
          className={`admin-nav-item ${isUsers ? "active" : ""}`}
          aria-current={isUsers ? "page" : undefined}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Users</span>
        </Link>
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-user">
          <span className="admin-user-tag">Signed in as</span>
          <span className="admin-user-email" title={sessionEmail}>{sessionEmail}</span>
        </div>
        <form method="post" action="/api/admin/logout">
          <button type="submit" className="admin-secondary admin-sidebar-signout">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
