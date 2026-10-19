import Link from "next/link";
import { ChatBox } from "@/components/ChatBox";
import { TrackIssueButton } from "@/components/TrackIssueButton";
import { apiFetch } from "@/lib/server-api";

type Params = { params: { id: string } };

export default async function MatchDetailPage({ params }: Params) {
  const matchId = encodeURIComponent(params.id);
  const match = await apiFetch<any>(`/api/v1/matches/${matchId}`);
  if (!match) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="card mt-10 rounded-3xl p-8 text-ink-soft">Match not found.</div>
      </main>
    );
  }
  const recommendation = await apiFetch<any>(`/api/v1/matches/${matchId}/issue-recommendation`);
  const contributions = (await apiFetch<any[]>("/api/v1/contributions")) ?? [];
  const tracked = Boolean(
    recommendation?.repo &&
      contributions.some(
        (item: any) =>
          item.repo === recommendation.repo &&
          item.issue_number === recommendation.issue_number &&
          item.state !== "MERGED",
      ),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/matches" className="mt-6 inline-block text-sm text-ink-dim hover:text-ink">← All matches</Link>

      <header className="card mt-4 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-accent-soft">{match.project?.owner_login}</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{match.project?.name}</h1>
          </div>
          <div className="rounded-2xl bg-accent/10 px-3 py-2 text-center">
            <div className="text-lg font-bold text-accent-soft">{Math.round(match.compatibility_score)}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink-dim">match</div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{match.project?.description}</p>
        <a
          href={match.project?.repo_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-full bg-ghost px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-ink/15"
        >
          Open repository ↗
        </a>
      </header>

      <section className="card mt-5 rounded-3xl p-6">
        <h2 className="font-semibold text-ink">Starter issue for you</h2>
        {!recommendation || recommendation.status === "PENDING" ? (
          <p className="mt-2 text-sm text-ink-dim">Generating a recommendation… refresh in a moment.</p>
        ) : (
          <>
            <a href={recommendation.url} target="_blank" rel="noreferrer" className="mt-2 block font-medium text-accent-soft hover:underline">
              {recommendation.title} ↗
            </a>
            <p className="mt-2 text-sm text-ink-dim">{recommendation.rationale}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-ghost px-2 py-1 text-ink-soft">difficulty {Math.round(recommendation.difficulty_score)}/100</span>
              <span className="rounded-full bg-ghost px-2 py-1 text-ink-soft">confidence {Math.round(recommendation.confidence * 100)}%</span>
            </div>
            {recommendation.repo && recommendation.issue_number ? (
              <div className="mt-4">
                <TrackIssueButton
                  repo={recommendation.repo}
                  issueNumber={recommendation.issue_number}
                  issueId={recommendation.issue_id ?? undefined}
                  initiallyTracked={tracked}
                  trackedHref="/contributions"
                />
              </div>
            ) : null}
          </>
        )}
      </section>

      {match.conversation_id ? (
        <ChatBox conversationId={match.conversation_id} />
      ) : (
        <p className="mt-5 text-sm text-ink-dim">Chat opens once the conversation is created.</p>
      )}
    </main>
  );
}
