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

test("project gallery migration preserves existing project media and ordering", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON");
    for (const name of ["0001_foundation.sql","0002_rate_limits.sql","0003_content.sql","0004_dark_glass_theme.sql","0005_project_video.sql"]) db.exec(readFileSync(new URL(`../database/migrations/${name}`,import.meta.url),"utf8"));
    db.prepare("INSERT INTO media(id,storage_key,original_name,mime_type,byte_size) VALUES(1,'image','image.webp','image/webp',10),(2,'video','video.mp4','video/mp4',10)").run();
    db.prepare("INSERT INTO projects(id,title,slug,start_date,image_media_id,video_media_id) VALUES(1,'Gallery','gallery','2026-01-01',1,2)").run();
    db.exec(readFileSync(new URL("../database/migrations/0006_project_gallery.sql",import.meta.url),"utf8"));
    assert.deepEqual(db.prepare("SELECT media_id,media_type,sort_order FROM project_media ORDER BY sort_order").all().map((row)=>({...row})),[{media_id:1,media_type:"image",sort_order:0},{media_id:2,media_type:"video",sort_order:1}]);
    assert.throws(() => db.prepare("INSERT INTO project_media(project_id,media_id,media_type) VALUES(1,1,'image')").run());
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
