"use client";

import { useState } from "react";
import Toast from "./toast";

export default function ContactForm() {
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  const [busy,setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);setMessage("");
    try {
      const response = await fetch("/api/messages",{ method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      element.reset();setError(false);setMessage("Message sent. I’ll get back to you soon.");
    } catch (caught) { setError(true);setMessage(caught instanceof Error ? caught.message : "Could not send your message."); }
    finally { setBusy(false); }
  }
  return <><form className="contact-form glass-form" onSubmit={submit}><div className="form-two"><label className="field"><span>Name</span><input name="name" required maxLength="100"/></label><label className="field"><span>Email</span><input name="email" type="email" required maxLength="200"/></label></div><label className="field"><span>Subject</span><input name="subject" maxLength="200"/></label><label className="field"><span>Message</span><textarea name="message" required maxLength="3000"/></label><label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off"/></label><button className="button no-margin" disabled={busy}>{busy ? "Sending…" : "Send message"}<span aria-hidden="true">↗</span></button></form><Toast message={message} clear={setMessage} error={error}/></>;
}
