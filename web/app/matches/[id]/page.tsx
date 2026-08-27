import Link from "next/link";
import { ChatBox } from "@/components/ChatBox";
import { TopNav } from "@/components/TopNav";
import { apiFetch } from "@/lib/server-api";

type Params = { params: { id: string } };

export default async function MatchDetailPage({ params }: Params) {
  const match = await apiFetch<any>(`/api/v1/matches/${params.id}`);
  if (!match) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <TopNav active="/matches" />
        <div className="glass-card mt-10 rounded-3xl p-8 text-white/65">Match not found.</div>
      </main>
    );
  }
  const recommendation = await apiFetch<any>(`/api/v1/matches/${params.id}/issue-recommendation`);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <TopNav active="/matches" />
      <Link href="/matches" className="mt-6 inline-block text-sm text-white/55 hover:text-white">← All matches</Link>

      <header className="glass-card mt-4 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-accent-soft">{match.project?.owner_login}</p>
            <h1 className="mt-1 text-2xl font-semibold">{match.project?.name}</h1>
          </div>
          <div className="rounded-2xl bg-black/40 px-3 py-2 text-center">
            <div className="text-lg font-bold text-like">{Math.round(match.compatibility_score)}</div>
            <div className="text-[10px] uppercase tracking-wide text-white/50">match</div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-white/65">{match.project?.description}</p>
        <a
          href={match.project?.repo_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
        >
          Open repository ↗
        </a>
      </header>

      <section className="glass-card mt-5 rounded-3xl p-6">
        <h2 className="font-semibold">Starter issue for you</h2>
        {!recommendation || recommendation.status === "PENDING" ? (
          <p className="mt-2 text-sm text-white/60">Generating a recommendation… refresh in a moment.</p>
        ) : (
          <>
            <a href={recommendation.url} target="_blank" rel="noreferrer" className="mt-2 block font-medium text-accent-soft hover:underline">
              {recommendation.title} ↗
            </a>
            <p className="mt-2 text-sm text-white/60">{recommendation.rationale}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-black/40 px-2 py-1 text-white/70">difficulty {Math.round(recommendation.difficulty_score)}/100</span>
              <span className="rounded-full bg-black/40 px-2 py-1 text-white/70">confidence {Math.round(recommendation.confidence * 100)}%</span>
            </div>
          </>
        )}
      </section>

      {match.conversation_id ? (
        <ChatBox conversationId={match.conversation_id} />
      ) : (
        <p className="mt-5 text-sm text-white/55">Chat opens once the conversation is created.</p>
      )}
    </main>
  );
}
