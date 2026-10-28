"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { neonAuthClient } from "@/lib/auth/client";

export default function SigninForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      const result = await neonAuthClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (result.error) throw new Error(result.error.message || "Could not send a sign-in code.");
      setStep("verify");
      setMessage("Check your inbox for a one-time sign-in code.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
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
        body: JSON.stringify({ mode: "signin" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not open your Linkwell account.");
      window.location.assign(payload.redirectTo || "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-form">
    {step === "email" ? (
      <form onSubmit={requestCode} className="auth-form">
        <label className="auth-field">Email address
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
        </label>
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        <button className="button button-dark auth-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="auth-spinner"/> Sending code…</> : <>Email me a sign-in code <ArrowRight size={16}/></>}
        </button>
        <p className="auth-privacy"><Mail size={15}/> Secure passwordless sign-in with Neon Auth.</p>
      </form>
    ) : (
      <form onSubmit={verifyAndSignIn} className="auth-form">
        <p className="auth-panel-intro">Enter the one-time code sent to <strong>{email}</strong>.</p>
        <label className="auth-field">Sign-in code
          <input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" minLength={4} maxLength={12} required placeholder="Enter one-time code" />
        </label>
        {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
        {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
        <button className="button button-dark auth-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="auth-spinner"/> Verifying…</> : <>Verify and sign in <ArrowRight size={16}/></>}
        </button>
        <button className="auth-back" type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); setMessage(""); }}>Use a different email</button>
      </form>
    )}
  </div>;
}
