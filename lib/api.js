import "server-only";

export async function getApi(path, { cookie } = {}) {
  const origin = process.env.WORKER_API_URL || "http://127.0.0.1:8787";
  const response = await fetch(`${origin}/api${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
    headers: cookie ? { Cookie: cookie } : undefined,
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error("The portfolio service is unavailable.");
  return result.data;
}
