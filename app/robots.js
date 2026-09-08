import {getApi} from '../lib/api';
export default async function robots(){let site='';try{site=(await getApi('/portfolio')).settings.site_url||''}catch{}return {rules:[{userAgent:'*',allow:'/',disallow:['/admin','/setup','/login']}],sitemap:site?`${site}/sitemap.xml`:undefined}}
