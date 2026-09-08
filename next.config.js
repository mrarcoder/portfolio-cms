const workerUrl = process.env.WORKER_API_URL || "http://127.0.0.1:8787";
const parsed = new URL(workerUrl);
if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
  throw new Error("WORKER_API_URL must be an HTTP(S) origin without a path or credentials.");
}
if (process.env.NODE_ENV === "production" && !process.env.WORKER_API_URL) {
  throw new Error("Set WORKER_API_URL before building for production.");
}

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};

export default nextConfig;
