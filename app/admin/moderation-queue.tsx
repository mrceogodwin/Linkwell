"use client";

import { useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";

type PendingJob = { id: string; title: string; company_name: string; category: string; listing_type: string; work_arrangement: string; location: string | null; description: string; submitted_at: string | null };

export default function ModerationQueue({ jobs }: { jobs: PendingJob[] }) {
  const [items, setItems] = useState(jobs);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function review(job: PendingJob, decision: "approve" | "reject") {
    if (decision === "reject" && (reasons[job.id] ?? "").trim().length < 5) {
      setMessage("Add a clear rejection reason (at least five characters).");
      return;
    }
    setBusy(job.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reasons[job.id] ?? "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Review failed.");
      setItems((current) => current.filter((item) => item.id !== job.id));
      setMessage(decision === "approve" ? "Listing approved and published." : "Listing rejected and the reason recorded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return <div className="moderation-empty"><Check size={20}/><h2>Queue clear</h2><p>There are no listings awaiting review right now.</p>{message && <p role="status">{message}</p>}</div>;

  return <div className="moderation-list">
    {message && <p className="moderation-message" role="status">{message}</p>}
    {items.map((job) => <article className="moderation-card" key={job.id}>
      <div className="moderation-card-head"><span className="eyebrow"><span/> AWAITING REVIEW</span><small>{job.submitted_at ? new Date(job.submitted_at).toLocaleDateString() : "Submission date unavailable"}</small></div>
      <h2>{job.title}</h2><h3>{job.company_name}</h3>
      <div className="job-detail-tags"><span>{job.listing_type.replace("_", "-")}</span><span>{job.work_arrangement.replace("_", "-")}</span><span>{job.category}</span>{job.location && <span>{job.location}</span>}</div>
      <p className="moderation-description">{job.description}</p>
      <label className="moderation-label" htmlFor={`reason-${job.id}`}>Rejection reason (required to reject)</label>
      <textarea id={`reason-${job.id}`} value={reasons[job.id] ?? ""} onChange={(event) => setReasons((current) => ({...current, [job.id]: event.target.value.slice(0,1000)}))} maxLength={1000} rows={2} placeholder="Explain what needs to be corrected…" />
      <div className="moderation-actions"><button disabled={busy !== null} onClick={() => review(job,"reject")} className="button button-light"><X size={15}/> Reject</button><button disabled={busy !== null} onClick={() => review(job,"approve")} className="button button-dark">{busy === job.id ? <LoaderCircle size={15} className="spin"/> : <Check size={15}/>} Approve & publish</button></div>
    </article>)}
  </div>;
}
