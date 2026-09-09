"use client";

import { useRouter } from "next/navigation";
import Icon from "../ui/icon";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
    router.refresh();
  }
  return <button className="text-button icon-only" type="button" onClick={logout} aria-label="Sign out" title="Sign out"><Icon name="logout"/></button>;
}
