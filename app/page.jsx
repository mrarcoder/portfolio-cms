import Portfolio from "../components/portfolio";
import { getApi } from "../lib/api";

export const dynamic='force-dynamic';
export async function generateMetadata(){try{const {settings,profile}=await getApi('/portfolio');return {title:settings.seo_title||profile.name||settings.site_name||'Portfolio',description:settings.seo_description||profile.short_bio||settings.site_description,alternates:settings.site_url?{canonical:settings.site_url}:undefined,openGraph:{title:settings.seo_title||profile.name,description:settings.seo_description||profile.short_bio,url:settings.site_url||undefined,type:'website'}}}catch{return {title:'Portfolio CMS'}}}
export default async function HomePage(){let data=null;try{data=await getApi('/portfolio')}catch{}if(!data)return <main id="main" className="container hero"><p className="eyebrow">Portfolio CMS</p><h1>Your story.<br/>Room to grow.</h1><p className="lede">The portfolio service is not ready. Start the local Worker and finish setup.</p></main>;return <Portfolio data={data}/>}
