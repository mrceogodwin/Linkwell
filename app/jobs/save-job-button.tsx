"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";

type SavedResponse = { jobs?: Array<{ id?: string }> };

export default function SaveJobButton({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/talent/saved", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) return null;
        return response.json() as Promise<SavedResponse>;
      })
      .then(data => {
        if (!active) return;
        setSaved(Array.isArray(data?.jobs) && data.jobs.some(job => job.id === jobId));
      })
      .catch(() => {
        // Saving remains available even if the initial saved-state check fails.
      })
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [jobId]);

  async function toggleSaved() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/talent/saved", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const result = await response.json();
      if (response.status === 403) {
        window.location.assign("/sign-in?next=%2Fjobs%2F" + encodeURIComponent(jobId));
        return;
      }
      if (!response.ok) throw new Error(result.error || "Could not update your saved opportunities.");
      setSaved(Boolean(result.saved));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your saved opportunities.");
    } finally {
      setBusy(false);
    }
  }

  return <div style={{display:"inline-grid",gap:6}}>
    <button type="button" className="button button-light" onClick={() => void toggleSaved()} disabled={busy || !checked} aria-pressed={saved}>
      {busy ? <LoaderCircle size={16}/> : saved ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>}
      {busy ? "Updating…" : saved ? "Remove saved opportunity" : "Save opportunity"}
    </button>
    {error && <small role="alert" style={{color:"#b42318"}}>{error}</small>}
  </div>;
}
