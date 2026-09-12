const paths = {
  add: <><path d="M12 5v14M5 12h14"/></>,
  apply: <><path d="m5 12 4 4L19 6"/></>,
  cancel: <><path d="m6 6 12 12M18 6 6 18"/></>,
  delete: <><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></>,
  down: <><path d="m7 10 5 5 5-5"/></>,
  edit: <><path d="M4 20h4l11-11-4-4L4 16v4ZM13.5 6.5l4 4"/></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
  eyeOff: <><path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A9 9 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.1 3M6.6 6.6C4 8.2 2.5 12 2.5 12S6 19 12 19a9 9 0 0 0 3.4-.7"/></>,
  filterClear: <><path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z"/><path d="m17 16 4 4m0-4-4 4"/></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9"/></>,
  left: <><path d="m15 18-6-6 6-6"/></>,
  right: <><path d="m9 18 6-6-6-6"/></>,
  play: <><path d="m9 7 8 5-8 5V7Z"/></>,
  reply: <><path d="m10 8-5 4 5 4v-3h3c3.5 0 5.5 1 7 4-.5-5-3-8-7-8h-3V8Z"/></>,
  reset: <><path d="M4 9V4m0 0h5M4 4l3.4 3.4A8 8 0 1 1 4 13"/></>,
  rotateLeft: <><path d="M5 9V4m0 0h5M5 4l3 3a7 7 0 1 1-2 7"/></>,
  rotateRight: <><path d="M19 9V4m0 0h-5m5 0-3 3a7 7 0 1 0 2 7"/></>,
  upload: <><path d="M12 16V4m0 0-4 4m4-4 4 4M5 14v5h14v-5"/></>,
  up: <><path d="m7 14 5-5 5 5"/></>,
};

export default function Icon({ name, className = "" }) {
  return <svg className={`action-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
