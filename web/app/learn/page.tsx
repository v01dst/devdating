import Link from "next/link";

type SearchParams = { issue?: string };

async function getJSON(path: string) {
  const response = await fetch(`${process.env.API_URL ?? "http://localhost:8000"}${path}`, {
    headers: { Authorization: "Bearer local-development-token" }, cache: "no-store",
  });
  return response.ok ? response.json() : null;
}

export default async function LearnPage({ searchParams }: { searchParams: SearchParams }) {
  const [paths, readiness, playbook] = await Promise.all([
    getJSON("/api/v1/learning/paths"),
    getJSON("/api/v1/learning/readiness"),
    searchParams.issue ? getJSON(`/api/v1/learning/playbook?issue_id=${searchParams.issue}`) : Promise.resolve(null),
  ]);
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <nav className="mb-10 flex items-center justify-between"><Link href="/discover" className="text-lg font-semibold">Dev<span className="text-accent-soft">Dating</span></Link><span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">Beginner academy</span></nav>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Learn open source by doing</h1>
      {readiness && (
        <div className="glass-card mt-8 rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-white/60">Contribution readiness</p><h2 className="text-3xl font-bold">{readiness.readiness_score}/100</h2></div>
            <div className="grid grid-cols-3 gap-5 text-center"><div><b>{readiness.indexed_issues}</b><span className="block text-xs text-white/55">issues</span></div><div><b>{readiness.unassigned_easy}</b><span className="block text-xs text-white/55">easy</span></div><div><b>{readiness.language_matched}</b><span className="block text-xs text-white/55">matched</span></div></div></div>
          <ul className="mt-4 grid gap-2 md:grid-cols-3">{readiness.advice.map((a:string)=><li key={a} className="rounded-2xl bg-white/5 p-4 text-sm">✦ {a}</li>)}</ul>
        </div>
      )}
      {playbook && (
        <section className="glass-card mt-6 rounded-3xl p-6"><h2 className="text-xl font-semibold">{playbook.issue.title}</h2><p className="mt-1 text-sm text-white/60">Difficulty: {playbook.difficulty} · Estimated time: {playbook.estimated_time_hours}h</p>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">{playbook.steps.map((step:any,index:number)=>(<li key={step.title} className="rounded-2xl border border-white/10 p-4"><b>{index+1}. {step.title}</b><p className="mt-1 text-sm text-white/65">{step.detail}</p></li>))}</ol>
          <a href={playbook.issue.url} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-full bg-accent px-5 py-2 font-medium">Open issue</a></section>)}
      <div className="mt-10 grid gap-5 md:grid-cols-2">{(paths?.paths ?? []).map((path:any)=>(<article key={path.id} className="glass-card rounded-3xl p-6"><h2 className="text-lg font-semibold">{path.title}</h2><p className="mt-2 text-sm text-white/65">{path.outcome}</p><ul className="mt-4 space-y-2 text-sm text-white/70">{path.steps.map((s:string)=><li key={s}>✦ {s}</li>)}</ul><span className="mt-4 inline-block rounded-full border border-white/15 px-3 py-1 text-xs">{path.estimated_days} days</span></article>))}</div>
      {playbook?.issue && <Link href="/issues" className="mt-8 inline-block text-sm text-accent-soft underline-offset-4 hover:underline">Choose another issue</Link>}
    </main>);
}
