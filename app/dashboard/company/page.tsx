import { redirect } from "next/navigation";
import { Building2, ShieldCheck, BriefcaseBusiness, Users, Clock3 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import EmployerJobForm from "./job-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statusLabels: Record<string, string> = {
  draft: "Draft", pending_review: "Awaiting review", published: "Published",
  rejected: "Changes requested", archived: "Archived",
};

export default async function CompanyDashboardPage() {
  const employer = await requireRole(["employer"]);
  if (!employer) redirect("/sign-in?next=%2Fdashboard%2Fcompany");

  let jobs: Array<{id:string;title:string;category:string;listing_type:string;work_arrangement:string;status:string;submitted_at:string|null;created_at:string;review_reason:string|null;applicant_count:number}> = [];
  let unavailable = false;
  try {
    jobs = await getDb().query(
      `SELECT j.id, j.title, j.category, j.listing_type, j.work_arrangement, j.status,
              j.submitted_at, j.created_at, j.review_reason, COUNT(a.id)::int AS applicant_count
       FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.employer_user_id = $1::uuid
       GROUP BY j.id ORDER BY j.created_at DESC LIMIT 100`,
      [employer.id]
    ) as typeof jobs;
  } catch {
    unavailable = true;
  }

  const listingCounts = [
    { label: "Published", value: jobs.filter(job => job.status === "published").length },
    { label: "Awaiting review", value: jobs.filter(job => job.status === "pending_review").length },
    { label: "Changes requested", value: jobs.filter(job => job.status === "rejected").length },
    { label: "Drafts", value: jobs.filter(job => job.status === "draft").length },
    { label: "Archived", value: jobs.filter(job => job.status === "archived").length },
  ];

  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/dashboard">Workspace</a><a className="button button-light button-small" href="/dashboard/company/applicants">Applicants</a><span className="admin-pill"><Building2 size={15}/> Employer</span><form action="/api/auth/logout" method="post"><button className="button button-dark button-small" type="submit">Sign out</button></form></nav></header>
    <section className="wrap admin-shell employer-shell">
      <div className="eyebrow"><span/> EMPLOYER WORKSPACE</div>
      <h1>Bring great people on board.</h1>
      <p className="admin-intro">Create a clear opportunity and keep track of its review status and applications.</p>
      <div className="dashboard-notice"><ShieldCheck size={18}/><span>Only verified employer profiles can submit listings. Every new listing starts in review and cannot publish itself.</span></div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}><a className="button button-dark" href="/dashboard/company/applicants"><Users size={16}/> Review applicants</a></div>
      {!unavailable && <section aria-label="Listing status summary" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,marginTop:24}}>
        {listingCounts.map(item => <article key={item.label} style={{border:"1px solid var(--line, #e5e7e5)",borderRadius:14,padding:"16px 18px",background:"var(--surface, #fff)"}}>
          <p style={{margin:0,fontSize:13,color:"var(--muted, #66706a)"}}>{item.label}</p>
          <strong style={{display:"block",fontSize:28,lineHeight:1.2,marginTop:8}}>{item.value}</strong>
        </article>)}
      </section>}
      <section style={{marginTop:30}}>
        <div className="section-heading"><div><div className="eyebrow">YOUR OPPORTUNITIES</div><h2 style={{fontSize:28}}>Listing overview</h2></div><span className="admin-pill"><BriefcaseBusiness size={15}/> {jobs.length} listings</span></div>
        {unavailable ? <div className="empty-state"><h3>Listings are temporarily unavailable.</h3><p>Try again shortly.</p></div> : jobs.length === 0 ? <div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={24}/></div><h3>Your first listing starts here.</h3><p>Submit a clear role description below. It will appear publicly only after an administrator approves it.</p></div> : <div className="application-list">{jobs.map(job=><article className="application-row" key={job.id}><div className="job-card-icon"><BriefcaseBusiness size={20}/></div><div className="application-main"><h2>{job.title}</h2><p>{job.category} · {job.listing_type.replaceAll("_"," ")} · {job.work_arrangement.replaceAll("_"," ")}</p><small><Clock3 size={13}/> Updated {new Date(job.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</small>{job.review_reason && <p className="auth-feedback auth-error">Review note: {job.review_reason}</p>}</div><div style={{display:"grid",gap:8,justifyItems:"end"}}><span className={"application-status status-"+job.status}>{statusLabels[job.status] ?? job.status}</span><span className="dashboard-card-link"><Users size={14}/> {job.applicant_count} applicants</span>{job.status==="published" && <a className="text-link" href={"/jobs/"+job.id}>View live listing ↗</a>}</div></article>)}</div>}
      </section>
      <section style={{marginTop:38}}><div className="eyebrow">CREATE A LISTING</div><h2 style={{fontSize:28}}>Share your opportunity.</h2><EmployerJobForm /></section>
    </section>
  </main>;
}
