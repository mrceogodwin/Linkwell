import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import EmployerReviewList from "./employer-review-list";

export const dynamic = "force-dynamic";

export default async function AdminEmployersPage() {
  const admin = await requireRole(["admin"]);
  if (!admin) redirect("/sign-in?next=%2Fadmin%2Femployers");
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/admin">Admin overview</a><form action="/api/auth/logout" method="post"><button className="button button-dark button-small" type="submit">Sign out</button></form></nav></header>
    <section className="wrap admin-shell">
      <a className="auth-back" href="/admin"><ArrowLeft size={14}/> Back to admin overview</a>
      <div className="eyebrow"><span/> TRUST & SAFETY</div>
      <h1>Employer verification.</h1>
      <p className="admin-intro">Review company details and verify legitimate employer accounts. Verified email is required before employer verification can be granted.</p>
      <div className="dashboard-notice"><Building2 size={18}/><span>Verification actions are recorded in the admin audit log. Only verified employers can submit listings for moderation.</span></div>
      <EmployerReviewList/>
    </section>
  </main>;
}
