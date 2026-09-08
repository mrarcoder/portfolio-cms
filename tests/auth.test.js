import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../worker/src/index.js";
import { createPasswordVerifier, createSalt } from "../lib/browser-password.js";

class Statement {
  constructor(database, sql) { this.database = database; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() { return this.database.prepare(this.sql).get(...this.values) || null; }
  async run() { this.database.prepare(this.sql).run(...this.values); return { success: true }; }
}

class D1Mock {
  constructor(database) { this.database = database; }
  prepare(sql) { return new Statement(this.database, sql); }
  async batch(statements) {
    for (const statement of statements) await statement.run();
    return [];
  }
}

function createEnvironment() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const file of ["0001_foundation.sql", "0002_rate_limits.sql"]) database.exec(readFileSync(new URL(`../database/migrations/${file}`, import.meta.url), "utf8"));
  return { database, DB: new D1Mock(database), MEDIA: { async head() { return null; } }, FRONTEND_ORIGIN: "https://portfolio.test", SETUP_TOKEN: "a-secure-setup-token-that-is-long-enough", AUTH_PEPPER: "a-separate-local-pepper-that-is-long-enough" };
}

function request(path, options = {}) {
  return new Request(`https://api.test${path}`, { ...options, headers: { Origin: "https://portfolio.test", "Content-Type": "application/json", ...options.headers } });
}

test("setup is single-use and creates no session", async () => {
  const env = createEnvironment();
  try {
    const salt = createSalt();
    const passwordVerifier = await createPasswordVerifier("a reliable long password", salt);
    let response = await worker.fetch(request("/api/setup/status", { method: "GET" }), env);
    assert.deepEqual(await response.json(), { success: true, data: { complete: false } });
    response = await worker.fetch(request("/api/setup", { method: "POST", body: JSON.stringify({ siteName: "My portfolio", setupToken: env.SETUP_TOKEN, username: "owner", salt, passwordVerifier }) }), env);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("Set-Cookie"), null);
    assert.equal(env.database.prepare("SELECT value_json FROM settings WHERE key = 'site_name'").get().value_json, '"My portfolio"');
    response = await worker.fetch(request("/api/setup", { method: "POST", body: JSON.stringify({ siteName: "Another", setupToken: env.SETUP_TOKEN, username: "other", salt, passwordVerifier }) }), env);
    assert.equal(response.status, 409);
    assert.equal(env.database.prepare("SELECT COUNT(*) AS count FROM users").get().count, 1);
  } finally { env.database.close(); }
});

test("login sessions protect the current-user endpoint and can be revoked", async () => {
  const env = createEnvironment();
  try {
    const salt = createSalt();
    const passwordVerifier = await createPasswordVerifier("a reliable long password", salt);
    await worker.fetch(request("/api/setup", { method: "POST", body: JSON.stringify({ siteName: "My portfolio", setupToken: env.SETUP_TOKEN, username: "owner", salt, passwordVerifier }) }), env);
    let response = await worker.fetch(new Request("https://api.test/api/auth/me"), env);
    assert.equal(response.status, 401);
    response = await worker.fetch(request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "owner", passwordVerifier }) }), env);
    assert.equal(response.status, 200);
    const cookie = response.headers.get("Set-Cookie").split(";")[0];
    assert.match(response.headers.get("Set-Cookie"), /HttpOnly; SameSite=Lax/);
    response = await worker.fetch(new Request("https://api.test/api/auth/me", { headers: { Cookie: cookie } }), env);
    assert.deepEqual(await response.json(), { success: true, data: { user: { id: 1, username: "owner" } } });
    response = await worker.fetch(request("/api/auth/logout", { method: "POST", headers: { Cookie: cookie } }), env);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
    response = await worker.fetch(new Request("https://api.test/api/auth/me", { headers: { Cookie: cookie } }), env);
    assert.equal(response.status, 401);
  } finally { env.database.close(); }
});

test("setup and login mutations reject untrusted origins", async () => {
  const env = createEnvironment();
  try {
    const response = await worker.fetch(request("/api/setup", { method: "POST", headers: { Origin: "https://attacker.test" }, body: "{}" }), env);
    assert.equal(response.status, 403);
    assert.equal(env.database.prepare("SELECT COUNT(*) AS count FROM users").get().count, 0);
  } finally { env.database.close(); }
});
