"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

export default function ProjectCard({ project, index }) {
  const videoRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);
  const hasVideo = Boolean(project.video_media_id);

  function playPreview(manual = false) {
    if (!hasVideo || !videoRef.current) return;
    if (!manual && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPreviewing(true);
    videoRef.current.play().catch(() => setPreviewing(false));
  }

  function stopPreview() {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setPreviewing(false);
  }

  function togglePreview(event) {
    event.preventDefault();
    event.stopPropagation();
    if (previewing) stopPreview();
    else playPreview(true);
  }

  return (
    <article
      className={`project-card${previewing ? " is-previewing" : ""}`}
      onPointerEnter={(event) => event.pointerType !== "touch" && playPreview()}
      onPointerLeave={(event) => event.pointerType !== "touch" && stopPreview()}
      onFocus={playPreview}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && stopPreview()}
    >
      <div className="project-media">
        {project.image_media_id ? <Image src={`/api/media/${project.image_media_id}`} width={720} height={450} alt={project.title} unoptimized/> : <div className="project-placeholder"><span>{String(index + 1).padStart(2, "0")}</span></div>}
        <span className="project-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        {hasVideo && <>
          <div className="project-video-shell">
            <video ref={videoRef} src={`/api/media/${project.video_media_id}`} poster={project.image_media_id ? `/api/media/${project.image_media_id}` : undefined} muted loop playsInline preload="metadata" controls={previewing} aria-label={`${project.title} video preview`}/>
            <span className="video-status" aria-hidden="true"><i/> Live preview</span>
          </div>
          <button className="video-preview-button" type="button" onClick={togglePreview} aria-label={previewing ? `Stop ${project.title} video preview` : `Play ${project.title} video preview`}>
            <span aria-hidden="true">{previewing ? "■" : "▶"}</span>{previewing ? " Stop" : " Preview"}
          </button>
        </>}
      </div>
      <div className="project-copy">
        <div className="card-meta"><p>{project.technologies.join(" · ")}</p><span aria-hidden="true">↗</span></div>
        <h2><Link href={`/projects/${project.slug}`}>{project.title}</Link></h2>
        <p>{project.summary}</p>
      </div>
    </article>
  );
}
