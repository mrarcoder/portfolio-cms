"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fromRecord, resources, toPayload } from "../../lib/admin/resources";
import SiteLogo, { siteHost } from "../portfolio/site-logo";
import Icon from "../ui/icon";
import MediaField from "./media-field";
import ProjectGalleryField from "./project-gallery-field";
import Toast from "../ui/toast";

function blank(fields) {
  return Object.fromEntries(fields.map(([name,,type,,options]) => [name, type === "checkbox" ? false : type === "select" ? options[0] : type === "gallery" ? [] : ""]));
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
  const [files, setFiles] = useState({});

  useEffect(() => {
    if (!editing) return undefined;
    const previousOverflow = document.body.style.overflow;
    const close = (event) => { if (event.key === "Escape" && !document.querySelector("[data-media-viewer]")) setEditing(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow;window.removeEventListener("keydown", close); };
  }, [editing]);

  function start(row) {
    setFiles(resource === "projects" ? { gallery_media:(row?.media || []).map((item) => ({ ...item,key:`saved-${item.id}` })) } : {});
    setEditing(row?.id || "new");
    setForm(row ? fromRecord(resource, row) : blank(config.fields));
  }

  async function save(event) {
    event.preventDefault();
    const isNew = editing === "new";
    const payload = toPayload(resource, form);
    const fileFields = config.fields.filter(([, , type]) => ["image", "pdf", "video"].includes(type));
    const selectedFiles = fileFields.map(([field]) => ({ field, file: files[field] })).filter(({ file }) => file);
    const uploads = [];
    setBusy(true);
    setMessage("");
    try {
      for (const { field, file } of selectedFiles) {
        const media = new FormData();
        media.set("file", file);
        media.set("altText", form.title || form.name || "Portfolio media");
        const upload = await fetch("/api/admin/media", { method: "POST", body: media });
        const uploaded = await upload.json();
        if (!upload.ok) throw new Error(uploaded.error);
        uploads.push({ field, id: uploaded.data.id, previousId: form[field] });
        payload[field] = uploaded.data.id;
      }
      if (resource === "projects") {
        const gallery = [];
        for (const item of files.gallery_media || []) {
          let id = item.id;
          if (item.file) {
            const media = new FormData();
            media.set("file",item.file);
            media.set("altText",form.title || "Project media");
            const upload = await fetch("/api/admin/media",{ method:"POST",body:media });
            const uploaded = await upload.json();
            if (!upload.ok) throw new Error(uploaded.error);
            id = uploaded.data.id;
            uploads.push({ field:"gallery_media",id });
          }
          if (id) gallery.push({ id:Number(id),type:item.type });
        }
        payload.gallery_media = gallery;
        payload.image_media_id = gallery.find((item) => item.type === "image")?.id || null;
        payload.video_media_id = gallery.find((item) => item.type === "video")?.id || null;
      }
      const response = await fetch(`/api/admin/${resource}${isNew ? "" : `/${editing}`}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const previous = rows.find((row) => row.id === editing);
      const currentIds = resource === "projects" ? new Set(payload.gallery_media.map((item) => Number(item.id))) : new Set(fileFields.map(([field]) => Number(payload[field])).filter(Boolean));
      const previousIds = resource === "projects" ? (previous?.media || []).map((item) => item.id) : fileFields.map(([field]) => previous?.[field]);
      await Promise.allSettled(previousIds.filter((id) => id && !currentIds.has(Number(id))).map((id) => fetch(`/api/admin/media/${id}`, { method: "DELETE" })));
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
      await Promise.allSettled(uploads.map(({ id }) => fetch(`/api/admin/media/${id}`, { method: "DELETE" })));
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
        <button className="button icon-only no-margin" onClick={() => start()} aria-label={`Add ${config.singular}`} title={`Add ${config.singular}`}><Icon name="add"/></button>
      </div>
      {editing && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="modal-head"><div><p className="eyebrow">{editing === "new" ? "Create new" : "Edit item"}</p><h2 id="editor-title">{config.singular[0].toUpperCase()}{config.singular.slice(1)}</h2></div><button className="icon-button" type="button" onClick={() => setEditing(null)} aria-label="Close editor" title="Close" autoFocus><Icon name="cancel"/></button></div>
            <form className="editor-form" onSubmit={save}>
              {config.fields.map(([name,label,type="text",required,options]) => {
                if (type === "checkbox") return <label className="check-field" key={name}><input type="checkbox" checked={Boolean(form[name])} onChange={(event) => setForm({ ...form, [name]: event.target.checked })}/><span>{label}</span></label>;
                if (["image","pdf","video"].includes(type)) return <MediaField key={name} label={label} type={type} mediaId={form[name]} file={files[name]} onChange={(file) => setFiles((current) => ({ ...current, [name]: file }))} onRemove={() => { setFiles((current) => ({ ...current, [name]: null })); setForm((current) => ({ ...current, [name]: null })); }}/>;
                if (type === "gallery") return <ProjectGalleryField key={name} items={files.gallery_media || []} onChange={(gallery_media) => setFiles((current) => ({ ...current,gallery_media }))}/>;
                return <label className="field" key={name}><span>{label}</span>{type === "textarea" ? <textarea value={form[name] ?? ""} required={required} onChange={(event) => setForm({ ...form, [name]: event.target.value })}/> : type === "select" ? <select value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })}>{options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select> : type === "category" ? <select value={form[name] ?? ""} onChange={(event) => setForm({ ...form, [name]: event.target.value })}><option value="">Uncategorised</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}{category.visible ? "" : " (hidden)"}</option>)}</select> : <><input type={type} value={form[name] ?? ""} required={required} onChange={(event) => setForm({ ...form, [name]: event.target.value })}/>{resource === "social-links" && name === "url" && siteHost(form[name]) && <span className="social-logo-preview"><SiteLogo url={form[name]} label={form.label}/><span>Logo detected from {siteHost(form[name])}</span></span>}</>}</label>;
              })}
              <div className="form-actions"><button className="button icon-only no-margin" type="submit" disabled={busy} aria-label={busy ? "Saving changes" : "Save changes"} title="Save changes"><Icon name="apply" className={busy ? "icon-spinning" : ""}/></button><button className="secondary-button icon-only" type="button" onClick={() => setEditing(null)} aria-label="Cancel changes" title="Cancel"><Icon name="cancel"/></button></div>
            </form>
          </section>
        </div>
      )}
      {rows.length === 0 ? <div className="panel empty-state"><span className="empty-icon" aria-hidden="true">◇</span><h2>Your canvas is clear</h2><p>No {config.label.toLowerCase()} yet. Add the first one when you are ready.</p></div> : <div className="content-list">{rows.map((row,index) => { const category=resource === "skills" ? categoryOptions.find((item) => Number(item.id) === Number(row.category_id)) : null;return <article className="panel content-row" key={row.id}><div className="row-copy"><span className="row-index">{String(index + 1).padStart(2,"0")}</span><div><h2>{row.title || row.name || row.position || row.degree || row.label}</h2><p className="muted">{category?.name || row.company || row.issuer || row.institution || row.organization || row.summary || (resource === "skills" ? "Uncategorised" : "Ready to edit")}</p></div></div><div className="row-actions"><span className={row.visible ? "pill visible" : "pill"}><i aria-hidden="true"/>{row.visible ? "Live" : "Hidden"}</span><button aria-label="Move up" title="Move up" disabled={index === 0} onClick={() => move(index,-1)}><Icon name="up"/></button><button aria-label="Move down" title="Move down" disabled={index === rows.length - 1} onClick={() => move(index,1)}><Icon name="down"/></button><button aria-label={`Edit ${row.title || row.name || row.position || row.degree || row.label}`} title="Edit" onClick={() => start(row)}><Icon name="edit"/></button><button className="danger" aria-label={`Delete ${row.title || row.name || row.position || row.degree || row.label}`} title="Delete" onClick={() => remove(row.id)}><Icon name="delete"/></button></div></article>})}</div>}
      <Toast message={message} clear={setMessage} error={error}/>
    </>
  );
}
