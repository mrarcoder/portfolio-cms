import Link from "next/link";
import AuthForm from "../../components/auth-form";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  return <main id="main" className="auth-shell"><section className="auth-card"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">p</span><span>portfolio<span className="font-normal text-[var(--muted)]"> / cms</span></span></Link><p className="eyebrow">Administrator access</p><h1>Welcome back.</h1>{params.created === "1" && <p className="form-success" role="status">Your administrator account is ready. Sign in to continue.</p>}<AuthForm mode="login" /><p className="muted auth-help">First deployment? <Link href="/setup">Set up your portfolio.</Link></p></section></main>;
}
