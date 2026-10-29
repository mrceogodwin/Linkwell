"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, Users } from "lucide-react";

type Application = {
  id: string;
  job_id: string;
  status: string;
  cover_letter: string | null;
  created_at: string;
  employer_notes: string | null;
  applicant_name: string;
  applicant_email: string;
  job_title: string;
};

const labels: Record<string, string> = {
  submitted: "Submitted", reviewing: "Under review", shortlisted: "Shortlisted",
  rejected: "Not selected", hired: "Hired", withdrawn: "Withdrawn",
};

export default function ApplicantsList() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let active = true;
    fetch("/api/employer/applications", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load applicants.");
        if (active) setItems(data.applications ?? []);
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load applicants."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function update(item: Application, status?: string) {
    setBusyId(item.id);
    setError("");
    setSavedId("");
    try {
      const response = await fetch("/api/employer/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: item.id, ...(status ? { status } : {}), employer_notes: notes[item.id] ?? item.employer_notes ?? "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update application.");
      setItems(current => current.map(row => row.id === item.id ? { ...row, status: data.application.status, employer_notes: data.application.employer_notes } : row));
      setSavedId(item.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update application.");
    } finally {
      setBusyId("");
    }
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items.filter(item => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesQuery = !query || [item.applicant_name, item.applicant_email, item.job_title]
        .some(value => value.toLocaleLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [items, search, statusFilter]);

  const statusCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});

  if (loading) return <div className="empty-state"><LoaderCircle size={20}/> Loading applicants…</div>;
  return <div className="applicant-list">
    {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    {items.length > 0 && <section aria-label="Filter applicants" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(180px,240px)",gap:12,marginBottom:18}}>
      <label className="auth-field">Search applicants
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, email or opportunity title" />
      </label>
      <label className="auth-field">Application status
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="all">All statuses ({items.length})</option>
          <option value="submitted">Submitted ({statusCounts.submitted ?? 0})</option>
          <option value="reviewing">Under review ({statusCounts.reviewing ?? 0})</option>
          <option value="shortlisted">Shortlisted ({statusCounts.shortlisted ?? 0})</option>
          <option value="rejected">Not selected ({statusCounts.rejected ?? 0})</option>
          <option value="hired">Hired ({statusCounts.hired ?? 0})</option>
        </select>
      </label>
    </section>}
    {items.length === 0 ? <div className="empty-state"><div className="empty-icon"><Users size={24}/></div><h3>No applications yet.</h3><p>When talent applies to one of your published opportunities, their application will appear here.</p><a className="button button-light" href="/dashboard/company">Manage listings</a></div> : filteredItems.length === 0 ? <div className="empty-state"><div className="empty-icon"><Users size={24}/></div><h3>No matching applicants.</h3><p>Try a different search term or status filter.</p><button className="button button-light" type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</button></div> : filteredItems.map(item => <article className="application-row applicant-row" key={item.id}>
      <div className="job-card-icon"><Users size={19}/></div>
      <div className="application-main">
        <h2>{item.applicant_name}</h2>
        <p><a href={"mailto:"+item.applicant_email}>{item.applicant_email}</a> · <a href={"/jobs/"+item.job_id}>{item.job_title}</a></p>
        <small>Applied {new Date(item.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</small>
        {item.cover_letter && <div className="application-cover-letter"><strong>Cover letter</strong><p>{item.cover_letter}</p></div>}
        <label className="auth-field" style={{marginTop:12}}>Internal note
          <textarea rows={2} maxLength={2000} value={notes[item.id] ?? item.employer_notes ?? ""} onChange={e => { setNotes(current => ({...current,[item.id]:e.target.value})); setSavedId(""); }} placeholder="Private notes for your hiring team"/>
        </label>
        <div className="applicant-note-actions">
          <button className="button button-light button-small" type="button" onClick={() => void update(item)} disabled={busyId === item.id}>{busyId === item.id ? <LoaderCircle size={13}/> : null} Save note</button>
          {savedId === item.id && <span className="auth-feedback auth-success" role="status"><CheckCircle2 size={15}/> Saved</span>}
        </div>
      </div>
      <div className="applicant-controls">
        <span className={"application-status status-"+item.status}>{labels[item.status] ?? item.status}</span>
        <select aria-label={"Update status for "+item.applicant_name} value={item.status} onChange={e => void update(item,e.target.value)} disabled={busyId===item.id}>
          <option value="submitted" disabled>Submitted</option>
          <option value="reviewing">Under review</option>
          <option value="shortlisted">Shortlist</option>
          <option value="rejected">Not selected</option>
          <option value="hired">Hired</option>
          <option value="withdrawn" disabled>Withdrawn</option>
        </select>
        {busyId===item.id && <small><LoaderCircle size={13}/> Saving status…</small>}
      </div>
    </article>)}
  </div>;
}
