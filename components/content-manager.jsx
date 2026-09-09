"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fromRecord, resources, toPayload } from "../lib/resources";
import Toast from "./toast";
import SiteLogo, { siteHost } from "./site-logo";

function blank(fields) {
  return Object.fromEntries(fields.map(([name,,type,,options]) => [name, type === "checkbox" ? false : type === "select" ? options[0] : ""]));
}

export default function ContentManager({ resource, initialRows, categoryOptions = [] }) {
  const config = resources[resource];
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank(config.fields));
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    const previousOverflow = document.body.style.overflow;
    const close = (event) => { if (event.key === "Escape") setEditing(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow;window.removeEventListener("keydown", close); };
  }, [editing]);

  function start(row) {
    setEditing(row?.id || "new");
    setForm(row ? fromRecord(resource, row) : blank(config.fields));
  }

  async function save(event) {
    event.preventDefault();
    const file = event.currentTarget.elements.namedItem("media")?.files?.[0];
    const isNew = editing === "new";
    const payload = toPayload(resource, form);
    let uploadedId = null;
    setBusy(true);
    setMessage("");
    try {
      if (file) {
        const media = new FormData();
        media.set("file", file);
        media.set("altText", form.title || form.name || "Portfolio media");
        const upload = await fetch("/api/admin/media", { method: "POST", body: media });
        const uploaded = await upload.json();
        if (!upload.ok) throw new Error(uploaded.error);
        uploadedId = uploaded.data.id;
        payload[resource === "projects" ? "image_media_id" : "file_media_id"] = uploadedId;
      }
      const response = await fetch(`/api/admin/${resource}${isNew ? "" : `/${editing}`}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const previousId = resource === "projects" ? form.image_media_id : resource === "certifications" ? form.file_media_id : null;
      if (uploadedId && previousId) await Promise.allSettled([fetch(`/api/admin/media/${previousId}`, { method: "DELETE" })]);
      try {
        const refreshed = await fetch(`/api/admin/${resource}`);
        const refreshedResult = await refreshed.json();
        if (refreshed.ok) setRows(refreshedResult.data);
      } catch { router.refresh(); }
      setEditing(null);
      setError(false);
      setMessage(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} saved.`);
      router.refresh();
    } catch (caught) {
      if (uploadedId) await fetch(`/api/admin/media/${uploadedId}`, { method: "DELETE" });
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Could not save this item.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm(`Delete this ${config.singular}?`)) return;
    const response = await fetch(`/api/admin/${resource}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      setError(true);
      setMessage(result.error || "Could not delete this item.");
      return;
    }
    setRows(rows.filter((row) => row.id !== id));
    setError(false);
    setMessage(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted.`);
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const previous = rows;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    const response = await fetch(`/api/admin/${resource}/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((row) => row.id) }),
    });
    if (!response.ok) {
      setRows(previous);
      setError(true);
      setMessage("Could not update the order.");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Content system</p><h1 className="admin-title">{config.label}</h1><p className="muted">Manage what appears in your public portfolio.</p></div>
        <button className="button no-margin" onClick={() => start()}><span aria-hidden="true">＋</span> Add {config.singular}</button>
      </div>
      {editing && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="modal-head"><div><p className="eyebrow">{editing === "new" ? "Create new" : "Edit item"}</p><h2 id="editor-title">{config.singular[0].toUpperCase()}{config.singular.slice(1)}</h2></div><button className="icon-button" type="button" onClick={() => setEditing(null)} aria-label="Close editor" autoFocus>×</button></div>
            <form className="editor-form" onSubmit={save}>
              {config.fields.map(([name,label,type="text",required,options]) => (
                <label className={type === "checkbox" ? "check-field" : "field"} key={name}>
                  {type === "checkbox" ? <><input type="checkbox" checked={Boolean(form[name])} onChange={(event) => setForm({ ...form, [name]: event.target.checked })}/><span>{label}</span></> : <><span>{label}</span>{type === "textarea" ? <textarea value={form[name] ?? ""} required={required} onChange={(event) => setForm({ ...form, [name]: event.target.value })}/> : type === "select" ? <select value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })}>{options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select> : type === "category" ? <select value={form[name] ?? ""} onChange={(event) => setForm({ ...form, [name]: event.target.value })}><option value="">Uncategorised</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}{category.visible ? "" : " (hidden)"}</option>)}</select> : ["image","pdf"].includes(type) ? <><input name="media" type="file" accept={type === "image" ? "image/jpeg,image/png,image/webp" : "application/pdf"}/>{form[name] && <small>A file is attached. Choose another to replace it.</small>}</> : <><input type={type} value={form[name] ?? ""} required={required} onChange={(event) => setForm({ ...form, [name]: event.target.value })}/>{resource === "social-links" && name === "url" && siteHost(form[name]) && <span className="social-logo-preview"><SiteLogo url={form[name]} label={form.label}/><span>Logo detected from {siteHost(form[name])}</span></span>}</>}</>}
                </label>
              ))}
              <div className="form-actions"><button className="button no-margin" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
            </form>
          </section>
        </div>
      )}
      {rows.length === 0 ? <div className="panel empty-state"><span className="empty-icon" aria-hidden="true">◇</span><h2>Your canvas is clear</h2><p>No {config.label.toLowerCase()} yet. Add the first one when you are ready.</p></div> : <div className="content-list">{rows.map((row,index) => { const category=resource === "skills" ? categoryOptions.find((item) => Number(item.id) === Number(row.category_id)) : null;return <article className="panel content-row" key={row.id}><div className="row-copy"><span className="row-index">{String(index + 1).padStart(2,"0")}</span><div><h2>{row.title || row.name || row.position || row.degree || row.label}</h2><p className="muted">{category?.name || row.company || row.issuer || row.institution || row.organization || row.summary || (resource === "skills" ? "Uncategorised" : "Ready to edit")}</p></div></div><div className="row-actions"><span className={row.visible ? "pill visible" : "pill"}><i aria-hidden="true"/>{row.visible ? "Live" : "Hidden"}</span><button aria-label="Move up" disabled={index === 0} onClick={() => move(index,-1)}>↑</button><button aria-label="Move down" disabled={index === rows.length - 1} onClick={() => move(index,1)}>↓</button><button onClick={() => start(row)}>Edit</button><button className="danger" onClick={() => remove(row.id)}>Delete</button></div></article>})}</div>}
      <Toast message={message} clear={setMessage} error={error}/>
    </>
  );
}
