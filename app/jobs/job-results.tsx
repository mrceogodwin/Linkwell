"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, MapPin, Clock3, Search, ShieldCheck } from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  category: string;
  listing_type: string;
  work_arrangement: string;
  location: string | null;
  salary_min: string | number | null;
  salary_max: string | number | null;
  salary_currency: string | null;
  salary_period: string | null;
  published_at: string | null;
};

export default function JobResults({ q = "", work = "", type = "", category = "" }: { q?: string; work?: string; type?: string; category?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (work) params.set("work", work);
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    let active = true;
    setLoading(true);
    fetch("/api/jobs?" + params.toString(), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("not_ready");
        return response.json();
      })
      .then((data: { jobs?: Job[] }) => {
        if (!active) return;
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setUnavailable(false);
      })
      .catch(() => {
        if (!active) return;
        setJobs([]);
        setUnavailable(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [q, work, type, category]);

  if (loading) return <div className="empty-state"><div className="empty-icon"><Search size={26}/></div><h3>Checking opportunities…</h3><p>Loading approved listings.</p></div>;
  if (unavailable) return <div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={28}/></div><h3>The opportunity board isn’t connected yet.</h3><p>The search API needs the Neon database configured and the marketplace schema applied before it can load vacancies. No invented sample jobs are shown.</p><small>Build stage · Database not configured or unavailable</small></div>;
  if (!jobs.length) return <div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={28}/></div><h3>No approved opportunities found.</h3><p>There are no published vacancies matching these filters yet. New listings must be reviewed by an administrator before they appear here.</p><small>Only approved, non-expired listings are displayed.</small></div>;

  return <div className="job-list">{jobs.map((job) => {
    const salary = job.salary_min != null || job.salary_max != null
      ? [job.salary_currency, job.salary_min ?? "—", job.salary_max != null ? "–" + job.salary_max : ""].filter(Boolean).join(" ") + (job.salary_period ? " / " + job.salary_period : "")
      : "";
    return <article className="job-card" key={job.id}>
      <div className="job-card-icon"><BriefcaseBusiness size={21}/></div>
      <div className="job-card-main"><div className="job-card-company">{job.company}</div><h3>{job.title}</h3><p>{job.description}</p><div className="job-tags"><span>{job.listing_type.replace("_", "-")}</span><span>{job.work_arrangement.replace("_", "-")}</span>{job.category && <span>{job.category}</span>}</div></div>
      <div className="job-card-meta">{job.location && <span><MapPin size={13}/>{job.location}</span>}{salary && <strong>{salary}</strong>}<span><ShieldCheck size={13}/>Approved listing</span></div>
    </article>;
  })}</div>;
}
