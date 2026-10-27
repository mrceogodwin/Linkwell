import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import EmployerJobForm from "./job-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CompanyDashboardPage() {
  const employer = await requireRole(["employer"]);
  if (!employer) redirect("/sign-in?next=%2Fdashboard%2Fcompany");
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/dashboard">Workspace</a><span className="admin-pill"><Building2 size={15}/> Employer</span></nav></header>
    <section className="wrap admin-shell employer-shell">
      <div className="eyebrow"><span/> EMPLOYER WORKSPACE</div>
      <h1>Bring great people on board.</h1>
      <p className="admin-intro">Create a clear opportunity, submit it for review, and keep track of its status here.</p>
      <div className="dashboard-notice"><ShieldCheck size={18}/><span>Only verified employer profiles can submit opportunities. All new listings start in review and cannot publish themselves.</span></div>
      <EmployerJobForm />
    </section>
  </main>;
}
