import Link from "next/link";
import { ChatBox } from "@/components/ChatBox";
import { apiFetch } from "@/lib/server-api";

type Params = { params: { id: string } };

export default async function MatchDetailPage({ params }: Params) {
  const match = await apiFetch<any>(`/api/v1/matches/${params.id}`);
  if (!match) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="card mt-10 rounded-3xl p-8 text-zinc-600">Match not found.</div>
      </main>
    );
  }
  const recommendation = await apiFetch<any>(`/api/v1/matches/${params.id}/issue-recommendation`);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/matches" className="mt-6 inline-block text-sm text-zinc-500 hover:text-zinc-900">← All matches</Link>

      <header className="card mt-4 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#5b3df0]">{match.project?.owner_login}</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{match.project?.name}</h1>
          </div>
          <div className="rounded-2xl bg-violet-100 px-3 py-2 text-center">
            <div className="text-lg font-bold text-[#5b3df0]">{Math.round(match.compatibility_score)}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">match</div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-zinc-600">{match.project?.description}</p>
        <a
          href={match.project?.repo_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
        >
          Open repository ↗
        </a>
      </header>

      <section className="card mt-5 rounded-3xl p-6">
        <h2 className="font-semibold text-zinc-900">Starter issue for you</h2>
        {!recommendation || recommendation.status === "PENDING" ? (
          <p className="mt-2 text-sm text-zinc-500">Generating a recommendation… refresh in a moment.</p>
        ) : (
          <>
            <a href={recommendation.url} target="_blank" rel="noreferrer" className="mt-2 block font-medium text-[#5b3df0] hover:underline">
              {recommendation.title} ↗
            </a>
            <p className="mt-2 text-sm text-zinc-500">{recommendation.rationale}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">difficulty {Math.round(recommendation.difficulty_score)}/100</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">confidence {Math.round(recommendation.confidence * 100)}%</span>
            </div>
          </>
        )}
      </section>

      {match.conversation_id ? (
        <ChatBox conversationId={match.conversation_id} />
      ) : (
        <p className="mt-5 text-sm text-zinc-500">Chat opens once the conversation is created.</p>
      )}
    </main>
  );
}
