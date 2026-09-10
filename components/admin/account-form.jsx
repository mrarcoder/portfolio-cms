"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPasswordVerifier, createSalt } from "../../lib/auth/browser-password";
import Icon from "../ui/icon";
import PasswordField from "../ui/password-field";
import Toast from "../ui/toast";

export default function AccountForm({ initialUsername }) {
  const router = useRouter();
  const [savedUsername,setSavedUsername] = useState(initialUsername);
  const [username,setUsername] = useState(initialUsername);
  const [currentPassword,setCurrentPassword] = useState("");
  const [newPassword,setNewPassword] = useState("");
  const [confirmPassword,setConfirmPassword] = useState("");
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  const [busy,setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();setMessage("");
    if (newPassword !== confirmPassword) { setError(true);setMessage("New passwords do not match.");return; }
    if (username.toLowerCase() === savedUsername && !newPassword) { setError(true);setMessage("Change the username or enter a new password.");return; }
    setBusy(true);
    try {
      const challengeResponse = await fetch(`/api/auth/challenge?username=${encodeURIComponent(savedUsername)}`, { credentials:"same-origin" });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error);
      const body = {
        username,
        currentPasswordVerifier:await createPasswordVerifier(currentPassword,challenge.data.salt,challenge.data.iterations),
      };
      if (newPassword) {
        body.newSalt = createSalt();
        body.newPasswordVerifier = await createPasswordVerifier(newPassword,body.newSalt);
      }
      const response = await fetch("/api/admin/account", { method:"PUT",headers:{ "Content-Type":"application/json" },body:JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSavedUsername(result.data.user.username);setUsername(result.data.user.username);
      setCurrentPassword("");setNewPassword("");setConfirmPassword("");
      setError(false);setMessage("Administrator credentials updated.");router.refresh();
    } catch (caught) { setError(true);setMessage(caught instanceof Error ? caught.message : "Could not update credentials."); }
    finally { setBusy(false); }
  }

  return <><form className="panel editor-form credentials-form" onSubmit={save}><label className="field"><span>Username</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required minLength="3" maxLength="40" pattern="[A-Za-z0-9_-]+"/><small>3–40 letters, numbers, hyphens, or underscores.</small></label><PasswordField id="current-password" label="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required minLength="12" maxLength="128"/><PasswordField id="new-password" label="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength="12" maxLength="128" hint="Leave blank to keep the current password."/><PasswordField id="confirm-new-password" label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required={Boolean(newPassword)} minLength="12" maxLength="128"/><div className="form-actions"><button className="button icon-only no-margin" disabled={busy} aria-label={busy ? "Updating credentials" : "Update credentials"} title="Update credentials"><Icon name={busy ? "reset" : "apply"} className={busy ? "icon-spinning" : ""}/></button></div></form><Toast message={message} clear={setMessage} error={error}/></>;
}
