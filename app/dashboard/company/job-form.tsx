"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Clock3, PlusCircle } from "lucide-react";

type Listing = {
  id: string; title: string; category: string; listing_type: string;
  work_arrangement: string; location: string | null; status: string;
  submitted_at: string | null; created_at: string; review_reason: string | null;
};

export default function EmployerJobForm() {
  const [jobs, setJobs] = useState<Listing[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const response = await fetch("/api/employer/jobs", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load listings.");
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load listings.");
    } finally { setLoadingJobs(false); }
  }

  useEffect(() => { void loadJobs(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, string | number | null> = {};
    for (const key of ["title","description","requirements","category","listing_type","work_arrangement","location","salary_currency","salary_period","application_url"]) {
      payload[key] = String(fd.get(key) || "").trim();
    }
    for (const key of ["salary_min","salary_max"]) {
      const value = String(fd.get(key) || "").trim();
      payload[key] = value ? Number(value) : null;
    }
    try {
      const response = await fetch("/api/employer/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Listing could not be submitted.");
      setMessage("Submitted successfully. Your listing is pending administrator review.");
      form.reset();
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Listing could not be submitted.");
    } finally { setSaving(false); }
  }

  const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

  return <div className="employer-workspace">
    <section className="employer-panel">
      <div className="employer-panel-heading"><span className="job-card-icon"><PlusCircle size={20}/></span><div><h2>Post an opportunity</h2><p>Every submission is reviewed before it goes live.</p></div></div>
      {message && <p className="form-success" role="status"><CheckCircle2 size={17}/>{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="employer-job-form" onSubmit={submit}>
        <label>Job or project title<input name="title" required minLength={4} maxLength={140} placeholder="e.g. Product Designer" /></label>
        <div className="employer-form-row">
          <label>Opportunity type<select name="listing_type" required defaultValue="full_time"><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="freelance">Freelance</option><option value="contract">Contract</option></select></label>
          <label>Work arrangement<select name="work_arrangement" required defaultValue="remote"><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label>
        </div>
        <div className="employer-form-row">
          <label>Category<input name="category" required maxLength={80} placeholder="e.g. Design, Engineering" /></label>
          <label>Location<input name="location" maxLength={160} placeholder="e.g. Nigeria / Remote" /></label>
        </div>
        <label>Description<textarea name="description" required minLength={30} maxLength={12000} rows={6} placeholder="Describe the opportunity, responsibilities and what success looks like." /></label>
        <label>Requirements <span className="form-optional">Optional</span><textarea name="requirements" maxLength={8000} rows={3} placeholder="Skills, experience and qualifications." /></label>
        <div className="employer-panel-subheading">Compensation <span className="form-optional">Optional</span></div>
        <div className="employer-form-row salary-row">
          <label>Minimum<input name="salary_min" type="number" min="0" step="0.01" placeholder="0" /></label>
          <label>Maximum<input name="salary_max" type="number" min="0" step="0.01" placeholder="0" /></label>
          <label>Currency<input name="salary_currency" minLength={3} maxLength={3} placeholder="NGN" /></label>
        </div>
        <div className="employer-form-row">
          <label>Pay period<select name="salary_period" defaultValue=""><option value="">Not specified</option><option value="hour">Per hour</option><option value="month">Per month</option><option value="year">Per year</option><option value="project">Per project</option></select></label>
          <label>Application URL<input name="application_url" type="url" placeholder="https://..." /></label>
        </div>
        <button className="button button-primary employer-submit" type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit for review"}</button>
        <p className="employer-form-footnote"><Clock3 size={14}/> Your opportunity remains unpublished until an administrator approves it.</p>
      </form>
    </section>
    <section className="employer-panel employer-listings-panel">
      <div className="employer-panel-heading"><div><h2>Your opportunities</h2><p>Track submissions and moderation decisions.</p></div><span className="employer-count">{jobs.length}</span></div>
      {loadingJobs ? <p className="employer-listing-empty">Loading your listings…</p> : jobs.length === 0 ? <p className="employer-listing-empty">No listings yet. Your submitted opportunities will appear here.</p> :
        <div className="employer-listings">{jobs.map(job => <article className="employer-listing" key={job.id}><div><h3>{job.title}</h3><p>{job.category} · {pretty(job.listing_type)} · {pretty(job.work_arrangement)}</p>{job.review_reason && <p className="review-reason">Review note: {job.review_reason}</p>}</div><span className={"listing-status status-" + job.status}>{pretty(job.status)}</span></article>)}</div>}
    </section>
  </div>;
}
