import { redirect } from "next/navigation";
import { ArrowLeft, Bookmark } from "lucide-react";
import { requireRole } from "@/lib/auth";
import SavedList from "./saved-list";

export const dynamic = "force-dynamic";

export default async function SavedOpportunitiesPage() {
  const user = await requireRole(["talent"]);
  if (!user) redirect("/sign-in?next=%2Fdashboard%2Fsaved");
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/dashboard">Workspace</a><form action="/api/auth/logout" method="post"><button className="button button-dark button-small" type="submit">Sign out</button></form></nav></header>
    <section className="wrap admin-shell">
      <a className="auth-back" href="/dashboard"><ArrowLeft size={14}/> Back to workspace</a>
      <div className="eyebrow"><span/> YOUR SHORTLIST</div>
      <h1>Saved opportunities.</h1>
      <p className="admin-intro">Keep interesting roles together and return when you’re ready to apply.</p>
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"24px 0 12px",color:"#123D2B"}}><Bookmark size={18}/><strong>My saved jobs</strong></div>
      <SavedList/>
    </section>
  </main>;
}
