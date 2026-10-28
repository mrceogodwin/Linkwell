import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import ApplicantsList from "../applicants-list";

export const dynamic = "force-dynamic";

export default async function CompanyApplicantsPage() {
  const employer = await requireRole(["employer"]);
  if (!employer) redirect("/sign-in?next=%2Fdashboard%2Fcompany%2Fapplicants");
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/dashboard/company">Company workspace</a><form action="/api/auth/logout" method="post"><button className="button button-dark button-small" type="submit">Sign out</button></form></nav></header>
    <section className="wrap admin-shell">
      <a className="auth-back" href="/dashboard/company"><ArrowLeft size={14}/> Back to company workspace</a>
      <div className="eyebrow"><span/> HIRING WORKSPACE</div>
      <h1>Meet your applicants.</h1>
      <p className="admin-intro">Review applications for your company’s listings, update each candidate’s status and keep private hiring notes.</p>
      <div className="dashboard-notice"><Users size={18}/><span>Only your company’s applicants are visible in this workspace. Status updates are saved to Linkwell.</span></div>
      <ApplicantsList/>
    </section>
  </main>;
}
