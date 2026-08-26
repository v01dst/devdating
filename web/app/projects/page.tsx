import { TopNav } from "@/components/TopNav";
import { apiFetch } from "@/lib/server-api";

type SearchParams = { language?: string; search?: string; topic?: string; sort?: string };

async function getProjects(query: URLSearchParams) {
  return (await apiFetch<any[]>(`/api/v1/projects/public?${query}`)) ?? [];
}

async function getLanguages() {
  return (await apiFetch<any[]>("/api/v1/meta/languages")) ?? [];
}

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const query = new URLSearchParams();
  for (const key of ["language", "search", "topic", "sort"] as const)
    if (searchParams[key]) query.set(key, searchParams[key]!);
  query.set("limit", "48");
  const [projects, languages] = await Promise.all([getProjects(query), getLanguages()]);
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <TopNav active="/projects" />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Projects that can help you</h1>
      <p className="mt-4 max-w-2xl text-white/65">Search indexed public repositories by language, topic, activity, and contribution need.</p>
      <form action="/projects" className="glass-card mt-8 grid gap-4 rounded-3xl p-5 md:grid-cols-[1fr_180px_170px_150px_130px]">
        <input name="search" defaultValue={searchParams.search ?? ""} placeholder="Search projects and descriptions…" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-accent" />
        <select name="language" defaultValue={searchParams.language ?? ""} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <option value="">All languages</option>
          {languages.map((item: any) => <option key={item.language} value={item.language}>{item.language} ({item.count})</option>)}
        </select>
        <input name="topic" defaultValue={searchParams.topic ?? ""} placeholder="Topic (e.g. cli)" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3" />
        <select name="sort" defaultValue={searchParams.sort ?? "activity"} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <option value="activity">Most active</option><option value="stars">Most stars</option><option value="issues">Most issues</option><option value="name">Name A-Z</option>
        </select>
        <button className="rounded-2xl bg-accent px-5 font-medium transition hover:bg-accent-soft">Find</button>
      </form>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{projects.length === 0 && <div className="glass-card rounded-3xl p-6 text-white/65">No matching projects yet.</div>}
        {projects.map((project: any) => (
          <a key={project.id} href={project.repo_url} target="_blank" rel="noreferrer" className="glass-card group rounded-3xl p-6 transition hover:border-accent/40">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-accent-soft">{project.owner_login}</p><h2 className="mt-1 line-clamp-1 text-lg font-semibold group-hover:text-accent-soft">{project.name}</h2></div><span className="text-sm text-yellow-300">★ {project.stars}</span></div>
            <p className="mt-3 line-clamp-3 min-h-16 text-sm text-white/65">{project.description || "No description provided."}</p>
            <div className="mt-5 flex flex-wrap gap-2">{project.languages.slice(0, 3).map((lang: string) => <span key={lang} className="rounded-full border border-white/15 px-3 py-1 text-xs">{lang}</span>)}</div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-white/60"><div><b className="block text-white">{project.activity_score.toFixed(0)}</b>vibe</div><div><b className="block text-like">{project.open_issues}</b>open issues</div><div><b className="block text-white">{project.forks}</b>forks</div></div>
          </a>
        ))}
      </div>
    </main>
  );
}
