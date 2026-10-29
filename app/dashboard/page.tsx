import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Bookmark, UserRound, ShieldCheck, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fdashboard");

  let profileChecklist: Array<{ label: string; complete: boolean }> = [];
  let profileCompletion: number | null = null;
  if (user.role === "talent") {
    try {
      const rows = await getDb().query(
        "SELECT headline, biography, location, skills, portfolio_url FROM talent_profiles WHERE user_id = $1::uuid LIMIT 1",
        [user.id]
      );
      const profile = rows[0] as { headline?: string | null; biography?: string | null; location?: string | null; skills?: string[] | null; portfolio_url?: string | null } | undefined;
      if (profile) {
        profileChecklist = [
          { label: "Add a professional headline", complete: Boolean(profile.headline?.trim()) },
          { label: "Write your introduction", complete: Boolean(profile.biography?.trim()) },
          { label: "Add your location", complete: Boolean(profile.location?.trim()) },
          { label: "List your skills", complete: Boolean(profile.skills?.length) },
          { label: "Add a portfolio link", complete: Boolean(profile.portfolio_url?.trim()) },
        ];
        profileCompletion = Math.round(profileChecklist.filter(item => item.complete).length / profileChecklist.length * 100);
      }
    } catch {
      // Keep the workspace usable if profile data is temporarily unavailable.
    }
  }

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
      {profileCompletion !== null && <section aria-labelledby="profile-progress-title" className="auth-panel" style={{maxWidth:820,marginBottom:24}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div><div className="eyebrow">YOUR PROFILE</div><h2 id="profile-progress-title" style={{margin:"8px 0"}}>Build a stronger first impression</h2><p style={{margin:0,color:"var(--muted, #66706a)"}}>Complete these details to help employers understand what you bring.</p></div>
          <strong style={{fontSize:28}} aria-label={profileCompletion+" percent complete"}>{profileCompletion}%</strong>
        </div>
        <div role="progressbar" aria-label="Talent profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion} style={{height:8,borderRadius:999,background:"var(--line, #e5e7e5)",overflow:"hidden",marginTop:18}}>
          <div style={{height:"100%",width:profileCompletion+"%",background:"var(--accent, #d7f36b)",transition:"width 180ms ease"}} />
        </div>
        <ul style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"10px 20px",padding:0,listStyle:"none",margin:"18px 0"}}>
          {profileChecklist.map(item=><li key={item.label} style={{display:"flex",gap:9,alignItems:"center",fontSize:14}}><span aria-hidden="true" style={{display:"inline-grid",placeItems:"center",width:19,height:19,borderRadius:"50%",background:item.complete?"var(--accent, #d7f36b)":"var(--line, #e5e7e5)",fontSize:12}}>{item.complete?"✓":"·"}</span><span style={{color:item.complete?"var(--muted, #66706a)":"inherit"}}>{item.label}</span></li>)}
        </ul>
        <a className="button button-dark button-small" href="/dashboard/profile">Update profile <ArrowRight size={15}/></a>
      </section>}
      <div className="dashboard-grid">{links.map(({href,title,detail,icon:Icon})=><a className="dashboard-link-card" href={href} key={href}><span className="job-card-icon"><Icon size={20}/></span><h2>{title}</h2><p>{detail}</p><span className="dashboard-card-link">Open workspace <ArrowRight size={15}/></span></a>)}</div>
      <div className="dashboard-notice"><ShieldCheck size={18}/><span>Account access is checked on the server. Application tracking, employer actions and moderation controls will only be enabled after their complete workflows are implemented and verified.</span></div>
    </section>
  </main>;
}
