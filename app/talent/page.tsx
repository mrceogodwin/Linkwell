import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import TalentDirectory from "./talent-directory";

export const metadata: Metadata = {
  title: "Discover talent",
  description: "Find discoverable African professionals by skills, roles and location on Linkwell.",
};

export default function TalentPage() {
  return <main className="subpage">
    <header className="nav wrap">
      <a className="brand" href="/" aria-label="Linkwell home"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a>
      <nav className="desktop-nav"><a href="/jobs">Find work</a><a href="/companies">For employers</a><a href="/talent" aria-current="page">Discover talent</a></nav>
      <div className="nav-actions"><a className="sign-in" href="/sign-in">Log in</a><a className="button button-dark button-small" href="/sign-up">Get started <ArrowRight size={15}/></a></div>
    </header>
    <section className="jobs-hero wrap">
      <a className="back-link" href="/">← Back home</a>
      <div className="eyebrow"><span/> DISCOVER AFRICAN TALENT</div>
      <h1>Great people. <em>Wider possibilities.</em></h1>
      <p>Search skills, professional headlines and locations. Only verified talent members who have chosen to make their profile discoverable appear in this directory.</p>
      <div className="hero-ctas"><a className="button button-dark" href="/sign-up">Create your talent profile <ArrowRight size={16}/></a><a className="button button-light" href="/jobs">Explore opportunities</a></div>
    </section>
    <TalentDirectory/>
    <footer className="footer"><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Linkwell</span><a href="/">Back to home</a></div></footer>
  </main>;
}
