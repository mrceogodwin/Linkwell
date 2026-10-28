"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";

export default function ApplyForm({ jobId }: { jobId: string }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    setNeedsSignIn(false);
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_letter: coverLetter }),
      });
      const result = await response.json();
      if (response.status === 403) {
        setNeedsSignIn(true);
        throw new Error("Sign in with a verified talent account before applying.");
      }
      if (!response.ok) throw new Error(result.error || "Could not submit your application.");
      setMessage("Application submitted. You can track its status from your talent dashboard.");
      setCoverLetter("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="apply-panel" style={{marginTop:24,padding:22,border:"1px solid #e0e5df",borderRadius:16,background:"#fff"}}>
    <h3 style={{marginTop:0}}>Apply through Linkwell</h3>
    <p>Send your application to the employer and track its status from your account.</p>
    {message ? <p className="auth-feedback auth-success" role="status"><CheckCircle2 size={16}/>{message}</p> : <form className="auth-form" onSubmit={submit}>
      <label className="auth-field">Cover letter <span style={{fontWeight:400}}>· optional</span>
        <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} maxLength={5000} rows={5} placeholder="Introduce yourself and explain why this opportunity interests you."/>
      </label>
      {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
      {needsSignIn && <p><a href="/sign-in">Sign in</a> or <a href="/sign-up">create a talent account</a>, then return to this opportunity.</p>}
      <button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16}/> Submitting…</> : <>Submit application <ArrowRight size={16}/></>}</button>
    </form>}
  </section>;
}
