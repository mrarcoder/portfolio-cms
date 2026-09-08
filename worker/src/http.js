export function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders } });
}

export function requireBrowserOrigin(request, env) { return request.headers.get("Origin") === env.FRONTEND_ORIGIN; }

export async function readJson(request, maxBytes = 10_000) {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export function methodNotAllowed(allowed) { return json({ success: false, error: "Method not allowed" }, 405, { Allow: allowed.join(", ") }); }
