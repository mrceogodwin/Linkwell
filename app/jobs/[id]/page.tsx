import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, MapPin, ShieldCheck } from "lucide-react";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Job = {
  id: string; title: string; company: string; description: string;
  requirements: string | null; category: string; listing_type: string;
  work_arrangement: string; location: string | null;
  salary_min: string | number | null; salary_max: string | number | null;
  salary_currency: string | null; salary_period: string | null;
  application_url: string | null; published_at: string | null;
};

async function loadJob(id: string): Promise<Job | null> {
  if (!process.env.DATABASE_URL || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const sql = getDb();
  const rows = await sql.query(
    `SELECT id, title, company_name AS company, description, requirements, category,
            listing_type, work_arrangement, location, salary_min, salary_max,
            salary_currency, salary_period, application_url, published_at
     FROM jobs WHERE id = $1::uuid AND status = 'published'
       AND (expires_at IS NULL OR expires_at > now()) LIMIT 1`,
    [id]
  );
  return (rows[0] as Job | undefined) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const job = await loadJob(id);
    return job ? { title: `${job.title} at ${job.company}`, description: job.description.slice(0, 155) } : { title: "Opportunity not found" };
  } catch {
    return { title: "Opportunity | Linkwell" };
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let job: Job | null = null;
  let databaseUnavailable = false;
  try { job = await loadJob(id); } catch { databaseUnavailable = true; }
  if (!job && !databaseUnavailable) notFound();
  if (!job) return <main className="subpage"><header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a></header><section className="wrap jobs-results"><div className="empty-state"><div className="eyebrow">TEMPORARILY UNAVAILABLE</div><h3>We couldn’t load this opportunity.</h3><p>The listing service is temporarily unavailable. Please try again shortly or return to the opportunity board.</p><div className="empty-actions"><a className="button button-dark" href="/jobs">Back to opportunities <ArrowRight size={16}/></a></div></div></section></main>;
  const salary = job.salary_min != null || job.salary_max != null
    ? [job.salary_currency, job.salary_min ?? "—", job.salary_max != null ? "–" + job.salary_max : ""].filter(Boolean).join(" ") + (job.salary_period ? " / " + job.salary_period : "")
    : null;
  const safeApplyUrl = job.application_url && /^https:\/\//i.test(job.application_url) ? job.application_url : null;
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/" aria-label="Linkwell home"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="desktop-nav"><a href="/jobs">Find work</a><a href="/companies">For employers</a><a href="/talent">Discover talent</a></nav><div className="nav-actions"><a className="sign-in" href="/sign-in">Log in</a><a className="button button-dark button-small" href="/sign-up">Get started <ArrowRight size={15}/></a></div></header>
    <section className="wrap jobs-results job-detail-wrap">
      <a className="back-link" href="/jobs"><ArrowLeft size={15}/> Back to opportunities</a>
      <article className="job-detail-card">
        <div className="job-card-icon"><BriefcaseBusiness size={23}/></div>
        <div className="eyebrow"><span/> APPROVED OPPORTUNITY</div>
        <h1>{job.title}</h1><h2>{job.company}</h2>
        <div className="job-detail-tags"><span>{job.listing_type.replace("_","-")}</span><span>{job.work_arrangement.replace("_","-")}</span><span>{job.category}</span></div>
        <div className="job-detail-meta">{job.location && <span><MapPin size={15}/>{job.location}</span>}{salary && <strong>{salary}</strong>}<span><ShieldCheck size={15}/> Reviewed by Linkwell</span></div>
        <div className="job-detail-copy"><h3>About the opportunity</h3><p>{job.description}</p>{job.requirements && <><h3>What you’ll need</h3><p>{job.requirements}</p></>}</div>
        {safeApplyUrl ? <a className="button button-dark" href={safeApplyUrl} target="_blank" rel="noopener noreferrer">Apply with employer <ArrowRight size={16}/></a> : <div className="apply-notice">Applications through Linkwell are coming soon. This listing does not yet have a verified external application link.</div>}
        <small>Never pay a recruiter to apply for a job. Verify the employer before sharing personal information.</small>
      </article>
    </section>
    <footer className="footer"><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Linkwell</span><a href="/">Back to home</a></div></footer>
  </main>;
}
