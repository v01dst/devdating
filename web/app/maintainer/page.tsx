import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { RespondButtons } from "@/components/RespondButtons";
import { apiFetch } from "@/lib/server-api";

export const metadata = { title: "Maintainer — DevDating" };

export default async function MaintainerPage() {
  const [projects, incoming] = await Promise.all([
    apiFetch<any[]>("/api/v1/me/maintained-projects"),
    apiFetch<any[]>("/api/v1/me/incoming-matches"),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <TopNav active="/maintainer" />
      <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">Maintainer hub</h1>
      <p className="mt-4 max-w-2xl text-white/65">
        Claim your projects to start approving or declining contributor interest.
      </p>

      <section className="mt-8">
        <h2 className="font-semibold">Incoming interest ({incoming?.length ?? 0})</h2>
        {(incoming ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-white/55">
            No pending matches. When a developer swipes right on one of your projects, they show up here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {incoming!.map((item) => (
              <div key={item.match_id} className="glass-card flex items-center justify-between gap-4 rounded-2xl p-5">
                <div>
                  <p className="font-medium">{item.project}</p>
                  <p className="text-sm text-white/60">
                    @{item.developer} · {Math.round(item.compatibility_score)}% fit
                  </p>
                </div>
                <RespondButtons matchId={item.match_id} project={item.project} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">Your projects ({projects?.length ?? 0})</h2>
        {(projects ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-white/55">
            No claimed projects yet. Claim one from the{" "}
            <Link href="/projects" className="text-accent-soft hover:underline">Projects</Link> page.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {projects!.map((project) => (
              <div key={project.id} className="glass-card rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-accent-soft">{project.owner_login}</p>
                    <h3 className="font-semibold">{project.name}</h3>
                  </div>
                  <span className="text-sm text-yellow-300">★ {project.stars}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/55">
                  <span className={`rounded-full px-2 py-1 ${project.verified ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"}`}>
                    {project.verified ? "verified" : "unverified"}
                  </span>
                  <a href={project.repo_url} target="_blank" rel="noreferrer" className="hover:text-white">repo ↗</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}