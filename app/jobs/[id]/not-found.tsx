import { ArrowLeft, BriefcaseBusiness } from "lucide-react";

export default function JobNotFound() {
  return <main className="subpage">
    <header className="nav wrap"><a className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span><span>linkwell</span></a></header>
    <section className="wrap jobs-results"><div className="empty-state">
      <div className="empty-icon"><BriefcaseBusiness size={28}/></div>
      <div className="eyebrow">OPPORTUNITY NOT FOUND</div>
      <h3>This listing isn’t available.</h3>
      <p>It may have expired, been removed, or not yet been approved by Linkwell’s review team.</p>
      <div className="empty-actions"><a className="button button-dark" href="/jobs"><ArrowLeft size={16}/> Browse opportunities</a></div>
    </div></section>
  </main>;
}
