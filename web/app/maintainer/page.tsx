import Link from "next/link";
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
      <h1 className="mt-8 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">Maintainer hub</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        Claim your projects to start approving or declining contributor interest.
      </p>

      <section className="mt-8">
        <h2 className="font-semibold text-zinc-900">Incoming interest ({incoming?.length ?? 0})</h2>
        {(incoming ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            No pending matches. When a developer swipes right on one of your projects, they show up here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {incoming!.map((item) => (
              <div key={item.match_id} className="card flex items-center justify-between gap-4 rounded-2xl p-5">
                <div>
                  <p className="font-medium text-zinc-900">{item.project}</p>
                  <p className="text-sm text-zinc-500">
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
        <h2 className="font-semibold text-zinc-900">Your projects ({projects?.length ?? 0})</h2>
        {(projects ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            No claimed projects yet. Claim one from the{" "}
            <Link href="/projects" className="text-[#5b3df0] hover:underline">Projects</Link> page.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {projects!.map((project) => (
              <div key={project.id} className="card rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#5b3df0]">{project.owner_login}</p>
                    <h3 className="font-semibold text-zinc-900">{project.name}</h3>
                  </div>
                  <span className="text-sm text-amber-500">★ {project.stars}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <span className={`rounded-full px-2 py-1 ${project.verified ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {project.verified ? "verified" : "unverified"}
                  </span>
                  <a href={project.repo_url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-900">repo ↗</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
