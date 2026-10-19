import "./admin.css";
import { getAdminSession } from "@/lib/security";
import { AdminSidebar } from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    return <div className="admin-shell">{children}</div>;
  }

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <AdminSidebar sessionEmail={session.email} />
        <div className="admin-content-area">
          {children}
        </div>
      </div>
    </div>
  );
}
