"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Clock3, Search, X } from "lucide-react";

type Application = {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  title: string;
  company_name: string;
  location: string | null;
  listing_type: string;
  work_arrangement: string;
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Under review",
  shortlisted: "Shortlisted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
  hired: "Hired",
};

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Under review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Not selected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "hired", label: "Hired" },
];

export default function ApplicationList({ applications }: { applications: Application[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter(app => {
      const matchesStatus = status === "all" || app.status === status;
      const matchesQuery = !needle || [app.title, app.company_name, app.location ?? ""].some(value => value.toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [applications, query, status]);

  const activeCount = applications.filter(app => ["submitted", "reviewing", "shortlisted"].includes(app.status)).length;
  const hiredCount = applications.filter(app => app.status === "hired").length;
  const hasFilters = Boolean(query.trim()) || status !== "all";

  return <>
    <div className="application-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "22px 0" }}>
      <div className="dashboard-link-card"><small>Total applications</small><strong style={{ display: "block", fontSize: 26, marginTop: 5 }}>{applications.length}</strong></div>
      <div className="dashboard-link-card"><small>In progress</small><strong style={{ display: "block", fontSize: 26, marginTop: 5 }}>{activeCount}</strong></div>
      <div className="dashboard-link-card"><small>Hired</small><strong style={{ display: "block", fontSize: 26, marginTop: 5 }}>{hiredCount}</strong></div>
    </div>
    <section className="auth-panel" aria-label="Filter applications" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "center", marginBottom: 20 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid var(--line, #e5e9e3)", borderRadius: 9, padding: "0 12px", minHeight: 44 }}>
        <Search size={17} aria-hidden="true"/>
        <input value={query} onChange={event => setQuery(event.target.value)} maxLength={120} placeholder="Search role, company or location" aria-label="Search applications" style={{ width: "100%", border: 0, outline: 0, background: "transparent" }}/>
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
        Status
        <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter by application status" style={{ width: "100%", minHeight: 44, border: "1px solid var(--line, #e5e9e3)", borderRadius: 9, padding: "0 10px", background: "white" }}>
          {statusOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      </label>
      {hasFilters ? <button type="button" className="button button-light button-small" onClick={() => { setQuery(""); setStatus("all"); }}><X size={15}/> Clear</button> : <span aria-hidden="true"/>}
    </section>
    <p aria-live="polite" style={{ color: "var(--muted, #68716b)", fontSize: 13, marginBottom: 14 }}>Showing {filtered.length} of {applications.length} applications</p>
    {filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={24}/></div><h3>{hasFilters ? "No applications match these filters." : "Your next opportunity starts here."}</h3><p>{hasFilters ? "Try another search or clear the filters to see every application." : "When you apply for a job through Linkwell, you’ll see its status here."}</p>{hasFilters ? <button type="button" className="button button-light" onClick={() => { setQuery(""); setStatus("all"); }}>Clear filters</button> : <a className="button button-dark" href="/jobs">Explore opportunities</a>}</div>
      : <div className="application-list">{filtered.map(app => <article className="application-row" key={app.id}>
        <div className="job-card-icon"><BriefcaseBusiness size={20}/></div>
        <div className="application-main"><h2><a href={"/jobs/" + app.job_id}>{app.title}</a></h2><p>{app.company_name}{app.location ? " · " + app.location : ""}</p><small><Clock3 size={13}/> Applied {new Date(app.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small></div>
        <span className={"application-status status-" + app.status}>{statusLabels[app.status] ?? app.status}</span>
      </article>)}</div>}
  </>;
}
