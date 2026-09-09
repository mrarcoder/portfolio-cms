import { cookies } from "next/headers";
import ProfileForm from "../../../components/admin/profile-form";
import { getApi } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getApi("/admin/profile", { cookie:(await cookies()).toString() });
  return (
    <>
      <p className="eyebrow">Identity layer</p>
      <h1 className="admin-title">Profile</h1>
      <p className="muted">Shape the introduction people see first.</p>
      <ProfileForm initial={profile}/>
    </>
  );
}
