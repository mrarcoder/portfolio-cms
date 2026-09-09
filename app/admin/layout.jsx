import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminHeader from "../../components/admin/admin-header";
import LogoutButton from "../../components/admin/logout-button";
import { getApi } from "../../lib/api";

export const metadata = { title:"Admin", robots:{ index:false, follow:false } };

const navigation = [
  ["/admin", "Overview"],
  ["/admin/profile", "Profile"],
  ["/admin/experiences", "Experience"],
  ["/admin/education", "Education"],
  ["/admin/skill-categories", "Skill categories"],
  ["/admin/skills", "Skills"],
  ["/admin/projects", "Projects"],
  ["/admin/achievements", "Achievements"],
  ["/admin/certifications", "Certifications"],
  ["/admin/social-links", "Social links"],
  ["/admin/settings", "Settings"],
];

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

  return (
    <>
      <AdminHeader unreadCount={unreadCount}/>
      <div className="container admin-grid">
        <aside className="sidebar">
          <div className="admin-user">
            <span className="user-orb" aria-hidden="true">{user.username[0]}</span>
            <div><small>Workspace</small><strong>{user.username}</strong></div>
          </div>
          <nav aria-label="Admin navigation" className="admin-nav">
            {navigation.map(([href, label], index) => <Link href={href} key={href}><span>{String(index + 1).padStart(2, "0")}</span>{label}</Link>)}
          </nav>
          <LogoutButton/>
        </aside>
        <main id="main" className="admin-main">{children}</main>
      </div>
    </>
  );
}
