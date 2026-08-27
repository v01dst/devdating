import Link from "next/link";
import { apiFetch } from "@/lib/server-api";

export const metadata = { title: "Matches — DevDating" };

export default async function MatchesPage() {
  const matches = (await apiFetch<any[]>("/api/v1/matches")) ?? [];
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">Your matches</h1>
      <p className="mt-4 max-w-2xl text-white/65">Every match comes with a starter issue and a direct line to coordinate.</p>
      {matches.length === 0 ? (
        <div className="glass-card mt-10 rounded-3xl p-8 text-center text-white/65">
          No matches yet.{" "}
          <Link href="/discover" className="text-accent-soft underline-offset-4 hover:underline">
            Swipe some projects
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {matches.map((match: any) => (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="glass-card group rounded-3xl p-6 transition hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-accent-soft">{match.project?.owner_login}</p>
                  <h2 className="mt-1 text-lg font-semibold group-hover:text-accent-soft">{match.project?.name}</h2>
                </div>
                <div className="rounded-2xl bg-black/40 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-like">{Math.round(match.compatibility_score)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/50">match</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs ${match.status === "MATCHED" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"}`}>
                  {match.status}
                </span>
                {match.conversation_id && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">chat open</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(match.project?.languages ?? []).slice(0, 3).map((lang: string) => (
                  <span key={lang} className="rounded-full border border-white/15 px-3 py-1 text-xs">{lang}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
