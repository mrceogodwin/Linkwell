"use client";

import { useState } from "react";
import { Bookmark, LoaderCircle } from "lucide-react";

export default function SaveJobButton({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/talent/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const result = await response.json();
      if (response.status === 403) {
        window.location.assign("/sign-in?next=%2Fjobs%2F" + encodeURIComponent(jobId));
        return;
      }
      if (!response.ok) throw new Error(result.error || "Could not save this opportunity.");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this opportunity.");
    } finally {
      setBusy(false);
    }
  }

  return <div style={{display:"inline-grid",gap:6}}>
    <button type="button" className="button button-light" onClick={() => void save()} disabled={busy || saved}>
      {busy ? <LoaderCircle size={16}/> : <Bookmark size={16}/>} {saved ? "Saved" : "Save opportunity"}
    </button>
    {error && <small role="alert" style={{color:"#b42318"}}>{error}</small>}
  </div>;
}
