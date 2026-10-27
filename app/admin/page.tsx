import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import ModerationQueue from "./moderation-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PendingJob = {
  id: string; title: string; company_name: string; category: string;
  listing_type: string; work_arrangement: string; location: string | null;
  description: string; submitted_at: string | null;
};

export default async function AdminPage() {
  const admin = await requireRole(["admin"]);
  if (!admin) redirect("/sign-in?next=%2Fadmin");

  let jobs: PendingJob[] = [];
  let unavailable = false;
  try {
    const sql = getDb();
    jobs = await sql.query(
      `SELECT id, title, company_name, category, listing_type, work_arrangement,
              location, description, submitted_at
       FROM jobs WHERE status = 'pending_review'
       ORDER BY submitted_at ASC NULLS LAST, created_at ASC LIMIT 100`,
      []
    ) as PendingJob[];
  } catch {
    unavailable = true;
  }

  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/dashboard">Workspace</a><span className="admin-pill"><ShieldCheck size={15}/> Administrator</span></nav></header>
    <section className="wrap admin-shell">
      <div className="eyebrow"><span/> TRUST & SAFETY</div>
      <h1>Listing moderation</h1>
      <p className="admin-intro">Review every new opportunity before it reaches the public marketplace. Rejections require a reason and every decision is recorded in the audit log.</p>
      {unavailable ? <div className="moderation-empty"><h2>Moderation queue unavailable</h2><p>We could not load the database queue. Check the connection and migrations; no listing status has been changed.</p></div> : <><div className="admin-count"><strong>{jobs.length}</strong><span>{jobs.length === 1 ? "listing awaiting review" : "listings awaiting review"}</span></div><ModerationQueue jobs={jobs}/></>}
    </section>
  </main>;
}
