"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";

export default function SignupForm({ initialRole }: { initialRole: string }) {
  const [role, setRole] = useState(initialRole === "employer" ? "employer" : "talent");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      display_name: String(form.get("display_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      role,
      company_name: String(form.get("company_name") ?? "").trim(),
    };
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create your account.");
      setMessage(result.message || "Check your email for a verification link.");
      event.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="auth-form">
    <label className="auth-field">I want to
      <select value={role} onChange={e => setRole(e.target.value)} aria-label="Account type">
        <option value="talent">Find work (Talent)</option>
        <option value="employer">Hire talent (Employer)</option>
      </select>
    </label>
    <label className="auth-field">Full name
      <input name="display_name" autoComplete="name" minLength={2} maxLength={100} required placeholder="Your full name" />
    </label>
    {role === "employer" && <label className="auth-field">Company name
      <input name="company_name" autoComplete="organization" minLength={2} maxLength={160} required placeholder="Your company or team" />
    </label>}
    <label className="auth-field">Email address
      <input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
    </label>
    {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
    <button className="button button-dark auth-submit" type="submit" disabled={busy}>
      {busy ? <><LoaderCircle size={16} className="auth-spinner"/> Creating account…</> : <>Create account <ArrowRight size={16}/></>}
    </button>
    <p className="auth-privacy"><ShieldCheck size={15}/> We’ll email you a one-time verification link. No password needed.</p>
  </form>;
}
