"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "./toast";

function asDate(value) {
  if (!value) return new Date(0);
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(normalized);
}

function replyLink(row) {
  const subject = row.subject ? `Re: ${row.subject}` : "Re: Portfolio message";
  const body = `Hi ${row.name},\n\n\n\nBest,`;
  return `mailto:${row.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function MessageList({ initial }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    const close = (event) => { if (event.key === "Escape") setSelected(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow;window.removeEventListener("keydown", close); };
  }, [selected]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .filter((row) => status === "all" || (status === "read" ? Boolean(row.is_read) : !row.is_read))
      .filter((row) => !date || asDate(row.created_at).toISOString().slice(0, 10) === date)
      .filter((row) => !search || [row.name, row.email, row.subject, row.message].some((value) => String(value || "").toLowerCase().includes(search)))
      .sort((a, b) => (asDate(b.created_at) - asDate(a.created_at)) * (sort === "newest" ? 1 : -1));
  }, [rows, status, date, query, sort]);

  async function markRead(row) {
    if (row.is_read) return;
    try {
      const response = await fetch(`/api/admin/messages/${row.id}/read`, { method: "PUT" });
      if (!response.ok) throw new Error();
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, is_read: 1 } : item));
      setSelected((current) => current?.id === row.id ? { ...current, is_read: 1 } : current);
      router.refresh();
    } catch {
      setError(true);
      setMessage("Could not mark this message as read.");
    }
  }

  function openMessage(row) {
    setSelected(row);
    void markRead(row);
  }

  async function remove(row) {
    if (!confirm("Delete this message?")) return;
    try {
      const response = await fetch(`/api/admin/messages/${row.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setRows((current) => current.filter((item) => item.id !== row.id));
      setSelected(null);
      setError(false);
      setMessage("Message deleted.");
      router.refresh();
    } catch {
      setError(true);
      setMessage("Could not delete this message.");
    }
  }

  function clearFilters() {
    setStatus("all");
    setDate("");
    setQuery("");
    setSort("newest");
  }

  return (
    <>
      <section className="mail-shell" aria-label="Inbox">
        <div className="mail-toolbar">
          <label className="mail-search"><span aria-hidden="true">⌕</span><span className="sr-only">Search messages</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mail"/></label>
          <label className="mail-filter"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All mail</option><option value="unread">Unread</option><option value="read">Read</option></select></label>
          <label className="mail-filter"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label>
          <label className="mail-filter"><span>Order</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label>
          {(query || date || status !== "all" || sort !== "newest") && <button className="mail-clear" type="button" onClick={clearFilters}>Clear</button>}
        </div>
        <div className="mail-list-head"><span>{filtered.length} {filtered.length === 1 ? "message" : "messages"}</span><span>Click a message to read and reply</span></div>
        {filtered.length ? <div className="mail-list">{filtered.map((row) => {
          const received = asDate(row.created_at);
          return <button type="button" className={`mail-row ${row.is_read ? "" : "mail-unread"}`} key={row.id} onClick={() => openMessage(row)}>
            <span className="mail-avatar" aria-hidden="true">{row.name?.[0] || "?"}</span>
            <span className="mail-sender"><strong>{row.name}</strong><small>{row.email}</small></span>
            <span className="mail-summary"><strong>{row.subject || "Portfolio message"}</strong><span> — {row.message}</span></span>
            <time className="mail-date" dateTime={row.created_at}>{received.toLocaleDateString(undefined, { month: "short", day: "numeric", year: received.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })}</time>
            {!row.is_read && <span className="mail-new-dot" aria-label="Unread"/>}
          </button>;
        })}</div> : <div className="mail-empty"><span aria-hidden="true">◇</span><h2>{rows.length ? "No matching messages" : "Inbox zero"}</h2><p>{rows.length ? "Try changing or clearing the filters." : "New portfolio messages will appear here."}</p></div>}
      </section>

      {selected && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
        <article className="modal-card message-modal" role="dialog" aria-modal="true" aria-labelledby="message-title">
          <div className="modal-head"><div><p className="eyebrow">Message from {selected.name}</p><h2 id="message-title">{selected.subject || "Portfolio message"}</h2></div><button className="icon-button" type="button" onClick={() => setSelected(null)} aria-label="Close message" autoFocus>×</button></div>
          <div className="message-detail-meta"><span className="mail-avatar" aria-hidden="true">{selected.name?.[0] || "?"}</span><div><strong>{selected.name}</strong><a href={`mailto:${selected.email}`}>{selected.email}</a></div><time dateTime={selected.created_at}>{asDate(selected.created_at).toLocaleString()}</time></div>
          <p className="pre-line message-detail-body">{selected.message}</p>
          <div className="message-actions"><a className="button no-margin" href={replyLink(selected)}>↩ Reply by email</a><button className="secondary-button danger" type="button" onClick={() => remove(selected)}>Delete</button></div>
        </article>
      </div>}
      <Toast message={message} clear={setMessage} error={error}/>
    </>
  );
}
