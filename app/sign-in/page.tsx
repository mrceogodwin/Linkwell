import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole } from "lucide-react";
export const metadata: Metadata = { title: "Sign in" };
export default function SignInPage() {
 return <main className="subpage"><header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a></header><section className="empty-state auth-preview"><div className="empty-icon"><LockKeyhole size={26}/></div><div className="eyebrow" style={{justifyContent:"center"}}>WELCOME BACK</div><h3>Sign-in is not open yet.</h3><p>Authentication must be connected and tested before Linkwell can safely accept accounts. This page intentionally does not collect passwords or pretend to sign anyone in.</p><div className="empty-actions"><a className="button button-dark" href="/">Return to homepage <ArrowLeft size={15}/></a></div></section></main>;
}