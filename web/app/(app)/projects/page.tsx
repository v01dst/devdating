import { ClaimButton } from "@/components/ClaimButton";
import { IndexButton } from "@/components/IndexButton";
import { PageShell, StaggerItem } from "@/components/PageShell";
import { timeAgo } from "@/lib/timeAgo";
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
    <PageShell>
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Projects that can help you</h1>
          <p className="mt-4 max-w-2xl text-ink-soft">Search indexed public repositories by language, topic, activity, and contribution need.</p>
        </div>
        <IndexButton />
      </div>
      <form action="/projects" className="card mt-8 grid gap-4 rounded-3xl p-5 md:grid-cols-[1fr_180px_170px_150px_130px]">
        <input name="search" defaultValue={searchParams.search ?? ""} placeholder="Search projects and descriptions…" className="input" />
        <select name="language" defaultValue={searchParams.language ?? ""} className="input">
          <option value="">All languages</option>
          {languages.map((item: any) => <option key={item.language} value={item.language}>{item.language} ({item.count})</option>)}
        </select>
        <input name="topic" defaultValue={searchParams.topic ?? ""} placeholder="Topic (e.g. cli)" className="input" />
        <select name="sort" defaultValue={searchParams.sort ?? "activity"} className="input">
          <option value="activity">Most active</option><option value="latest">Latest indexed</option><option value="stars">Most stars</option><option value="issues">Most issues</option><option value="name">Name A-Z</option>
        </select>
        <button className="btn-primary px-5 py-3 transition">Find</button>
      </form>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{projects.length === 0 && <div className="card rounded-3xl p-6 text-ink-soft">No matching projects yet.</div>}
        {projects.map((project: any, index: number) => (
          <StaggerItem key={project.id} index={index}>
          <div className="card group h-full rounded-3xl p-6 transition hover:border-accent/40">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-accent-soft">{project.owner_login}</p><a href={project.repo_url} target="_blank" rel="noreferrer"><h2 className="mt-1 line-clamp-1 text-lg font-semibold text-ink group-hover:text-accent-soft">{project.name}</h2></a></div><span className="text-sm text-warn">★ {project.stars}</span></div>
            <p className="mt-3 line-clamp-3 min-h-16 text-sm text-ink-soft">{project.description || "No description provided."}</p>
            {timeAgo(project.synced_at) && (
              <p className="mt-1 text-xs text-ink-dim">indexed {timeAgo(project.synced_at)}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">{project.languages.slice(0, 3).map((lang: string) => <span key={lang} className="chip">{lang}</span>)}</div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-ink-dim"><div><b className="block text-ink">{project.activity_score.toFixed(0)}</b>vibe</div><div><b className="block text-like">{project.open_issues}</b>open issues</div><div><b className="block text-ink">{project.forks}</b>forks</div></div>
            <div className="mt-4"><ClaimButton projectId={project.id} /></div>
          </div>
          </StaggerItem>
        ))}
      </div>
    </main>
    </PageShell>
  );
}
