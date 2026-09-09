import { redirect } from "next/navigation";
import AuthForm from "../../components/auth/auth-form";
import { getApi } from "../../lib/api";

export const metadata = { title: "Set up", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  try {
    const setup = await getApi("/setup/status");
    if (setup.complete) redirect("/login");
  } catch {
    return <main id="main" className="auth-shell"><section className="auth-card"><p className="eyebrow">Initial setup</p><h1>Setup is unavailable.</h1><p className="lede">The portfolio service could not be reached. Start the Worker and try again.</p></section></main>;
  }
  return <main id="main" className="auth-shell"><section className="auth-card"><p className="eyebrow">Initial setup</p><h1>Make it yours.</h1><p className="muted">Create the one administrator account for this portfolio. Setup is permanently locked after this step.</p><AuthForm mode="setup" /></section></main>;
}
