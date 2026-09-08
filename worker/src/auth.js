const encoder = new TextEncoder();
export const PASSWORD_ITERATIONS = 600000;
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_FORMAT = "browser-pbkdf2-sha256-hmac-v1";

function encodeBase64Url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

async function hmac(value, pepper) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, value));
}

export function isConfiguredPepper(pepper) { return typeof pepper === "string" && pepper.length >= 32; }

export function validVerifier(value) {
  try { return typeof value === "string" && value.length <= 128 && decodeBase64Url(value).length === 32; } catch { return false; }
}

export function validSalt(value) {
  try { return typeof value === "string" && value.length <= 64 && decodeBase64Url(value).length === 16; } catch { return false; }
}

export async function createPasswordRecord(verifier, salt, pepper) {
  return `${PASSWORD_FORMAT}$${PASSWORD_ITERATIONS}$${salt}$${encodeBase64Url(await hmac(decodeBase64Url(verifier), pepper))}`;
}

export function passwordChallenge(storedValue) {
  const [format, iterations, salt] = storedValue.split("$");
  return format === PASSWORD_FORMAT && Number(iterations) === PASSWORD_ITERATIONS && validSalt(salt) ? { iterations: PASSWORD_ITERATIONS, salt } : null;
}

export async function verifyPasswordVerifier(verifier, storedValue, pepper) {
  const challenge = passwordChallenge(storedValue);
  if (!challenge || !validVerifier(verifier)) return false;
  const expected = decodeBase64Url(storedValue.split("$")[3] || "");
  return constantTimeEqual(await hmac(decodeBase64Url(verifier), pepper), expected);
}

export async function tokenHash(token) {
  return encodeBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}

function createToken() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.get("Cookie") || "").split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return [name, value.join("=")];
  }).filter(([name]) => name));
}

function sessionCookie(request, value, maxAge = SESSION_DURATION_SECONDS) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `portfolio_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function createSession(request, env, userId) {
  const token = createToken();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(Math.floor(Date.now() / 1000)),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await tokenHash(token), userId, expiresAt),
  ]);
  return sessionCookie(request, token);
}

export async function getSessionUser(request, env) {
  const token = parseCookies(request).portfolio_session;
  if (!token || token.length > 128) return null;
  const now = Math.floor(Date.now() / 1000);
  const hash = await tokenHash(token);
  const user = await env.DB.prepare("SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").bind(hash, now).first();
  if (!user) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ? AND expires_at <= ?").bind(hash, now).run();
  return user;
}

export async function revokeSession(request, env) {
  const token = parseCookies(request).portfolio_session;
  if (token && token.length <= 128) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await tokenHash(token)).run();
  return sessionCookie(request, "", 0);
}

export function validUsername(username) { return typeof username === "string" && /^[a-zA-Z0-9_-]{3,40}$/.test(username); }

export function normalizeUsername(username) { return username.toLowerCase(); }
