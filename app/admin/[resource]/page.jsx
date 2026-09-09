import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ContentManager from "../../../components/admin/content-manager";
import { getApi } from "../../../lib/api";
import { resources } from "../../../lib/admin/resources";

export const dynamic = "force-dynamic";

export default async function ResourcePage({ params }) {
  const { resource } = await params;
  if (!resources[resource]) notFound();

  const cookie = (await cookies()).toString();
  const [rows, categoryOptions] = await Promise.all([
    getApi(`/admin/${resource}`, { cookie }),
    resource === "skills" ? getApi("/admin/skill-categories", { cookie }) : Promise.resolve([]),
  ]);

  return <ContentManager resource={resource} initialRows={rows} categoryOptions={categoryOptions}/>;
}
