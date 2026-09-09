import { cookies } from "next/headers";
import SettingsForm from "../../../components/admin/settings-form";
import { getApi } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getApi("/admin/settings", { cookie:(await cookies()).toString() });
  return (
    <>
      <p className="eyebrow">System controls</p>
      <h1 className="admin-title">Settings</h1>
      <p className="muted">Tune your public experience and search identity.</p>
      <SettingsForm initial={settings}/>
    </>
  );
}
