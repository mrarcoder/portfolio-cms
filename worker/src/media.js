import { getSessionUser } from "./auth.js";
import { json, requireBrowserOrigin } from "./http.js";

const allowedTypes = new Map([["image/jpeg",[0xff,0xd8,0xff]],["image/png",[0x89,0x50,0x4e,0x47]],["image/webp",null],["application/pdf",[0x25,0x50,0x44,0x46]]]);
const MAX_SIZE = 3 * 1024 * 1024;

function signatureMatches(type, bytes) {
  if (type === "image/webp") return bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50;
  return allowedTypes.get(type)?.every((byte,index)=>bytes[index]===byte);
}

export async function uploadMedia(request,env){
  if(!requireBrowserOrigin(request,env))return json({success:false,error:"Invalid request origin"},403);
  if(!(await getSessionUser(request,env)))return json({success:false,error:"Authentication required"},401);
  const declared=Number(request.headers.get("Content-Length"));if(declared>MAX_SIZE+100000)return json({success:false,error:"File is too large"},413);
  const form=await request.formData();const file=form.get("file");const alt=typeof form.get("altText")==="string"?form.get("altText").trim():"";
  if(!(file instanceof File)||!allowedTypes.has(file.type)||file.size<4||file.size>MAX_SIZE||alt.length>300)return json({success:false,error:"Invalid file"},422);
  const bytes=new Uint8Array(await file.arrayBuffer());if(!signatureMatches(file.type,bytes))return json({success:false,error:"File content does not match its type"},422);
  const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"}[file.type];const key=`media/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:file.type}});
  try{const result=await env.DB.prepare("INSERT INTO media(storage_key,original_name,mime_type,byte_size,alt_text) VALUES(?,?,?,?,?)").bind(key,file.name.slice(0,255),file.type,file.size,alt).run();return json({success:true,data:{id:result.meta.last_row_id,url:`/api/media/${result.meta.last_row_id}`}},201);}catch{await env.MEDIA.delete(key);return json({success:false,error:"Upload could not be saved"},503);}
}

async function isPublic(env,id){return Boolean(await env.DB.prepare(`SELECT m.id FROM media m WHERE m.id=? AND (EXISTS(SELECT 1 FROM profile p WHERE p.photo_media_id=m.id OR p.resume_media_id=m.id) OR EXISTS(SELECT 1 FROM projects p WHERE p.image_media_id=m.id AND p.visible=1) OR EXISTS(SELECT 1 FROM certifications c WHERE c.file_media_id=m.id AND c.visible=1))`).bind(id).first());}

export async function serveMedia(request,env,id){const row=await env.DB.prepare("SELECT * FROM media WHERE id=?").bind(id).first();if(!row)return json({success:false,error:"Not found"},404);if(!(await isPublic(env,id))&&!(await getSessionUser(request,env)))return json({success:false,error:"Not found"},404);const object=await env.MEDIA.get(row.storage_key);if(!object)return json({success:false,error:"Not found"},404);const headers=new Headers({"Content-Type":row.mime_type,"Content-Length":String(row.byte_size),"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store"});if(row.mime_type==="application/pdf")headers.set("Content-Disposition",`attachment; filename="${row.original_name.replace(/[\\\r\n"]/g,'_')}"`);return new Response(object.body,{headers});}

export async function deleteMedia(request,env,id){if(!requireBrowserOrigin(request,env))return json({success:false,error:"Invalid request origin"},403);if(!(await getSessionUser(request,env)))return json({success:false,error:"Authentication required"},401);const row=await env.DB.prepare("SELECT * FROM media WHERE id=?").bind(id).first();if(!row)return json({success:false,error:"Not found"},404);const used=await env.DB.prepare("SELECT (EXISTS(SELECT 1 FROM profile WHERE photo_media_id=? OR resume_media_id=?)+EXISTS(SELECT 1 FROM projects WHERE image_media_id=?)+EXISTS(SELECT 1 FROM certifications WHERE file_media_id=?)) AS used").bind(id,id,id,id).first();if(used.used)return json({success:false,error:"File is still in use"},409);await env.DB.prepare("DELETE FROM media WHERE id=?").bind(id).run();await env.MEDIA.delete(row.storage_key);return json({success:true,data:{}});}
