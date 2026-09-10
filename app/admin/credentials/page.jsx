import { cookies } from "next/headers";
import AccountForm from "../../../components/admin/account-form";
import { getApi } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  const session = await getApi("/auth/me", { cookie:(await cookies()).toString() });
  return (
    <>
      <p className="eyebrow">Restricted controls</p>
      <h1 className="admin-title">Administrator credentials</h1>
      <p className="muted">Change the private login details for this portfolio.</p>
      <AccountForm initialUsername={session.user.username}/>
    </>
  );
}
