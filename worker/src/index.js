import { createPasswordRecord, createSession, getSessionUser, isConfiguredPepper, normalizeUsername, passwordChallenge, revokeSession, tokenHash, validSalt, validUsername, validVerifier, verifyPasswordVerifier } from "./auth.js";
import { json, methodNotAllowed, readJson, requireBrowserOrigin } from "./http.js";
import { adminResource, adminSummary, messages, portfolio, profile, publicProject, reorder, settings, submitMessage } from "./content.js";
import { deleteMedia, serveMedia, uploadMedia } from "./media.js";

function databaseError(error) { return error instanceof Error && /UNIQUE constraint failed: users\.id/.test(error.message); }

async function getSetupStatus(env) {
  const owner = await env.DB.prepare("SELECT id FROM users WHERE id = 1").first();
  return json({ success: true, data: { complete: Boolean(owner) } });
}

async function setup(request, env) {
  if (!requireBrowserOrigin(request, env)) return json({ success: false, error: "Invalid request origin" }, 403);
  const body = await readJson(request);
  if (typeof env.SETUP_TOKEN !== "string" || env.SETUP_TOKEN.length < 32 || !isConfiguredPepper(env.AUTH_PEPPER)) return json({ success: false, error: "Setup is not configured" }, 503);
  if (!body || body.setupToken !== env.SETUP_TOKEN || !validUsername(body.username) || !validSalt(body.salt) || !validVerifier(body.passwordVerifier) || typeof body.siteName !== "string" || !body.siteName.trim() || body.siteName.trim().length > 100) return json({ success: false, error: "Invalid setup details" }, 422);
  if (await env.DB.prepare("SELECT id FROM users WHERE id = 1").first()) return json({ success: false, error: "Setup is already complete" }, 409);
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, username, password_hash) VALUES (1, ?, ?)").bind(normalizeUsername(body.username), await createPasswordRecord(body.passwordVerifier, body.salt, env.AUTH_PEPPER)),
      env.DB.prepare("INSERT INTO settings (key, value_json) VALUES (?, ?)").bind("setup_completed", "true"),
      env.DB.prepare("INSERT INTO settings (key, value_json) VALUES (?, ?)").bind("site_name", JSON.stringify(body.siteName.trim())),
    ]);
    return json({ success: true, data: { complete: true } }, 201);
  } catch (error) {
    if (databaseError(error)) return json({ success: false, error: "Setup is already complete" }, 409);
    return json({ success: false, error: "Setup could not be completed" }, 503);
  }
}

async function loginRate(env, request, username) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `login:${await tokenHash(`${address}:${normalizeUsername(username)}`)}`;
  const now = Math.floor(Date.now() / 1000);
  const current = await env.DB.prepare("SELECT attempt_count, window_end FROM rate_limits WHERE key = ?").bind(key).first();
  return { key, blocked: Boolean(current && current.window_end > now && current.attempt_count >= 5) };
}

async function recordFailedLogin(env, key) {
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + (15 * 60);
  await env.DB.prepare(`INSERT INTO rate_limits (key, attempt_count, window_end) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      attempt_count = CASE WHEN rate_limits.window_end <= ? THEN 1 ELSE rate_limits.attempt_count + 1 END,
      window_end = CASE WHEN rate_limits.window_end <= ? THEN ? ELSE rate_limits.window_end END`)
    .bind(key, windowEnd, now, now, windowEnd).run();
}

async function login(request, env) {
  if (!requireBrowserOrigin(request, env)) return json({ success: false, error: "Invalid request origin" }, 403);
  const body = await readJson(request);
  if (!body || typeof body.username !== "string" || !validVerifier(body.passwordVerifier) || !isConfiguredPepper(env.AUTH_PEPPER)) return json({ success: false, error: "Invalid login details" }, 422);
  const rate = await loginRate(env, request, body.username);
  if (rate.blocked) return json({ success: false, error: "Too many login attempts. Please try again later." }, 429);
  const user = await env.DB.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").bind(normalizeUsername(body.username)).first();
  if (!user || !(await verifyPasswordVerifier(body.passwordVerifier, user.password_hash, env.AUTH_PEPPER))) {
    await recordFailedLogin(env, rate.key);
    return json({ success: false, error: "Invalid username or password" }, 401);
  }
  await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(rate.key).run();
  return json({ success: true, data: { user: { id: user.id, username: user.username } } }, 200, { "Set-Cookie": await createSession(request, env, user.id) });
}

async function challenge(request, env) {
  const username = new URL(request.url).searchParams.get("username") || "";
  const user = await env.DB.prepare("SELECT password_hash FROM users WHERE username = ?").bind(normalizeUsername(username)).first();
  const knownChallenge = user ? passwordChallenge(user.password_hash) : null;
  const salt = knownChallenge?.salt || btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return json({ success: true, data: { algorithm: "PBKDF2-SHA-256", iterations: 600000, salt } });
}

async function me(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ success: false, error: "Authentication required" }, 401);
  return json({ success: true, data: { user } });
}

async function logout(request, env) {
  if (!requireBrowserOrigin(request, env)) return json({ success: false, error: "Invalid request origin" }, 403);
  return json({ success: true, data: {} }, 200, { "Set-Cookie": await revokeSession(request, env) });
}

