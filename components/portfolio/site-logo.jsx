export function siteHost(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

export default function SiteLogo({ url, label }) {
  const host = siteHost(url);
  const initial = (label || host || "?").trim()[0]?.toUpperCase();
  const rootIcon = host ? new URL(url).origin + "/favicon.ico" : "";
  const fallbackIcon = host ? "https://www.google.com/s2/favicons?domain_url=" + encodeURIComponent(url) + "&sz=64" : "";
  const backgrounds = rootIcon ? "url(\"" + rootIcon + "\"), url(\"" + fallbackIcon + "\")" : "";
  return <span className="site-logo" aria-hidden="true"><span>{initial}</span>{backgrounds && <i style={{ backgroundImage:backgrounds }}/>}</span>;
}
