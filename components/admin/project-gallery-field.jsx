"use client";

import { useRef } from "react";
import Icon from "../ui/icon";
import MediaField from "./media-field";

function itemType(file) { return file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null; }

export default function ProjectGalleryField({ items, onChange }) {
  const input = useRef(null);

  function addFiles(event) {
    const available = Math.max(0,20 - items.length);
    const additions = Array.from(event.target.files || []).map((file) => ({ key:crypto.randomUUID(),type:itemType(file),file,name:file.name })).filter((item) => item.type).slice(0,available);
    if (additions.length) onChange([...items,...additions]);
    event.target.value = "";
  }

  function update(key, values) { onChange(items.map((item) => item.key === key ? { ...item,...values } : item)); }
  function remove(key) { onChange(items.filter((item) => item.key !== key)); }

  return <section className="project-gallery-field">
    <div className="project-gallery-heading">
      <div><span className="profile-photo-label">Project gallery</span><small>Add up to 20 images or videos. The first image is the card cover and the first video is its hover preview.</small></div>
      <button className="secondary-button icon-only" type="button" disabled={items.length >= 20} onClick={() => input.current?.click()} aria-label="Upload project photos or videos" title="Upload media"><Icon name="upload"/></button>
    </div>
    {items.length ? <div className="project-gallery-list">{items.map((item,index) => <div className="project-gallery-item" key={item.key}>
      <span className="project-gallery-index">{String(index + 1).padStart(2,"0")}</span>
      <MediaField label={item.type === "image" ? "Project image" : "Project video"} type={item.type} mediaId={item.id} file={item.file} onChange={(file) => update(item.key,{ file,name:file.name })} onRemove={() => remove(item.key)}/>
      <div className="project-gallery-order">
        <button type="button" disabled={index === 0} onClick={() => { const next=[...items];[next[index - 1],next[index]]=[next[index],next[index - 1]];onChange(next); }} aria-label="Move media up" title="Move up"><Icon name="up"/></button>
        <button type="button" disabled={index === items.length - 1} onClick={() => { const next=[...items];[next[index + 1],next[index]]=[next[index],next[index + 1]];onChange(next); }} aria-label="Move media down" title="Move down"><Icon name="down"/></button>
      </div>
    </div>)}</div> : <button className="project-gallery-empty" type="button" onClick={() => input.current?.click()}><Icon name="upload"/><span>Upload photos or videos</span></button>}
    <input ref={input} className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={addFiles}/>
  </section>;
}
