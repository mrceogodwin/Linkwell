"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, Save } from "lucide-react";

type Profile = {
  headline: string | null;
  biography: string | null;
  location: string | null;
  skills: string[];
  portfolio_url: string | null;
  profile_visibility: boolean;
};

export default function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [headline, setHeadline] = useState(initialProfile.headline ?? "");
  const [biography, setBiography] = useState(initialProfile.biography ?? "");
  const [location, setLocation] = useState(initialProfile.location ?? "");
  const [skills, setSkills] = useState((initialProfile.skills ?? []).join(", "));
  const [portfolioUrl, setPortfolioUrl] = useState(initialProfile.portfolio_url ?? "");
  const [profileVisibility, setProfileVisibility] = useState(initialProfile.profile_visibility);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const completionItems = [
    { label: "Professional headline", complete: Boolean(headline.trim()) },
    { label: "About you", complete: Boolean(biography.trim()) },
    { label: "Location", complete: Boolean(location.trim()) },
    { label: "At least one skill", complete: skills.split(",").some(skill => skill.trim()) },
    { label: "Portfolio or professional website", complete: Boolean(portfolioUrl.trim()) },
  ];
  const completedItems = completionItems.filter(item => item.complete).length;
  const completionPercent = Math.round((completedItems / completionItems.length) * 100);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/talent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, biography, location, skills: skills.split(","), portfolio_url: portfolioUrl, profile_visibility: profileVisibility }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your profile.");
      setMessage("Your profile has been saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="auth-form profile-form" onSubmit={submit}>
    <section className="dashboard-link-card" aria-labelledby="profile-completion-title" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div>
          <h2 id="profile-completion-title" style={{ margin: 0 }}>Profile strength</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted, #666)" }}>A complete profile helps employers understand your experience.</p>
        </div>
        <strong aria-live="polite">{completionPercent}%</strong>
      </div>
      <div role="progressbar" aria-label="Talent profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent} style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "var(--border, #e5e7eb)" }}>
        <div style={{ width: completionPercent + "%", height: "100%", background: "var(--accent, #18794e)", transition: "width 180ms ease" }} />
      </div>
      <p style={{ margin: "10px 0 8px" }}>{completedItems} of {completionItems.length} profile sections completed</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
        {completionItems.map(item => <li key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} aria-hidden="true" color={item.complete ? "var(--accent, #18794e)" : "var(--muted, #999)"} />
          <span style={{ color: item.complete ? "inherit" : "var(--muted, #666)" }}>{item.label}</span>
        </li>)}
      </ul>
    </section>
    <label className="auth-field">Professional headline
      <input value={headline} onChange={e => setHeadline(e.target.value)} maxLength={120} placeholder="e.g. Product designer | Frontend developer" />
    </label>
    <label className="auth-field">About you
      <textarea value={biography} onChange={e => setBiography(e.target.value)} maxLength={3000} rows={6} placeholder="Describe your experience, strengths and the work you want to do." />
      <small>{biography.length}/3000 characters</small>
    </label>
    <label className="auth-field">Location
      <input value={location} onChange={e => setLocation(e.target.value)} maxLength={120} placeholder="e.g. Lagos, Nigeria · Open to remote work" />
    </label>
    <label className="auth-field">Skills
      <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, UI/UX, project management" />
      <small>Separate skills with commas. Up to 30 skills.</small>
    </label>
    <label className="auth-field" style={{display:"flex",alignItems:"flex-start",gap:12}}>
      <input type="checkbox" checked={profileVisibility} onChange={e => setProfileVisibility(e.target.checked)} style={{width:18,height:18,marginTop:4}} />
      <span><strong>Make my talent profile discoverable</strong><br/><small>When enabled, your profile can be shown in talent discovery. Turn this off to hide it from public discovery.</small></span>
    </label>
    <label className="auth-field">Portfolio or professional website
      <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} type="url" placeholder="https://yourportfolio.com" />
      <small>Use a secure HTTPS link.</small>
    </label>
    {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    {message && <p className="auth-feedback auth-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
    <button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="auth-spinner"/> Saving…</> : <>Save profile <Save size={16}/></>}</button>
  </form>;
}
