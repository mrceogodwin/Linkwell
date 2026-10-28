import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Bookmark, UserRound, ShieldCheck, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fdashboard");

  const links = user.role === "employer"
    ? [{ href: "/dashboard/company", title: "Company workspace", detail: "Manage your company profile and prepare opportunities for review.", icon: BriefcaseBusiness }]
    : user.role === "admin"
    ? [{ href: "/admin", title: "Administration", detail: "Review the moderation queue and manage marketplace operations.", icon: ShieldCheck }]
    : [{ href: "/dashboard/profile", title: "Talent profile", detail: "Build the profile employers can use to understand your experience.", icon: UserRound }, { href: "/jobs", title: "Find opportunities", detail: "Browse reviewed jobs, freelance projects and contracts.", icon: BriefcaseBusiness }, { href: "/dashboard/applications", title: "My applications", detail: "Track submitted applications and status updates.", icon: BriefcaseBusiness }, { href: "/dashboard/saved", title: "Saved opportunities", detail: "Keep a shortlist of roles you want to revisit.", icon: Bookmark }];

  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><span className="sign-in">{user.display_name}</span><a className="button button-light button-small" href="/jobs">Browse jobs</a><form action="/api/auth/logout" method="post"><button className="button button-dark button-small" type="submit">Sign out</button></form></nav></header>
    <section className="wrap dashboard-shell">
      <div className="eyebrow"><span/> YOUR LINKWELL WORKSPACE</div>
      <h1>Welcome back, {user.display_name.split(" ")[0]}.</h1>
      <p className="dashboard-intro">You’re signed in as <strong>{user.role}</strong>. This workspace is being connected to the full marketplace workflows.</p>
      <div className="dashboard-grid">{links.map(({href,title,detail,icon:Icon})=><a className="dashboard-link-card" href={href} key={href}><span className="job-card-icon"><Icon size={20}/></span><h2>{title}</h2><p>{detail}</p><span className="dashboard-card-link">Open workspace <ArrowRight size={15}/></span></a>)}</div>
      <div className="dashboard-notice"><ShieldCheck size={18}/><span>Account access is checked on the server. Application tracking, employer actions and moderation controls will only be enabled after their complete workflows are implemented and verified.</span></div>
    </section>
  </main>;
}
