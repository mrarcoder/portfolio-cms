import { getSessionUser, tokenHash } from "./auth.js";
import { json, readJson, requireBrowserOrigin } from "./http.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const resourceSpecs = {
  experiences: { table: "experiences", fields: ["company","position","location","start_date","end_date","is_current","description","visible"], required: ["company","position","start_date"], dates: ["start_date","end_date"], booleans: ["is_current","visible"] },
  education: { table: "education", fields: ["institution","degree","field","start_date","end_date","description","visible"], required: ["institution","degree","start_date"], dates: ["start_date","end_date"], booleans: ["visible"] },
  "skill-categories": { table: "skill_categories", fields: ["name","visible"], required: ["name"], booleans: ["visible"], timestamps: false },
  skills: { table: "skills", fields: ["category_id","name","visible"], required: ["name"], booleans: ["visible"], integers: ["category_id"] },
  projects: { table: "projects", fields: ["title","slug","summary","description","image_media_id","technologies_json","github_url","live_url","start_date","end_date","progress","visible"], required: ["title","slug","start_date"], dates: ["start_date","end_date"], booleans: ["visible"], integers: ["image_media_id"] },
  achievements: { table: "achievements", fields: ["title","organization","date","description","url","visible"], required: ["title","date"], dates: ["date"], booleans: ["visible"] },
  certifications: { table: "certifications", fields: ["name","issuer","issue_date","expiry_date","credential_id","credential_url","file_media_id","visible"], required: ["name","issuer","issue_date"], dates: ["issue_date","expiry_date"], booleans: ["visible"], integers: ["file_media_id"] },
  "social-links": { table: "social_links", fields: ["label","url","visible"], required: ["label","url"], booleans: ["visible"], timestamps: false },
};

function validUrl(value) { if (!value) return true; try { return ["http:","https:"].includes(new URL(value).protocol); } catch { return false; } }
function validDate(value) { return datePattern.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value; }
function cleanText(value, max = 5000) { return typeof value === "string" && value.trim().length <= max ? value.trim() : null; }
function validate(spec, input) {
  const data = {};
  for (const field of spec.fields) {
    let value = input[field];
    if (spec.booleans?.includes(field)) {
      if (![true,false,0,1].includes(value)) return null;
      value = value ? 1 : 0;
    }
    else if (spec.integers?.includes(field)) {
      value = value === "" || value == null ? null : Number(value);
      if (value !== null && (!Number.isInteger(value) || value < 1)) return null;
      if (value === null && spec.required?.includes(field)) return null;
      data[field] = value;
      continue;
    }
    else if (field === "technologies_json") value = JSON.stringify(Array.isArray(value) ? value.map((item) => cleanText(item, 50)).filter(Boolean).slice(0, 20) : []);
    else value = cleanText(value ?? "", field === "description" ? 10000 : 500);
    if (value === null || (spec.required?.includes(field) && value === "")) return null;
    data[field] = value;
  }
  if (spec.dates?.some((field) => data[field] && !validDate(data[field]))) return null;
  if (data.start_date && data.end_date && data.end_date < data.start_date) return null;
  if (data.issue_date && data.expiry_date && data.expiry_date < data.issue_date) return null;
  if (data.slug && !slugPattern.test(data.slug)) return null;
  if (data.progress && !["completed","in_progress","archived"].includes(data.progress)) return null;
  if ([data.github_url,data.live_url,data.url,data.credential_url].some((value) => value && !validUrl(value))) return null;
  return data;
}

async function requireAdmin(request, env, mutate = false) {
  if (mutate && !requireBrowserOrigin(request, env)) return json({ success:false, error:"Invalid request origin" },403);
  return (await getSessionUser(request, env)) || json({ success:false, error:"Authentication required" },401);
}

