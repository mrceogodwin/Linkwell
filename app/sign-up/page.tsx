import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import SignupForm from "./signup-form";

export const metadata: Metadata = { title: "Create an account | Linkwell" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="nav-actions"><a className="sign-in" href="/sign-in">Already a member?</a></nav></header>
    <section className="auth-shell">
      <div className="auth-aside"><div className="eyebrow"><span/> LINKWELL ACCOUNT</div><h1>Make your next move.</h1><p>One account for finding meaningful work or building a team with talent across borders.</p><div className="auth-promise"><ShieldCheck size={18}/><span>Email verification helps protect the Linkwell community.</span></div></div>
      <div className="auth-panel"><h2>Create your account</h2><p className="auth-panel-intro">Choose how you’ll use Linkwell. You can get started in a minute.</p><SignupForm initialRole={role ?? "talent"}/><p className="auth-switch">Already have an account? <a href="/sign-in">Sign in</a></p><a className="auth-back" href="/"><ArrowLeft size={14}/> Back to Linkwell</a></div>
    </section>
  </main>;
}