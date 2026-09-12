"use client";

import { useState } from "react";
import ProfilePhotoEditor from "./profile-photo-editor";
import MediaField from "./media-field";
import Icon from "../ui/icon";
import Toast from "../ui/toast";

const fields = [["name","Name"],["title","Professional title"],["short_bio","Short bio","textarea"],["long_bio","About","textarea"],["location","Location"],["public_email","Public email","email"],["public_phone","Public phone","tel"]];

export default function ProfileForm({ initial }) {
  const [form,setForm] = useState(initial);
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  const [busy,setBusy] = useState(false);
  const [photoFile,setPhotoFile] = useState(null);
  const [resumeFile,setResumeFile] = useState(null);
  const [savedMedia,setSavedMedia] = useState(initial);

  async function upload(file,kind) {
    if (!file) return null;
    const data = new FormData();
    data.set("file",file);
    data.set("altText",kind === "photo" ? `${form.name || "Profile"} portrait` : "Resume");
    const response = await fetch("/api/admin/media",{ method:"POST",body:data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result.data.id;
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);setMessage("");
    let photo = null;let resume = null;
    try {
      photo = await upload(photoFile,"photo");
      resume = await upload(resumeFile,"resume");
      const payload = { ...form,photo_media_id:photo || form.photo_media_id,resume_media_id:resume || form.resume_media_id };
      const response = await fetch("/api/admin/profile",{ method:"PUT",headers:{ "Content-Type":"application/json" },body:JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await Promise.allSettled(["photo_media_id","resume_media_id"].map((key) => savedMedia[key]).filter((id) => id && id !== payload.photo_media_id && id !== payload.resume_media_id).map((id) => fetch(`/api/admin/media/${id}`, { method:"DELETE" })));
      setForm(payload);setSavedMedia(payload);setPhotoFile(null);setResumeFile(null);setError(false);setMessage("Profile saved successfully.");
    } catch (caught) {
      if (photo) await fetch(`/api/admin/media/${photo}`,{ method:"DELETE" });
      if (resume) await fetch(`/api/admin/media/${resume}`,{ method:"DELETE" });
      setError(true);setMessage(caught instanceof Error ? caught.message : "Could not save your profile.");
    } finally { setBusy(false); }
  }

  return <><form className="panel editor-form profile-editor" onSubmit={save}>{fields.map(([name,label,type="text"]) => <label className="field" key={name}><span>{label}</span>{type === "textarea" ? <textarea value={form[name] || ""} onChange={(event) => setForm({ ...form,[name]:event.target.value })}/> : <input type={type} value={form[name] || ""} onChange={(event) => setForm({ ...form,[name]:event.target.value })}/>}</label>)}<ProfilePhotoEditor currentMediaId={form.photo_media_id} file={photoFile} onFileChange={setPhotoFile} onRemove={() => { setPhotoFile(null); setForm({ ...form, photo_media_id:null }); }}/><MediaField label="Résumé PDF" type="pdf" mediaId={form.resume_media_id} file={resumeFile} onChange={setResumeFile} onRemove={() => { setResumeFile(null); setForm({ ...form, resume_media_id:null }); }}/><div className="form-actions"><button className="button icon-only no-margin" disabled={busy} aria-label={busy ? "Saving profile" : "Save profile"} title="Save profile"><Icon name={busy ? "reset" : "apply"} className={busy ? "icon-spinning" : ""}/></button></div></form><Toast message={message} clear={setMessage} error={error}/></>;
}
