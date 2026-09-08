import Link from "next/link";

export default function SiteHeader({ admin = false, unreadCount = 0 }) {
  return (
    <header className="site-header admin-header">
      <div className="container header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">p</span>
          <span>portfolio<span className="brand-soft"> / cms</span></span>
        </Link>
        <nav aria-label="Main navigation" className="header-actions">
          {admin && <Link className="nav-link header-action inbox-link" href="/admin/messages"><span aria-hidden="true">✉</span> Inbox{unreadCount > 0 && <strong className="unread-badge" aria-label={`${unreadCount} unread messages`}>{unreadCount > 99 ? "99+" : unreadCount}</strong>}</Link>}
          <Link className="nav-link header-action" href={admin ? "/" : "/admin"}>
            {admin ? "View portfolio ↗" : "Admin overview ↗"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
