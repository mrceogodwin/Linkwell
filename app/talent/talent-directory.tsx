"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, LoaderCircle, Search, Users } from "lucide-react";

type TalentProfile = {
  display_name: string;
  headline: string | null;
  biography: string | null;
  location: string | null;
  skills: string[];
  portfolio_url: string | null;
};

export default function TalentDirectory() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/talent/discover?q=" + encodeURIComponent(submittedQuery), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load talent profiles.");
        setProfiles(Array.isArray(data.talent) ? data.talent : []);
      })
      .catch(cause => {
        if (cause instanceof Error && cause.name !== "AbortError") {
          setError(cause.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [submittedQuery]);

  return <section className="wrap talent-directory">
    <div className="directory-heading">
      <div><div className="eyebrow"><span/> TALENT DIRECTORY</div><h2>Meet the people behind the skills.</h2><p>Explore professionals who have chosen to make their profiles discoverable.</p></div>
      <form className="directory-search" onSubmit={event => { event.preventDefault(); setSubmittedQuery(query.trim()); }}>
        <label><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} maxLength={100} placeholder="Search skills, roles or locations" aria-label="Search talent profiles"/></label>
        <button className="button button-dark" type="submit">Search</button>
      </form>
    </div>
    {error ? <div className="empty-state" role="alert"><h3>Talent directory unavailable</h3><p>{error}</p></div>
      : loading ? <div className="empty-state"><LoaderCircle size={22} className="auth-spinner"/><p>Loading discoverable profiles…</p></div>
      : profiles.length === 0 ? <div className="empty-state"><div className="empty-icon"><Users size={23}/></div><h3>{submittedQuery ? "No matching profiles yet." : "No public profiles yet."}</h3><p>{submittedQuery ? "Try another skill, role or location." : "As talent members choose to make their profiles discoverable, their profiles will appear here."}</p>{submittedQuery && <button type="button" className="button button-light" onClick={() => { setQuery(""); setSubmittedQuery(""); }}>Clear search</button>}</div>
      : <div className="talent-card-grid">{profiles.map((profile, index) => <article className="talent-card" key={profile.display_name + "-" + index}>
          <div className="talent-card-top"><span className="talent-avatar" aria-hidden="true">{profile.display_name.trim().slice(0,1).toUpperCase() || "T"}</span><span className="discoverable-pill">Discoverable</span></div>
          <h3>{profile.display_name}</h3>
          <p className="talent-headline">{profile.headline || "Professional on Linkwell"}</p>
          {profile.location && <p className="talent-location">{profile.location}</p>}
          {profile.biography && <p className="talent-bio">{profile.biography}</p>}
          {profile.skills?.length > 0 && <div className="talent-skills">{profile.skills.slice(0,8).map(skill => <span key={skill}>{skill}</span>)}</div>}
          {profile.portfolio_url && <a className="talent-portfolio" href={profile.portfolio_url} target="_blank" rel="noreferrer">View portfolio <ArrowUpRight size={15}/></a>}
        </article>)}</div>}
  </section>;
}
