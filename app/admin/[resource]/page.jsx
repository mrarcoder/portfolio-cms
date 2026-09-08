import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ContentManager from "../../../components/content-manager";
import { getApi } from "../../../lib/api";
import { resources } from "../../../lib/resources";

export const dynamic="force-dynamic";
export default async function ResourcePage({params}){const {resource}=await params;if(!resources[resource])notFound();const rows=await getApi(`/admin/${resource}`,{cookie:(await cookies()).toString()});return <ContentManager resource={resource} initialRows={rows}/>;}
