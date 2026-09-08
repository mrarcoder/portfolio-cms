const methodsWithBodies = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function proxy(request, { params }) {
  const { path } = await params;
  const workerOrigin = process.env.WORKER_API_URL || "http://127.0.0.1:8787";
  const incoming = new URL(request.url);
  const target = new URL(`/api/${path.join("/")}${incoming.search}`, workerOrigin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("cf-connecting-ip");
  headers.delete("accept-encoding");
  headers.delete("connection");

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: methodsWithBodies.has(request.method) ? request.body : undefined,
      duplex: methodsWithBodies.has(request.method) ? "half" : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ success: false, error: "The portfolio service is unavailable." }, { status: 503 });
  }
}

export const dynamic = "force-dynamic";
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
