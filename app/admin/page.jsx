import Link from "next/link";
import { cookies } from "next/headers";
import { getApi } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const summary = await getApi("/admin/summary", { cookie: (await cookies()).toString() });
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Control center</p><h1 className="admin-title">Portfolio overview</h1><p className="muted">Everything important, visible at a glance.</p></div><Link className="button no-margin" href="/admin/projects">Manage projects <span aria-hidden="true">↗</span></Link></div>
      <div className="admin-panels">
        <Link className="panel metric-card" href="/admin/projects"><span className="metric-icon">◇</span><strong>{summary.projects}</strong><span>Projects</span><small>Curated work</small></Link>
        <Link className="panel metric-card" href="/admin/experiences"><span className="metric-icon">⌁</span><strong>{summary.experiences}</strong><span>Experiences</span><small>Career entries</small></Link>
        <Link className="panel metric-card" href="/admin/certifications"><span className="metric-icon">✦</span><strong>{summary.certifications}</strong><span>Certificates</span><small>Verified skills</small></Link>
        <Link className={`panel metric-card ${summary.unread_messages ? "metric-live" : ""}`} href="/admin/messages"><span className="metric-icon">↗</span><strong>{summary.unread_messages}</strong><span>Unread</span><small>Inbox messages</small></Link>
      </div>
      <section className="panel overview-banner"><div><p className="eyebrow">Public experience</p><h2>Your portfolio updates instantly.</h2><p className="muted">Edit content here, then open the public site to see the latest version without another deployment.</p></div><Link className="secondary-button" href="/">View live portfolio</Link></section>
    </>
  );
}
