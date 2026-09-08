import Link from "next/link";
import { cookies } from "next/headers";
import { getApi } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const summary = await getApi("/admin/summary", { cookie: (await cookies()).toString() });
  return (
    <>
      <p className="eyebrow">Your workspace</p>
      <h1 className="admin-title">Portfolio overview</h1>
      <p className="muted">A quick view of your content and inbox.</p>
      <div className="admin-panels">
        <section className="panel">
          <h2>Content</h2>
          <div className="status-line"><span>Projects</span><strong>{summary.projects}</strong></div>
          <div className="status-line"><span>Experience entries</span><strong>{summary.experiences}</strong></div>
          <div className="status-line"><span>Certifications</span><strong>{summary.certifications}</strong></div>
        </section>
        <section className="panel">
          <h2>Inbox</h2>
          <p className="muted"><strong>{summary.unread_messages}</strong> unread message{summary.unread_messages===1?"":"s"}.</p>
          <Link className="text-link" href="/admin/messages">Open messages</Link>
        </section>
      </div>
    </>
  );
}
