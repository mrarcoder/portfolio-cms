import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "../../components/admin/admin-shell";
import { getApi } from "../../lib/api";

export const metadata = { title:"Admin", robots:{ index:false, follow:false } };

export default async function AdminLayout({ children }) {
  let user;
  let unreadCount = 0;
  try {
    const cookie = (await cookies()).toString();
    const session = await getApi("/auth/me", { cookie });
    user = session.user;
    try {
      const summary = await getApi("/admin/summary", { cookie });
      unreadCount = Number(summary.unread_messages) || 0;
    } catch {}
  } catch {
    redirect("/login");
  }

  return <AdminShell username={user.username} unreadCount={unreadCount}>{children}</AdminShell>;
}
