"use client";

import { useState } from "react";
import { ArrowRight, Bookmark, CheckCircle2, LoaderCircle } from "lucide-react";

export default function JobActions({ jobId }: { jobId: string }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);

  async function saveJob() {
    setBusy(true); setError(""); setMessage(""); setSignIn(false);
    try {
      const response = await fetch("/api/talent/saved", { method: saved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: jobId }) });
      const data = await response.json();
      if (response.status === 403) { setSignIn(true); throw new Error("Sign in with a verified talent account to save opportunities."); }
      if (!response.ok) throw new Error(data.error || "Could not update your saved list.");
      setSaved(!saved); setMessage(saved ? "Removed from saved opportunities." : "Saved to your opportunities.");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setSignIn(false);
    try {
      const response = await fetch("/api/talent/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: jobId, cover_letter: coverLetter }) });
      const data = await response.json();
      if (response.status === 403) { setSignIn(true); throw new Error("Sign in with a verified talent account to apply."); }
      if (!response.ok) throw new Error(data.error || "Could not submit your application.");
      setMessage("Application submitted. You can track it from your dashboard."); setShowApply(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  return <div className="job-actions">
    <div className="job-action-buttons">
      <button type="button" className="button button-dark" onClick={()=>{setShowApply(v=>!v);setError("");setMessage("");}}>{showApply ? "Close application" : <>Apply with Linkwell <ArrowRight size={16}/></>}</button>
      <button type="button" className="button button-light" onClick={saveJob} disabled={busy}><Bookmark size={16}/>{saved ? "Saved" : "Save opportunity"}</button>
    </div>
    {showApply && <form className="auth-form application-form" onSubmit={apply}><label className="auth-field">Cover letter (optional)<textarea value={coverLetter} onChange={e=>setCoverLetter(e.target.value)} maxLength={5000} rows={6} placeholder="Briefly tell the employer why you’re a good fit."/></label><button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16}/> Submitting…</> : <>Submit application <ArrowRight size={16}/></>}</button></form>}
    {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    {message && <p className="auth-feedback auth-success" role="status"><CheckCircle2 size={15}/> {message}</p>}
    {signIn && <p className="auth-privacy"><a href={"/sign-in?next="+encodeURIComponent("/jobs/"+jobId)}>Sign in</a> or <a href={"/sign-up?next="+encodeURIComponent("/jobs/"+jobId)}>create a talent account</a> to continue.</p>}
  </div>;
}
