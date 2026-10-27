import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Search, ShieldCheck } from "lucide-react";
import JobResults from "./job-results";
export const metadata: Metadata = { title: "Find work" };
type SearchParams = Promise<{ q?: string; work?: string; type?: string; category?: string }>;
export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q ?? "";
  const work = params.work ?? "";
  const type = params.type ?? "";
  const category = params.category ?? "";
  return <main className="subpage"><header className="nav wrap"><a className="brand" href="/" aria-label="Linkwell home"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a><nav className="desktop-nav"><a href="/jobs">Find work</a><a href="/companies">For employers</a><a href="/talent">Discover talent</a></nav><div className="nav-actions"><a className="sign-in" href="/sign-in">Log in</a><a className="button button-dark button-small" href="/sign-up">Get started <ArrowRight size={15}/></a></div></header>
  <section className="jobs-hero wrap"><a className="back-link" href="/"><ArrowLeft size={15}/> Back home</a><div className="eyebrow"><span/> FIND YOUR NEXT MOVE</div><h1>Work that moves<br/><em>you forward.</em></h1><p>Explore full-time, part-time, freelance, and contract opportunities built for African talent and a world of possibilities.</p>
  <form className="search-bar jobs-search" action="/jobs"><label><Search size={19}/><input name="q" defaultValue={query} placeholder="Role, skill, or company" aria-label="Role, skill, or company"/></label><label><BriefcaseBusiness size={18}/><select name="type" defaultValue={type} aria-label="Opportunity type"><option value="">All opportunity types</option><option>Full-time</option><option>Part-time</option><option>Freelance</option><option>Contract</option></select></label><label><Search size={18}/><select name="work" defaultValue={work} aria-label="Work arrangement"><option value="">Any location style</option><option value="Remote">Remote</option><option value="Hybrid">Hybrid</option><option value="On-site">On-site</option></select></label><button type="submit">Search <ArrowRight size={17}/></button></form></section>
  <section className="wrap jobs-results"><div className="results-heading"><div><div className="eyebrow">OPPORTUNITY BOARD</div><h2>{query ? <>Results for “{query}”</> : category || "Find your kind of work"}</h2></div><span className="review-note"><ShieldCheck size={16}/> Listings require review before publication</span></div><JobResults q={query} work={work} type={type} category={category}/><div className="empty-actions"><a className="button button-dark" href="/sign-up">Create an account <ArrowRight size={16}/></a><a className="button button-light" href="/companies">I’m hiring</a></div></section>
  <footer className="footer"><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Linkwell</span><a href="/">Back to home</a></div></footer></main>;
}