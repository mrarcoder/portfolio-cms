import Image from "next/image";
import Link from "next/link";
import ContactForm from "./contact-form";
import SiteLogo from "./site-logo";

function Section({ id, title, number, intro, children }) {
  return (
    <section className="portfolio-section reveal" id={id}>
      <div className="section-heading">
        <p className="section-kicker"><span>{number}</span>{title}</p>
        {intro && <p className="section-intro">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Dates({ start, end, current }) {
  return <span>{start}{current ? " — Present" : end ? ` — ${end}` : ""}</span>;
}

export default function Portfolio({ data }) {
  const { profile: p, settings: s } = data;
  const enabled = s.enabled_sections || {};
  const sections = {
    about: Boolean(p.long_bio),
    experience: enabled.experience !== false && data.experiences.length > 0,
    projects: enabled.projects !== false && data.projects.length > 0,
    skills: enabled.skills !== false && data.skills.length > 0,
    education: enabled.education !== false && data.education.length > 0,
    achievements: enabled.achievements !== false && data.achievements.length > 0,
    certifications: enabled.certifications !== false && data.certifications.length > 0,
    contact: enabled.contact !== false,
  };
  const navigation = [
    ["about", "About"], ["experience", "Experience"], ["projects", "Work"],
    ["skills", "Skills"], ["education", "Education"], ["achievements", "Achievements"],
    ["certifications", "Certifications"], ["contact", "Contact"],
  ].filter(([id]) => sections[id]);
  const jsonLd = { "@context": "https://schema.org", "@type": "Person", name: p.name, jobTitle: p.title, url: s.site_url || undefined, email: p.public_email || undefined };
  const initials = (p.name || s.site_name || "P").split(" ").map((word) => word[0]).slice(0, 2).join("");
  let sectionNumber = 0;
  const number = () => String(++sectionNumber).padStart(2, "0");

  return (
    <div className="portfolio-shell" style={{ "--accent": s.primary_color || "#70f0c0" }} data-mode={s.color_mode || "dark"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }}/>
      <div className="scroll-progress" aria-hidden="true" />
      <header className="public-header">
        <div className="container header-inner">
          <a className="brand" href="#top"><span className="brand-mark">{initials}</span><span>{p.name || s.site_name || "Portfolio"}</span></a>
          <nav className="public-nav" aria-label="Portfolio sections">
            {navigation.map(([id, label]) => <a className={id === "contact" ? "nav-cta" : undefined} href={`#${id}`} key={id}>{label}{id === "contact" && <span aria-hidden="true"> ↗</span>}</a>)}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="public-hero container" id="top">
          <div className="hero-panel">
            <div className="hero-copy">
              <p className="availability"><i aria-hidden="true" />{p.location ? `Based in ${p.location}` : "Available for meaningful work"}</p>
              <h1><span className="hero-name">{p.name || "Your name"}</span><span className="hero-title">{p.title || "Your professional title"}</span></h1>
              <p className="lede">{p.short_bio || s.site_description || "Add your introduction from the admin panel."}</p>
              <div className="hero-actions">
                {enabled.contact !== false && <a className="button no-margin" href="#contact">Start a conversation <span aria-hidden="true">↗</span></a>}
                {p.resume_media_id && <a className="secondary-link" href={`/api/media/${p.resume_media_id}`}>Download résumé <span aria-hidden="true">↓</span></a>}
              </div>
            </div>
            <div className="portrait-frame">
              <div className="portrait-toolbar" aria-hidden="true"><span /><span /><span /><small>profile.preview</small></div>
              <div className="portrait-visual">
                {p.photo_media_id ? <Image className="portrait" src={`/api/media/${p.photo_media_id}`} width={520} height={620} alt={`${p.name} portrait`} priority unoptimized/> : <div className="portrait-placeholder"><span>{initials}</span><small>Portrait</small></div>}
                <span className="scan-line" aria-hidden="true" />
              </div>
              <div className="portrait-status"><span><i /> Portfolio live</span><small>{p.title || "Software professional"}</small></div>
            </div>
          </div>
          <a className="scroll-cue" href={`#${navigation[0]?.[0] || "contact"}`}><span>Scroll to explore</span><i aria-hidden="true">↓</i></a>
        </section>

        <div className="portfolio-content container">
          {sections.about && <Section id="about" title="About" number={number()} intro="The thinking, craft, and experience behind the work."><div className="about-layout"><h2 className="section-title">I turn complex ideas into clear digital experiences.</h2><p className="section-copy pre-line">{p.long_bio}</p></div></Section>}
          {sections.experience && <Section id="experience" title="Experience" number={number()} intro="A track record of shipping, learning, and creating impact."><div className="timeline">{data.experiences.map((item, index) => <article key={item.id}><span className="timeline-index">{String(index + 1).padStart(2, "0")}</span><div className="timeline-role"><h2>{item.position}</h2><p>{item.company}{item.location && ` · ${item.location}`}</p></div><div className="timeline-detail"><p className="timeline-date"><Dates start={item.start_date} end={item.end_date} current={item.is_current}/></p><p className="pre-line">{item.description}</p></div></article>)}</div></Section>}
          {sections.projects && <Section id="projects" title="Selected work" number={number()} intro="Products and ideas shaped into useful, polished outcomes."><div className="project-grid">{data.projects.map((item, index) => <article className="project-card" key={item.id}>{item.image_media_id ? <div className="project-media"><Image src={`/api/media/${item.image_media_id}`} width={720} height={450} alt={item.title} unoptimized/><span>{String(index + 1).padStart(2, "0")}</span></div> : <div className="project-placeholder"><span>{String(index + 1).padStart(2, "0")}</span></div>}<div className="project-copy"><div className="card-meta"><p>{item.technologies.join(" · ")}</p><span aria-hidden="true">↗</span></div><h2><Link href={`/projects/${item.slug}`}>{item.title}</Link></h2><p>{item.summary}</p></div></article>)}</div></Section>}
          {sections.skills && <Section id="skills" title="Capabilities" number={number()} intro="Tools and technologies I use to move from concept to production."><div className="skill-groups">{data.skillCategories.map((category) => { const skills = data.skills.filter((item) => item.category_id === category.id); return skills.length > 0 && <article key={category.id}><span className="skill-glow"/><p className="skill-count">{String(skills.length).padStart(2, "0")}</p><h2>{category.name}</h2><div className="skill-list">{skills.map((item) => <span key={item.id}>{item.name}</span>)}</div></article>; })}</div></Section>}
          {sections.education && <Section id="education" title="Education" number={number()} intro="The academic foundation behind my practice."><div className="simple-grid">{data.education.map((item) => <article key={item.id}><p className="card-date"><Dates start={item.start_date} end={item.end_date}/></p><h2>{item.degree}</h2><p>{item.institution}{item.field && ` · ${item.field}`}</p></article>)}</div></Section>}
          {sections.achievements && <Section id="achievements" title="Achievements" number={number()} intro="Milestones that mark progress and meaningful contribution."><div className="simple-grid">{data.achievements.map((item) => <article key={item.id}><p className="card-date">{item.date}</p><h2>{item.title}</h2><p>{item.description}</p><p className="muted">{item.organization}</p></article>)}</div></Section>}
          {sections.certifications && <Section id="certifications" title="Certifications" number={number()} intro="Continued learning, verified."><div className="simple-grid">{data.certifications.map((item) => <article key={item.id}><p className="card-date">Issued {item.issue_date}</p><h2>{item.name}</h2><p>{item.issuer}</p><div className="credential-links">{item.credential_url && <a href={item.credential_url}>View credential ↗</a>}{item.file_media_id && <a href={`/api/media/${item.file_media_id}`}>Download certificate ↓</a>}</div></article>)}</div></Section>}
          {sections.contact && <Section id="contact" title="Contact" number={number()} intro="Have an opportunity or an idea? My inbox is open."><div className="contact-grid"><div className="contact-copy"><p className="contact-overline">Let&apos;s work together</p><h2 className="section-title">Build something people remember.</h2><p className="section-copy">Tell me what you are working on, where you need help, and what success looks like.</p>{p.public_email && <a className="contact-email" href={`mailto:${p.public_email}`}>{p.public_email} <span aria-hidden="true">↗</span></a>}<div className="socials">{data.socialLinks.map((item) => <a href={item.url} key={item.id}><span className="social-name"><SiteLogo url={item.url} label={item.label}/><span>{item.label}</span></span><span aria-hidden="true">↗</span></a>)}</div></div><div className="contact-form-panel"><div className="form-window-bar" aria-hidden="true"><span/><span/><span/><small>new-message</small></div><ContactForm/></div></div></Section>}
        </div>
      </main>

      <footer className="site-footer"><div className="container"><span>© {new Date().getFullYear()} {p.name || s.site_name || "Portfolio"}</span><span className="footer-status"><i/> Designed to evolve</span><a href="#top">Back to top ↑</a></div></footer>
    </div>
  );
}
