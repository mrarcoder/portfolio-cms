import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApi } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function getProject(slug) {
  try {
    return await getApi(`/projects/${slug}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  return project ? { title:project.title, description:project.summary } : { title:"Project not found" };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <main id="main" className="container project-detail">
      <Link href="/#projects" className="back-link">← Back to portfolio</Link>
      <p className="eyebrow">{project.progress.replace("_", " ")}</p>
      <h1>{project.title}</h1>
      <p className="lede">{project.summary}</p>
      {project.image_media_id && <Image className="project-cover" src={`/api/media/${project.image_media_id}`} width={1200} height={720} alt={project.title} priority unoptimized/>}
      <div className="project-body">
        <div>
          <p className="eyebrow">Technologies</p>
          <p>{project.technologies.join(" · ")}</p>
          <div className="project-links">
            {project.github_url && <a href={project.github_url}>Source code ↗</a>}
            {project.live_url && <a href={project.live_url}>Live project ↗</a>}
          </div>
        </div>
        <p className="pre-line section-copy">{project.description}</p>
      </div>
    </main>
  );
}