export async function adminResource(request, env, resource, id) {
  const spec = resourceSpecs[resource];
  if (!spec) return json({ success:false, error:"Not found" },404);
  const auth = await requireAdmin(request, env, request.method !== "GET");
  if (auth instanceof Response) return auth;
  if (request.method === "GET") {
    const result = await env.DB.prepare(`SELECT * FROM ${spec.table} ORDER BY sort_order, id LIMIT 500`).all();
    return json({ success:true, data:result.results });
  }
  if (request.method === "DELETE" && id) {
    const result = await env.DB.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).bind(id).run();
    return result.meta.changes ? json({ success:true, data:{} }) : json({ success:false, error:"Not found" },404);
  }
  if (!["POST","PUT"].includes(request.method) || (request.method === "PUT" && !id)) return json({ success:false, error:"Method not allowed" },405);
  const input = await readJson(request, 25000); const data = input && validate(spec,input);
  if (!data) return json({ success:false, error:"Invalid content" },422);
  const columns = Object.keys(data); const values = Object.values(data);
  try {
    if (request.method === "POST") {
      const order = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${spec.table}`).first();
      const result = await env.DB.prepare(`INSERT INTO ${spec.table} (${columns.join(",")}, sort_order) VALUES (${columns.map(()=>"?").join(",")}, ?)`).bind(...values,order.next).run();
      return json({ success:true, data:{ id:result.meta.last_row_id } },201);
    }
    const suffix = spec.timestamps === false ? "" : ", updated_at = CURRENT_TIMESTAMP";
    const result = await env.DB.prepare(`UPDATE ${spec.table} SET ${columns.map((field)=>`${field} = ?`).join(",")}${suffix} WHERE id = ?`).bind(...values,id).run();
    return result.meta.changes ? json({ success:true, data:{ id:Number(id) } }) : json({ success:false,error:"Not found"},404);
  } catch { return json({ success:false, error:"Content conflicts with an existing record" },409); }
}

export async function reorder(request, env, resource) {
  const spec=resourceSpecs[resource]; const auth=await requireAdmin(request,env,true);
  if (!spec) return json({success:false,error:"Not found"},404); if(auth instanceof Response)return auth;
  const body=await readJson(request); const ids=body?.ids;
  if(!Array.isArray(ids)||ids.length>500||new Set(ids).size!==ids.length||ids.some((id)=>!Number.isInteger(id)))return json({success:false,error:"Invalid order"},422);
  const current=await env.DB.prepare(`SELECT id FROM ${spec.table}`).all();
  if(current.results.length!==ids.length||current.results.some((row)=>!ids.includes(row.id)))return json({success:false,error:"Invalid order"},422);
  await env.DB.batch(ids.map((id,index)=>env.DB.prepare(`UPDATE ${spec.table} SET sort_order = ? WHERE id = ?`).bind(index,id)));
  return json({success:true,data:{}});
}

export async function profile(request,env){
  const auth=await requireAdmin(request,env,request.method!=="GET");if(auth instanceof Response)return auth;
  if(request.method==="GET")return json({success:true,data:await env.DB.prepare("SELECT * FROM profile WHERE id=1").first()});
  if(request.method!=="PUT")return json({success:false,error:"Method not allowed"},405);
  const b=await readJson(request,25000); const fields=["name","title","short_bio","long_bio","location","public_email","public_phone","photo_media_id","resume_media_id"];
  if(!b)return json({success:false,error:"Invalid profile"},422); const data=fields.map((f)=>f.endsWith("_media_id")?(b[f]?Number(b[f]):null):cleanText(b[f]??"",f==="long_bio"?10000:500));
  if(data.slice(0,7).some((v)=>v===null)||(data[5]&&!emailPattern.test(data[5]))||data.slice(7).some((v)=>v!==null&&!Number.isInteger(v)))return json({success:false,error:"Invalid profile"},422);
  try{await env.DB.prepare(`UPDATE profile SET ${fields.map((f)=>`${f}=?`).join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=1`).bind(...data).run();return json({success:true,data:{}});}catch{return json({success:false,error:"Invalid media reference"},422);}
}

const publicSettings=["site_name","site_description","site_url","primary_color","color_mode","enabled_sections","seo_title","seo_description"];
const sectionNames=["experience","education","skills","projects","achievements","certifications","contact"];
function validSettings(input){
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length===0||Object.keys(input).some((key)=>!publicSettings.includes(key)))return false;
  for(const [key,value] of Object.entries(input)){
    if(key==="primary_color"&&!(typeof value==="string"&&/^#[0-9a-fA-F]{6}$/.test(value)))return false;
    if(key==="color_mode"&&!['light','dark'].includes(value))return false;
    if(key==="site_url"&&!(typeof value==="string"&&(!value||validUrl(value))))return false;
    if(key==="enabled_sections"){
      if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some((name)=>!sectionNames.includes(name))||Object.values(value).some((enabled)=>typeof enabled!=="boolean"))return false;
      continue;
    }
    if(!["primary_color","color_mode"].includes(key)&&typeof value!=="string")return false;
    if(typeof value==="string"&&value.length>(["site_description","seo_description"].includes(key)?300:100))return false;
  }
  return true;
}
export async function settings(request,env){
  const auth=await requireAdmin(request,env,request.method!=="GET");if(auth instanceof Response)return auth;
  if(request.method==="GET"){const r=await env.DB.prepare(`SELECT key,value_json FROM settings WHERE key IN (${publicSettings.map(()=>"?").join(",")})`).bind(...publicSettings).all();return json({success:true,data:Object.fromEntries(r.results.map((x)=>[x.key,JSON.parse(x.value_json)]))});}
  if(request.method!=="PUT")return json({success:false,error:"Method not allowed"},405);const b=await readJson(request);
  if(!validSettings(b))return json({success:false,error:"Invalid settings"},422);
  await env.DB.batch(Object.entries(b).map(([k,v])=>env.DB.prepare("INSERT INTO settings(key,value_json) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP").bind(k,JSON.stringify(v))));return json({success:true,data:{}});
}

export async function adminSummary(request,env){
  const auth=await requireAdmin(request,env);if(auth instanceof Response)return auth;
  const result=await env.DB.prepare(`SELECT
    (SELECT COUNT(*) FROM projects) AS projects,
    (SELECT COUNT(*) FROM experiences) AS experiences,
    (SELECT COUNT(*) FROM messages WHERE is_read=0) AS unread_messages,
    (SELECT COUNT(*) FROM certifications) AS certifications`).first();
  return json({success:true,data:result});
}

export async function portfolio(env){
  const [p,s,ex,ed,ca,sk,pr,ac,ce,so]=await Promise.all([
    env.DB.prepare("SELECT * FROM profile WHERE id=1").first(),env.DB.prepare(`SELECT key,value_json FROM settings WHERE key IN (${publicSettings.map(()=>"?").join(",")})`).bind(...publicSettings).all(),
    ...["experiences","education","skill_categories","skills","projects","achievements","certifications","social_links"].map((t)=>env.DB.prepare(t==="skills"?"SELECT skills.* FROM skills LEFT JOIN skill_categories ON skill_categories.id=skills.category_id WHERE skills.visible=1 AND (skills.category_id IS NULL OR skill_categories.visible=1) ORDER BY skills.sort_order,skills.id":`SELECT * FROM ${t} WHERE visible=1 ORDER BY sort_order,id`).all())]);
  const configured=Object.fromEntries(s.results.map((x)=>[x.key,JSON.parse(x.value_json)]));const enabled=configured.enabled_sections||{};
  return json({success:true,data:{profile:p,settings:configured,experiences:enabled.experience===false?[]:ex.results,education:enabled.education===false?[]:ed.results,skillCategories:enabled.skills===false?[]:ca.results,skills:enabled.skills===false?[]:sk.results,projects:enabled.projects===false?[]:pr.results.map((x)=>({...x,technologies:JSON.parse(x.technologies_json)})),achievements:enabled.achievements===false?[]:ac.results,certifications:enabled.certifications===false?[]:ce.results,socialLinks:so.results}});
}

export async function publicProject(env,slug){const p=await env.DB.prepare("SELECT * FROM projects WHERE slug=? AND visible=1").bind(slug).first();return p?json({success:true,data:{...p,technologies:JSON.parse(p.technologies_json)}}):json({success:false,error:"Not found"},404);}

export async function submitMessage(request,env){if(!requireBrowserOrigin(request,env))return json({success:false,error:"Invalid request origin"},403);const b=await readJson(request);if(!b||b.website)return json({success:true,data:{}},201);const values=[cleanText(b.name,100),cleanText(b.email,200),cleanText(b.subject??"",200),cleanText(b.message,3000)];if(values.some((v)=>v===null)||!values[0]||!emailPattern.test(values[1])||!values[3])return json({success:false,error:"Invalid message"},422);const key=`contact:${await tokenHash(request.headers.get("CF-Connecting-IP")||"unknown")}`;const now=Math.floor(Date.now()/1000);const current=await env.DB.prepare("SELECT attempt_count,window_end FROM rate_limits WHERE key=?").bind(key).first();if(current&&current.window_end>now&&current.attempt_count>=3)return json({success:false,error:"Please wait before sending another message"},429);await env.DB.batch([env.DB.prepare("INSERT INTO messages(name,email,subject,message) VALUES(?,?,?,?)").bind(...values),env.DB.prepare("INSERT INTO rate_limits(key,attempt_count,window_end) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempt_count=CASE WHEN window_end<=? THEN 1 ELSE attempt_count+1 END,window_end=CASE WHEN window_end<=? THEN ? ELSE window_end END").bind(key,now+3600,now,now,now+3600)]);return json({success:true,data:{}},201);}

export async function messages(request,env,id,markRead){const auth=await requireAdmin(request,env,request.method!=="GET");if(auth instanceof Response)return auth;if(request.method==="GET"){const r=await env.DB.prepare("SELECT * FROM messages ORDER BY created_at DESC LIMIT 100").all();return json({success:true,data:r.results});}if(request.method==="DELETE"&&id){await env.DB.prepare("DELETE FROM messages WHERE id=?").bind(id).run();return json({success:true,data:{}});}if(request.method==="PUT"&&id&&markRead){await env.DB.prepare("UPDATE messages SET is_read=1 WHERE id=?").bind(id).run();return json({success:true,data:{}});}return json({success:false,error:"Method not allowed"},405);}

export { resourceSpecs };
