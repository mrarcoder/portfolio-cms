"use client";

import { useEffect, useMemo, useRef } from "react";
import ProfilePhotoEditor from "./profile-photo-editor";
import MediaViewer from "./media-viewer";
import Icon from "../ui/icon";

export default function MediaField({ label, type, mediaId, file, onChange, onRemove }) {
  const input = useRef(null);
  const localUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);
  if (type === "image") return <ProfilePhotoEditor label={label} currentMediaId={mediaId} file={file} onFileChange={onChange} onRemove={onRemove} width={1200} height={750}/>;
  const source = localUrl || (mediaId ? `/api/media/${mediaId}` : "");
  return <div className="profile-photo-field">
    <span className="profile-photo-label">{label}</span>
    <div className="profile-photo-card">
      <div className="profile-photo-preview attachment-preview">
        {type === "video" && source ? <video src={source} muted playsInline preload="metadata" aria-label={label}/> : <span>{type === "pdf" ? "PDF" : "VIDEO"}</span>}
      </div>
      <div className="profile-photo-copy">
        <p>{file ? file.name : mediaId ? `Current ${label}` : `Add ${label}`}</p>
        <small>{file ? "Save changes to publish this file." : `${type === "pdf" ? "PDF" : "MP4 or WebM"} · maximum 3 MiB`}</small>
        <div className="profile-photo-actions">
          {source && <MediaViewer mediaId={mediaId} sourceUrl={localUrl} type={type} label={label} compact/>}
          <button className="secondary-button icon-only" type="button" onClick={() => input.current?.click()} aria-label={`Replace ${label}`} title={source ? "Edit / replace file" : "Upload file"}><Icon name={source ? "edit" : "upload"}/></button>
          {source && <button className="secondary-button icon-only danger" type="button" onClick={onRemove} aria-label={`Delete ${label}`} title="Delete file"><Icon name="delete"/></button>}
        </div>
      </div>
    </div>
    <input ref={input} className="sr-only" type="file" accept={type === "pdf" ? "application/pdf" : "video/mp4,video/webm"} aria-label={`Upload ${label}`} onChange={(event) => { const selected = event.target.files?.[0]; if (selected) onChange(selected); event.target.value = ""; }}/>
  </div>;
}
