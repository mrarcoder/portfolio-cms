"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../ui/icon";

const DEFAULT_ADJUSTMENTS = { zoom: 1, x: 50, y: 50, rotation: 0, brightness: 100, contrast: 100 };

function drawCrop(canvas, image, adjustments) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const sideways = Math.abs(adjustments.rotation % 180) === 90;
  const rotatedWidth = sideways ? image.naturalHeight : image.naturalWidth;
  const rotatedHeight = sideways ? image.naturalWidth : image.naturalHeight;
  const scale = Math.max(canvas.width / rotatedWidth, canvas.height / rotatedHeight) * adjustments.zoom;
  const shownWidth = rotatedWidth * scale;
  const shownHeight = rotatedHeight * scale;
  const offsetX = ((50 - adjustments.x) / 50) * Math.max(0, (shownWidth - canvas.width) / 2);
  const offsetY = ((50 - adjustments.y) / 50) * Math.max(0, (shownHeight - canvas.height) / 2);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`;
  context.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
  context.rotate((adjustments.rotation * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
  context.restore();
}

function RangeControl({ label, value, min, max, step = 1, suffix = "", onChange }) {
  return <label className="photo-range"><span>{label}<output>{value}{suffix}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))}/></label>;
}

export default function ProfilePhotoEditor({ currentMediaId, file, onFileChange }) {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode,setMode] = useState(null);
  const [image,setImage] = useState(null);
  const [adjustments,setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [error,setError] = useState("");
  const [processing,setProcessing] = useState(false);
  const localUrl = useMemo(() => file ? URL.createObjectURL(file) : "",[file]);
  const sourceUrl = localUrl || (currentMediaId ? `/api/media/${currentMediaId}` : "");

  useEffect(() => {
    return () => { if (localUrl) URL.revokeObjectURL(localUrl); };
  },[localUrl]);

  useEffect(() => {
    if (mode !== "edit" || !sourceUrl) return undefined;
    const nextImage = new window.Image();
    nextImage.onload = () => { setImage(nextImage); setError(""); };
    nextImage.onerror = () => setError("The photo could not be opened for editing.");
    nextImage.src = sourceUrl;
    return () => { nextImage.onload = null; nextImage.onerror = null; };
  },[mode,sourceUrl]);

  useEffect(() => {
    if (mode === "edit" && image && canvasRef.current) drawCrop(canvasRef.current,image,adjustments);
  },[mode,image,adjustments]);

  useEffect(() => {
    if (!mode) return undefined;
    function closeOnEscape(event) { if (event.key === "Escape") setMode(null); }
    document.addEventListener("keydown",closeOnEscape);
    return () => document.removeEventListener("keydown",closeOnEscape);
  },[mode]);

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    if (selected) onFileChange(selected);
    event.target.value = "";
  }

  function openEditor() {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setImage(null);
    setError("");
    setMode("edit");
  }

  function update(name,value) {
    setAdjustments((current) => ({ ...current,[name]:value }));
  }

  async function applyEdit() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    setProcessing(true);setError("");
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve,"image/webp",.9));
      if (!blob) throw new Error("This browser could not create the edited photo.");
      onFileChange(new File([blob],"profile-photo.webp",{ type:"image/webp" }));
      setMode(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The edited photo could not be created.");
    } finally { setProcessing(false); }
  }

  return <><div className="profile-photo-field">
    <span className="profile-photo-label">Profile photo</span>
    <div className="profile-photo-card">
      <div className="profile-photo-preview">
        {sourceUrl ? <Image src={sourceUrl} width={176} height={220} unoptimized alt="Profile photo preview"/> : <div className="profile-photo-placeholder" aria-label="No profile photo"><span>+</span><small>No photo</small></div>}
      </div>
      <div className="profile-photo-copy">
        <p>{file ? "New photo ready" : currentMediaId ? "Current profile photo" : "Add a profile photo"}</p>
        <small>{file ? "Save the profile to publish this photo." : "JPEG, PNG or WebP · maximum 3 MiB"}</small>
        <div className="profile-photo-actions">
          {sourceUrl && <button className="secondary-button icon-only" type="button" onClick={() => setMode("view")} aria-label="View profile photo" title="View photo"><Icon name="eye"/></button>}
          {sourceUrl && <button className="secondary-button icon-only" type="button" onClick={openEditor} aria-label="Edit profile photo" title="Edit photo"><Icon name="edit"/></button>}
          <button className="secondary-button icon-only" type="button" onClick={() => inputRef.current?.click()} aria-label={sourceUrl ? "Upload a new profile photo" : "Upload a profile photo"} title={sourceUrl ? "Upload new" : "Upload photo"}><Icon name="upload"/></button>
        </div>
      </div>
    </div>
    <input className="sr-only" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile}/>
  </div>{mode && createPortal(<>

    {mode === "view" && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMode(null); }}><div className="modal-card photo-viewer" role="dialog" aria-modal="true" aria-labelledby="photo-view-title"><div className="modal-head"><div><p className="eyebrow">Profile photo</p><h2 id="photo-view-title">Current preview</h2></div><button className="icon-button" type="button" onClick={() => setMode(null)} aria-label="Close photo viewer" title="Close" autoFocus><Icon name="cancel"/></button></div><Image src={sourceUrl} width={800} height={1000} unoptimized alt="Full profile photo preview"/></div></div>}

    {mode === "edit" && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMode(null); }}><div className="modal-card photo-editor-modal" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title"><div className="modal-head"><div><p className="eyebrow">Profile photo</p><h2 id="photo-editor-title">Crop and adjust</h2></div><button className="icon-button" type="button" onClick={() => setMode(null)} aria-label="Close photo editor" title="Close"><Icon name="cancel"/></button></div><div className="photo-editor-layout"><div className="photo-crop-stage">{!image && !error && <span>Loading photo…</span>}<canvas ref={canvasRef} width="640" height="800" aria-label="Edited photo preview"/></div><div className="photo-adjustments"><RangeControl label="Zoom" value={adjustments.zoom} min={1} max={3} step={.05} suffix="×" onChange={(value) => update("zoom",value)}/><RangeControl label="Horizontal" value={adjustments.x} min={0} max={100} suffix="%" onChange={(value) => update("x",value)}/><RangeControl label="Vertical" value={adjustments.y} min={0} max={100} suffix="%" onChange={(value) => update("y",value)}/><RangeControl label="Brightness" value={adjustments.brightness} min={70} max={130} suffix="%" onChange={(value) => update("brightness",value)}/><RangeControl label="Contrast" value={adjustments.contrast} min={70} max={130} suffix="%" onChange={(value) => update("contrast",value)}/><div className="photo-rotate"><span>Rotate</span><div><button className="secondary-button icon-only" type="button" onClick={() => update("rotation",adjustments.rotation - 90)} aria-label="Rotate left" title="Rotate left"><Icon name="rotateLeft"/></button><button className="secondary-button icon-only" type="button" onClick={() => update("rotation",adjustments.rotation + 90)} aria-label="Rotate right" title="Rotate right"><Icon name="rotateRight"/></button></div></div></div></div>{error && <p className="photo-editor-error" role="alert">{error}</p>}<div className="photo-editor-actions"><button className="secondary-button icon-only" type="button" onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)} aria-label="Reset photo adjustments" title="Reset"><Icon name="reset"/></button><button className="button icon-only no-margin" type="button" disabled={!image || processing} onClick={applyEdit} aria-label={processing ? "Applying photo changes" : "Apply photo changes"} title="Apply changes"><Icon name={processing ? "reset" : "apply"} className={processing ? "icon-spinning" : ""}/></button></div></div></div>}
  </>,document.body)}</>;
}
