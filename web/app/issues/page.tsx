import { PageShell, StaggerItem } from "@/components/PageShell";
import { timeAgo } from "@/lib/timeAgo";
import { apiFetch } from "@/lib/server-api";

type SearchParams = { language?: string; search?: string; label?: string; sort?: string };

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
  if (searchParams.sort) query.set("sort", searchParams.sort);
  query.set("limit", "48");
  const [issues, languages] = await Promise.all([getIssues(query), getLanguages()]);
  return (
    <PageShell>
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">Issues picked for you</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">Search public open-source issues by language, label, and keyword.</p>
      <form action="/issues" className="card mt-8 grid gap-4 rounded-3xl p-5 md:grid-cols-[1fr_180px_180px_150px_130px]">
        <input name="search" defaultValue={searchParams.search ?? ""} placeholder="Search issues, projects, descriptions…" className="input" />
        <select name="language" defaultValue={searchParams.language ?? ""} className="input">
          <option value="">All languages</option>
          {languages.map((item: any) => <option key={item.language} value={item.language}>{item.language} ({item.count})</option>)}
        </select>
        <select name="label" defaultValue={searchParams.label ?? ""} className="input">
          <option value="">All labels</option>
          {["good first issue","help wanted","documentation","beginner"].map(label => <option key={label} value={label}>{label}</option>)}
        </select>
        <select name="sort" defaultValue={searchParams.sort ?? "fit"} className="input">
          <option value="fit">Best fit</option>
          <option value="latest">Latest opened</option>
          <option value="easy">Easiest first</option>
        </select>
        <button className="btn-primary px-5 py-3 transition">Search</button>
      </form>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{issues.length === 0 && <div className="card rounded-3xl p-6 text-zinc-600">No live issues indexed yet. Index some from the button above or run <code>devdating sync-github</code>.</div>}
        {issues.map((issue: any, index: number) => (
          <StaggerItem key={issue.issue_id} index={index}>
          <a href={issue.url} target="_blank" rel="noreferrer" className="card group block h-full rounded-3xl p-6 transition hover:border-accent/40">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{issue.project_name}</span>
              <span>{timeAgo(issue.opened_at) ? `opened ${timeAgo(issue.opened_at)}` : ""} · <span className="text-emerald-600">{Math.round(issue.score)} fit</span></span>
            </div>
            <h2 className="mt-3 line-clamp-3 font-semibold leading-snug text-zinc-900 group-hover:text-[#5b3df0]">{issue.title}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600" title="Estimated difficulty from labels, discussion, and size">difficulty {Math.round(issue.difficulty)}</span>
              {typeof issue.difficulty === "number" && issue.difficulty <= 35 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-700">beginner</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{issue.languages.slice(0,2).map((x:string)=><span key={x} className="chip">{x}</span>)}</div>
            <ul className="mt-4 space-y-1 text-sm text-zinc-500">{issue.reasons.slice(0,2).map((r:string)=><li key={r}>✦ {r}</li>)}</ul>
            <span className="mt-4 block rounded-full bg-zinc-100 py-2 text-center text-sm font-medium text-zinc-700 transition group-hover:bg-zinc-200">Open issue</span>
          </a>
          </StaggerItem>
        ))}
      </div>
    </main>
    </PageShell>
  );
}
