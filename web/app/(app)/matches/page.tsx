import Link from "next/link";
import { PageShell, StaggerItem } from "@/components/PageShell";
import { timeAgo } from "@/lib/timeAgo";
import { apiFetch } from "@/lib/server-api";

export const metadata = { title: "Matches — DevDating" };

export default async function MatchesPage() {
  const matches = (await apiFetch<any[]>("/api/v1/matches")) ?? [];
  return (
    <PageShell>
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="mt-8 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Your matches</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">Every match comes with a starter issue and a direct line to coordinate.</p>
      {matches.length === 0 ? (
        <div className="card mt-10 rounded-3xl p-8 text-center text-ink-soft">
          No matches yet.{" "}
          <Link href="/discover" className="text-accent-soft underline-offset-4 hover:underline">
            Swipe some projects
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {matches.map((match: any, index: number) => (
            <StaggerItem key={match.id} index={index}>
            <Link
              href={`/matches/${match.id}`}
              className="card group block h-full rounded-3xl p-6 transition hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-accent-soft">{match.project?.owner_login}</p>
                  <h2 className="mt-1 text-lg font-semibold text-ink group-hover:text-accent-soft">{match.project?.name}</h2>
                </div>
                <div className="rounded-2xl bg-accent/10 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-accent-soft">{Math.round(match.compatibility_score)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-dim">match</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs ${match.status === "MATCHED" ? "bg-like/15 text-like" : "bg-ghost text-ink-dim"}`}>
                  {match.status}
                </span>
                {match.conversation_id && (
                  <span className="rounded-full bg-ghost px-3 py-1 text-xs text-ink-dim">chat open</span>
                )}
                {timeAgo(match.matched_at ?? match.created_at) && (
                  <span className="text-xs text-ink-dim">matched {timeAgo(match.matched_at ?? match.created_at)}</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(match.project?.languages ?? []).slice(0, 3).map((lang: string) => (
                  <span key={lang} className="chip">{lang}</span>
                ))}
              </div>
            </Link>
            </StaggerItem>
          ))}
        </div>
      )}
    </main>
    </PageShell>
  );
}
