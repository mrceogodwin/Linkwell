import { redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import ProfileForm from "./profile-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TalentProfilePage() {
  const user = await requireRole(["talent"]);
  if (!user) redirect("/sign-in?next=%2Fdashboard%2Fprofile");

  let profile = {
    headline: null as string | null,
    biography: null as string | null,
    location: null as string | null,
    skills: [] as string[],
    portfolio_url: null as string | null,
    profile_visibility: false,
  };
  try {
    const rows = await getDb().query(
      "SELECT headline, biography, location, skills, portfolio_url, profile_visibility FROM talent_profiles WHERE user_id = $1::uuid LIMIT 1",
      [user.id]
    );
    if (rows[0]) profile = { ...profile, ...(rows[0] as Partial<typeof profile>) };
  } catch {
    // Keep the page renderable; the form/API will report service errors on save.
  }

  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/dashboard">Workspace</a><span className="admin-pill"><UserRound size={15}/> Talent</span><form action="/api/auth/logout" method="post"><button className="button button-dark button-small" type="submit">Sign out</button></form></nav></header>
    <section className="wrap admin-shell">
      <a className="auth-back" href="/dashboard"><ArrowLeft size={14}/> Back to workspace</a>
      <div className="eyebrow"><span/> TALENT PROFILE</div>
      <h1>Show employers what you bring.</h1>
      <p className="admin-intro">Add the details that help teams understand your experience. You can update this whenever you need.</p>
      <div className="auth-panel" style={{maxWidth:760,marginTop:24}}><ProfileForm initialProfile={profile}/></div>
    </section>
  </main>;
}
