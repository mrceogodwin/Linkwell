import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import SigninForm from "./signin-form";

export const metadata: Metadata = { title: "Sign in | Linkwell" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const linkError = error === "invalid-link"
    ? "That sign-in link is invalid, expired, or already used. Request a new one."
    : error === "service-unavailable"
    ? "Sign-in is temporarily unavailable. Please try again."
    : "";
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/sign-up">Create account</a></nav></header>
    <section className="auth-shell auth-shell-single">
      <div className="auth-aside"><div className="eyebrow"><span/> WELCOME BACK</div><h1>Your next chapter starts here.</h1><p>Pick up where you left off, keep your opportunities close, and move forward with confidence.</p><div className="auth-promise"><ShieldCheck size={18}/><span>No password to remember. Your secure sign-in link is sent to your email.</span></div></div>
      <div className="auth-panel"><h2>Sign in to Linkwell</h2><p className="auth-panel-intro">Enter the email address connected to your verified account.</p>{linkError && <p className="auth-feedback auth-error" role="alert">{linkError}</p>}<SigninForm next={next ?? ""}/><p className="auth-switch">New to Linkwell? <a href="/sign-up">Create an account</a></p><a className="auth-back" href="/"><ArrowLeft size={14}/> Back to Linkwell</a></div>
    </section>
  </main>;
}