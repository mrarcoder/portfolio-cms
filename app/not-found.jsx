import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="container hero"><p className="eyebrow">404</p><h1>Page not found.</h1><p className="lede">This page doesn’t exist.</p><Link className="button" href="/">Back to portfolio</Link></main>;
}
