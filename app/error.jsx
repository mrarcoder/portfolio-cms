"use client";

export default function ErrorPage({ reset }) {
  return <main id="main" className="container hero"><h1>Something went wrong.</h1><p className="lede">Please try loading this page again.</p><button type="button" className="button" onClick={reset}>Try again</button></main>;
}
