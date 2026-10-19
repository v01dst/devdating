"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageShell, SkeletonCard, StaggerItem } from "@/components/PageShell";
import { api, type DiscoveryCard } from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";

export default function Home() {
  const { data, isLoading } = useQuery({ queryKey: ["picks"], queryFn: () => api.cards() });
  const picks = (data as DiscoveryCard[] | undefined)?.slice(0, 3) ?? [];
  return (
    <PageShell>
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-4xl font-bold text-ink">Today&apos;s picks for you</h1>
      <p className="text-ink-soft">Top matches from live GitHub data. <Link className="text-accent-soft underline-offset-4 hover:underline" href="/discover">Open swipe deck →</Link></p>
      <div className="mt-6 flex flex-col gap-3">
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
        {picks.map((c, index) => (
          <StaggerItem key={c.project.id} index={index}>
          <div className="card p-4">
            <div className="font-bold text-ink">{Math.round(c.compatibility_score)}% · {c.project.owner_login}/{c.project.name}</div>
            <div className="text-sm text-ink-soft">{(c.project.description ?? "")} · {(c.project.languages ?? []).join(", ")} · ★{c.project.stars}</div>
            <div className="text-xs text-ink-dim">{c.reasons.join(" · ")}{timeAgo(c.project.synced_at) ? ` · indexed ${timeAgo(c.project.synced_at)}` : ""}</div>
          </div>
          </StaggerItem>
        ))}
        {!isLoading && picks.length === 0 && <div className="text-ink-dim">No picks yet — run onboarding or index projects.</div>}
      </div>
      <div className="mt-6 flex gap-4 font-mono text-xs text-ink-dim">
        <Link className="transition hover:text-ink" href="/onboarding">onboarding</Link>
        <Link className="transition hover:text-ink" href="/inbox">inbox</Link>
        <Link className="transition hover:text-ink" href="/contributions">tracking</Link>
      </div>
    </main>
    </PageShell>
  );
}
