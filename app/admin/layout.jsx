import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/site-header";
import LogoutButton from "../../components/logout-button";
import { getApi } from "../../lib/api";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }) {
  let user;
  try {
    const cookie = (await cookies()).toString();
    const session = await getApi("/auth/me", { cookie });
    user = session.user;
  } catch { redirect("/login"); }
  return (
    <>
      <SiteHeader admin />
      <div className="container admin-grid">
        <aside className="sidebar"><p className="muted m-0 mb-3">Signed in as <strong>{user.username}</strong></p><nav aria-label="Admin navigation" className="admin-nav">{[['/admin','Overview'],['/admin/profile','Profile'],['/admin/experiences','Experience'],['/admin/education','Education'],['/admin/skill-categories','Skill categories'],['/admin/skills','Skills'],['/admin/projects','Projects'],['/admin/achievements','Achievements'],['/admin/certifications','Certifications'],['/admin/social-links','Social links'],['/admin/messages','Messages'],['/admin/settings','Settings']].map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav><LogoutButton /></aside>
        <main id="main">{children}</main>
      </div>
    </>
  );
}
