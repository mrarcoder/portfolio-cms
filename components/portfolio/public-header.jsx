"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../ui/icon";

export default function PublicHeader({ name, initials, navigation }) {
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState("");
  const closeButton = useRef(null);

  useEffect(() => {
    const sections = navigation.map(([id]) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },{ rootMargin:"-25% 0px -60%",threshold:[0,.15,.4] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  },[navigation]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    const close = (event) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    window.addEventListener("keydown",close);
    return () => { document.body.style.overflow = previous;window.removeEventListener("keydown",close); };
  },[open]);

  const links = (mobile = false) => navigation.map(([id,label]) => <a className={`${id === "contact" ? "nav-cta " : ""}${active === id ? "active" : ""}`} href={`#${id}`} key={id} aria-current={active === id ? "location" : undefined} onClick={() => mobile && setOpen(false)}><span>{label}</span>{mobile && <Icon name="right"/>}</a>);

  return <>
    <header className="public-header">
      <div className="container header-inner">
        <a className="brand" href="#top" onClick={() => setOpen(false)}><span className="brand-mark">{initials}</span><span>{name}</span></a>
        <nav className="public-nav" aria-label="Portfolio sections">{links()}</nav>
        <button className="public-menu-button" type="button" onClick={() => setOpen(true)} aria-label="Open portfolio navigation" aria-expanded={open}><Icon name="menu"/></button>
      </div>
    </header>
    {open && <button className="public-drawer-backdrop" type="button" onClick={() => setOpen(false)} aria-label="Close portfolio navigation"/>}
    <aside className={`public-drawer${open ? " is-open" : ""}`} aria-label="Portfolio navigation" aria-hidden={!open} inert={!open}>
      <div className="public-drawer-head"><div><span className="eyebrow">Navigate</span><strong>{name}</strong></div><button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Close portfolio navigation"><Icon name="cancel"/></button></div>
      <nav>{links(true)}</nav>
    </aside>
  </>;
}
