"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../ui/icon";

function galleryFor(project) {
  if (project.media?.length) return project.media;
  return [project.image_media_id && { id:project.image_media_id,type:"image",original_name:project.title },project.video_media_id && { id:project.video_media_id,type:"video",original_name:`${project.title} video` }].filter(Boolean);
}

export default function ProjectCard({ project, index }) {
  const videoRef = useRef(null);
  const gallery = useMemo(() => galleryFor(project),[project]);
  const [previewing,setPreviewing] = useState(false);
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(0);
  const hasVideo = Boolean(project.video_media_id);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    function keys(event) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setActive((value) => (value - 1 + gallery.length) % gallery.length);
      if (event.key === "ArrowRight") setActive((value) => (value + 1) % gallery.length);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown",keys);
    return () => { document.body.style.overflow = previous;window.removeEventListener("keydown",keys); };
  },[open,gallery.length]);

  function playPreview(manual = false) {
    if (!hasVideo || !videoRef.current || open) return;
    if (!manual && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPreviewing(true);
    videoRef.current.play().catch(() => setPreviewing(false));
  }

  function stopPreview() { if (!videoRef.current) return;videoRef.current.pause();videoRef.current.currentTime = 0;setPreviewing(false); }
  function togglePreview(event) { event.preventDefault();event.stopPropagation();if (previewing) stopPreview();else playPreview(true); }
  function showGallery(start = 0) { if (!gallery.length) return;stopPreview();setActive(start);setOpen(true); }

  const current = gallery[active];
  return <>
    <article className={`project-card${previewing ? " is-previewing" : ""}`} onClick={(event) => { if (!event.target.closest("a,button,video")) showGallery(); }} onPointerEnter={(event) => event.pointerType !== "touch" && playPreview()} onPointerLeave={(event) => event.pointerType !== "touch" && stopPreview()} onFocus={playPreview} onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && stopPreview()}>
      <div className="project-media">
        {project.image_media_id ? <Image src={`/api/media/${project.image_media_id}`} width={720} height={450} alt={project.title} unoptimized/> : <div className="project-placeholder"><span>{String(index + 1).padStart(2,"0")}</span></div>}
        <span className="project-number" aria-hidden="true">{String(index + 1).padStart(2,"0")}</span>
        {hasVideo && <><div className="project-video-shell"><video ref={videoRef} src={`/api/media/${project.video_media_id}`} poster={project.image_media_id ? `/api/media/${project.image_media_id}` : undefined} muted loop playsInline preload="metadata" controls={previewing} aria-label={`${project.title} video preview`}/><span className="video-status" aria-hidden="true"><i/> Live preview</span></div><button className="video-preview-button" type="button" onClick={togglePreview} aria-label={previewing ? `Stop ${project.title} video preview` : `Play ${project.title} video preview`}><span aria-hidden="true">{previewing ? "■" : "▶"}</span>{previewing ? " Stop" : " Preview"}</button></>}
      </div>
      <div className="project-copy">
        <div className="card-meta"><p>{project.technologies.join(" · ")}</p>{gallery.length > 0 && <button className="project-gallery-button" type="button" onClick={() => showGallery()} aria-label={`View ${project.title} gallery`} title="View gallery"><Icon name="eye"/><span>{gallery.length}</span></button>}</div>
        <h2><Link href={`/projects/${project.slug}`}>{project.title}</Link></h2><p>{project.summary}</p>
      </div>
    </article>
    {open && current && createPortal(<div className="project-carousel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="project-carousel" role="dialog" aria-modal="true" aria-labelledby={`gallery-title-${project.id}`}>
        <header><div><span>Project gallery · {active + 1}/{gallery.length}</span><h2 id={`gallery-title-${project.id}`}>{project.title}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close project gallery" title="Close" autoFocus><Icon name="cancel"/></button></header>
        <div className="project-carousel-stage">
          {current.type === "image" ? <Image key={current.id} src={`/api/media/${current.id}`} width={1400} height={900} alt={current.original_name || project.title} unoptimized/> : <video key={current.id} src={`/api/media/${current.id}`} controls autoPlay playsInline preload="metadata" aria-label={current.original_name || `${project.title} video`}/>}
          {gallery.length > 1 && <><button className="carousel-arrow previous" type="button" onClick={() => setActive((active - 1 + gallery.length) % gallery.length)} aria-label="Previous media"><Icon name="left"/></button><button className="carousel-arrow next" type="button" onClick={() => setActive((active + 1) % gallery.length)} aria-label="Next media"><Icon name="right"/></button></>}
        </div>
        {gallery.length > 1 && <div className="project-carousel-thumbs" aria-label="Choose project media">{gallery.map((item,itemIndex) => <button className={itemIndex === active ? "active" : ""} key={item.id} type="button" onClick={() => setActive(itemIndex)} aria-label={`View ${item.type} ${itemIndex + 1}`}>{item.type === "image" ? <Image src={`/api/media/${item.id}`} width={120} height={72} alt="" unoptimized/> : <span><Icon name="play"/></span>}</button>)}</div>}
      </section>
    </div>,document.body)}
  </>;
}
