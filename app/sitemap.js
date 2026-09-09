import { getApi } from "../lib/api";

export default async function sitemap() {
  try {
    const data = await getApi("/portfolio");
    const base = data.settings.site_url?.replace(/\/$/, "");
    if (!base) return [];
    return [
      { url:base, lastModified:new Date() },
      ...data.projects.map((project) => ({
        url: `${base}/projects/${project.slug}`,
        lastModified: new Date(project.updated_at),
      })),
    ];
  } catch {
    return [];
  }
}
