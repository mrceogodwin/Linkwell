import { redirect } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Clock3 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statusLabels: Record<string, string> = {
  submitted: "Submitted", reviewing: "Under review", shortlisted: "Shortlisted",
  rejected: "Not selected", withdrawn: "Withdrawn", hired: "Hired"
};

export default async function ApplicationsPage() {
  const user = await requireRole(["talent"]);
  if (!user) redirect("/sign-in?next=%2Fdashboard%2Fapplications");
  let applications: Array<{id:string;job_id:string;status:string;created_at:string;title:string;company_name:string;location:string|null;listing_type:string;work_arrangement:string}> = [];
  let unavailable = false;
  try {
    applications = await getDb().query(
      `SELECT a.id, a.job_id, a.status, a.created_at, j.title, j.company_name,
              j.location, j.listing_type, j.work_arrangement
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.talent_user_id = $1::uuid ORDER BY a.created_at DESC LIMIT 200`,
      [user.id]
    ) as typeof applications;
  } catch { unavailable = true; }

  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/dashboard">Workspace</a><a className="button button-light button-small" href="/jobs">Find work</a></nav></header>
    <section className="wrap dashboard-shell">
      <a className="back-link" href="/dashboard"><ArrowLeft size={15}/> Back to workspace</a>
      <div className="eyebrow"><span/> YOUR PROGRESS</div><h1>Your applications</h1>
      <p className="dashboard-intro">Keep track of the opportunities you’ve applied for and their latest status.</p>
      {unavailable ? <div className="empty-state"><h3>Applications are temporarily unavailable.</h3><p>Please try again shortly.</p></div> : applications.length === 0 ? <div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={24}/></div><h3>Your next opportunity starts here.</h3><p>When you apply for a job through Linkwell, you’ll see its status here.</p><a className="button button-dark" href="/jobs">Explore opportunities</a></div> : <div className="application-list">{applications.map(app=><article className="application-row" key={app.id}><div className="job-card-icon"><BriefcaseBusiness size={20}/></div><div className="application-main"><h2><a href={"/jobs/"+app.job_id}>{app.title}</a></h2><p>{app.company_name}{app.location ? " · "+app.location : ""}</p><small><Clock3 size={13}/> Applied {new Date(app.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</small></div><span className={"application-status status-"+app.status}>{statusLabels[app.status] ?? app.status}</span></article>)}</div>}
    </section>
  </main>;
}
