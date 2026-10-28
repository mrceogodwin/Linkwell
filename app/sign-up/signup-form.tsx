"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { neonAuthClient } from "@/lib/auth/client";

type Step = "details" | "verify";

export default function SignupForm({ initialRole }: { initialRole: string }) {
  const [role, setRole] = useState(initialRole === "employer" ? "employer" : "talent");
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await neonAuthClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (result.error) throw new Error(result.error.message || "Could not send a verification code.");
      setStep("verify");
      setMessage("We sent a one-time code to your email. Enter it below to finish creating your account.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await neonAuthClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (result.error) throw new Error(result.error.message || "That code could not be verified.");

      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "signup",
          display_name: displayName.trim(),
          role,
          company_name: companyName.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your account could not be set up.");
      window.location.assign(payload.redirectTo || "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-form">
    {step === "details" ? (
      <form onSubmit={requestCode} className="auth-form">
        <label className="auth-field">I want to
          <select value={role} onChange={e => setRole(e.target.value)} aria-label="Account type">
            <option value="talent">Find work (Talent)</option>
            <option value="employer">Hire talent (Employer)</option>
          </select>
        </label>
        <label className="auth-field">Full name
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} autoComplete="name" minLength={2} maxLength={100} required placeholder="Your full name" />
        </label>
        {role === "employer" && <label className="auth-field">Company name
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} autoComplete="organization" minLength={2} maxLength={160} required placeholder="Your company or team" />
        </label>}
        <label className="auth-field">Email address
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
        </label>
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        <button className="button button-dark auth-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="auth-spinner"/> Sending code…</> : <>Continue with email <ArrowRight size={16}/></>}
        </button>
        <p className="auth-privacy"><ShieldCheck size={15}/> Secure email verification. No password needed.</p>
      </form>
    ) : (
      <form onSubmit={verifyAndCreate} className="auth-form">
        <p className="auth-panel-intro">Enter the code sent to <strong>{email}</strong>.</p>
        <label className="auth-field">Email verification code
          <input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" minLength={4} maxLength={12} required placeholder="Enter one-time code" />
        </label>
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
        <button className="button button-dark auth-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="auth-spinner"/> Verifying account…</> : <>Verify and create account <ArrowRight size={16}/></>}
        </button>
        <button className="auth-back" type="button" onClick={() => { setStep("details"); setOtp(""); setError(""); setMessage(""); }}>Use a different email</button>
      </form>
    )}
  </div>;
}