async function updateAccount(request, env) {
  if (!requireBrowserOrigin(request, env)) return json({ success: false, error: "Invalid request origin" }, 403);
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) return json({ success: false, error: "Authentication required" }, 401);
  if (!isConfiguredPepper(env.AUTH_PEPPER)) return json({ success: false, error: "Account security is not configured" }, 503);

  const body = await readJson(request, 1000);
  const changesPassword = Boolean(body && (body.newPasswordVerifier || body.newSalt));
  if (!body || !validUsername(body.username) || !validVerifier(body.currentPasswordVerifier)
    || (changesPassword && (!validVerifier(body.newPasswordVerifier) || !validSalt(body.newSalt)))) {
    return json({ success: false, error: "Invalid account details" }, 422);
  }

  const username = normalizeUsername(body.username);
  if (username === sessionUser.username && !changesPassword) return json({ success: false, error: "No account changes to save" }, 422);
  const user = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(sessionUser.id).first();
  if (!user || !(await verifyPasswordVerifier(body.currentPasswordVerifier, user.password_hash, env.AUTH_PEPPER))) {
    return json({ success: false, error: "Current password is incorrect" }, 401);
  }

  const passwordHash = changesPassword
    ? await createPasswordRecord(body.newPasswordVerifier, body.newSalt, env.AUTH_PEPPER)
    : user.password_hash;
  const statements = [env.DB.prepare("UPDATE users SET username = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(username, passwordHash, sessionUser.id)];
  if (changesPassword) statements.push(env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(sessionUser.id));
  await env.DB.batch(statements);
  const headers = changesPassword ? { "Set-Cookie": await createSession(request, env, sessionUser.id) } : {};
  return json({ success: true, data: { user: { id: sessionUser.id, username } } }, 200, headers);
}

async function health(env) {
  try {
    await env.DB.prepare("SELECT id FROM users LIMIT 1").first();
    await env.MEDIA.head("__readiness__");
    return json({ success: true, data: { status: "ready" } });
  } catch { return json({ success: false, error: "Service unavailable" }, 503); }
}

const worker = {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/health") return request.method === "GET" ? health(env) : methodNotAllowed(["GET"]);
    if (path === "/api/setup/status") return request.method === "GET" ? getSetupStatus(env) : methodNotAllowed(["GET"]);
    if (path === "/api/setup") return request.method === "POST" ? setup(request, env) : methodNotAllowed(["POST"]);
    if (path === "/api/auth/login") return request.method === "POST" ? login(request, env) : methodNotAllowed(["POST"]);
    if (path === "/api/auth/challenge") return request.method === "GET" ? challenge(request, env) : methodNotAllowed(["GET"]);
    if (path === "/api/auth/me") return request.method === "GET" ? me(request, env) : methodNotAllowed(["GET"]);
    if (path === "/api/auth/logout") return request.method === "POST" ? logout(request, env) : methodNotAllowed(["POST"]);
    if(path==="/api/portfolio")return request.method==="GET"?portfolio(env):methodNotAllowed(["GET"]);
    if(path==="/api/messages")return request.method==="POST"?submitMessage(request,env):methodNotAllowed(["POST"]);
    if(path==="/api/admin/profile")return profile(request,env);
    if(path==="/api/admin/settings")return settings(request,env);
    if(path==="/api/admin/account")return request.method==="PUT"?updateAccount(request,env):methodNotAllowed(["PUT"]);
    if(path==="/api/admin/summary")return request.method==="GET"?adminSummary(request,env):methodNotAllowed(["GET"]);
    if(path==="/api/admin/media")return request.method==="POST"?uploadMedia(request,env):methodNotAllowed(["POST"]);
    const mediaMatch=path.match(/^\/api\/(?:admin\/)?media\/(\d+)$/);if(mediaMatch)return path.includes("/admin/")&&request.method==="DELETE"?deleteMedia(request,env,Number(mediaMatch[1])):request.method==="GET"?serveMedia(request,env,Number(mediaMatch[1])):methodNotAllowed(["GET","DELETE"]);
    const projectMatch=path.match(/^\/api\/projects\/([a-z0-9-]+)$/);if(projectMatch)return request.method==="GET"?publicProject(env,projectMatch[1]):methodNotAllowed(["GET"]);
    const inboxMatch=path.match(/^\/api\/admin\/messages(?:\/(\d+)(\/read)?)?$/);if(inboxMatch)return messages(request,env,inboxMatch[1]&&Number(inboxMatch[1]),Boolean(inboxMatch[2]));
    const orderMatch=path.match(/^\/api\/admin\/([a-z-]+)\/order$/);if(orderMatch)return request.method==="PUT"?reorder(request,env,orderMatch[1]):methodNotAllowed(["PUT"]);
    const resourceMatch=path.match(/^\/api\/admin\/([a-z-]+)(?:\/(\d+))?$/);if(resourceMatch)return adminResource(request,env,resourceMatch[1],resourceMatch[2]&&Number(resourceMatch[2]));
    return json({ success: false, error: "Not found" }, 404);
  },
};

export default worker;
