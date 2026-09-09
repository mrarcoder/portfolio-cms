import Image from "next/image";
import Link from "next/link";
import ContactForm from "./contact-form";
import SiteLogo from "./site-logo";

function Section({ id,title,children }) {
  return <section className="portfolio-section reveal" id={id}><div className="section-label"><span>{title}</span><i/></div>{children}</section>;
}

function Dates({ start,end,current }) {
  return <span>{start}{current ? " — Present" : end ? ` — ${end}` : ""}</span>;
}

export default function Portfolio({ data }) {
  const { profile:p,settings:s } = data;
  const enabled = s.enabled_sections || {};
  const jsonLd = { "@context":"https://schema.org","@type":"Person",name:p.name,jobTitle:p.title,url:s.site_url || undefined,email:p.public_email || undefined };
  const initials = (p.name || s.site_name || "P").split(" ").map((word) => word[0]).slice(0,2).join("");
  return <div className="portfolio-shell" style={{ "--accent":s.primary_color || "#70f0c0" }} data-mode={s.color_mode || "dark"}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html:JSON.stringify(jsonLd).replace(/</g,"\u003c") }}/>
    <header className="public-header"><div className="container header-inner"><a className="brand" href="#top"><span className="brand-mark">{initials}</span><span>{p.name || s.site_name || "Portfolio"}</span></a><nav className="public-nav" aria-label="Portfolio">{enabled.projects !== false && <a href="#projects">Work</a>}{p.long_bio && <a href="#about">About</a>}{enabled.contact !== false && <a className="nav-cta" href="#contact">Let&apos;s talk <span aria-hidden="true">↗</span></a>}</nav></div></header>
    <main id="main">
      <section className="public-hero container" id="top">
        <div className="hero-copy"><div className="availability"><i aria-hidden="true"/>Portfolio · Selected work</div>{p.location && <p className="eyebrow">Based in {p.location}</p>}<h1>{p.name || "Your name"}<br/><span>{p.title || "Your professional title"}</span></h1><p className="lede">{p.short_bio || s.site_description || "Add your introduction from the admin panel."}</p><div className="hero-actions">{enabled.contact !== false && <a className="button no-margin" href="#contact">Start a conversation <span aria-hidden="true">↗</span></a>}{p.resume_media_id && <a className="secondary-link" href={`/api/media/${p.resume_media_id}`}>Download résumé <span aria-hidden="true">↓</span></a>}</div></div>
        <div className="portrait-frame"><div className="orbit orbit-one"/><div className="orbit orbit-two"/>{p.photo_media_id ? <Image className="portrait" src={`/api/media/${p.photo_media_id}`} width={520} height={620} alt={`${p.name} portrait`} priority unoptimized/> : <div className="portrait-placeholder"><span>{initials}</span><small>Portrait</small></div>}<div className="portrait-chip"><span>01</span><p>Personal portfolio<br/>and profile</p></div></div>
      </section>
      <div className="container">
        {p.long_bio && <Section id="about" title="About"><h2 className="section-title">{p.title || "About me"}</h2><p className="section-copy pre-line">{p.long_bio}</p></Section>}
        {enabled.experience !== false && data.experiences.length > 0 && <Section id="experience" title="Experience"><div className="timeline">{data.experiences.map((item,index) => <article key={item.id}><span className="timeline-index">{String(index+1).padStart(2,"0")}</span><div><h2>{item.position}</h2><p>{item.company}{item.location && ` · ${item.location}`}</p></div><div><p className="muted"><Dates start={item.start_date} end={item.end_date} current={item.is_current}/></p><p className="pre-line">{item.description}</p></div></article>)}</div></Section>}
        {enabled.projects !== false && data.projects.length > 0 && <Section id="projects" title="Selected work"><h2 className="section-title">Ideas made tangible.</h2><div className="project-grid">{data.projects.map((item,index) => <article className="project-card" key={item.id}>{item.image_media_id ? <Image src={`/api/media/${item.image_media_id}`} width={720} height={450} alt={item.title} unoptimized/> : <div className="project-placeholder"><span>{String(index+1).padStart(2,"0")}</span></div>}<div><div className="card-meta"><p>{item.technologies.join(" · ")}</p><span aria-hidden="true">↗</span></div><h2><Link href={`/projects/${item.slug}`}>{item.title}</Link></h2><p>{item.summary}</p></div></article>)}</div></Section>}
        {enabled.skills !== false && data.skills.length > 0 && <Section id="skills" title="Capabilities"><div className="skill-groups">{data.skillCategories.map((category) => <article key={category.id}><span className="skill-glow"/><h2>{category.name}</h2><p>{data.skills.filter((item) => item.category_id === category.id).map((item) => item.name).join(" · ")}</p></article>)}</div></Section>}
        {enabled.education !== false && data.education.length > 0 && <Section id="education" title="Education"><div className="simple-grid">{data.education.map((item) => <article key={item.id}><p className="eyebrow"><Dates start={item.start_date} end={item.end_date}/></p><h2>{item.degree}</h2><p>{item.institution}{item.field && ` · ${item.field}`}</p></article>)}</div></Section>}
        {enabled.achievements !== false && data.achievements.length > 0 && <Section id="achievements" title="Achievements"><div className="simple-grid">{data.achievements.map((item) => <article key={item.id}><p className="eyebrow">{item.date}</p><h2>{item.title}</h2><p>{item.description}</p><p className="muted">{item.organization}</p></article>)}</div></Section>}
        {enabled.certifications !== false && data.certifications.length > 0 && <Section id="certifications" title="Certifications"><div className="simple-grid">{data.certifications.map((item) => <article key={item.id}><p className="eyebrow">Issued {item.issue_date}</p><h2>{item.name}</h2><p>{item.issuer}</p><div className="credential-links">{item.credential_url && <a href={item.credential_url}>View credential ↗</a>}{item.file_media_id && <a href={`/api/media/${item.file_media_id}`}>Download certificate ↓</a>}</div></article>)}</div></Section>}
        {enabled.contact !== false && <Section id="contact" title="Contact"><div className="contact-grid"><div><h2 className="section-title">Let&apos;s build something that matters.</h2><p className="section-copy">Have a project, an opportunity, or simply a good idea? Send a message.</p>{p.public_email && <a className="contact-email" href={`mailto:${p.public_email}`}>{p.public_email} <span aria-hidden="true">↗</span></a>}<div className="socials">{data.socialLinks.map((item) => <a href={item.url} key={item.id}><span className="social-name"><SiteLogo url={item.url} label={item.label}/><span>{item.label}</span></span><span aria-hidden="true">↗</span></a>)}</div></div><ContactForm/></div></Section>}
      </div>
    </main>
    <footer className="site-footer"><div className="container"><span>© {new Date().getFullYear()} {p.name || s.site_name || "Portfolio"}</span><a href="#top">Back to top ↑</a></div></footer>
  </div>;
}
