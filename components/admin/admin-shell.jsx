"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "../ui/icon";
import LogoutButton from "./logout-button";

const navigation = [
  ["/admin","Overview","dashboard"],
  ["/admin/profile","Profile","user"],
  ["/admin/experiences","Experience","briefcase"],
  ["/admin/education","Education","education"],
  ["/admin/skill-categories","Skill categories","category"],
  ["/admin/skills","Skills","spark"],
  ["/admin/projects","Projects","project"],
  ["/admin/achievements","Achievements","award"],
  ["/admin/certifications","Certifications","certificate"],
  ["/admin/social-links","Social links","link"],
  ["/admin/settings","Settings","settings"],
];

export default function AdminShell({ username, unreadCount, children }) {
  const pathname = usePathname();
  const [menuOpen,setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    const close = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown",close);
    return () => { document.body.style.overflow = previous;window.removeEventListener("keydown",close); };
  },[menuOpen]);

  function active(href) { return href === "/admin" ? pathname === href : pathname.startsWith(href); }

  return <div className="admin-shell">
    <header className="site-header admin-header">
      <div className="container header-inner">
        <div className="admin-header-start">
          <button className="admin-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open admin navigation" aria-expanded={menuOpen}><Icon name="menu"/></button>
          <Link className="brand" href="/admin"><span className="brand-mark" aria-hidden="true">p</span><span>portfolio<span className="brand-soft"> / cms</span></span></Link>
        </div>
        <nav aria-label="Admin shortcuts" className="header-actions">
          <Link className="header-icon-link inbox-link" href="/admin/messages" aria-label={`Inbox${unreadCount ? `, ${unreadCount} unread` : ""}`} title="Inbox"><Icon name="mail"/>{unreadCount > 0 && <strong className="unread-badge">{unreadCount > 99 ? "99+" : unreadCount}</strong>}</Link>
          <Link className="header-icon-link" href="/" aria-label="View public portfolio" title="View portfolio"><Icon name="external"/></Link>
        </nav>
      </div>
    </header>

    {menuOpen && <button className="admin-drawer-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Close admin navigation"/>}
    <div className="container admin-grid">
      <aside className={`sidebar${menuOpen ? " is-open" : ""}`} aria-label="Admin workspace">
        <div className="sidebar-head">
          <div className="admin-user"><span className="user-orb" aria-hidden="true">{username[0]}</span><div><small>Signed in as</small><strong>{username}</strong></div></div>
          <button className="sidebar-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><Icon name="cancel"/></button>
        </div>
        <p className="sidebar-label">Workspace</p>
        <nav aria-label="Admin navigation" className="admin-nav">
          {navigation.map(([href,label,icon]) => <Link href={href} key={href} className={active(href) ? "active" : ""} aria-current={active(href) ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon name={icon}/><span>{label}</span></Link>)}
        </nav>
        <div className="sidebar-footer"><Link href="/" className="sidebar-public-link" onClick={() => setMenuOpen(false)}><Icon name="external"/><span>View portfolio</span></Link><LogoutButton/></div>
      </aside>
      <main id="main" className="admin-main">{children}</main>
    </div>
  </div>;
}
