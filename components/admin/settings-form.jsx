"use client";

import { useState } from "react";
import Icon from "../ui/icon";
import Toast from "../ui/toast";

const sectionNames = ["experience","education","skills","projects","achievements","certifications","contact"];

export default function SettingsForm({ initial }) {
  const [form,setForm] = useState(initial);
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  const [busy,setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();setBusy(true);setMessage("");
    try {
      const response = await fetch("/api/admin/settings",{ method:"PUT",headers:{ "Content-Type":"application/json" },body:JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setError(false);setMessage("Settings saved successfully.");
    } catch (caught) { setError(true);setMessage(caught instanceof Error ? caught.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  return <>
    <form className="panel editor-form settings-editor" onSubmit={save}>
      <section className="form-section"><div className="form-section-heading"><span><Icon name="project"/></span><div><h2>Site identity</h2><p>Basic information used throughout the public portfolio.</p></div></div><div className="form-section-grid"><label className="field"><span>Site name</span><input value={form.site_name || ""} onChange={(event) => setForm({ ...form,site_name:event.target.value })}/></label><label className="field"><span>Site URL</span><input type="url" placeholder="https://example.com" value={form.site_url || ""} onChange={(event) => setForm({ ...form,site_url:event.target.value })}/></label><label className="field field-wide"><span>Site description</span><textarea value={form.site_description || ""} onChange={(event) => setForm({ ...form,site_description:event.target.value })}/></label></div></section>
      <section className="form-section"><div className="form-section-heading"><span><Icon name="spark"/></span><div><h2>Appearance</h2><p>Choose the main accent and portfolio color mode.</p></div></div><div className="form-section-grid"><label className="field color-field"><span>Primary color</span><span className="color-control"><input type="color" value={form.primary_color || "#70f0c0"} onChange={(event) => setForm({ ...form,primary_color:event.target.value })}/><code>{form.primary_color || "#70f0c0"}</code></span></label><label className="field"><span>Portfolio mode</span><select value={form.color_mode || "dark"} onChange={(event) => setForm({ ...form,color_mode:event.target.value })}><option value="dark">Dark</option><option value="light">Light</option></select></label></div></section>
      <section className="form-section"><div className="form-section-heading"><span><Icon name="eye"/></span><div><h2>Public sections</h2><p>Control which content areas appear in the navigation and portfolio.</p></div></div><div className="section-toggle-grid">{sectionNames.map((name) => <label className="section-toggle" key={name}><span>{name[0].toUpperCase() + name.slice(1)}</span><input type="checkbox" checked={form.enabled_sections?.[name] !== false} onChange={(event) => setForm({ ...form,enabled_sections:{ ...form.enabled_sections,[name]:event.target.checked } })}/></label>)}</div></section>
      <section className="form-section"><div className="form-section-heading"><span><Icon name="settings"/></span><div><h2>Search identity</h2><p>Title and description shown by search engines and shared links.</p></div></div><div className="form-section-grid"><label className="field"><span>SEO title</span><input value={form.seo_title || ""} onChange={(event) => setForm({ ...form,seo_title:event.target.value })}/></label><label className="field"><span>SEO description</span><textarea value={form.seo_description || ""} onChange={(event) => setForm({ ...form,seo_description:event.target.value })}/></label></div></section>
      <div className="form-actions"><button className="button icon-only no-margin" disabled={busy} aria-label={busy ? "Saving settings" : "Save settings"} title="Save settings"><Icon name={busy ? "reset" : "apply"} className={busy ? "icon-spinning" : ""}/></button><span>Save settings</span></div>
    </form>
    <Toast message={message} clear={setMessage} error={error}/>
  </>;
}
