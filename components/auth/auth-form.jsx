"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPasswordVerifier, createSalt } from "../../lib/auth/browser-password";
import Toast from "../ui/toast";

function Field({ id, label, type = "text", value, onChange, autoComplete, hint }) {
  return <label className="field" htmlFor={id}><span>{label}</span><input id={id} type={type} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={type === "password" ? 12 : undefined} maxLength={type === "password" ? 128 : undefined} />{hint && <small>{hint}</small>}</label>;
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isSetup = mode === "setup";
  const [siteName, setSiteName] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      let body;
      if (isSetup) {
        const salt = createSalt();
        body = { siteName, setupToken, username, salt, passwordVerifier: await createPasswordVerifier(password, salt) };
      } else {
        const challengeResponse = await fetch(`/api/auth/challenge?username=${encodeURIComponent(username)}`, { credentials: "same-origin" });
        const challenge = await challengeResponse.json();
        if (!challengeResponse.ok || !challenge.success) throw new Error(challenge.error || "Your request could not be completed.");
        body = { username, passwordVerifier: await createPasswordVerifier(password, challenge.data.salt, challenge.data.iterations) };
      }
      const response = await fetch(isSetup ? "/api/setup" : "/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Your request could not be completed.");
      router.replace(isSetup ? "/login?created=1" : "/admin");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your request could not be completed.");
    } finally { setSubmitting(false); }
  }

  return <form className="auth-form" onSubmit={submit}>
    {isSetup && <><Field id="site-name" label="Site name" value={siteName} onChange={(event) => setSiteName(event.target.value)} autoComplete="organization" /><Field id="setup-token" label="Setup token" type="password" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} autoComplete="off" hint="Keep this deployment secret private." /></>}
    <Field id="username" label="Username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" hint="3–40 letters, numbers, hyphens, or underscores." />
    <Field id="password" label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSetup ? "new-password" : "current-password"} hint="Use at least 12 characters." />
    <button className="button" type="submit" disabled={submitting}>{submitting ? "Please wait…" : isSetup ? "Create administrator" : "Sign in"}</button>
    <Toast message={message} clear={setMessage} error />
  </form>;
}
