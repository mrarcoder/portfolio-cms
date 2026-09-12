"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../ui/icon";

export default function MediaViewer({ mediaId, type, label }) {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfError, setPdfError] = useState("");
  const url = mediaId ? `/api/media/${mediaId}` : "";
  const titleId = `media-view-${mediaId}-${type}`;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const close = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || type !== "pdf") return undefined;
    const controller = new AbortController();
    let objectUrl = "";
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the PDF preview.");
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPdfError("Could not load the PDF preview.");
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPdfUrl("");
      setPdfError("");
    };
  }, [open, type, url]);

  if (!mediaId) return null;

  return <>
    <div className="current-media-row">
      <span>Current file attached</span>
      <button className="secondary-button icon-only" type="button" onClick={() => setOpen(true)} aria-label={`View current ${label}`} title={`View current ${label}`}><Icon name="eye"/></button>
    </div>
    {open && createPortal(<div className="modal-backdrop media-viewer-backdrop" data-media-viewer role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="modal-card media-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head"><div><p className="eyebrow">Attached media</p><h2 id={titleId}>{label}</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close media viewer" title="Close" autoFocus><Icon name="cancel"/></button></div>
        <div className={`media-viewer-stage media-viewer-${type}`}>
          {type === "image" && <Image src={url} width={1200} height={800} unoptimized alt={`Current ${label}`}/>}
          {type === "video" && <video src={url} controls autoPlay muted playsInline>Current {label}</video>}
          {type === "pdf" && (pdfUrl ? <iframe src={pdfUrl} title={`Current ${label}`}/> : <p role={pdfError ? "alert" : "status"}>{pdfError || "Loading PDF…"}</p>)}
        </div>
      </section>
    </div>, document.body)}
  </>;
}
