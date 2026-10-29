"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";

export default function SigninForm({ nextPath = "" }: { nextPath?: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get("email") ?? "").trim();
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail, next: nextPath }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not request a sign-in link.");
      setMessage(result.message || "Check your email for a sign-in link.");
      (event.target as HTMLFormElement).reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setMessage("");
    setError("");
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      setError("Enter your email address above first.");
      return;
    }
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not request a verification email.");
      setMessage(result.message || "If your account needs verification, a new link will arrive shortly.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return <form onSubmit={submit} className="auth-form">
    <label className="auth-field">Email address
      <input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} />
    </label>
    {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
    {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
    <button className="button button-dark auth-submit" type="submit" disabled={busy}>
      {busy ? <><LoaderCircle size={16} className="auth-spinner"/> Sending link…</> : <>Email me a sign-in link <ArrowRight size={16}/></>}
    </button>
    <button className="button auth-submit" type="button" onClick={resendVerification} disabled={busy || resending}>
      {resending ? <><LoaderCircle size={16} className="auth-spinner"/> Sending verification email…</> : "Resend verification email"}
    </button>
    <p className="auth-privacy"><Mail size={15}/> Secure sign-in link expires after 15 minutes and works once.</p>
  </form>;
}
