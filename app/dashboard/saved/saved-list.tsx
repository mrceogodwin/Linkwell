"use client";

import { useEffect, useState } from "react";
import { Bookmark, LoaderCircle, Trash2 } from "lucide-react";

type SavedJob = {
  id: string;
  title: string;
  company_name: string;
  category: string;
  listing_type: string;
  work_arrangement: string;
  location: string | null;
  salary_min: string | number | null;
  salary_max: string | number | null;
  salary_currency: string | null;
  salary_period: string | null;
  saved_at: string;
};

export default function SavedList() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/talent/saved", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load saved jobs.");
      setJobs(result.jobs ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load saved jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function remove(jobId: string) {
    setBusyId(jobId);
    setError("");
    try {
      const response = await fetch("/api/talent/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove saved job.");
      setJobs(current => current.filter(job => job.id !== jobId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove saved job.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) return <div className="empty-state"><LoaderCircle size={20}/> Loading saved opportunities…</div>;
  return <div className="saved-jobs-list">
    {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    {jobs.length === 0 ? <div className="empty-state"><div className="empty-icon"><Bookmark size={24}/></div><h3>No saved opportunities yet.</h3><p>Save roles that interest you and they’ll be waiting here when you’re ready.</p><a className="button button-dark" href="/jobs">Explore opportunities</a></div> : jobs.map(job => {
      const salary = job.salary_min != null || job.salary_max != null
        ? `${job.salary_currency ?? ""} ${job.salary_min ?? "—"}–${job.salary_max ?? "—"}${job.salary_period ? " / " + job.salary_period : ""}`.trim()
        : "";
      return <article className="dashboard-link-card saved-job-card" key={job.id}>
        <div className="job-card-icon"><Bookmark size={18}/></div>
        <h2><a href={`/jobs/${job.id}`}>{job.title}</a></h2>
        <p><strong>{job.company_name}</strong> · {job.category}</p>
        <p>{job.listing_type.replaceAll("_", " ")} · {job.work_arrangement.replaceAll("_", " ")}{job.location ? ` · ${job.location}` : ""}{salary ? ` · ${salary}` : ""}</p>
        <div className="dashboard-card-link"><a href={`/jobs/${job.id}`}>View opportunity</a><button className="button button-light button-small" type="button" onClick={() => void remove(job.id)} disabled={busyId === job.id}>{busyId === job.id ? <LoaderCircle size={14}/> : <Trash2 size={14}/>} Remove</button></div>
      </article>;
    })}
  </div>;
}
