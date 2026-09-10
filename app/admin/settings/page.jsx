import { cookies } from "next/headers";
import AccountForm from "../../../components/admin/account-form";
import SettingsForm from "../../../components/admin/settings-form";
import { getApi } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookie = (await cookies()).toString();
  const [settings, session] = await Promise.all([
    getApi("/admin/settings", { cookie }),
    getApi("/auth/me", { cookie }),
  ]);
  return (
    <>
      <p className="eyebrow">System controls</p>
      <h1 className="admin-title">Settings</h1>
      <p className="muted">Tune your public experience and search identity.</p>
      <SettingsForm initial={settings}/>
      <AccountForm initialUsername={session.user.username}/>
    </>
  );
}
