export const resources = {
  experiences:{label:"Experience",singular:"experience",fields:[['position','Position','text',true],['company','Company','text',true],['location','Location'],['start_date','Start date','date',true],['end_date','End date','date'],['is_current','Current role','checkbox'],['description','Description','textarea'],['visible','Visible','checkbox']]},
  education:{label:"Education",singular:"education record",fields:[['institution','Institution','text',true],['degree','Degree','text',true],['field','Field'],['start_date','Start date','date',true],['end_date','End date','date'],['description','Description','textarea'],['visible','Visible','checkbox']]},
  'skill-categories':{label:"Skill categories",singular:"category",fields:[['name','Name','text',true],['visible','Visible','checkbox']]},
  skills:{label:"Skills",singular:"skill",fields:[['name','Name','text',true],['category_id','Category','category'],['visible','Visible','checkbox']]},
  projects:{label:"Projects",singular:"project",fields:[['title','Title','text',true],['slug','Slug','text',true],['summary','Summary','textarea'],['description','Description','textarea'],['image_media_id','Project image','image'],['video_media_id','Hover showcase video','video'],['technologies','Technologies (comma separated)'],['github_url','GitHub URL','url'],['live_url','Live URL','url'],['start_date','Start date','date',true],['end_date','End date','date'],['progress','Progress','select',true,['completed','in_progress','archived']],['visible','Visible','checkbox']]},
  achievements:{label:"Achievements",singular:"achievement",fields:[['title','Title','text',true],['organization','Organization'],['date','Date','date',true],['description','Description','textarea'],['url','Link','url'],['visible','Visible','checkbox']]},
  certifications:{label:"Certifications",singular:"certification",fields:[['name','Name','text',true],['issuer','Issuer','text',true],['issue_date','Issue date','date',true],['expiry_date','Expiry date','date'],['credential_id','Credential ID'],['credential_url','Credential URL','url'],['file_media_id','Certificate PDF','pdf'],['visible','Visible','checkbox']]},
  'social-links':{label:"Social links",singular:"social link",fields:[['label','Label','text',true],['url','URL','url',true],['visible','Visible','checkbox']]},
};

export function toPayload(resource, form) {
  const payload={...form};
  if(resource==='projects'){payload.technologies_json=(form.technologies||'').split(',').map((x)=>x.trim()).filter(Boolean);delete payload.technologies;}
  return payload;
}

export function fromRecord(resource,record){
  const result={...record};
  if(resource==='projects')result.technologies=Array.isArray(record.technologies)?record.technologies.join(', '):JSON.parse(record.technologies_json||'[]').join(', ');
  return result;
}
