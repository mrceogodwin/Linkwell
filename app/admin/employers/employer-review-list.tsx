"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, LoaderCircle, ShieldCheck, ShieldOff } from "lucide-react";

type Employer = {
  user_id: string;
  display_name: string;
  email: string;
  email_verified_at: string | null;
  disabled_at: string | null;
  company_name: string;
  website_url: string | null;
  description: string | null;
  location: string | null;
  verified_at: string | null;
  created_at: string;
};

export default function EmployerReviewList() {
  const [items, setItems] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [reason, setReason] = useState<Record<string,string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("all");

  async function load() {
    try {
      const response = await fetch("/api/admin/employers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load employer accounts.");
      setItems(data.employers ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load employer accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function decide(item: Employer, decision: "verify" | "unverify") {
    setBusyId(item.user_id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/employers/${item.user_id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reason[item.user_id] ?? "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update verification.");
      setNotice(`${item.company_name} verification updated.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update verification.");
    } finally {
      setBusyId("");
    }
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || [item.company_name, item.display_name, item.email, item.location ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(query));
      const matchesVerification = verificationFilter === "all"
        || (verificationFilter === "verified" && !!item.verified_at)
        || (verificationFilter === "pending" && !item.verified_at);
      return matchesSearch && matchesVerification;
    });
  }, [items, search, verificationFilter]);

  if (loading) return <div className="empty-state"><LoaderCircle size={20}/> Loading employer accounts…</div>;
  return <div className="employer-review-list">
    {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    {notice && <p className="auth-feedback auth-success" role="status"><CheckCircle2 size={16}/>{notice}</p>}
    {items.length > 0 && <section aria-label="Filter employer accounts" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(170px,220px)",gap:12,marginBottom:18}}>
      <label className="auth-field">Search employers
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Company, contact, email or location" />
      </label>
      <label className="auth-field">Verification status
        <select value={verificationFilter} onChange={event => setVerificationFilter(event.target.value)}>
          <option value="all">All accounts ({items.length})</option>
          <option value="pending">Awaiting verification</option>
          <option value="verified">Verified employers</option>
        </select>
      </label>
    </section>}
    {items.length === 0 ? <div className="empty-state"><div className="empty-icon"><Building2 size={24}/></div><h3>No employer accounts yet.</h3><p>Employer accounts will appear here after someone signs up and verifies their email.</p></div> : filteredItems.length === 0 ? <div className="empty-state"><h3>No matching employers.</h3><p>Try a different search or verification status.</p><button type="button" className="button button-light button-small" onClick={() => {setSearch("");setVerificationFilter("all");}}>Clear filters</button></div> : filteredItems.map(item => <article className="application-row employer-review-row" key={item.user_id}>
      <div className="job-card-icon"><Building2 size={20}/></div>
      <div className="application-main">
        <h2>{item.company_name}</h2>
        <p>{item.display_name} · <a href={"mailto:"+item.email}>{item.email}</a></p>
        {item.location && <p>{item.location}</p>}
        {item.website_url && <p><a href={item.website_url} target="_blank" rel="noreferrer">{item.website_url}</a></p>}
        {item.description && <p>{item.description}</p>}
        <small>Registered {new Date(item.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</small>
        {!item.email_verified_at && <p className="auth-feedback auth-error">Email not verified — cannot approve yet.</p>}
        {item.disabled_at && <p className="auth-feedback auth-error">Account is disabled.</p>}
        {item.verified_at ? <span className="application-status status-published"><ShieldCheck size={13}/> Verified employer</span> : <span className="application-status status-pending_review"><ShieldOff size={13}/> Awaiting verification</span>}
        {item.verified_at && <label className="auth-field" style={{marginTop:12}}>Reason for removing verification
          <textarea rows={2} maxLength={1000} value={reason[item.user_id] ?? ""} onChange={e => setReason(current=>({...current,[item.user_id]:e.target.value}))} placeholder="Required if you need to revoke verification"/>
        </label>}
      </div>
      <div className="applicant-controls">
        <button type="button" className="button button-dark button-small" disabled={busyId===item.user_id || !item.email_verified_at || !!item.disabled_at || !!item.verified_at} onClick={()=>void decide(item,"verify")}>{busyId===item.user_id ? <LoaderCircle size={14}/> : <ShieldCheck size={14}/>} Verify</button>
        {item.verified_at && <button type="button" className="button button-light button-small" disabled={busyId===item.user_id || (reason[item.user_id] ?? "").trim().length<5} onClick={()=>void decide(item,"unverify")}>Revoke</button>}
      </div>
    </article>)}
  </div>;
}
