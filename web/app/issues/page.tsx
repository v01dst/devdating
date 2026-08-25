import Link from "next/link";

export const metadata = { title: "Recommended Issues — DevDating" };

async function getIssues() {
  const response = await fetch(`${process.env.API_URL ?? "http://localhost:8000"}/api/v1/me/recommended-issues?limit=24`, {
    headers: { Authorization: "Bearer local-development-token" }, cache: "no-store",
  });
  if (!response.ok) return [];
  return response.json();
}

export default async function IssuesPage() {
  const issues = await getIssues();
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <nav className="mb-10 flex items-center justify-between"><Link href="/discover" className="text-lg font-semibold">Dev<span className="text-accent-soft">Dating</span></Link><span className="pill rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">Live GitHub issues</span></nav>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Issues picked for you</h1>
      <p className="mt-4 max-w-2xl text-white/65">Ranked by your tech stack, beginner-friendly labels, discussion load, and project health.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{issues.length === 0 && <div className="glass-card rounded-3xl p-6 text-white/65">No live issues indexed yet. Run <code>devdating sync-github</code>.</div>}
        {issues.map((issue: any) => (
          <a key={issue.issue_id} href={issue.url} target="_blank" rel="noreferrer" className="glass-card group rounded-3xl p-6 transition hover:border-accent/40">
            <div className="flex items-center justify-between text-xs text-white/55"><span>{issue.project_name}</span><span className="text-like">{Math.round(issue.score)} fit</span></div>
            <h2 className="mt-3 line-clamp-3 font-semibold leading-snug group-hover:text-accent-soft">{issue.title}</h2>
            <div className="mt-4 flex flex-wrap gap-2">{issue.languages.slice(0,2).map((x:string)=><span key={x} className="rounded-full border border-white/15 px-2 py-1 text-xs">{x}</span>)}</div>
            <ul className="mt-4 space-y-1 text-sm text-white/60">{issue.reasons.slice(0,2).map((r:string)=><li key={r}>✦ {r}</li>)}</ul>
          </a>
        ))}
      </div>
    </main>
  );
}
