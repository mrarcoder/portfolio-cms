"use client";

import { useState } from "react";
import Toast from "./toast";

export default function MessageList({ initial }) {
  const [rows,setRows] = useState(initial);
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  async function act(id,kind) {
    if (kind === "delete" && !confirm("Delete this message?")) return;
    const response = await fetch(`/api/admin/messages/${id}${kind === "read" ? "/read" : ""}`,{ method:kind === "read" ? "PUT" : "DELETE" });
    if (!response.ok) { setError(true);setMessage("Could not update this message.");return; }
    setRows(kind === "read" ? rows.map((row) => row.id === id ? { ...row,is_read:1 } : row) : rows.filter((row) => row.id !== id));
    setError(false);setMessage(kind === "read" ? "Message marked as read." : "Message deleted.");
  }
  return <>{rows.length ? <div className="content-list message-list">{rows.map((row) => <article className={`panel message ${row.is_read ? "" : "message-new"}`} key={row.id}><div className="message-head"><div><p className="eyebrow">{new Date(row.created_at).toLocaleDateString()}</p><h2>{row.subject || "Portfolio message"}</h2></div><span className={row.is_read ? "pill" : "pill visible"}><i aria-hidden="true"/>{row.is_read ? "Read" : "New"}</span></div><p className="muted">From {row.name} · <a href={`mailto:${row.email}`}>{row.email}</a></p><p className="pre-line message-copy">{row.message}</p><div className="row-actions">{!row.is_read && <button onClick={() => act(row.id,"read")}>Mark read</button>}<button className="danger" onClick={() => act(row.id,"delete")}>Delete</button></div></article>)}</div> : <div className="panel empty-state"><span className="empty-icon" aria-hidden="true">◇</span><h2>Inbox zero</h2><p>New portfolio messages will appear here.</p></div>}<Toast message={message} clear={setMessage} error={error}/></>;
}
