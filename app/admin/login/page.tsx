import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/security";

export const metadata = { title: "Administrator sign in | Airavut", robots: { index: false, follow: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminSession()) redirect("/admin");
  const error = (await searchParams).error;
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <p className="admin-kicker">Airavut administration</p>
        <h1>Sign in to inquiries</h1>
        <p>Authorized administrators only.</p>
        {error ? <p className="admin-error" role="alert">{error === "limited" ? "Too many sign-in attempts. Try again in 15 minutes." : "The email or password is incorrect."}</p> : null}
        <form method="post" action="/api/admin/login">
          <label>Email<input name="email" type="email" autoComplete="username" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
