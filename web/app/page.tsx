"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageShell, SkeletonCard, StaggerItem } from "@/components/PageShell";
import { api, type DiscoveryCard } from "@/lib/api";

export default function Home() {
  const { data, isLoading } = useQuery({ queryKey: ["picks"], queryFn: () => api.cards() });
  const picks = (data as DiscoveryCard[] | undefined)?.slice(0, 3) ?? [];
  return (
    <PageShell>
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-4xl font-bold text-zinc-900">Today&apos;s picks for you</h1>
      <p className="text-zinc-600">Top matches from live GitHub data. <Link className="underline" href="/discover">Open swipe deck →</Link></p>
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
            <div className="font-bold text-zinc-900">{Math.round(c.compatibility_score)}% · {c.project.owner_login}/{c.project.name}</div>
            <div className="text-sm text-zinc-600">{(c.project.description ?? "")} · {(c.project.languages ?? []).join(", ")} · ★{c.project.stars}</div>
            <div className="text-xs text-zinc-500">{c.reasons.join(" · ")}</div>
          </div>
          </StaggerItem>
        ))}
        {!isLoading && picks.length === 0 && <div className="text-zinc-500">No picks yet — run onboarding or index projects.</div>}
      </div>
      <div className="mt-6 flex gap-2 text-sm">
        <Link className="underline" href="/onboarding">Onboarding</Link>
        <Link className="underline" href="/inbox">Inbox</Link>
        <Link className="underline" href="/contributions">Tracking</Link>
      </div>
    </main>
    </PageShell>
  );
}
