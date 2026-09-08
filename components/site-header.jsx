import Link from "next/link";

export default function SiteHeader({ admin = false }) {
  return (
    <header className="site-header admin-header">
      <div className="container header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">p</span>
          <span>portfolio<span className="brand-soft"> / cms</span></span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className="nav-link header-action" href={admin ? "/" : "/admin"}>
            {admin ? "View portfolio ↗" : "Admin overview ↗"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
