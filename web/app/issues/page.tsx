import { TopNav } from "@/components/TopNav";
import { apiFetch } from "@/lib/server-api";

type SearchParams = { language?: string; search?: string; label?: string };

export const metadata = { title: "Recommended Issues — DevDating" };

async function getIssues(query: URLSearchParams) {
  return (await apiFetch<any[]>(`/api/v1/me/recommended-issues?${query}`)) ?? [];
}

async function getLanguages() {
  return (await apiFetch<any[]>("/api/v1/meta/languages")) ?? [];
}

export default async function IssuesPage({ searchParams }: { searchParams: SearchParams }) {
  const query = new URLSearchParams();
  if (searchParams.language) query.set("language", searchParams.language);
  if (searchParams.search) query.set("search", searchParams.search);
  if (searchParams.label) query.set("label", searchParams.label);
  query.set("limit", "48");
  const [issues, languages] = await Promise.all([getIssues(query), getLanguages()]);
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <TopNav active="/issues" />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Issues picked for you</h1>
      <p className="mt-4 max-w-2xl text-white/65">Search public open-source issues by language, label, and keyword.</p>
      <form action="/issues" className="glass-card mt-8 grid gap-4 rounded-3xl p-5 md:grid-cols-[1fr_180px_180px_130px]">
        <input name="search" defaultValue={searchParams.search ?? ""} placeholder="Search issues, projects, descriptions…" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-accent" />
        <select name="language" defaultValue={searchParams.language ?? ""} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none">
          <option value="">All languages</option>
          {languages.map((item: any) => <option key={item.language} value={item.language}>{item.language} ({item.count})</option>)}
        </select>
        <select name="label" defaultValue={searchParams.label ?? ""} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none">
          <option value="">All labels</option>
          {["good first issue","help wanted","documentation","beginner"].map(label => <option key={label} value={label}>{label}</option>)}
        </select>
        <button className="rounded-2xl bg-accent px-5 font-medium transition hover:bg-accent-soft">Search</button>
      </form>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{issues.length === 0 && <div className="glass-card rounded-3xl p-6 text-white/65">No live issues indexed yet. Run <code>devdating sync-github</code>.</div>}
        {issues.map((issue: any) => (
          <a key={issue.issue_id} href={issue.url} target="_blank" rel="noreferrer" className="glass-card group rounded-3xl p-6 transition hover:border-accent/40">
            <div className="flex items-center justify-between text-xs text-white/55"><span>{issue.project_name}</span><span className="text-like">{Math.round(issue.score)} fit</span></div>
            <h2 className="mt-3 line-clamp-3 font-semibold leading-snug group-hover:text-accent-soft">{issue.title}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wide text-white/70" title="Estimated difficulty from labels, discussion, and size">difficulty {Math.round(issue.difficulty)}</span>
              {typeof issue.difficulty === "number" && issue.difficulty <= 35 && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300">beginner</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{issue.languages.slice(0,2).map((x:string)=><span key={x} className="rounded-full border border-white/15 px-2 py-1 text-xs">{x}</span>)}</div>
            <ul className="mt-4 space-y-1 text-sm text-white/60">{issue.reasons.slice(0,2).map((r:string)=><li key={r}>✦ {r}</li>)}</ul>
            <span className="mt-4 block rounded-full bg-white/10 py-2 text-center text-sm font-medium transition group-hover:bg-white/20">Open issue</span>
          </a>
        ))}
      </div>
    </main>
  );
}
