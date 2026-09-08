import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../worker/src/index.js";

test("foundation schema enforces one owner and session ownership", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(readFileSync(new URL("../database/migrations/0001_foundation.sql", import.meta.url), "utf8"));
    db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(1, "owner", "test-hash");
    assert.throws(() => db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(2, "other", "test-hash"));
    assert.throws(() => db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run("orphan", 2, 1));
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run("session", 1, 1);
    db.exec("DELETE FROM users WHERE id = 1");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count, 0);
    assert.throws(() => db.prepare("INSERT INTO settings (key, value_json) VALUES (?, ?)").run("site", "invalid-json"));
  } finally { db.close(); }
});

test("admin routes require auth and methods are constrained", async () => {
  const unknown = await worker.fetch(new Request("https://api.example/api/admin/profile"), {});
  assert.equal(unknown.status, 401);
  const post = await worker.fetch(new Request("https://api.example/api/health", { method: "POST" }), {});
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET");
});

test("readiness fails safely if database or object storage is unavailable", async () => {
  for (const env of [
    { DB: { prepare() { throw new Error("private SQL detail"); } } },
    { DB: { prepare: () => ({ first: async () => null }) }, MEDIA: { head() { throw new Error("private bucket detail"); } } },
  ]) {
    const response = await worker.fetch(new Request("https://api.example/api/health"), env);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { success: false, error: "Service unavailable" });
  }
});
