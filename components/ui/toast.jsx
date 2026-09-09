"use client";

import { useEffect } from "react";

export default function Toast({ message, clear, error = false }) {
  useEffect(() => {
    if (!message) return undefined;
    const timeout = setTimeout(() => clear(""), 4200);
    return () => clearTimeout(timeout);
  }, [message, clear]);

  if (!message) return null;
  return (
    <div className={`toast ${error ? "toast-error" : ""}`} role={error ? "alert" : "status"}>
      <span className="toast-icon" aria-hidden="true">{error ? "!" : "✓"}</span>
      <span>{message}</span>
      <button type="button" onClick={() => clear("")} aria-label="Dismiss notification">×</button>
    </div>
  );
}
