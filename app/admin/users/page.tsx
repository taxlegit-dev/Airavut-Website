import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAdmin, getAdminSession } from "@/lib/security";
import { AdminUsersManager, type AdminUserRecord } from "@/components/AdminUsersManager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin Users | Airavut",
  robots: { index: false, follow: false }
};

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  await ensureDefaultAdmin();

  const records = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: "asc" }
  });

  const users: AdminUserRecord[] = records.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  }));

  return (
    <main className="admin-main">
      <header className="admin-topbar">
        <div>
          <p className="admin-kicker">Airavut administration</p>
          <h1>Users</h1>
          <p>Signed in as {session.email}</p>
        </div>
        <form method="post" action="/api/admin/logout">
          <button className="admin-secondary">Sign out</button>
        </form>
      </header>

      <AdminUsersManager initialUsers={users} />
    </main>
  );
}
