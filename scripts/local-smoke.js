import assert from "node:assert/strict";
import { createPasswordVerifier, createSalt } from "../lib/auth/browser-password.js";

const base = (process.env.SMOKE_ORIGIN || "http://127.0.0.1:3010").replace(/\/$/, "");
const setupToken = process.env.SMOKE_SETUP_TOKEN || "test-setup-token-at-least-32-characters";
let cookie = "";

async function api(path, { method = "GET", body, form, origin = base, useCookie = true } = {}) {
  const headers = { Origin: origin };
  if (cookie && useCookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}/api${path}`, { method, headers, body: form || (body === undefined ? undefined : JSON.stringify(body)) });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";", 1)[0];
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : new Uint8Array(await response.arrayBuffer());
  return { response, data };
}

function ok(result, status) {
  assert.equal(result.response.status, status, JSON.stringify(result.data));
  assert.equal(result.data.success, true, JSON.stringify(result.data));
  return result.data.data;
}

async function create(resource, body) {
  return ok(await api(`/admin/${resource}`, { method: "POST", body }), 201).id;
}

const status = ok(await api("/setup/status"), 200);
assert.equal(status.complete, false);
assert.equal((await api("/admin/summary")).response.status, 401);

const salt = createSalt();
const password = "correct-horse-battery-staple";
const passwordVerifier = await createPasswordVerifier(password, salt);
ok(await api("/setup", { method: "POST", body: { setupToken, username: "owner", siteName: "Smoke Portfolio", salt, passwordVerifier } }), 201);
assert.equal((await api("/setup", { method: "POST", body: { setupToken, username: "other", siteName: "No", salt, passwordVerifier } })).response.status, 409);

const challenge = ok(await api("/auth/challenge?username=owner"), 200);
assert.equal(challenge.salt, salt);
const loginVerifier = await createPasswordVerifier(password, challenge.salt, challenge.iterations);
ok(await api("/auth/login", { method: "POST", body: { username: "owner", passwordVerifier: loginVerifier } }), 200);
assert.match(cookie, /^portfolio_session=/);

const png = new FormData();
png.append("file", new Blob([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])], { type: "image/png" }), "sample.png");
png.append("altText", "Sample portrait");
const imageId = ok(await api("/admin/media", { method: "POST", form: png }), 201).id;

const hiddenPng = new FormData();
hiddenPng.append("file", new Blob([Uint8Array.from([0x89,0x50,0x4e,0x47,0,0,0,0])], { type: "image/png" }), "hidden.png");
const hiddenImageId = ok(await api("/admin/media", { method: "POST", form: hiddenPng }), 201).id;

ok(await api("/admin/profile", { method: "PUT", body: { name:"Ada Example", title:"Software Engineer", short_bio:"I build useful software.", long_bio:"A longer biography.", location:"Lahore", public_email:"ada@example.com", public_phone:"", photo_media_id:imageId, resume_media_id:null } }), 200);

const experienceId = await create("experiences", { company:"Example Co",position:"Engineer",location:"Remote",start_date:"2024-01-01",end_date:"",is_current:true,description:"Built products.",visible:true });
await create("education", { institution:"Example University",degree:"BS Computer Science",field:"Computer Science",start_date:"2020-01-01",end_date:"2023-12-01",description:"",visible:true });
const categoryId = await create("skill-categories", { name:"Engineering",visible:true });
await create("skills", { category_id:categoryId,name:"JavaScript",visible:true });
const visibleProjectId = await create("projects", { title:"Visible project",slug:"visible-project",summary:"Public work",description:"Project details",image_media_id:imageId,technologies_json:["Next.js","Cloudflare"],github_url:"https://github.com/example/project",live_url:"",start_date:"2025-01-01",end_date:"",progress:"completed",visible:true });
const hiddenProjectId = await create("projects", { title:"Hidden project",slug:"hidden-project",summary:"Private draft",description:"Draft",image_media_id:hiddenImageId,technologies_json:[],github_url:"",live_url:"",start_date:"2026-01-01",end_date:"",progress:"in_progress",visible:false });
await create("achievements", { title:"Award",organization:"Example",date:"2025-02-01",description:"An achievement",url:"https://example.com/award",visible:true });
await create("certifications", { name:"Certificate",issuer:"Example",issue_date:"2025-03-01",expiry_date:"",credential_id:"ABC",credential_url:"https://example.com/certificate",file_media_id:null,visible:true });
await create("social-links", { label:"GitHub",url:"https://github.com/example",visible:true });

ok(await api("/admin/projects/order", { method:"PUT", body:{ ids:[hiddenProjectId,visibleProjectId] } }), 200);
assert.equal((await api(`/media/${hiddenImageId}`, { useCookie:false })).response.status, 404);
assert.equal((await api(`/media/${imageId}`, { useCookie:false })).response.status, 200);

ok(await api("/admin/settings", { method:"PUT", body:{ site_name:"Ada Portfolio",site_description:"A software portfolio",site_url:base,primary_color:"#315c4b",color_mode:"light",enabled_sections:{experience:true,education:true,skills:true,projects:true,achievements:false,certifications:true,contact:true},seo_title:"Ada Example",seo_description:"Ada's portfolio" } }), 200);
const portfolio = ok(await api("/portfolio"), 200);
assert.deepEqual(portfolio.projects.map((item) => item.slug), ["visible-project"]);
assert.equal(portfolio.achievements.length, 0);
assert.deepEqual(portfolio.projects[0].technologies, ["Next.js", "Cloudflare"]);
assert.equal((await api("/projects/hidden-project")).response.status, 404);
ok(await api("/projects/visible-project"), 200);

ok(await api("/messages", { method:"POST", body:{ name:"Visitor",email:"visitor@example.com",subject:"Hello",message:"A test message",website:"" } }), 201);
const inbox = ok(await api("/admin/messages"), 200);
assert.equal(inbox.length, 1);
ok(await api(`/admin/messages/${inbox[0].id}/read`, { method:"PUT", body:{} }), 200);
const summary = ok(await api("/admin/summary"), 200);
assert.deepEqual(summary, { projects:2, experiences:1, unread_messages:0, certifications:1 });

const home = await fetch(base);
assert.equal(home.status, 200);
const homeHtml = await home.text();
assert.match(homeHtml, /Ada Example/);
for (const section of ["about", "experience", "projects", "skills", "education", "certifications", "contact"]) {
  assert.match(homeHtml, new RegExp(`href="#${section}"`));
  assert.match(homeHtml, new RegExp(`id="${section}"`));
}
assert.doesNotMatch(homeHtml, /href="#achievements"/);
const detail = await fetch(`${base}/projects/visible-project`);
assert.equal(detail.status, 200);
assert.match(await detail.text(), /Project details/);

const pageRoutes = [
  "/",
  "/login",
  "/setup",
  "/projects/visible-project",
  "/robots.txt",
  "/sitemap.xml",
  "/admin",
  "/admin/profile",
  "/admin/experiences",
  "/admin/education",
  "/admin/skill-categories",
  "/admin/skills",
  "/admin/projects",
  "/admin/achievements",
  "/admin/certifications",
  "/admin/social-links",
  "/admin/messages",
  "/admin/settings",
];
for (const path of pageRoutes) {
  const response = await fetch(`${base}${path}`, { headers:{ Cookie:cookie } });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  await response.arrayBuffer();
}
assert.equal((await fetch(`${base}/route-that-does-not-exist`)).status, 404);

ok(await api("/auth/logout", { method:"POST", body:{} }), 200);
assert.equal((await api("/admin/summary")).response.status, 401);
assert.equal(experienceId > 0, true);
console.log("Local end-to-end smoke test passed.");
