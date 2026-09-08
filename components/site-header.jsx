import Link from "next/link";

export default function SiteHeader({ admin = false }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">p</span>
          <span>portfolio<span className="font-normal text-[var(--muted)]"> / cms</span></span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className="nav-link" href={admin ? "/" : "/admin"}>
            {admin ? "View portfolio ↗" : "Admin overview ↗"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
